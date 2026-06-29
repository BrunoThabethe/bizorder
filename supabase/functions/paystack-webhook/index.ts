// Paystack webhook. Verifies signature, then routes by metadata.transaction_type.
// Always returns HTTP 200 unless signature verification fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  corsHeaders,
  json,
  SERVICE_KEY,
  SUPABASE_URL,
  verifySignature,
} from "../_shared/paystack.ts";

interface Metadata {
  transaction_type?: "booking" | "quote_payment" | "adjustment";
  order_id?: string | null;
  service_id?: string | null;
  business_id?: string;
  customer_id?: string;
  quote_id?: string | null;
  adjustment_id?: string | null;
  service_type?: string | null;
  tier_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const ok = await verifySignature(raw, signature);
  if (!ok) return json(401, { error: "Invalid signature" });

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return json(200, { received: true });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Idempotency
    const reference = (event.data as { reference?: string })?.reference ?? null;
    if (reference) {
      const { data: existing } = await admin
        .from("payment_webhook_events")
        .select("id")
        .eq("reference", reference)
        .maybeSingle();
      if (existing) return json(200, { duplicate: true });
      await admin.from("payment_webhook_events").insert({
        reference,
        provider: "paystack",
        event_type: event.event,
        payload: event,
      });
    }

    if (event.event !== "charge.success") {
      return json(200, { ignored: event.event });
    }

    const meta = ((event.data as { metadata?: Metadata })?.metadata ?? {}) as Metadata;
    const txType = meta.transaction_type;
    const amount = Number((event.data as { amount?: number })?.amount ?? 0) / 100;

    if (txType === "booking" && meta.order_id) {
      await admin
        .from("orders")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", meta.order_id);
      await admin.from("order_payments").upsert(
        {
          order_id: meta.order_id,
          provider: "paystack",
          provider_reference: reference,
          amount,
          currency: "ZAR",
          status: "funded",
          funded_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );
      if (meta.business_id) {
        const { data: biz } = await admin
          .from("businesses")
          .select("owner_id")
          .eq("id", meta.business_id)
          .maybeSingle();
        if (biz?.owner_id) {
          await admin.from("notifications").insert({
            user_id: biz.owner_id,
            type: "order_paid",
            title: "New paid order",
            body: "A customer has paid for an order. Tap to review.",
            link: `/business/orders/${meta.order_id}`,
          });
        }
      }
    } else if (txType === "quote_payment" && meta.quote_id) {
      const { data: quote } = await admin
        .from("quotes")
        .select("*, services(title, currency)")
        .eq("id", meta.quote_id)
        .maybeSingle();
      if (quote) {
        // Create matching order
        const { data: order } = await admin
          .from("orders")
          .insert({
            customer_id: quote.customer_id,
            business_id: quote.business_id,
            service_id: quote.service_id,
            total: quote.quoted_price ?? amount,
            currency: "ZAR",
            status: "pending",
            source_quote_id: quote.id,
            notes: quote.message,
          })
          .select("id")
          .single();
        await admin
          .from("quotes")
          .update({ status: "paid", order_id: order?.id ?? null })
          .eq("id", quote.id);
        if (order?.id) {
          await admin.from("order_payments").upsert(
            {
              order_id: order.id,
              provider: "paystack",
              provider_reference: reference,
              amount,
              currency: "ZAR",
              status: "funded",
              funded_at: new Date().toISOString(),
            },
            { onConflict: "order_id" },
          );
          const { data: biz } = await admin
            .from("businesses")
            .select("owner_id")
            .eq("id", quote.business_id)
            .maybeSingle();
          if (biz?.owner_id) {
            await admin.from("notifications").insert({
              user_id: biz.owner_id,
              type: "order_paid",
              title: "Quote paid — new order",
              body: "Your quote was paid. A new order is waiting.",
              link: `/business/orders/${order.id}`,
            });
          }
        }
      }
    } else if (txType === "adjustment" && meta.adjustment_id) {
      await admin
        .from("order_adjustments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paystack_reference: reference,
        })
        .eq("id", meta.adjustment_id);
      if (meta.business_id) {
        const { data: biz } = await admin
          .from("businesses")
          .select("owner_id")
          .eq("id", meta.business_id)
          .maybeSingle();
        if (biz?.owner_id) {
          await admin.from("notifications").insert({
            user_id: biz.owner_id,
            type: "adjustment_paid",
            title: "Adjustment paid",
            body: "Your top-up request was paid by the customer.",
            link: meta.order_id ? `/business/orders/${meta.order_id}` : null,
          });
        }
      }
    }

    return json(200, { received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("paystack-webhook", message);
    return json(200, { received: true, error: message });
  }
});

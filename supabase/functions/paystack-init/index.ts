// Initialise a Paystack transaction for booking, quote payment, or adjustment.
// Requires a signed-in user; server resolves amount + business subaccount.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  ANON_KEY,
  corsHeaders,
  failureUrl,
  InitMetadata,
  json,
  newReference,
  paystackInit,
  SERVICE_KEY,
  successUrl,
  SUPABASE_URL,
  TransactionType,
} from "../_shared/paystack.ts";

const BodySchema = z.object({
  transaction_type: z.enum(["booking", "quote_payment", "adjustment"]),
  order_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  adjustment_id: z.string().uuid().optional(),
  tier_id: z.string().uuid().nullish(),
  origin: z.string().url().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await authed.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? "";

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json(400, { error: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const txType: TransactionType = body.transaction_type;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let amount = 0;
    let businessId = "";
    let serviceId: string | null = null;
    let serviceType: string | null = null;
    let orderId: string | null = body.order_id ?? null;

    if (txType === "booking") {
      if (!body.order_id) return json(400, { error: "order_id required" });
      const { data: order } = await admin
        .from("orders")
        .select("id, total, business_id, service_id, customer_id, services(service_type)")
        .eq("id", body.order_id)
        .maybeSingle();
      if (!order) return json(404, { error: "Order not found" });
      if (order.customer_id !== userId) return json(403, { error: "Forbidden" });
      amount = Number(order.total);
      businessId = order.business_id;
      serviceId = order.service_id;
      // deno-lint-ignore no-explicit-any
      serviceType = (order as any).services?.service_type ?? null;

      // Tiered/hourly override price from selected tier.
      if (body.tier_id) {
        const { data: tier } = await admin
          .from("service_tiers")
          .select("price, service_id")
          .eq("id", body.tier_id)
          .maybeSingle();
        if (!tier || tier.service_id !== serviceId) {
          return json(400, { error: "Invalid tier" });
        }
        amount = Number(tier.price);
      }
    } else if (txType === "quote_payment") {
      if (!body.quote_id) return json(400, { error: "quote_id required" });
      const { data: quote } = await admin
        .from("quotes")
        .select("id, quoted_price, business_id, service_id, customer_id, status, services(service_type)")
        .eq("id", body.quote_id)
        .maybeSingle();
      if (!quote) return json(404, { error: "Quote not found" });
      if (quote.customer_id !== userId) return json(403, { error: "Forbidden" });
      if (quote.status !== "quoted" || !quote.quoted_price) {
        return json(400, { error: "Quote not ready for payment" });
      }
      amount = Number(quote.quoted_price);
      businessId = quote.business_id;
      serviceId = quote.service_id;
      // deno-lint-ignore no-explicit-any
      serviceType = (quote as any).services?.service_type ?? "quote_based";
    } else if (txType === "adjustment") {
      if (!body.adjustment_id) return json(400, { error: "adjustment_id required" });
      const { data: adj } = await admin
        .from("order_adjustments")
        .select("id, order_id, business_id, customer_id, amount, status")
        .eq("id", body.adjustment_id)
        .maybeSingle();
      if (!adj) return json(404, { error: "Adjustment not found" });
      if (adj.customer_id !== userId) return json(403, { error: "Forbidden" });
      if (adj.status !== "pending") {
        return json(400, { error: "Adjustment already resolved" });
      }
      amount = Number(adj.amount);
      businessId = adj.business_id;
      orderId = adj.order_id;
      const { data: ord } = await admin
        .from("orders")
        .select("service_id, services(service_type)")
        .eq("id", adj.order_id)
        .maybeSingle();
      serviceId = ord?.service_id ?? null;
      // deno-lint-ignore no-explicit-any
      serviceType = (ord as any)?.services?.service_type ?? null;
    }

    if (amount <= 0) return json(400, { error: "Amount must be positive" });

    const { data: biz } = await admin
      .from("businesses")
      .select("paystack_subaccount_code, name")
      .eq("id", businessId)
      .maybeSingle();

    const origin = body.origin ??
      req.headers.get("origin") ??
      req.headers.get("referer")?.replace(/\/$/, "") ??
      "https://bizorder.co.za";

    const reference = newReference(txType);
    const metadata: InitMetadata = {
      order_id: orderId,
      service_id: serviceId,
      business_id: businessId,
      customer_id: userId,
      service_type: serviceType,
      transaction_type: txType,
      quote_id: body.quote_id ?? null,
      adjustment_id: body.adjustment_id ?? null,
      tier_id: body.tier_id ?? null,
    };

    const init = await paystackInit({
      email: userEmail || `customer-${userId.slice(0, 8)}@bizorder.co.za`,
      amount,
      reference,
      subaccount: biz?.paystack_subaccount_code ?? null,
      metadata,
      callbackUrl: successUrl(origin),
    });

    // Persist reference on the originating record for traceability.
    if (txType === "quote_payment" && body.quote_id) {
      await admin
        .from("quotes")
        .update({ paystack_reference: reference })
        .eq("id", body.quote_id);
    } else if (txType === "adjustment" && body.adjustment_id) {
      await admin
        .from("order_adjustments")
        .update({ paystack_reference: reference })
        .eq("id", body.adjustment_id);
    }

    return json(200, {
      authorization_url: init.authorization_url,
      reference: init.reference,
      failure_url: failureUrl(origin),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("paystack-init", message);
    return json(500, { error: message });
  }
});

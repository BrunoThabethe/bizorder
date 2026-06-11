import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const CallbackSchema = z.object({
  data: z.object({
    id: z.string().min(1).max(255),
    reference: z.string().max(255).optional().nullable(),
    state: z.string().min(1).max(64),
    updated_at: z.string().max(64).optional(),
    allocations: z.array(z.object({
      id: z.string().min(1).max(255),
      state: z.string().min(1).max(64),
      updated_at: z.string().max(64).optional(),
    })).max(50).default([]),
  }),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("TRADESAFE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook secret not configured" }, 503);
  const suppliedSecret = new URL(req.url).searchParams.get("secret");
  if (suppliedSecret !== secret) return json({ error: "Unauthorized callback" }, 401);

  const rawBody = await req.text();
  if (rawBody.length > 100_000) return json({ error: "Payload too large" }, 413);
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = CallbackSchema.safeParse(decoded);
  if (!parsed.success) return json({ error: "Invalid TradeSafe callback" }, 400);
  const payload = parsed.data;
  const transaction = payload.data;
  const eventId = `${transaction.id}:${transaction.state}:${transaction.updated_at ?? "unknown"}`;
  const eventType = transaction.state;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency
  const { data: existing } = await admin
    .from("payment_webhook_events")
    .select("id, processed_at")
    .eq("provider", "tradesafe")
    .eq("external_event_id", eventId)
    .maybeSingle();

  if (existing?.processed_at) return json({ ok: true, duplicate: true });

  if (!existing) {
    await admin.from("payment_webhook_events").insert({
      provider: "tradesafe",
      external_event_id: eventId,
      event_type: eventType,
      payload,
    });
  }

  const { data: payment } = await admin
    .from("order_payments")
    .select("*")
    .eq("tradesafe_transaction_id", transaction.id)
    .maybeSingle();

  if (!payment) {
    await admin
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "tradesafe")
      .eq("external_event_id", eventId);
    return json({ ok: true, note: "Unknown allocation" });
  }

  const now = new Date().toISOString();
  let paymentPatch: Record<string, unknown> = { raw: payload, updated_at: now, last_error: null };
  let orderPatch: Record<string, unknown> | null = null;
  const allocationStates = transaction.allocations.map((allocation) => allocation.state);

  if (eventType === "FUNDS_RECEIVED") {
    paymentPatch = { ...paymentPatch, status: "funded", funded_at: now };
    orderPatch = { status: "pending" };
  } else if (eventType === "FUNDS_RELEASED" || allocationStates.includes("FUNDS_RELEASED")) {
    paymentPatch = { ...paymentPatch, status: "released", released_at: now };
  } else if (["CANCELED", "CANCELLED", "REFUNDED"].includes(eventType)) {
    paymentPatch = { ...paymentPatch, status: "refunded", refunded_at: now };
    orderPatch = { status: "cancelled" };
  } else if (["DECLINED", "FAILED"].includes(eventType)) {
    paymentPatch = { ...paymentPatch, status: "failed", last_error: eventType };
  } else {
    paymentPatch = { ...paymentPatch, status: payment.status };
  }

  await admin.from("order_payments").update(paymentPatch).eq("id", payment.id);
  if (orderPatch) {
    await admin.from("orders").update(orderPatch).eq("id", payment.order_id);
    await admin.from("order_events").insert({
      order_id: payment.order_id,
      type: orderPatch.status === "pending" ? "payment_funded" : "payment_refunded",
      message:
        orderPatch.status === "pending"
          ? "Payment received via TradeSafe — order is now visible to the provider."
          : "TradeSafe refunded the payment.",
    });
    if (orderPatch.status === "pending") {
      const { data: order } = await admin
        .from("orders")
        .select("businesses(owner_id)")
        .eq("id", payment.order_id)
        .maybeSingle();
      const business = order?.businesses as unknown as { owner_id?: string } | null;
      if (business?.owner_id) {
        await admin.from("notifications").insert({
          user_id: business.owner_id,
          type: "order_paid",
          title: "New paid order",
          body: `Payment is secured for order #${payment.order_id.slice(0, 8)}. You can now review and accept it.`,
          link: `/business/orders/${payment.order_id}`,
        });
      }
    }
  }

  await admin
    .from("payment_webhook_events")
    .update({ processed_at: now })
    .eq("provider", "tradesafe")
    .eq("external_event_id", eventId);

  return json({ ok: true });
});

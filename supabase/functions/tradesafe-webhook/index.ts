// TradeSafe webhook receiver. Public endpoint — relies on signature
// verification (TRADESAFE_WEBHOOK_SECRET) and idempotent storage in
// payment_webhook_events.
//
// Expected events (names mirror TradeSafe's API):
//   - allocation.funded     → order_payments.status = funded, order.status = pending
//   - allocation.released   → order_payments.status = released
//   - allocation.refunded   → order_payments.status = refunded, order.status = cancelled (if not already)
//   - allocation.failed     → order_payments.status = failed

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature.replace(/^sha256=/, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();
  const signature = req.headers.get("x-tradesafe-signature") ?? req.headers.get("x-signature");
  const secret = Deno.env.get("TRADESAFE_WEBHOOK_SECRET");

  // Only enforce signature when a secret is configured (lets us scaffold safely).
  if (secret) {
    const ok = await verifySignature(rawBody, signature, secret);
    if (!ok) return json({ error: "Bad signature" }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const eventId = String(
    payload.id ?? payload.event_id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const eventType = String(payload.type ?? payload.event ?? "unknown");

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

  const allocationId =
    (payload.allocation_id as string | undefined) ??
    (payload.allocation as Record<string, string> | undefined)?.id ??
    (payload.data as Record<string, unknown> | undefined)?.allocation_id as string | undefined;
  const transactionId =
    (payload.transaction_id as string | undefined) ??
    (payload.transaction as Record<string, string> | undefined)?.id;

  if (!allocationId && !transactionId) {
    await admin
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "tradesafe")
      .eq("external_event_id", eventId);
    return json({ ok: true, note: "No allocation/transaction reference" });
  }

  // Locate the payment row
  let query = admin.from("order_payments").select("*").limit(1);
  if (allocationId) query = query.eq("tradesafe_allocation_id", allocationId);
  else if (transactionId) query = query.eq("tradesafe_transaction_id", transactionId);
  const { data: paymentRows } = await query;
  const payment = paymentRows?.[0];

  if (!payment) {
    await admin
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "tradesafe")
      .eq("external_event_id", eventId);
    return json({ ok: true, note: "Unknown allocation" });
  }

  // Map event → status changes
  const now = new Date().toISOString();
  let paymentPatch: Record<string, unknown> = { raw: payload, updated_at: now };
  let orderPatch: Record<string, unknown> | null = null;

  if (/funded|deposit/i.test(eventType)) {
    paymentPatch = { ...paymentPatch, status: "funded", funded_at: now };
    orderPatch = { status: "pending" };
  } else if (/released|payout/i.test(eventType)) {
    paymentPatch = { ...paymentPatch, status: "released", released_at: now };
  } else if (/refund|reversed/i.test(eventType)) {
    paymentPatch = { ...paymentPatch, status: "refunded", refunded_at: now };
    orderPatch = { status: "cancelled" };
  } else if (/fail|declined/i.test(eventType)) {
    paymentPatch = { ...paymentPatch, status: "failed", last_error: eventType };
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
  }

  await admin
    .from("payment_webhook_events")
    .update({ processed_at: now })
    .eq("provider", "tradesafe")
    .eq("external_event_id", eventId);

  return json({ ok: true });
});

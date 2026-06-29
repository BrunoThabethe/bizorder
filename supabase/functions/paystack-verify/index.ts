// Lightweight verify endpoint called by the success-redirect page so the
// customer sees a confirmed state even if the webhook is still in flight.

import { corsHeaders, json, paystackVerify } from "../_shared/paystack.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    let reference: string | null = null;
    if (req.method === "GET") {
      reference = new URL(req.url).searchParams.get("reference");
    } else {
      const body = await req.json().catch(() => ({}));
      reference = body?.reference ?? null;
    }
    if (!reference) return json(400, { error: "reference required" });

    const data = await paystackVerify(reference);
    return json(200, {
      status: data.status,
      reference: data.reference,
      amount: Number(data.amount ?? 0) / 100,
      metadata: data.metadata ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verify error";
    return json(500, { error: message });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const CallbackSchema = z.object({
  id: z.string().min(1).max(255),
  reference: z.string().max(255).optional().nullable(),
  state: z.string().min(1).max(64),
  balance: z.number().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function mapStateToStatus(state: string): string | null {
  const s = state.toUpperCase();
  if (s === "FUNDS_RECEIVED") return "paid";
  if (s === "FUNDS_RELEASED") return "completed";
  if (s === "CANCELLED" || s === "CANCELED") return "cancelled";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ received: true }, 200);
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 50_000) {
      return json({ received: true }, 200);
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody || "{}");
    } catch {
      return json({ received: true }, 200);
    }

    const parsed = CallbackSchema.safeParse(decoded);
    if (!parsed.success) {
      return json({ received: true }, 200);
    }

    const { id, state } = parsed.data;
    const newStatus = mapStateToStatus(state);

    if (!newStatus) {
      return json({ received: true }, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase credentials not configured for tradesafe-callback");
      return json({ received: true }, 200);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: findError } = await admin
      .from("orders")
      .select("id, status")
      .eq("tradesafe_transaction_id", id)
      .maybeSingle();

    if (findError) {
      console.error("Error finding order:", findError.message);
      return json({ received: true }, 200);
    }

    if (!order) {
      return json({ received: true }, 200);
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError.message);
    }

    return json({ received: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error in tradesafe-callback:", message);
    return json({ received: true }, 200);
  }
});

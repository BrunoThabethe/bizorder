// Releases escrowed funds to the provider. Called by the customer (or admin)
// after customer_confirm_completion has set the order to "completed".

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { getTradeSafeAccessToken, tradeSafeGraphQl } from "../_shared/tradesafe.ts";

const BodySchema = z.object({ order_id: z.string().uuid() });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
  const userId = authData.user.id;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { order_id } = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE);

  // Caller must be the customer on the order OR an admin
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status")
    .eq("id", order_id)
    .maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);

  let allowed = order.customer_id === userId;
  if (!allowed) {
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    allowed = !!roles?.some((r) => r.role === "admin");
  }
  if (!allowed) return json({ error: "Not allowed" }, 403);

  if (order.status !== "completed") {
    return json({ error: "Order must be completed before releasing funds" }, 409);
  }

  const { data: payment } = await admin
    .from("order_payments")
    .select("*")
    .eq("order_id", order_id)
    .maybeSingle();
  if (!payment) return json({ error: "No payment found for this order" }, 404);
  if (payment.status === "released") return json({ ok: true, already_released: true });
  if (payment.status !== "funded") {
    return json({ error: `Payment is ${payment.status}, cannot release` }, 409);
  }

  try {
    if (!payment.tradesafe_allocation_id) return json({ error: "TradeSafe allocation is missing" }, 409);
    const accessToken = await getTradeSafeAccessToken();
    await tradeSafeGraphQl<{ allocationAcceptDelivery: { id: string; state: string } }>(
      accessToken,
      `mutation AcceptDelivery($id: ID!) {
        allocationAcceptDelivery(id: $id) { id state }
      }`,
      { id: payment.tradesafe_allocation_id },
    );

    // The webhook will also confirm; mark optimistically so the UI updates fast.
    await admin
      .from("order_payments")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", payment.id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "TradeSafe release failed" }, 502);
  }
});

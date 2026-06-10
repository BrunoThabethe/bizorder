// Releases escrowed funds to the provider. Called by the customer (or admin)
// after customer_confirm_completion has set the order to "completed".

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

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
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

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

  const CLIENT_ID = Deno.env.get("TRADESAFE_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("TRADESAFE_CLIENT_SECRET");
  const TS_API = Deno.env.get("TRADESAFE_API_URL") ?? "https://api-sit.tradesafe.co.za";

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json(
      {
        configured: false,
        message: "TradeSafe is not configured yet — funds cannot be released.",
      },
      503,
    );
  }

  try {
    const tokenRes = await fetch(`${TS_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) return json({ error: "TradeSafe auth failed" }, 502);
    const { access_token } = await tokenRes.json();

    const gql = {
      query: `
        mutation Release($id: ID!) {
          allocationRelease(id: $id) { id state }
        }
      `,
      variables: { id: payment.tradesafe_allocation_id },
    };
    const releaseRes = await fetch(`${TS_API}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(gql),
    });
    const releaseJson = await releaseRes.json();
    if (!releaseRes.ok || releaseJson.errors) {
      return json({ error: "TradeSafe release failed", detail: releaseJson.errors ?? releaseJson }, 502);
    }

    // The webhook will also confirm; mark optimistically so the UI updates fast.
    await admin
      .from("order_payments")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", payment.id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

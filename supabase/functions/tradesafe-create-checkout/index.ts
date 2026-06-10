// Creates a TradeSafe escrow transaction + allocation for an order
// and returns a checkout URL the customer is redirected to.
//
// Scaffolded: if TRADESAFE_CLIENT_ID / TRADESAFE_CLIENT_SECRET are not set,
// returns 503 with a friendly message so the UI can show "payment not
// configured yet" during development.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  return_url: z.string().url().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { order_id, return_url } = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE);

  // Confirm the order belongs to the caller and is awaiting payment
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, customer_id, business_id, total, currency, status, businesses(name, owner_id, email)")
    .eq("id", order_id)
    .maybeSingle();

  if (orderErr) return json({ error: orderErr.message }, 400);
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.customer_id !== userId) return json({ error: "Not allowed" }, 403);
  if (order.status !== "awaiting_payment") {
    return json({ error: `Order is ${order.status}, cannot start payment` }, 409);
  }

  // Read fee split from system_settings
  const { data: settings } = await admin
    .from("system_settings")
    .select("key, value")
    .in("key", [
      "tradesafe_fee_split_customer_pct",
      "tradesafe_fee_split_business_pct",
    ]);
  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const feeCustomerPct = Number(settingsMap.tradesafe_fee_split_customer_pct ?? "50");
  const feeBusinessPct = Number(settingsMap.tradesafe_fee_split_business_pct ?? "50");

  const CLIENT_ID = Deno.env.get("TRADESAFE_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("TRADESAFE_CLIENT_SECRET");
  const TS_API = Deno.env.get("TRADESAFE_API_URL") ?? "https://api-sit.tradesafe.co.za";

  // No creds yet: scaffold mode. Still create the payment row so the UI flow can be tested.
  if (!CLIENT_ID || !CLIENT_SECRET) {
    await admin
      .from("order_payments")
      .upsert(
        {
          order_id,
          provider: "tradesafe",
          status: "pending",
          amount: order.total,
          currency: order.currency,
          fee_customer: (Number(order.total) * feeCustomerPct) / 100,
          fee_business: (Number(order.total) * feeBusinessPct) / 100,
          last_error: "TradeSafe not configured",
        },
        { onConflict: "order_id" },
      );
    return json(
      {
        configured: false,
        message:
          "TradeSafe is not configured yet. Add TRADESAFE_CLIENT_ID and TRADESAFE_CLIENT_SECRET secrets to enable checkout.",
      },
      503,
    );
  }

  try {
    // 1. OAuth token
    const tokenRes = await fetch(`${TS_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return json({ error: "TradeSafe auth failed", detail: txt }, 502);
    }
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token as string;

    // 2. Create a transaction with allocation via GraphQL
    // NOTE: This GraphQL document follows the TradeSafe public schema as of 2025.
    // Adjust field names if your account's schema differs.
    const business = (order as unknown as { businesses: { name: string; owner_id: string; email: string | null } }).businesses;
    const description = `BizOrder #${order_id.slice(0, 8)} — ${business?.name ?? "Service"}`;

    const gql = {
      query: `
        mutation CreateTx($input: TransactionInput!) {
          transactionCreate(input: $input) {
            id
            allocations { id }
          }
        }
      `,
      variables: {
        input: {
          title: description,
          description,
          industry: "GENERAL_GOODS_SERVICES",
          currency: order.currency,
          feeAllocation: "SELLER", // base fee — fine-tune later if needed
          allocations: {
            create: [
              {
                title: description,
                value: Number(order.total),
                daysToDeliver: 7,
                daysToInspect: 1,
              },
            ],
          },
        },
      },
    };

    const gqlRes = await fetch(`${TS_API}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(gql),
    });
    const gqlJson = await gqlRes.json();
    if (!gqlRes.ok || gqlJson.errors) {
      return json({ error: "TradeSafe transaction failed", detail: gqlJson.errors ?? gqlJson }, 502);
    }

    const tx = gqlJson.data?.transactionCreate;
    const txId = tx?.id;
    const allocId = tx?.allocations?.[0]?.id;
    const checkoutUrl =
      `https://app${TS_API.includes("sit") ? "-sit" : ""}.tradesafe.co.za/checkout/${txId}` +
      (return_url ? `?return=${encodeURIComponent(return_url)}` : "");

    await admin.from("order_payments").upsert(
      {
        order_id,
        provider: "tradesafe",
        status: "pending",
        tradesafe_transaction_id: txId,
        tradesafe_allocation_id: allocId,
        checkout_url: checkoutUrl,
        amount: order.total,
        currency: order.currency,
        fee_customer: (Number(order.total) * feeCustomerPct) / 100,
        fee_business: (Number(order.total) * feeBusinessPct) / 100,
      },
      { onConflict: "order_id" },
    );

    return json({ configured: true, checkout_url: checkoutUrl, transaction_id: txId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

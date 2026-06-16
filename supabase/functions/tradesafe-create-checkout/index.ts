import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import {
  getTradeSafeAccessToken,
  splitName,
  tradeSafeGraphQl,
} from "../_shared/tradesafe.ts";

const BodySchema = z.object({
  order_id: z.string().uuid(),
});

type TradeSafeToken = { id: string };
type TradeSafeTransaction = { id: string; allocations: Array<{ id: string }> };

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
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
  const userId = authData.user.id;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { order_id } = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE);

  // Confirm the order belongs to the caller and is awaiting payment
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, customer_id, business_id, total, currency, status, businesses(name, owner_id, email, tradesafe_token_id)")
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

  try {
    const accessToken = await getTradeSafeAccessToken();
    const business = order.businesses as unknown as {
      name: string;
      owner_id: string;
      email: string | null;
      tradesafe_token_id: string | null;
    };
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("full_name, email, phone, tradesafe_token_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "Customer profile not found" }, 400);

    let buyerTokenId = profile.tradesafe_token_id;
    if (!buyerTokenId) {
      if (!profile.phone) {
        return json({ error: "Add a mobile number to your profile before paying with TradeSafe." }, 400);
      }
      const { givenName, familyName } = splitName(profile.full_name || "BizOrder Customer");
      const tokenData = await tradeSafeGraphQl<{ tokenCreate: TradeSafeToken }>(
        accessToken,
        `mutation CreateToken($input: TokenInput) {
          tokenCreate(input: $input) { id }
        }`,
        {
          input: {
            user: {
              givenName,
              familyName,
              email: profile.email,
              mobile: profile.phone,
            },
          },
        },
      );
      buyerTokenId = tokenData.tokenCreate.id;
      await admin.from("profiles").update({ tradesafe_token_id: buyerTokenId }).eq("id", userId);
    }

    let sellerTokenId = business.tradesafe_token_id;
    if (!sellerTokenId) {
      // Per TradeSafe Quick Start: the API owner's token comes from apiProfile.
      const profileData = await tradeSafeGraphQl<{
        apiProfile: {
          token?: string | null;
          organizations?: Array<{ name?: string | null; token?: string | null }> | null;
        };
      }>(
        accessToken,
        `query ApiProfile { apiProfile { token organizations { name token } } }`,
        {},
      );
      sellerTokenId =
        profileData.apiProfile.token ??
        profileData.apiProfile.organizations?.find((org) => org?.token)?.token ??
        null;
      if (!sellerTokenId) return json({ error: "No TradeSafe seller token is available for this application." }, 503);
      await admin.from("businesses").update({ tradesafe_token_id: sellerTokenId }).eq("id", order.business_id);
    }

    const description = `BizOrder #${order_id.slice(0, 8)} — ${business?.name ?? "Service"}`;
    const transactionData = await tradeSafeGraphQl<{ transactionCreate: TradeSafeTransaction }>(
      accessToken,
      `mutation CreateTransaction($input: TransactionInput) {
        transactionCreate(input: $input) { id allocations { id } }
      }`,
      {
        input: {
          title: description,
          description,
          industry: "GENERAL_GOODS_SERVICES",
          currency: order.currency,
          feeAllocation: "SELLER",
          reference: order_id,
          allocations: {
            create: [
              {
                title: description,
                description,
                value: Number(order.total),
                daysToDeliver: 7,
                daysToInspect: 1,
              },
            ],
          },
          parties: {
            create: [
              { token: buyerTokenId, role: "BUYER" },
              { token: sellerTokenId, role: "SELLER" },
            ],
          },
        },
      },
    );
    const tx = transactionData.transactionCreate;
    const checkoutData = await tradeSafeGraphQl<{ checkoutLink: string }>(
      accessToken,
      `mutation CheckoutLink($transactionId: ID!) { checkoutLink(transactionId: $transactionId) }`,
      { transactionId: tx.id },
    );
    const checkoutUrl = checkoutData.checkoutLink;

    await admin.from("order_payments").upsert(
      {
        order_id,
        provider: "tradesafe",
        status: "pending",
        tradesafe_transaction_id: tx.id,
        tradesafe_allocation_id: tx.allocations[0]?.id ?? null,
        checkout_url: checkoutUrl,
        amount: order.total,
        currency: order.currency,
        fee_customer: (Number(order.total) * feeCustomerPct) / 100,
        fee_business: (Number(order.total) * feeBusinessPct) / 100,
      },
      { onConflict: "order_id" },
    );

    return json({ configured: true, checkout_url: checkoutUrl, transaction_id: tx.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "TradeSafe checkout failed";
    await admin.from("order_payments").upsert({
      order_id,
      provider: "tradesafe",
      status: "failed",
      amount: order.total,
      currency: order.currency,
      fee_customer: (Number(order.total) * feeCustomerPct) / 100,
      fee_business: (Number(order.total) * feeBusinessPct) / 100,
      last_error: message.slice(0, 500),
    }, { onConflict: "order_id" });
    return json({ error: message }, 502);
  }
});

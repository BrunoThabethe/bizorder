// Securely create / manage a business's Paystack subaccount.
// Actions: list_banks | resolve_account | create | get
// All Paystack calls happen server-side; the secret key never leaves this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  ANON_KEY,
  PAYSTACK_SECRET_KEY,
  SERVICE_KEY,
  SUPABASE_URL,
  corsHeaders,
  json,
} from "../_shared/paystack.ts";

interface BodyBase {
  action: "list_banks" | "resolve_account" | "create" | "get";
}
interface ResolveBody extends BodyBase {
  action: "resolve_account";
  account_number: string;
  bank_code: string;
}
interface CreateBody extends BodyBase {
  action: "create";
  business_id: string;
  business_name: string;
  settlement_bank: string; // bank code
  account_number: string;
  primary_contact_email?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
}
interface GetBody extends BodyBase {
  action: "get";
  business_id: string;
}

type Body = BodyBase | ResolveBody | CreateBody | GetBody;

async function paystackGET(path: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.status) {
    throw new Error(data?.message ?? `Paystack GET ${path} failed (${res.status})`);
  }
  return data.data;
}

async function paystackPOST(path: string, body: unknown) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data?.status) {
    throw new Error(data?.message ?? `Paystack POST ${path} failed (${res.status})`);
  }
  return data.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!PAYSTACK_SECRET_KEY) return json(500, { error: "Paystack not configured" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing auth" });

  // Identify caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "Invalid session" });
  const userId = userData.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    switch (body.action) {
      case "list_banks": {
        const banks = await paystackGET("/bank?country=south%20africa&currency=ZAR");
        return json(200, { banks });
      }

      case "resolve_account": {
        const b = body as ResolveBody;
        if (!/^\d{6,20}$/.test(b.account_number ?? "")) {
          return json(400, { error: "Invalid account number" });
        }
        if (!b.bank_code) return json(400, { error: "Missing bank code" });
        const data = await paystackGET(
          `/bank/resolve?account_number=${encodeURIComponent(b.account_number)}&bank_code=${encodeURIComponent(b.bank_code)}`,
        );
        return json(200, { account_name: data.account_name, account_number: data.account_number });
      }

      case "get": {
        const b = body as GetBody;
        const { data: biz } = await admin
          .from("businesses")
          .select("id, owner_id, paystack_subaccount_code")
          .eq("id", b.business_id)
          .maybeSingle();
        if (!biz || biz.owner_id !== userId) return json(403, { error: "Forbidden" });
        return json(200, { subaccount_code: biz.paystack_subaccount_code ?? null });
      }

      case "create": {
        const b = body as CreateBody;
        if (!b.business_id || !b.business_name || !b.settlement_bank || !b.account_number) {
          return json(400, { error: "Missing required fields" });
        }
        if (!/^\d{6,20}$/.test(b.account_number)) {
          return json(400, { error: "Invalid account number" });
        }
        if (b.business_name.length > 200) return json(400, { error: "Business name too long" });

        // Ownership + verification check
        const { data: biz, error: bizErr } = await admin
          .from("businesses")
          .select("id, owner_id, is_verified, is_onboarded, paystack_subaccount_code")
          .eq("id", b.business_id)
          .maybeSingle();
        if (bizErr || !biz) return json(404, { error: "Business not found" });
        if (biz.owner_id !== userId) return json(403, { error: "Forbidden" });
        if (!biz.is_verified || !biz.is_onboarded) {
          return json(403, { error: "Business must be verified before payout setup" });
        }
        if (biz.paystack_subaccount_code) {
          return json(200, { subaccount_code: biz.paystack_subaccount_code, already: true });
        }

        // Resolve account to lock in the real name before creating
        let resolvedName: string | null = null;
        try {
          const resolved = await paystackGET(
            `/bank/resolve?account_number=${encodeURIComponent(b.account_number)}&bank_code=${encodeURIComponent(b.settlement_bank)}`,
          );
          resolvedName = resolved?.account_name ?? null;
        } catch (e) {
          return json(400, { error: `Could not verify bank account: ${(e as Error).message}` });
        }

        // percentage_charge on the subaccount is the platform's share Paystack auto-splits.
        // We set 0 here because our paystack-init sends an explicit transaction_charge
        // (computed from PAYSTACK_PLATFORM_COMMISSION_BPS). Avoids double-charging.
        const created = await paystackPOST("/subaccount", {
          business_name: b.business_name.slice(0, 200),
          settlement_bank: b.settlement_bank,
          account_number: b.account_number,
          percentage_charge: 0,
          primary_contact_email: b.primary_contact_email,
          primary_contact_name: b.primary_contact_name ?? resolvedName ?? undefined,
          primary_contact_phone: b.primary_contact_phone,
          metadata: { business_id: b.business_id, owner_id: userId },
        });

        const subaccountCode = created?.subaccount_code as string | undefined;
        if (!subaccountCode) return json(502, { error: "Paystack did not return a subaccount code" });

        const { error: upErr } = await admin
          .from("businesses")
          .update({ paystack_subaccount_code: subaccountCode })
          .eq("id", b.business_id);
        if (upErr) return json(500, { error: `Saved subaccount but could not store code: ${upErr.message}` });

        return json(200, {
          subaccount_code: subaccountCode,
          account_name: resolvedName,
        });
      }

      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    console.error("paystack-subaccount error", e);
    return json(500, { error: (e as Error).message ?? "Internal error" });
  }
});

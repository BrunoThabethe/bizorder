// Shared Paystack helpers used by paystack-init, paystack-webhook, paystack-verify.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
export const COMMISSION_BPS = Number(
  Deno.env.get("PAYSTACK_PLATFORM_COMMISSION_BPS") ?? "500",
);

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SUCCESS_PATH = "/payment/success";
const FAILURE_PATH = "/payment/error";

export const successUrl = (origin: string) => `${origin}${SUCCESS_PATH}`;
export const failureUrl = (origin: string) => `${origin}${FAILURE_PATH}`;

// Amount in major units (ZAR) -> kobo (cents) for Paystack.
export const toKobo = (amount: number) => Math.round(amount * 100);

// Platform fee in kobo from major-unit total.
export const commissionKobo = (amount: number) =>
  Math.floor((toKobo(amount) * COMMISSION_BPS) / 10000);

export type TransactionType = "booking" | "quote_payment" | "adjustment";

export interface InitMetadata {
  order_id: string | null;
  service_id: string | null;
  business_id: string;
  customer_id: string;
  service_type: string | null;
  transaction_type: TransactionType;
  quote_id?: string | null;
  adjustment_id?: string | null;
  tier_id?: string | null;
}

export interface InitArgs {
  email: string;
  amount: number;
  reference: string;
  subaccount: string | null;
  metadata: InitMetadata;
  callbackUrl: string;
}

export async function paystackInit(args: InitArgs) {
  const body: Record<string, unknown> = {
    email: args.email,
    amount: toKobo(args.amount),
    reference: args.reference,
    callback_url: args.callbackUrl,
    metadata: args.metadata,
    currency: "ZAR",
  };

  if (args.subaccount) {
    body.subaccount = args.subaccount;
    body.bearer = "subaccount";
    body.transaction_charge = commissionKobo(args.amount);
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json();
  if (!res.ok || !payload?.status) {
    throw new Error(payload?.message ?? `Paystack init failed (${res.status})`);
  }
  return payload.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function paystackVerify(reference: string) {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  const payload = await res.json();
  if (!res.ok || !payload?.status) {
    throw new Error(payload?.message ?? `Paystack verify failed (${res.status})`);
  }
  return payload.data;
}

// HMAC-SHA512 of raw body, hex-encoded, compared to x-paystack-signature.
export async function verifySignature(raw: string, signature: string | null) {
  if (!signature || !PAYSTACK_SECRET_KEY) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(raw),
  );
  const hex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature.toLowerCase();
}

export const newReference = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;

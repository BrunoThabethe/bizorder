import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

async function sendEmail(to: string, code: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "BizOrder", email: "thabethebruno@legendarysolutions.co.za" },
      to: [{ email: to }],
      subject: `Your BizOrder verification code: ${code}`,
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0F172A;color:#fff;padding:32px;border-radius:12px;max-width:480px;margin:auto">
          <h1 style="font-family:'Space Grotesk',sans-serif;color:#D9A957;margin:0 0 12px">Verify your email</h1>
          <p style="opacity:.8;margin:0 0 24px">Enter this code to finish creating your BizOrder account. It expires in 15 minutes.</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;background:#1E293B;padding:20px;border-radius:8px;text-align:center">${code}</div>
          <p style="opacity:.6;font-size:12px;margin-top:24px">If you didn't try to sign up, you can ignore this email.</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  }
}

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s) && s.length <= 255;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!isEmail(email)) return json(400, { error: "Enter a valid email" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "request") {
      // Block if the email is already registered.
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      // Not all SDK versions expose filter; do a simple manual check:
      const { data: list } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);
      if (list && list.length > 0) {
        return json(409, { error: "An account with that email already exists. Please sign in." });
      }
      void existing;

      const { data: code, error } = await admin.rpc("issue_signup_otp", { _email: email });
      if (error || !code) return json(500, { error: error?.message ?? "Could not issue code" });
      await sendEmail(email, code as string);
      return json(200, { ok: true });
    }

    if (action === "verify") {
      const codeInput = String(body?.code ?? "").trim();
      const password = String(body?.password ?? "");
      const payload = (body?.payload ?? {}) as Record<string, unknown>;

      if (!/^\d{6}$/.test(codeInput)) return json(400, { error: "Enter the 6-digit code" });
      if (password.length < 8 || password.length > 128) return json(400, { error: "Password is invalid" });

      const role = payload.role === "business" ? "business" : "customer";
      const fullName = typeof payload.full_name === "string" ? payload.full_name.slice(0, 100) : "";
      const phone = typeof payload.phone === "string" ? payload.phone.slice(0, 20) : "";
      const businessName = typeof payload.business_name === "string" ? payload.business_name.slice(0, 120) : null;
      const businessCategory = typeof payload.business_category === "string" ? payload.business_category.slice(0, 60) : null;
      const businessAddress = typeof payload.business_address === "string" ? payload.business_address.slice(0, 240) : null;
      const marketingOptIn = payload.marketing_opt_in === true;

      const { data: ok, error } = await admin.rpc("verify_signup_otp", {
        _email: email,
        _code: codeInput,
      });
      if (error) return json(500, { error: error.message });
      if (!ok) return json(400, { error: "Invalid or expired code" });

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone,
          role,
          business_name: businessName,
          business_category: businessCategory,
          business_address: businessAddress,
          marketing_opt_in: marketingOptIn,
          data_consent_accepted_at: new Date().toISOString(),
        },
      });
      if (createErr || !created?.user) {
        return json(500, { error: createErr?.message ?? "Could not create account" });
      }

      return json(200, { ok: true, role });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

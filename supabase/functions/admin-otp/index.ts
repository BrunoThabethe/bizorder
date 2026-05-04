import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

class EmailDeliveryError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = code;
  }
}

type AdminOtpBody =
  | { action: "request" }
  | { action: "verify"; code: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBody = async (req: Request): Promise<AdminOtpBody | null> => {
  const body: unknown = await req.json().catch(() => null);
  if (!isRecord(body)) return null;

  if (body.action === "request") return { action: "request" };
  if (body.action === "verify") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    return { action: "verify", code };
  }

  return null;
};

async function sendEmail(to: string, code: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "BizOrder Security", email: "no-reply@bizorder.app" },
      to: [{ email: to }],
      subject: `Your admin sign-in code: ${code}`,
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0F172A;color:#fff;padding:32px;border-radius:12px;max-width:480px;margin:auto">
          <h1 style="font-family:'Space Grotesk',sans-serif;color:#34D399;margin:0 0 12px">Admin sign-in code</h1>
          <p style="opacity:.8;margin:0 0 24px">Use this code to finish signing in. It expires in 10 minutes.</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;background:#1E293B;padding:20px;border-radius:8px;text-align:center">${code}</div>
          <p style="opacity:.6;font-size:12px;margin-top:24px">If you did not try to sign in, change your password immediately.</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    const providerMessage = await res.text();
    if (res.status === 401 && /unrecognised IP address/i.test(providerMessage)) {
      throw new EmailDeliveryError(
        "Brevo is still blocking the server that sends admin codes. Disable API authorised IP restrictions in Brevo security settings; browser application restrictions do not affect Supabase Edge Functions.",
        "brevo_ip_blocked",
      );
    }

    throw new EmailDeliveryError(
      "The email provider rejected the admin code request. Check the sender, API key, and provider security settings.",
      "email_provider_rejected",
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing auth" });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { error: "Not signed in" });

    const body = await readBody(req);
    if (!body) return json(400, { ok: false, error: "Invalid request" });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Confirm admin role
    const { data: hasAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json(403, { error: "Not an admin" });

    if (body.action === "request") {
      const { data: code, error } = await admin.rpc("admin_issue_otp", { _user_id: user.id });
      if (error || !code) return json(500, { error: error?.message ?? "Could not issue code" });
      if (!user.email) return json(400, { ok: false, error: "This admin account has no email address" });
      try {
        await sendEmail(user.email, code as string);
      } catch (err) {
        if (err instanceof EmailDeliveryError) return json(200, { ok: false, code: err.code, error: err.message });
        throw err;
      }
      return json(200, { ok: true });
    }

    if (body.action === "verify") {
      const codeInput = body.code;
      if (!/^\d{6}$/.test(codeInput)) return json(200, { ok: false, error: "Enter the 6-digit code" });
      const { data: ok, error } = await admin.rpc("admin_verify_otp", {
        _user_id: user.id,
        _code: codeInput,
      });
      if (error) return json(500, { error: error.message });
      if (!ok) return json(200, { ok: false, error: "Invalid or expired code" });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

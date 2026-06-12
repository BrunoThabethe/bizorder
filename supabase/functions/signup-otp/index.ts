import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Simple in-memory rate limiter: 5 attempts per 15 min per email.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count += 1;
  return true;
}

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
          <p style="opacity:.8;margin:0 0 24px">Use this 6-digit code to finish creating your BizOrder account. It expires in 15 minutes.</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;background:#1E293B;padding:20px;border-radius:8px;text-align:center">${code}</div>
          <p style="opacity:.6;font-size:12px;margin-top:24px">If you did not request this code, you can safely ignore this email.</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!EMAIL_RE.test(email) || email.length > 255) {
      return json(400, { error: "Enter a valid email" });
    }
    if (!rateLimit(email)) {
      return json(429, { error: "Too many attempts. Try again in 15 minutes." });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "request") {
      const password = String(body?.password ?? "");
      if (password.length < 8 || password.length > 128) {
        return json(400, { error: "Password must be 8-128 characters" });
      }
      const metadata = (body?.data && typeof body.data === "object") ? body.data : {};

      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: { data: metadata },
      });

      if (error || !data) {
        const msg = error?.message ?? "Could not create account";
        if (/already/i.test(msg) || /registered/i.test(msg)) {
          return json(409, { error: "This email is already registered. Try signing in." });
        }
        return json(400, { error: msg });
      }

      const code = (data.properties as { email_otp?: string } | null)?.email_otp;
      if (!code) return json(500, { error: "Could not generate verification code" });

      await sendEmail(email, code);
      return json(200, { ok: true });
    }

    if (action === "resend") {
      // Reissue an OTP for an existing unconfirmed signup.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password: String(body?.password ?? crypto.randomUUID()),
      });
      if (error || !data) {
        return json(400, { error: error?.message ?? "Could not resend code" });
      }
      const code = (data.properties as { email_otp?: string } | null)?.email_otp;
      if (!code) return json(500, { error: "Could not generate verification code" });
      await sendEmail(email, code);
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

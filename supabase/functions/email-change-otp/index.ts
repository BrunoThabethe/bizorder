import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
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
      subject: `Confirm your new BizOrder email: ${code}`,
      htmlContent: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0F172A;color:#fff;padding:32px;border-radius:12px;max-width:480px;margin:auto">
          <h1 style="font-family:'Space Grotesk',sans-serif;color:#34D399;margin:0 0 12px">Confirm your new email</h1>
          <p style="opacity:.8;margin:0 0 24px">Use this code to confirm this email belongs to you. It expires in 15 minutes.</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;background:#1E293B;padding:20px;border-radius:8px;text-align:center">${code}</div>
          <p style="opacity:.6;font-size:12px;margin-top:24px">If you did not request this, ignore this email.</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && /unrecognised IP address/i.test(body)) {
      throw new EmailDeliveryError(
        "Brevo blocked our server. Disable API authorised IP restrictions in Brevo security settings.",
        "brevo_ip_blocked",
      );
    }
    throw new EmailDeliveryError(`Email send failed: ${res.status} ${body}`, "email_send_failed");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing auth" });

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { error: "Not signed in" });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "request") {
      const newEmail = String(body?.new_email ?? "").trim().toLowerCase();
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 255) {
        return json(400, { ok: false, error: "Enter a valid email address." });
      }
      if (newEmail === user.email?.toLowerCase()) {
        return json(400, { ok: false, error: "That's already your email." });
      }
      const { data: code, error } = await admin.rpc("request_email_change", {
        _user_id: user.id,
        _new_email: newEmail,
      });
      if (error || !code) {
        return json(200, { ok: false, error: error?.message ?? "Could not issue code" });
      }
      try {
        await sendEmail(newEmail, code as string);
      } catch (e) {
        if (e instanceof EmailDeliveryError) {
          return json(200, { ok: false, code: e.code, error: e.message });
        }
        throw e;
      }
      return json(200, { ok: true });
    }

    if (action === "verify") {
      const codeInput = String(body?.code ?? "").trim();
      if (!/^\d{6}$/.test(codeInput)) {
        return json(400, { ok: false, error: "Enter the 6-digit code" });
      }
      const { data: newEmail, error } = await admin.rpc("verify_email_change", {
        _user_id: user.id,
        _code: codeInput,
      });
      if (error) return json(500, { ok: false, error: error.message });
      if (!newEmail) return json(200, { ok: false, error: "Invalid or expired code" });

      const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
        email: newEmail as string,
        email_confirm: true,
      });
      if (updateErr) {
        return json(500, { ok: false, error: updateErr.message });
      }
      return json(200, { ok: true, new_email: newEmail });
    }

    return json(400, { ok: false, error: "Unknown action" });
  } catch (err) {
    return json(500, { ok: false, error: (err as Error).message });
  }
});

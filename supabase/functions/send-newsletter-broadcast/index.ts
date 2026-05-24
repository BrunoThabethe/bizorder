import { z } from "https://esm.sh/zod@3.23.8";
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

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SENDER = {
  name: "BizOrder Nexus",
  email: "thabethebruno@legendarysolutions.co.za",
};

const BodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100_000),
  testEmail: z.string().trim().toLowerCase().email().max(160).optional(),
  saveAsCampaign: z.boolean().default(true),
  title: z.string().trim().max(160).optional(),
});

// 3 broadcasts / hour per admin
const hits = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 3;
const limited = (key: string) => {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > RATE_MAX;
};

const wrapHtml = (html: string) => `
<div style="font-family:Inter,Arial,sans-serif;background:#F8F4EC;color:#3A2C1F;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
    ${html}
    <hr style="border:none;border-top:1px solid #EADFCB;margin:28px 0 12px"/>
    <p style="margin:0;color:#7A6A55;font-size:12px;line-height:1.5">
      You're receiving this because you joined the BizOrder Nexus waitlist.
    </p>
  </div>
</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!BREVO_API_KEY) return json(500, { error: "Email service not configured" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const userId = userData.user.id;

    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json(403, { error: "Admin only" });

    if (limited(userId)) return json(429, { error: "Too many broadcasts, try again later" });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "Invalid input", issues: parsed.error.flatten() });
    const { subject, html, testEmail, saveAsCampaign, title } = parsed.data;

    const wrapped = wrapHtml(html);

    // ---- TEST MODE ----
    if (testEmail) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          sender: SENDER,
          to: [{ email: testEmail }],
          subject: `[TEST] ${subject}`,
          htmlContent: wrapped,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        return json(502, { error: "Test send failed", detail });
      }
      return json(200, { ok: true, mode: "test", sentTo: testEmail });
    }

    // ---- BROADCAST ----
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subs, error: subsErr } = await admin
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);
    if (subsErr) return json(500, { error: "Failed to load subscribers" });

    const recipients = (subs ?? [])
      .map((s: { email: string }) => s.email?.trim().toLowerCase())
      .filter((e: string): e is string => !!e && /.+@.+\..+/.test(e));

    if (recipients.length === 0) {
      return json(400, { error: "No active subscribers" });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Brevo: send one envelope per recipient (no leaked addresses), batched in parallel groups of 10
    const BATCH = 10;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const chunk = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map((email) =>
          fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": BREVO_API_KEY, "content-type": "application/json" },
            body: JSON.stringify({
              sender: SENDER,
              to: [{ email }],
              subject,
              htmlContent: wrapped,
            }),
          }).then(async (r) => {
            if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
            return true;
          }),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled") sent += 1;
        else {
          failed += 1;
          if (errors.length < 5) errors.push(String(r.reason));
        }
      }
    }

    if (saveAsCampaign) {
      await admin.from("ai_campaigns").insert({
        title: (title ?? subject).slice(0, 160),
        subject,
        prompt: null,
        body: html,
        status: "sent",
        recipients_count: sent,
        sent_at: new Date().toISOString(),
        created_by: userId,
      });
    }

    return json(200, { ok: true, mode: "broadcast", sent, failed, total: recipients.length, errors });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

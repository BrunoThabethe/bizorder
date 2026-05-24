import { z } from "https://esm.sh/zod@3.23.8";

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

const SENDER = {
  name: "BizOrder Nexus",
  email: "thabethebruno@legendarysolutions.co.za",
};

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
});

// naive in-memory rate limit: 5 / 15 min per IP
const hits = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
};

const htmlBody = (email: string) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#F8F4EC;color:#3A2C1F;padding:32px;border-radius:16px;max-width:520px;margin:auto">
    <h1 style="font-family:'Space Grotesk',sans-serif;color:#3A2C1F;margin:0 0 12px;font-size:28px">
      Welcome to BizOrder <span style="color:#D9A957">Nexus</span>
    </h1>
    <p style="margin:0 0 16px;line-height:1.6">
      Thanks for joining the waitlist. You're officially on the list — we'll send you
      early access, launch news, and founder-only perks before anyone else.
    </p>
    <div style="background:#F3E9D3;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0;font-weight:600">What happens next</p>
      <ul style="margin:8px 0 0;padding-left:18px;line-height:1.7">
        <li>Early invite to test the platform</li>
        <li>Founding member pricing</li>
        <li>First look at new tools and updates</li>
      </ul>
    </div>
    <p style="margin:24px 0 0;color:#6B5A48;font-size:13px">
      You're receiving this because you signed up with ${email}.
    </p>
  </div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!BREVO_API_KEY) return json(500, { error: "Email service not configured" });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      "unknown";
    if (isRateLimited(ip)) return json(429, { error: "Too many requests" });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "Invalid email" });
    const { email } = parsed.data;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email }],
        subject: "Welcome to BizOrder Nexus — you're on the list",
        htmlContent: htmlBody(email),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json(502, { error: "Email send failed", detail });
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

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

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  brief: z.string().trim().min(5).max(2000),
  tone: z.enum(["friendly", "professional", "promotional"]).default("friendly"),
  cta: z.string().trim().max(200).optional(),
});

// 20 / 15 min per user
const hits = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 20;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
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

    if (limited(userId)) return json(429, { error: "Too many requests" });
    if (!LOVABLE_API_KEY) return json(500, { error: "AI gateway not configured" });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "Invalid input", issues: parsed.error.flatten() });
    const { brief, tone, cta } = parsed.data;

    const { data: settings } = await sb
      .from("ai_assistant_settings")
      .select("model, system_prompt, temperature, max_tokens")
      .maybeSingle();

    const model = settings?.model ?? "google/gemini-2.5-flash";
    const baseSystem = (settings?.system_prompt as string | undefined) ??
      "You are BizOrder Nexus's email copywriter.";
    const system = `${baseSystem}
You write newsletter emails for the BizOrder Nexus waitlist audience.
Tone: ${tone}. Sentence case. No jargon. Scannable. Motivational.
Return ONLY a JSON object with keys "subject" (max 80 chars) and "html" (clean inline-styled HTML body, no <html>/<head> wrapper, use brand colors #3A2C1F text, #D9A957 accent, #F3E9D3 callouts, font-family Inter).
Do not include unsubscribe footer — it is added later.`;

    const userPrompt = `Brief: ${brief}${cta ? `\nCall to action: ${cta}` : ""}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: Number(settings?.temperature ?? 0.7),
        max_tokens: Number(settings?.max_tokens ?? 1500),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) return json(429, { error: "AI rate limit, try again shortly" });
    if (aiRes.status === 402) return json(402, { error: "AI credits exhausted" });
    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return json(502, { error: "AI request failed", detail });
    }

    const payload = await aiRes.json();
    const content = payload?.choices?.[0]?.message?.content ?? "{}";
    let draft: { subject?: string; html?: string } = {};
    try {
      draft = JSON.parse(content);
    } catch {
      return json(502, { error: "AI returned invalid JSON" });
    }

    return json(200, {
      subject: (draft.subject ?? "").slice(0, 200),
      html: draft.html ?? "",
    });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});

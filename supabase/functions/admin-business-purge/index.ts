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

async function purgeBucketPrefix(admin: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const { data: objects, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !objects?.length) return 0;
  const paths = objects.map((o) => `${prefix}/${o.name}`);
  await admin.storage.from(bucket).remove(paths);
  return paths.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { ok: false, error: "Missing auth" });

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { ok: false, error: "Not signed in" });

    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.business_id ?? "");
    if (!/^[0-9a-fA-F-]{36}$/.test(businessId)) {
      return json(400, { ok: false, error: "Invalid business id" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: hasAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json(403, { ok: false, error: "Not an admin" });

    // 1. Wipe storage prefixes first (safer if RPC fails afterwards)
    const mediaCount = await purgeBucketPrefix(admin, "business-media", businessId);
    const docsCount = await purgeBucketPrefix(admin, "verification-docs", businessId);

    // 2. Then run the database purge
    const { error } = await admin.rpc("admin_purge_business", { _business_id: businessId });
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true, removed_media: mediaCount, removed_docs: docsCount });
  } catch (err) {
    return json(500, { ok: false, error: (err as Error).message });
  }
});

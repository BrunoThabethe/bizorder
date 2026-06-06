// Auto-distance edge function: geocodes business + customer addresses via
// OpenStreetMap Nominatim (no API key) and returns the haversine distance in km.
// Requires an authenticated caller — protects Nominatim quota from anonymous abuse.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const geocode = async (q: string): Promise<{ lat: number; lon: number } | null> => {
  const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BizOrder/1.0 (distance-calc)" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
};

const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require an authenticated caller
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { from, to } = (await req.json()) as { from?: string; to?: string };
    if (!from || !to || from.length < 4 || to.length < 4 || from.length > 500 || to.length > 500) {
      return new Response(JSON.stringify({ error: "Both addresses required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [a, b] = await Promise.all([geocode(from), geocode(to)]);
    if (!a || !b) {
      return new Response(
        JSON.stringify({ error: "Could not locate one of the addresses." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const km = Math.round(haversineKm(a, b) * 10) / 10;
    return new Response(JSON.stringify({ km }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

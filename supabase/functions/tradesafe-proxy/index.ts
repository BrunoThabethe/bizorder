import { getTradeSafeAccessToken, tradeSafeGraphQl } from "../_shared/tradesafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const { query, variables } = await req.json();

    // Step 1: Get OAuth token using shared helper
    const accessToken = await getTradeSafeAccessToken();

    // Step 2: Run GraphQL query
    const data = await tradeSafeGraphQl(accessToken, query, variables ?? {});

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("TradeSafe proxy error:", message);
    return new Response(JSON.stringify({ errors: [{ message }] }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

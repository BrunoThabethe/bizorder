const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bizorder.co.za",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const { query, variables } = await req.json();

    const clientId = Deno.env.get("TRADESAFE_CLIENT_ID");
    const clientSecret = Deno.env.get("TRADESAFE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new Error("TradeSafe credentials are not configured");
    }

    const tokenForm = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch("https://auth.tradesafe.co.za/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenForm.toString(),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(
        `Failed to obtain TradeSafe token: ${tokenRes.status} ${JSON.stringify(tokenJson)}`,
      );
    }

    const gqlRes = await fetch("https://api-developer.tradesafe.dev/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const gqlJson = await gqlRes.json();
    return new Response(JSON.stringify(gqlJson), {
      status: gqlRes.status,
      headers: jsonHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});

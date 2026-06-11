const AUTH_URL = "https://auth.tradesafe.co.za/oauth/token";

export type GraphQlResult<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export const getTradeSafeAccessToken = async () => {
  const clientId = Deno.env.get("TRADESAFE_CLIENT_ID");
  const clientSecret = Deno.env.get("TRADESAFE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("TradeSafe credentials are not configured");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`TradeSafe authentication failed (${response.status})`);
  const parsed = JSON.parse(raw) as { access_token?: unknown };
  if (typeof parsed.access_token !== "string") throw new Error("TradeSafe did not return an access token");
  return parsed.access_token;
};

export const getTradeSafeGraphQlUrl = () => {
  const configured = Deno.env.get("TRADESAFE_API_URL") ?? "https://api.tradesafe.co.za";
  return configured.replace(/\/$/, "").replace(/\/graphql$/, "") + "/graphql";
};

export const tradeSafeGraphQl = async <T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
) => {
  const response = await fetch(getTradeSafeGraphQlUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const raw = await response.text();
  let parsed: GraphQlResult<T>;
  try {
    parsed = JSON.parse(raw) as GraphQlResult<T>;
  } catch {
    throw new Error(`TradeSafe returned an invalid response (${response.status})`);
  }
  if (!response.ok || parsed.errors?.length) {
    const message = parsed.errors?.map((error) => error.message).filter(Boolean).join("; ");
    throw new Error(message || `TradeSafe request failed (${response.status})`);
  }
  if (!parsed.data) throw new Error("TradeSafe returned no data");
  return parsed.data;
};

export const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    givenName: parts[0] ?? "BizOrder",
    familyName: parts.slice(1).join(" ") || "Customer",
  };
};
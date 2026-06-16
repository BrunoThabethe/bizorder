export type GraphQlResult<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

const getTradeSafeAuthUrl = () => {
  const explicit = Deno.env.get("TRADESAFE_AUTH_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  // Derive auth host from the configured API URL so sandbox ↔ production stay aligned.
  const apiUrl = Deno.env.get("TRADESAFE_API_URL") ?? "https://api.tradesafe.co.za";
  const isSandbox = /sandbox/i.test(apiUrl);
  return isSandbox
    ? "https://auth.sandbox.tradesafe.co.za/oauth/token"
    : "https://auth.tradesafe.co.za/oauth/token";
};

export const getTradeSafeAccessToken = async () => {
  const clientId = Deno.env.get("TRADESAFE_CLIENT_ID");
  const clientSecret = Deno.env.get("TRADESAFE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("TradeSafe credentials are not configured");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "auth",
  });
  const authUrl = getTradeSafeAuthUrl();
  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const raw = await response.text();
  if (!response.ok) {
    // Surface TradeSafe's error so we know whether it's invalid_client, invalid_scope, etc.
    const snippet = raw.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`TradeSafe authentication failed (${response.status}) at ${authUrl}: ${snippet}`);
  }
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
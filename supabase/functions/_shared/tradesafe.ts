export type GraphQlResult<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type TradeSafeEnv = "sandbox" | "production";

const normalizeEnv = (value: string | undefined): TradeSafeEnv | null => {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "sandbox" || v === "sbx" || v === "test" || v === "staging") return "sandbox";
  if (v === "production" || v === "prod" || v === "live") return "production";
  return null;
};

const inferEnvFromUrl = (url: string | undefined): TradeSafeEnv | null => {
  if (!url) return null;
  if (/sandbox|sbx|staging|test/i.test(url)) return "sandbox";
  if (/api\.tradesafe\.co\.za|auth\.tradesafe\.co\.za/i.test(url)) return "production";
  return null;
};

/**
 * Resolve and validate the TradeSafe environment. Throws if the configured
 * TRADESAFE_API_URL and the declared TRADESAFE_ENV disagree, so we fail fast
 * instead of attempting auth with a credential/URL mismatch.
 */
export const getTradeSafeEnv = (): TradeSafeEnv => {
  const apiUrl = Deno.env.get("TRADESAFE_API_URL");
  const declared = normalizeEnv(Deno.env.get("TRADESAFE_ENV"));
  const inferred = inferEnvFromUrl(apiUrl);

  if (declared && inferred && declared !== inferred) {
    throw new Error(
      `TradeSafe environment mismatch: TRADESAFE_ENV=${declared} but TRADESAFE_API_URL points to ${inferred}. ` +
        `Use ${declared} credentials with a ${declared} API URL (or vice versa).`,
    );
  }
  return declared ?? inferred ?? "production";
};

const getTradeSafeAuthUrl = (env: TradeSafeEnv) => {
  const explicit = Deno.env.get("TRADESAFE_AUTH_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  return env === "sandbox"
    ? "https://auth.sandbox.tradesafe.co.za/oauth/token"
    : "https://auth.tradesafe.co.za/oauth/token";
};

export const getTradeSafeAccessToken = async () => {
  const clientId = Deno.env.get("TRADESAFE_CLIENT_ID");
  const clientSecret = Deno.env.get("TRADESAFE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("TradeSafe credentials are not configured");

  const env = getTradeSafeEnv();
  const authUrl = getTradeSafeAuthUrl(env);

  // TradeSafe's accepted scope differs between tenants/environments.
  // Prefer an explicit TRADESAFE_SCOPE when configured; otherwise try no scope,
  // then fall back to wildcard scope if TradeSafe reports invalid_scope.
  const scope = Deno.env.get("TRADESAFE_SCOPE")?.trim();
  const requestedScopes = scope ? [scope] : [undefined, "*"];
  let raw = "";
  let response: Response | null = null;
  for (const requestedScope of requestedScopes) {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (requestedScope) body.set("scope", requestedScope);
    response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    raw = await response.text();
    if (response.ok || scope || !/invalid_scope/i.test(raw)) break;
  }
  if (!response) throw new Error("TradeSafe authentication did not return a response");
  if (!response.ok) {
    const snippet = raw.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(
      `TradeSafe authentication failed (${response.status}) for env=${env} at ${authUrl}: ${snippet}. ` +
        `Verify TRADESAFE_CLIENT_ID/SECRET are ${env} credentials.`,
    );
  }
  const parsed = JSON.parse(raw) as { access_token?: unknown };
  if (typeof parsed.access_token !== "string") throw new Error("TradeSafe did not return an access token");
  return parsed.access_token;
};

export const getTradeSafeGraphQlUrl = () => {
  const env = getTradeSafeEnv();
  const fallback = env === "sandbox" ? "https://api.sandbox.tradesafe.co.za" : "https://api.tradesafe.co.za";
  const configured = Deno.env.get("TRADESAFE_API_URL") ?? fallback;
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
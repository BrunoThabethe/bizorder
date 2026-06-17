# Secure TradeSafe credentials & fix "Payment setup unavailable"

## Important: rotate the credentials you just pasted

You shared the Client ID and Client Secret in chat. Anything pasted into chat should be treated as compromised. **Before anything else, log into the TradeSafe dashboard and rotate (regenerate) that client secret.** I'll then store the *new* secret using Lovable's secure secret form — never in chat, never in `.env`, never in the frontend bundle.

## Why not `.env`

TradeSafe credentials must only ever be used server-side (in the Supabase edge functions `tradesafe-create-checkout`, `tradesafe-webhook`, `tradesafe-release`, `tradesafe-expire-unpaid`). Anything placed in a frontend `.env` (Vite `VITE_*` vars) is bundled into the JavaScript that ships to every visitor's browser — that's worse than the current state. The correct home for these values is Lovable Cloud / Supabase edge function secrets, which are injected as environment variables only inside the edge runtime.

## Plan

1. **You rotate the secret in TradeSafe** and have the new Client ID + Client Secret ready (Client ID can stay the same if TradeSafe doesn't rotate it; only the secret must change).
2. I open the secure `add_secret` (or `update_secret`) form for these names — you paste the values directly into the form, not into chat:
   - `TRADESAFE_CLIENT_ID`
   - `TRADESAFE_CLIENT_SECRET`
   - `TRADESAFE_ENV` — set to `sandbox` or `production` so the env-check added previously can validate it against `TRADESAFE_API_URL`
3. I confirm via `fetch_secrets` that `TRADESAFE_API_URL` (and optionally `TRADESAFE_AUTH_URL`) point at the matching environment — sandbox creds → `https://api.sandbox.tradesafe.co.za`, production creds → `https://api.tradesafe.co.za`. If they don't match I'll flag it before we test.
4. Scan the repo (`rg`) for any hardcoded TradeSafe ID/secret/token strings and remove them if present. No code changes expected — the edge functions already read from `Deno.env`.
5. Trigger a checkout from the customer flow and tail `tradesafe-create-checkout` logs to confirm the 401 / "Payment setup unavailable" is gone.

## What I will NOT do

- Will not write the Client ID or Secret you pasted into any file, commit, or `.env`.
- Will not add `VITE_TRADESAFE_*` variables — those would leak to the browser.
- Will not change order/payment logic; this is purely a credentials + config fix.

Please rotate the secret in TradeSafe now and approve the plan — I'll then open the secure secret form for the new values.

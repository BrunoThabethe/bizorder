## Problem

Supabase's built-in signup OTP email is not being delivered. The admin OTP (Brevo-based) works fine. Replace the Supabase signup OTP with the same Brevo-powered pattern, then route customers to login and businesses to document verification.

## Approach

Mirror the `admin-otp` design with a new `signup-otp` edge function and a parallel DB table. Sign-up no longer calls `supabase.auth.signUp` from the browser. Instead:

1. User fills the signup form.
2. Frontend sends form data + email to `signup-otp { action: "request" }`. The function stores the pending signup payload, issues a 6-digit code, and emails it via Brevo (identical template/styling to admin OTP, just rebranded "verify your email").
3. User lands on `/verify-email` and enters the code. Frontend calls `signup-otp { action: "verify", code }`.
4. On success, the function uses the service-role key to create the auth user with `email_confirm: true` and the same `user_metadata` the existing `handle_new_user` trigger reads (so profile + role insert is unchanged). It returns `{ role }`.
5. Frontend then signs the user in with the password (already known on the verify page via a short-lived sessionStorage handoff) and routes:
   - `customer` → `/customer/dashboard`
   - `business` → `/business/onboarding` (document verification step)

## Technical details

### New DB objects (migration)

- Table `public.signup_otp_codes`:
  - `id uuid pk`, `email citext not null`, `code_hash text not null`, `payload jsonb not null` (signup metadata: full_name, phone, role, business_name, business_category, business_address, password_hash NOT stored — see below, marketing_opt_in, data_consent_accepted_at), `attempts int default 0`, `expires_at timestamptz`, `used_at timestamptz`, `created_at timestamptz default now()`.
  - RLS enabled, no policies (service-role only access via edge function).
  - No `GRANT` to anon/authenticated (function uses service role).
- RPC `issue_signup_otp(_email text, _payload jsonb) returns text` — SECURITY DEFINER, throttles to 3/hour per email, invalidates prior unused codes, returns the 6-digit code (hashed in table, plaintext returned to function only).
- RPC `verify_signup_otp(_email text, _code text) returns jsonb` — SECURITY DEFINER, returns the stored `payload` on success or `null`, marks `used_at`.

Password is **not** stored in the DB. To avoid persisting passwords, the frontend keeps the password in memory + `sessionStorage` (cleared after verify) and submits it again to `signup-otp { action: "verify" }`. The function uses service-role `admin.createUser({ email, password, email_confirm: true, user_metadata })`. This matches today's flow where the password already lives in the browser between signup and email confirmation.

### New edge function `supabase/functions/signup-otp/index.ts`

- `verify_jwt = false` (user is not signed in yet) — add to `config.toml`.
- CORS like other functions.
- Validates input with zod (email, password ≥ 8, role, etc.).
- `action: "request"` → calls `issue_signup_otp`, sends Brevo email (subject "Your BizOrder verification code: NNNNNN", same dark template as admin-otp but copy says "Verify your email to finish creating your account").
- `action: "verify"` → calls `verify_signup_otp`. On success, `supabase.auth.admin.createUser` with `email_confirm: true` and the full `user_metadata` payload the existing `handle_new_user` trigger expects. Returns `{ ok: true, role }`.
- Reuses the same Brevo secret `BREVO_API_KEY` already configured.

### Frontend changes

- `src/pages/SignupPage.tsx`:
  - Remove `supabase.auth.signUp` call.
  - Call `supabase.functions.invoke('signup-otp', { body: { action: 'request', email, password, payload: {...} } })`.
  - On success, stash `{ email, password, role }` in `sessionStorage` under `bizorder.pendingSignup` and navigate to `/verify-email?email=...`.
- `src/pages/VerifyEmailPage.tsx`:
  - Replace `supabase.auth.verifyOtp` with `supabase.functions.invoke('signup-otp', { body: { action: 'verify', email, password, code } })`.
  - Replace `supabase.auth.resend` with `signup-otp { action: 'request', ... }` using the stored payload.
  - On verify success: `supabase.auth.signInWithPassword({ email, password })`, clear sessionStorage, then `navigate` to `/customer/dashboard` or `/business/onboarding` based on returned role.

### What is removed / left alone

- Supabase's built-in signup confirmation email is no longer relied upon (the new user is created with `email_confirm: true`).
- `admin-otp`, `email-change-otp`, and `handle_new_user` trigger are untouched.
- Business onboarding/document verification flow at `/business/onboarding` is reused as-is — only the routing target changes.

## Files

- New: `supabase/migrations/<timestamp>_signup_otp.sql`
- New: `supabase/functions/signup-otp/index.ts`
- Edit: `supabase/config.toml` (register function, `verify_jwt = false`)
- Edit: `src/pages/SignupPage.tsx`
- Edit: `src/pages/VerifyEmailPage.tsx`

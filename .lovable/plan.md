## 1. Business soft-delete + purge (admin)

**Database**
- Add `deleted_at TIMESTAMPTZ` to `businesses`.
- Update RLS for `businesses` so customer-facing read requires `is_published = true AND deleted_at IS NULL` (owners and admins still see their own / all).
- Update existing related read policies (services, business_hours, business_settings, browse queries) to exclude soft-deleted rows.
- New SECURITY DEFINER RPCs (admin-only via `has_role`):
  - `admin_soft_delete_business(_business_id, _reason)` → sets `deleted_at = now()`, `is_published = false`, logs to `audit_logs`, notifies owner.
  - `admin_restore_business(_business_id)` → clears `deleted_at`, leaves `is_published = false` (admin re-publishes manually).
  - `admin_purge_business(_business_id)` → hard delete: cascade-cleans services, hours, settings, verification docs/storage, change requests, payouts, order_progress, order_tasks, order_events, messages tied to its orders, then orders, then the business row. Heavy audit log entry (severity `critical`).
- Storage cleanup helper: list and delete objects in `business-media/<business_id>/` and `verification-docs/<business_id>/` from the purge edge function (RPC can't touch storage directly).

**Edge function**
- New `admin-business-purge` function: verifies caller is admin, calls the purge RPC, then wipes the two storage prefixes. Returns counts.

**Frontend (`AdminBusinessesPage`)**
- Add status filter chip: All / Live / Hidden / Deleted.
- New row actions: `Delete` (soft) with confirm dialog asking for reason; for already-soft-deleted rows show `Restore` and `Permanently delete` (purge) actions, both behind a typed-confirmation AlertDialog.
- Show a `Deleted` badge for soft-deleted rows; hide them from `BrowseBusinessesPage` and any public/customer query (`fetchPublishedBusinesses` etc.).

## 2. Admin OTP every login, every device

**Behaviour**
- OTP verification is per-session, never persisted across sign-outs or new sessions. It must re-prompt on each fresh login on every device.

**Changes**
- `AdminOtpGate` / `markAdminOtpVerified`: switch storage key from `sessionStorage` keyed by `user.id` → keyed by `session.access_token` (or a per-session UUID stored in sessionStorage on verify). New device = new access token = forced re-prompt.
- `use-auth`: on `SIGNED_OUT` and on `SIGNED_IN` events, clear all `admin_otp_ok_*` keys from sessionStorage and any localStorage residue.
- `LoginPage`: after a successful admin password login, immediately `clearAdminOtpVerified()` before redirecting to `/admin/verify`.
- Server-side hardening: `admin_otp_verifications` table is purely a log; never used to bypass the gate. The gate is client-session only, so a different device cannot reuse another device's verification.

## 3. Email-change OTP (business + admin only)

**Database**
- New table `email_change_requests(id, user_id, new_email, code_hash, expires_at, attempts, used_at, created_at)` with RLS (user can read own).
- RPCs:
  - `request_email_change(_new_email)` → role check (`business` or `admin`), validates email format, throttles (max 3 active per hour), generates 6-digit code, hashes with `extensions.digest`, stores row, returns plaintext code to caller (edge function only).
  - `verify_email_change(_code)` → matches hash, marks used, returns `new_email` on success.

**Edge function**
- New `email-change-otp` with actions `request` and `verify`:
  - `request`: calls `request_email_change`, sends the code via the existing Brevo sender to the **new** email address (subject "Confirm your new BizOrder email").
  - `verify`: calls `verify_email_change`; on success uses service-role admin client to call `auth.admin.updateUserById(user.id, { email: new_email, email_confirm: true })` so the change takes effect without a second Supabase confirmation email.

**Frontend**
- `BusinessSettingsPage` and `AdminSettingsPage`: add an "Email address" card with current email read-only, "Change email" button → dialog with new-email input → "Send code" → 6-digit input → "Confirm". On success, refresh the auth user and toast.
- Customer/crew settings: leave existing flow untouched.

## 4. Admin analytics revamp

Replace the bar-only `AdminAnalyticsPage` with proper charts using the `recharts`-based `Chart` shadcn primitive already in `src/components/ui/chart.tsx`.

**Layout**
- KPI strip across the top: Total GMV, Completed orders, Avg order value, Completion rate (animated count-up).
- Pie / donut: Order pipeline by status (new, accepted, in progress, completed, cancelled).
- Pie / donut: Users by role (customers, providers, crew, admins).
- Line chart: Orders per day (last 30 days), two series — created vs completed.
- Bar chart: Top 5 providers by GMV (horizontal bars).
- Health card with completion rate, cancellation rate, open disputes, subscribers (kept as compact stat list).

**Data**
- Extend `fetchAdminMetrics` (or add `fetchAdminAnalytics`) to additionally return:
  - `dailyOrders: { date, created, completed }[]` for last 30 days
  - `topProviders: { name, gmv }[]` (top 5)
- Use the design system's HSL tokens for chart colours (no hard-coded hex).
- Subtle entry animation via `framer-motion` (already a dep) on cards; respect reduced-motion.

## Out of scope
- Reworking the entire admin nav, customer pages, or other portals.
- Marketing/transactional email templates beyond the two new auth-style sends.

## Files touched (high level)

```text
supabase/migrations/<new>.sql              add deleted_at, RLS updates, RPCs, email_change_requests
supabase/functions/admin-business-purge/   new
supabase/functions/email-change-otp/       new
src/components/admin/AdminOtpGate.tsx      session-token-keyed verification
src/hooks/use-auth.ts                      clear OTP keys on SIGNED_IN / SIGNED_OUT
src/pages/LoginPage.tsx                    clear OTP before /admin/verify redirect
src/pages/admin/AdminBusinessesPage.tsx    soft delete / restore / purge UI
src/pages/admin/AdminAnalyticsPage.tsx     full chart revamp
src/pages/admin/AdminSettingsPage.tsx      email-change dialog
src/pages/business/BusinessSettingsPage.tsx email-change dialog
src/lib/admin/queries.ts                   purge/soft-delete/analytics helpers
src/lib/customer/queries.ts                exclude deleted businesses
```

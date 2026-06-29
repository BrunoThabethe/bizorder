# Service Types, Quotes & Adjustments + Paystack Splits

This is a large refactor across DB, business portal, customer portal, admin portal, and a new Paystack edge function layer. I'll ship it in 4 phases so each one is reviewable and the app stays working between phases.

## Phase 1 — Database schema

One migration that adds everything needed up front so later phases just consume it.

**New tables**
- `service_tiers` — `id`, `service_id` (fk → services, cascade), `label`, `price` numeric, `duration_hours` numeric null, `sort_order` int, timestamps. RLS: public read for tiers of published services; business owner CRUD.
- `quotes` — `id`, `service_id`, `business_id`, `customer_id`, `answers` jsonb, `quoted_price` numeric null, `status` enum (`pending`, `quoted`, `paid`, `cancelled`, `expired`), `paystack_reference` null, `order_id` null, timestamps. RLS: customer sees own, business sees own, admin all.
- `order_adjustments` — `id`, `order_id`, `business_id`, `customer_id`, `reason`, `amount` numeric, `paystack_reference` null, `status` enum (`pending`, `paid`, `cancelled`), `created_at`, `paid_at` null. RLS: parties + admin.

**Column additions**
- `services`: `service_type` enum (`fixed`, `tiered`, `quote_based`, `hourly`) default `fixed`; `quote_questions` jsonb default `[]`; `hourly_rate` numeric null.
- `businesses`: `paystack_subaccount_code` text null.
- `orders`: `total_adjustments_amount` numeric default 0; `source_quote_id` uuid null (links order back to its quote when applicable).

**Triggers / helpers**
- Trigger on `order_adjustments` AFTER UPDATE → recompute `orders.total_adjustments_amount = sum(paid adjustments)`.
- `has_role` / `is_business_owner` reused for policies.
- All public tables get the required GRANT block (anon read only where needed).

## Phase 2 — Paystack edge functions

Three Deno edge functions in `supabase/functions/`, using `PAYSTACK_SECRET_KEY` + `PAYSTACK_PLATFORM_COMMISSION_BPS` (basis points) from secrets.

- `paystack-init` — body: `{ transaction_type: 'booking'|'quote_payment'|'adjustment', order_id?, quote_id?, adjustment_id?, tier_id? }`. Server resolves amount + business subaccount, builds Paystack `/transaction/initialize` call with `split` config + metadata `{ order_id, service_id, business_id, customer_id, service_type, transaction_type }`. Returns `authorization_url` + `reference`. Validates caller owns the resource. Rate limited (per user, in-memory + DB attempt log).
- `paystack-webhook` — verifies `x-paystack-signature` HMAC-SHA512 against `PAYSTACK_SECRET_KEY`. On `charge.success`, reads `metadata.transaction_type` and:
  - `booking` → mark order `pending` (paid), insert `order_payments`, notify business.
  - `quote_payment` → mark quote `paid`, insert matching `orders` row (status `pending`), link `source_quote_id`.
  - `adjustment` → mark adjustment `paid`, set `paid_at`, recompute order total.
  - Always idempotent via `payment_webhook_events.reference` unique check.
- `paystack-verify` — fallback called from success-redirect page to confirm a reference before showing success UI.

`supabase/config.toml` gets `verify_jwt = true` for init, `false` for webhook + verify.

## Phase 3 — Business portal

- **ServicesManagerPage**: new "Service type" selector at top of the create/edit dialog. Conditional sections:
  - fixed → current price field.
  - tiered → repeatable rows (label + price), saved to `service_tiers`.
  - quote_based → question builder (add/remove/reorder text questions), saved to `services.quote_questions`.
  - hourly → hourly rate field + repeatable time-block rows (label + hours + total price) → `service_tiers` with `duration_hours`.
- **Quotes inbox** (`/business/quotes`): list pending quotes with customer, service, answers, price input, "Send Quote" → updates `quotes` to `quoted` with `quoted_price`, notifies customer.
- **Order detail** (`BusinessOrderDetailPage`): when order is `accepted/in_progress/ready_for_review/completed`, show "Send adjustment request" form (reason + amount) → inserts `order_adjustments`, notifies customer. List of past adjustments with status.
- **Settings**: small field to paste `paystack_subaccount_code` (until we automate subaccount creation).

## Phase 4 — Customer portal + Admin

- **BusinessProfilePage / service card** routes by `service_type`:
  - fixed → existing Book Now → calls `paystack-init` (booking).
  - tiered → tier cards, select one → Book Now → `paystack-init` with `tier_id`.
  - quote_based → "Request a quote" modal renders `quote_questions`, submit → insert `quotes` (pending).
  - hourly → time-block tier cards → Book Session → `paystack-init` with `tier_id`.
- **Customer Quotes page** (`/customer/quotes`): list quotes; when `quoted`, show "Pay Now" → `paystack-init` (quote_payment).
- **OrderDetailPage**: card for each pending adjustment → "Pay Adjustment" → `paystack-init` (adjustment). Paid adjustments shown in history.
- **Payment success/failure routes**: `/payment/success?reference=…` calls `paystack-verify`, then redirects to relevant detail page; `/payment/error` shows retry.
- **Admin Orders** (`AdminOrdersPage` + detail): full transaction chain — original payment + each adjustment (business, customer, order id, reason, amount, ref, status, time) + totals (collected, commission). Filters: business, customer, service type, transaction type, date range. Nothing hidden.

## Technical notes

- All amounts stored in ZAR major units (numeric), sent to Paystack as kobo/cents (`* 100`) at init time.
- Commission = `PAYSTACK_PLATFORM_COMMISSION_BPS` (e.g. `500` = 5%). Split: `subaccount = business.paystack_subaccount_code`, `bearer = subaccount`, `transaction_charge = amount * bps / 10000`.
- Quote → order creation reuses existing `orders` insert path so dashboards, messaging, status stepper all work unchanged.
- Adjustments never mutate `orders.total`; reporting reads `total + total_adjustments_amount`.
- TS strict, no `any`; service-layer files under `src/lib/{business,customer,admin}/` for new queries; React Query for all reads; Zod validation in edge functions; existing rate-limit pattern reused for new endpoints.
- I'll request `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, and `PAYSTACK_PLATFORM_COMMISSION_BPS` via `add_secret` at the start of Phase 2.

## Out of scope (call out)

- Automatic Paystack subaccount creation for businesses — handled manually via the settings field for now; can add an "onboard with Paystack" flow next.
- Refund automation for adjustments — manual via Paystack dashboard until requested.

Approve and I'll start with the Phase 1 migration.

# TradeSafe escrow integration

## Goal
Customer must fund a TradeSafe escrow allocation before the business sees the order. Funds release to the business when the customer confirms completion (already wired via `customer_confirm_completion`). Disputes already block release.

## How TradeSafe fits BizOrder

```text
Customer creates order
        │
        ▼
[awaiting_payment]  ──── unpaid 30 min ────► [cancelled]
        │ pays via TradeSafe checkout
        ▼
TradeSafe webhook: funds received
        │
        ▼
   [pending]   ◄── business now sees it in the queue
        │
        ▼ (existing flow: accepted → in_progress → ready_for_review)
        ▼
Customer confirms completion
        │
        ▼
Edge function calls TradeSafe "release allocation"
        │
        ▼
   [completed]   + payout row marked released
```

Disputes pause the release exactly like today.

## What I'll build now (scaffolding — works once you add API keys)

### 1. Database (one migration)
- New order status `awaiting_payment` added to the `order_status` enum, set as the default for new orders.
- New table `order_payments`:
  - `order_id` (FK, unique), `provider` (`tradesafe`), `status` (`pending` | `funded` | `released` | `refunded` | `failed`)
  - `tradesafe_transaction_id`, `tradesafe_allocation_id`, `checkout_url`
  - `amount`, `currency`, `fee_customer`, `fee_business`, `funded_at`, `released_at`, `raw` (jsonb of last webhook)
- New table `payment_webhook_events` for idempotent webhook processing (event id, payload, processed_at).
- `system_settings` rows: `tradesafe_fee_split_customer_pct`, `tradesafe_fee_split_business_pct`, `awaiting_payment_timeout_minutes` (default 30) — admin can tune later.
- RLS: customer reads own `order_payments`; business reads its own (only when funded+); service role full access. `payment_webhook_events` is service-role-only.
- Function `expire_unpaid_orders()` + scheduled trigger logic (called from edge function cron) to cancel stale `awaiting_payment` orders.

### 2. Edge functions (4 new)
All gated by JWT except the webhook:
- `tradesafe-create-checkout` — called after order insert. Creates TradeSafe transaction + allocation, returns `checkout_url`. Stores IDs on `order_payments`.
- `tradesafe-webhook` — public, verifies TradeSafe signature, marks order `pending` on `FUNDS_DEPOSITED`, marks payment `released` on `ALLOCATION_RELEASED`, etc. Idempotent via `payment_webhook_events`.
- `tradesafe-release` — called by `customer_confirm_completion` trigger via `pg_net`, releases the allocation server-side.
- `tradesafe-expire-unpaid` — cron-style, run by a Postgres cron job every 5 min to cancel timed-out unpaid orders.

All functions read `TRADESAFE_CLIENT_ID`, `TRADESAFE_CLIENT_SECRET`, `TRADESAFE_API_URL`, `TRADESAFE_WEBHOOK_SECRET` from secrets. Until you add them, the functions return a clear "TradeSafe not configured" 503 instead of crashing — so the UI can show a friendly message during dev.

### 3. Frontend
- `CreateOrderPage` → after insert, calls `tradesafe-create-checkout`, redirects to `checkout_url`.
- New `/customer/orders/:id/payment-return` route — polls `order_payments.status` (5s) and routes to the order page once funded, or shows a "still waiting" / "retry payment" state.
- `OrderStatusStepper` gains an `awaiting_payment` step shown before "Placed".
- Business order queue (`OrdersQueuePage`, `fetchBusinessOrders`) filters out `awaiting_payment` — businesses never see unpaid orders. Admin sees everything.
- Customer order list shows a clear "Awaiting payment — complete checkout" pill with a resume button.

### 4. Admin
- `AdminOrdersPage` gets an "Awaiting payment" filter.
- New `AdminPaymentsPage` (light) listing `order_payments` rows so you can audit funded/released/failed states and copy the TradeSafe transaction ID.

## What I will NOT do until you have credentials
- Hit the real TradeSafe API. The functions are written against their published GraphQL schema but will only execute end-to-end once `TRADESAFE_CLIENT_ID` / `TRADESAFE_CLIENT_SECRET` are in secrets.
- Wire the cron job. I'll create the function; you flip on the schedule when you go live.

## After you have TradeSafe keys
You tell me, I add the 4 secrets via the secrets tool, then we do one round of sandbox testing: place a test order → pay with TradeSafe sandbox card → confirm webhook moves status to `pending` → confirm completion → confirm release. No code changes needed at that point.

## Open items I'm assuming (correct me if wrong)
- ZAR only (TradeSafe is SA-only anyway).
- Fee split starts 50/50 customer/business; you'll tune via admin.
- 30-minute unpaid timeout.
- Refunds on cancellation: customer-initiated cancel before business accepts → automatic refund via TradeSafe; after acceptance → goes through dispute flow.

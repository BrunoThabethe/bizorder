# Coming-soon polish, gold accents, newsletter wiring, welcome email

## 1. Coming-soon page — mobile + logo + copy

**`coming-soon-page.tsx`**
- Shrink logo from `size={180}` → `size={126}` (~30% smaller). Wrap the logo in a `div` with `onDoubleClick={() => setPwOpen(true)}` and `cursor-pointer`. Remove the global `window.dblclick` listener.
- Delete the "Team? Double-click anywhere to enter." footer line so customers don't see the gate hint.
- Tighten mobile spacing: reduce top padding (`pt-8 md:pt-20`), headline `text-3xl md:text-6xl`, body `text-sm md:text-lg`, section gaps `mt-6 md:mt-10`. Constrain widths so logo/form/video stay centered (`mx-auto w-full`).
- Replace remaining `text-muted-foreground` chrome on this page with `text-primary/80` or `text-secondary` for the gold/warm-brown accent feel.

**`hover-video.tsx`** — keep aspect-video, ensure `max-w-full` and remove fixed paddings that overflow on 384px. Pill overlay font shrinks on small screens.

**`waitlist-form.tsx`** — stack vertically on mobile (already does), bump tap targets to `h-12`. After success, render a prominent two-line confirmation card: "🎉 Thank you for joining the pack." + "A welcome email is on its way — keep an eye on your inbox." (replacing the small inline message).

## 2. Remove gray app-wide → gold accent

In `src/index.css` `.light` block:
- `--muted-foreground: 33 21% 35%;` → `38 50% 38%;` (warm gold-brown instead of gray) so every `text-muted-foreground` across homepage, coming soon, admin, etc. picks up the gold accent automatically.
- `--muted: 0 0% 90%;` → `40 50% 90%;` (warm beige surface instead of flat gray).
- `--border: 0 0% 90%;` / `--input: 0 0% 90%;` → `38 40% 82%;` for a subtle gold-tinted border.

This is one token change that propagates to every page using semantic tokens — no per-component refactor needed.

## 3. Newsletter admin shows waitlist signups

The admin page reads `newsletter_subscribers`, but the coming-soon form writes to `waitlist_signups`. Fix by writing to **both** in `waitlist-form.tsx`:
- Keep the existing `waitlist_signups` insert (unique source-of-truth, has rate-limit policy).
- Additionally upsert into `newsletter_subscribers` with `source: 'coming_soon'` so it appears in the existing Admin → Newsletter list and CSV export.
- Treat unique-constraint conflicts as success (already subscribed).

No schema change needed — both tables exist with `INSERT` policies open to anon.

## 4. Welcome / thank-you email

Currently no email is sent on signup, so the user gets nothing in their inbox. To fix this we need an email sender domain (none is configured yet). Setup flow:

1. User completes the email domain setup dialog.
2. Scaffold transactional emails.
3. Create a `waitlist-welcome` React Email template (BizOrder gold + leopard-brown brand, white body) with subject "Welcome to the BizOrder pack 🐾".
4. From `waitlist-form.tsx`, after a successful insert, invoke `send-transactional-email` with `templateName: 'waitlist-welcome'`, `recipientEmail`, and `idempotencyKey: \`waitlist-welcome-${email}\``.

Since no domain exists, the first step of build mode will surface the email setup dialog. Everything else (steps 1-3) ships immediately and doesn't depend on email being live.

## Files touched

- `src/components/coming-soon/coming-soon-page.tsx` (logo size, dblclick scope, remove hint, mobile spacing)
- `src/components/coming-soon/waitlist-form.tsx` (dual insert, success state, welcome-email invoke)
- `src/components/coming-soon/hover-video.tsx` (mobile polish)
- `src/index.css` (light-theme muted/border tokens → gold-tinted)
- New: `supabase/functions/_shared/transactional-email-templates/waitlist-welcome.tsx` + registry entry (after email infra setup)

## Out of scope

- No changes to password (`BizOrder2026`), gate logic, or `waitlist_signups` schema.
- No homepage layout changes beyond the global token swap.

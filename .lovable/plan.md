
# Coming Soon Gate

A full-screen "coming soon" page that hides the entire app from the public. Double-click anywhere → password modal → entering `BizOrder2026` unlocks the real app on the device.

## 1. Gate behavior

- New route wrapper `ComingSoonGate` mounted at the root of the router, wrapping every existing route.
- Reads `localStorage["bo_unlocked"] === "1"`. If unlocked → render children (current app). If not → render `ComingSoonPage`.
- `ComingSoonPage` listens for `dblclick` on the whole page → opens a shadcn `Dialog` with password input + "Enter" button.
- Correct password sets the flag and reloads. Wrong password shakes the input and shows an inline error. Rate-limited to 5 attempts per 15 min via in-memory + localStorage counter (matches your security rule).
- A hidden `/admin-unlock` route also accepts the password (escape hatch in case dbl-click is awkward on mobile).

## 2. Page layout (top → bottom, smooth scroll, no borders)

```text
┌──────────────────────────────────────────┐
│            [ leopard logo ]              │  ← top-middle, interactive
│                                          │
│   "Big things are coming."               │  ← 2-line marketing hook
│   "Be first in line when we go live."    │
│                                          │
│   [ glossy email input ][ Notify me → ]  │
│                                          │
│        ◯  ◯  ◯  ◯   (social icons)       │
│                                          │
│  ─────── (lots of breathing room) ───────│
│                                          │
│        [ hover-to-play looping video ]   │
└──────────────────────────────────────────┘
```

- Background: deep leopard-brown gradient with subtle animated grain + soft gold radial glow.
- Smooth scroll via `scroll-behavior: smooth` + `framer-motion` fade/slide-up reveal on each section.
- Brand palette only: leopard brown `#3A2C1F`, gold `#D9A957`, warm beige `#F3E9D3`. Space Grotesk display, Inter body.

## 3. Interactive leopard logo

- Logo asset extracted from `BON_logo_OBJ_package.zip` → `src/assets/bon-leopard.png` (and any layered ear/tail pieces in the zip used as separate SVG/PNG layers if available).
- Component `LeopardMark` renders the body and overlays separate **ear** and **tail** layers positioned absolutely.
- Global `mousemove` listener (throttled) feeds normalized pointer coords into framer-motion springs:
  - Ears tilt ±8° toward the cursor.
  - Tail sways with a delayed spring (feels alive).
  - Subtle head/eye parallax (±4px) toward cursor.
- If the zip only contains a flat logo, I'll slice the ears + tail into separate transparent PNGs during build using the bundled image so the animation still works.

## 4. Email capture + auto-reply

**Database** (`waitlist_signups`)
- `email` (citext, unique), `source` (text default 'coming_soon'), `ip_hash` (text), `user_agent` (text)
- RLS: `INSERT` allowed for `anon` with row-level rate check; no `SELECT/UPDATE/DELETE` for anon. Admin role can read.
- Unique constraint → duplicate email returns 23505 → UI shows "You're already on the list 🎯".

**Edge function** `waitlist-subscribe`
- Validates email with Zod (trim, lowercase, max 160).
- Rate-limit by IP (5/15 min) using a small `rate_limits` table.
- Inserts row; on duplicate returns friendly message.
- Invokes `send-transactional-email` with template `waitlist-welcome`.

**Email template** `waitlist-welcome.tsx`
- React Email, white body, leopard-brown header band, gold accent rule, faint leopard-print watermark in the hero block, short thank-you copy, follow-us buttons (social URLs configurable later — placeholder `#` for now).
- Subject: "You're on the list — BizOrder is almost here".

**Prerequisite (flagged):** sending requires Lovable Emails infra + a verified sender domain. If not yet set up, I'll trigger the email-domain setup dialog as the first step; signups will still be saved in the meantime, and the auto-reply will start sending the moment DNS verifies.

## 5. Glossy email box

- Frosted-glass effect: `backdrop-blur-xl`, white/8% fill, gold 1px inner ring, soft gold glow on focus.
- Inline "Notify me →" button uses the existing high-contrast gold CTA (no ghost).
- Loading spinner inside the button while submitting; success state morphs to "✓ You're in".

## 6. Social row

- Five circular icon buttons (Instagram, X, Facebook, TikTok, LinkedIn) with `href="#"` placeholders, `aria-label` set, gold hover glow + scale.
- Centralized in `src/config/social-links.ts` so URLs are one-line swaps later.

## 7. Hover-to-play marketing video

- `<video muted loop playsInline preload="metadata">` with no controls, no border, rounded-2xl, soft gold ambient shadow.
- `onMouseEnter` → `play()`, `onMouseLeave` → `pause()`. Touch devices: tap to toggle.
- Source: `public/marketing/bizorder-teaser.mp4` placeholder (silent black frame) until you upload the real file. Poster image generated from the logo.

## 8. Files

**New**
- `src/components/coming-soon/coming-soon-gate.tsx`
- `src/components/coming-soon/coming-soon-page.tsx`
- `src/components/coming-soon/leopard-mark.tsx`
- `src/components/coming-soon/password-dialog.tsx`
- `src/components/coming-soon/waitlist-form.tsx`
- `src/components/coming-soon/social-row.tsx`
- `src/components/coming-soon/hover-video.tsx`
- `src/config/social-links.ts`
- `src/assets/bon-leopard.png` (+ ear/tail layers, extracted from zip)
- `supabase/functions/waitlist-subscribe/index.ts`
- `supabase/functions/_shared/transactional-email-templates/waitlist-welcome.tsx`
- Migration: `waitlist_signups` + `rate_limits` tables, RLS, unique index.

**Edited**
- `src/App.tsx` — wrap `<Routes>` in `<ComingSoonGate>`.
- `_shared/transactional-email-templates/registry.ts` — register new template.

## 9. Out of scope / assumptions

- Social URLs left as `#` until you provide them.
- Video file is a placeholder; drop the real `.mp4` into `public/marketing/` to replace.
- Password is hardcoded as requested (`BizOrder2026`). For a public launch I'd recommend moving this to a secret; happy to do that on a follow-up.
- Logged-in app users behind the gate are unaffected once they unlock once on a device.


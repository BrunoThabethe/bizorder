## Redesign Coming Soon Page to Match Homepage

Rebuild the gate page so it inherits the homepage's look and feel (light theme, brand layout, same typography and colors) instead of the dark leopard concept.

### Changes

**1. Swap the logo**
- Remove `bon-leopard.png` usage from `LeopardMark`.
- Use the existing brand logo `src/assets/bon-logo.png` (the one rendered via `BrandMark` in the homepage nav) at the top center.
- Keep the interactive hover/mouse-tracking behavior (subtle tilt, breathe, gold glow halo) — just applied to the real logo.
- Rename component to `InteractiveLogo` and delete the leopard ear/tail flicker overlays (they were specific to the leopard art).

**2. Match the homepage shell**
- Wrap the page in `SiteLayout` so it gets the same `Navbar` + `Footer` + background as `/index`.
- Use the same light background, container widths, and section rhythm as `Hero` / `CtaForm`.
- Replace dark `#0d0a07` gradient + grain with the homepage's light surface (semantic tokens `bg-background`, `bg-card-gradient`, `shadow-card-lift`).

**3. Keep the existing copy and structure**
- Headline + sub: "Something bold is about to prowl the market." / "Be first in line — get the launch date, early-access perks, and a head start over the pack." (unchanged text)
- Email capture (`WaitlistForm`): same logic and Supabase insert, restyled to match homepage CTA card (high-contrast gold button, beige card, no glassmorphism, no ghost styling).
- Social row: same icons + links, restyled as solid pill buttons with brand colors instead of frosted glass.
- Hover-to-play video: kept, restyled with `rounded-3xl border border-border/60 shadow-card-lift` to match homepage cards.

**4. Gate behavior — unchanged**
- `ComingSoonGate` still wraps the app, double-click opens `PasswordDialog`, password `BizOrder2026`, 5-attempts/15-min rate limit, `localStorage["bo_unlocked"]` persistence.

### Files touched

- `src/components/coming-soon/coming-soon-page.tsx` — full rewrite around `SiteLayout` and homepage tokens.
- `src/components/coming-soon/leopard-mark.tsx` — replace with `interactive-logo.tsx` using `bon-logo.png`; delete old file.
- `src/components/coming-soon/waitlist-form.tsx` — restyle to match `CtaForm` card (light, high-contrast).
- `src/components/coming-soon/social-row.tsx` — restyle pills for light background.
- `src/components/coming-soon/hover-video.tsx` — restyle frame to match homepage cards.
- No DB, no routing, no gate-logic changes.

### Out of scope
- No changes to `App.tsx`, gate logic, password, or `waitlist_signups` table.
- No copy rewrite beyond removing the dark-theme "Follow the pack" eyebrow if it reads off in light theme (kept as is unless it clashes).

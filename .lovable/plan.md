# Dark Dashboard Redesign

Apply the look & feel of the reference dashboards (near-black surfaces, soft rounded cards, gold accents replacing orange, subtle gradients, pill chips, sidebar shell) across the entire site — public marketing pages and the customer / business / admin / crew portals — without changing any functionality, routes, queries, or data flow.

## Visual language (from references)

- **Surfaces**: near-black canvas (`#0F0F0F`), elevated cards (`#171717` → `#1C1C1C`), soft inner borders (`#262626`), generous 16–20px radius.
- **Accent**: Gold `#D9A957` everywhere orange appears in the refs — primary buttons, active nav, key numbers, chart highlights, focus rings.
- **Typography**: keep Space Grotesk display + Inter body; tighten weights — large bold numbers for stats, muted gray labels above them.
- **Cards**: dark card with subtle top-edge highlight, soft shadow, rounded-2xl. Inline pill badges (`+8%`, status chips) with translucent backgrounds.
- **Buttons**: solid gold primary (dark text), solid dark secondary (light text), pill or rounded-xl. No ghost / no outline-only.
- **Charts/visuals**: dark bars with one gold highlighted bar, gold line accents, subtle grid.
- **Light mode**: keep functional but mirror the structure (off-white canvas, warm beige cards, gold accent stays).

## Scope of changes (presentation only)

1. **Design tokens** (`src/index.css`)
   - Refine dark tokens: card / popover / muted / border / sidebar values to match dashboard palette.
   - Add `--card-elevated`, `--ring-gold`, refined shadow tokens (`--shadow-card`, `--shadow-glow`).
   - Update gradients (`--gradient-hero`, `--gradient-card`, `--gradient-cta`) to dark + gold.

2. **Primitives**
   - `components/ui/card.tsx` — default to elevated dark surface, rounded-2xl, soft border + shadow.
   - `components/ui/button.tsx` — refine variants (gold primary, dark secondary, destructive, link). Remove ghost/outline visual weakness; keep variant names so call-sites don't change.
   - `components/ui/badge.tsx`, `input.tsx`, `tabs.tsx`, `table.tsx` — minor token swaps for the dashboard look.

3. **Marketing shell** (public pages: `/`, `/how-it-works`, `/for-businesses`, `/for-customers`, `/contact`, legal)
   - `Navbar.tsx`: dark translucent pill with gold logo mark, gold active link, solid gold CTA.
   - `Footer.tsx`: dark surface, gold wordmark accent, lighter dividers.
   - `sections/Hero.tsx`, `Pains.tsx`, `SocialProof.tsx`, `CtaForm.tsx`: dark cards, gold stat chips, dashboard-style stat tiles in hero, bar/line motif in social proof.

4. **Portal layouts** (sidebar shells)
   - `components/customer/CustomerLayout.tsx`, `business/BusinessLayout.tsx`, `admin/AdminLayout.tsx`, `crew/CrewLayout.tsx`: restyle the sidebar to match the reference (dark sidebar, rounded gold pill on active item, muted icons, section labels in uppercase tracked-wide).
   - `components/customer/PageHeader.tsx`: title + subtitle stack, gold accent underline.

5. **Page polish (token-only, no markup changes)**
   - Dashboard pages (`*DashboardPage.tsx`): swap stat-card visuals to dashboard-style tiles (large number, label above, % chip).
   - Order detail / queue / settings pages: cards adopt new elevated style automatically via token updates.

## What does NOT change

- No route changes, no new pages, no removed pages.
- No query/mutation/edge-function/migration changes.
- No business logic, role-gating, validation, or copy rewrites (unless a heading needs sentence-case fix).
- No component prop changes; all variant names preserved so consuming pages don't need edits.
- ThemeProvider / theme toggle untouched.

## Verification

- Visit `/`, `/how-it-works`, `/login`, `/customer`, `/business`, `/admin` (already-styled portals will pick up new tokens).
- Confirm contrast (WCAG AA) for gold-on-dark text, gold buttons, muted labels.
- Check mobile (Navbar collapse, sidebar Sheet) at 375px.

## Technical notes

- All colors stay HSL in `index.css`; component files use semantic Tailwind classes (`bg-card`, `text-primary`, `border-border`) — no hex literals in components.
- Button variants keep their current names (`default`, `secondary`, `outline`, `destructive`, `link`, `lime`, `bright`) but `outline` becomes a high-contrast bordered solid (per "no ghost buttons" rule).
- Light mode receives the same structural treatment with the warm-beige palette so toggling stays coherent.

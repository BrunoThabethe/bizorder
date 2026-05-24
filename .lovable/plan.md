## Goal
Turn the Admin AI Assistant page into an AI-powered newsletter composer that sends bulk emails (via Brevo) to all active newsletter subscribers. Remove the Campaigns page.

## Changes

### 1. Remove Campaigns page
- Delete `src/pages/admin/AdminCampaignsPage.tsx`.
- Remove its route and import from `src/App.tsx`.
- Remove the Campaigns link from the admin sidebar (`src/components/admin/AdminLayout.tsx`).
- Leave the `ai_campaigns` table in place (history of past sends will reuse it as a send log). Existing `fetchCampaigns` / `createCampaign` helpers stay; unused ones get removed.

### 2. Rebuild AI Assistant page (`src/pages/admin/AdminAiAssistantPage.tsx`)
New single-page composer with three stacked sections:

**a. Brief / draft mode**
- Tabs: "Write myself" | "Draft with AI".
- AI mode: textarea for the brief ("What is this email about?"), tone selector (Friendly / Professional / Promotional), optional CTA field, "Generate draft" button.
- Calls a new edge function `ai-draft-newsletter` that uses Lovable AI Gateway (`google/gemini-2.5-flash`) and returns `{ subject, html, text }`.

**b. Editor**
- Subject input + rich textarea (plain HTML body) populated from the AI draft or empty for manual mode.
- Fully editable; user can add/remove anything.
- Live recipient counter ("Will send to N active subscribers").
- "Send test to me" button (sends only to the admin's email).

**c. Send**
- "Send to newsletter" button with a confirmation dialog showing recipient count.
- Calls new edge function `send-newsletter-broadcast` which:
  - Verifies caller is admin via `has_role`.
  - Loads all `newsletter_subscribers` where `is_active = true`.
  - Sends through Brevo (same `BREVO_API_KEY` + sender used by `send-waitlist-welcome`) in batches of 50 using Brevo's `to` array with `messageVersions` so each recipient gets their own envelope (no leaking addresses).
  - Logs the send into `ai_campaigns` as `status='sent'` with `recipients_count` filled.
- Rate-limited (max 3 broadcasts per admin per hour) and input-validated (subject ≤ 200 chars, body ≤ 100k chars).

### 3. Sidebar / nav
- In `AdminLayout`, rename the "AI assistant" item to "AI newsletter" and drop the Campaigns item.

### 4. Settings page kept
- Existing `ai_assistant_settings` (model, system prompt, temperature) stays and is reused by the draft function. A small collapsible "Assistant settings" panel stays at the bottom of the AI Assistant page so admins can still tweak the model/prompt.

## Technical notes
- New edge functions: `supabase/functions/ai-draft-newsletter/index.ts`, `supabase/functions/send-newsletter-broadcast/index.ts`, both with `verify_jwt = false` + in-code JWT validation + admin role check, CORS, Zod input validation.
- Brevo call uses `https://api.brevo.com/v3/smtp/email` with header `api-key: BREVO_API_KEY` (same as existing `send-waitlist-welcome`).
- Frontend uses `supabase.functions.invoke(...)`, React Query for subscriber count, shadcn `Tabs`, `Textarea`, `Dialog`.
- No DB schema changes required.
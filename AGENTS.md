# Event Spark 2.0 — agent system map

This file is the source of truth for how the product actually works.
`README.md` is a Lovable PRD (branded “EventFlow”). Do not implement AWS, Express, Redis, Zoom, HubSpot, Stripe, SSO, webhooks, or Jest/Cypress because the README lists them. They are not in this repo.

## What this product is

White-label event registration. Organizers create branded public pages; attendees register, receive a ticket, and can be checked in. Product UI name is **eventspark**. Live share origin defaults to `https://event-spark-2.lovable.app` unless `VITE_PUBLIC_SITE_URL` is set.

**Shipped:** auth, events, cinematic public page, custom form fields, ticket tiers (display price only), waitlist, QR check-in, UTM tracking links, cohost invites, transactional email, AI cover/page generation, basic analytics, marketing landing CMS.

**Not shipped (do not advertise as done):** native integrations (Integrations page copies Lovable prompts), payments, conversion funnel, conditional form logic, file-upload fields, SSO. Paid-looking tickets still register for free.

## Architecture

Vite + React 18 SPA → `@supabase/supabase-js` → hosted Supabase project `oiqiqdctkfjrbrjmjczc`.

There is no application server. Privileged work is Deno edge functions. Schema, RLS, and RPCs live remotely; this repo has **no** `supabase/migrations`. The contract is `src/integrations/supabase/types.ts`. Do not invent tables/columns that are not in that file.

```
Attendee / Organizer browser
        ↓
Vite React SPA (port 8080)
        ↓
Supabase client (anon/publishable key)
        ├── Auth
        ├── Postgres + RLS + RPCs
        ├── Storage (event assets)
        └── Edge functions
              ├── notify → send-transactional-email (service role only)
              ├── process-email-queue / schedule-event-reminders
              ├── generate-cover-image / generate-event-page
              └── event-ics
```

Env (frontend): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional `VITE_PUBLIC_SITE_URL`. Never commit secrets from `.env`.

## Roles

| Signal | Meaning |
|---|---|
| `useAuth()` | Supabase session. Email/password. Google/Apple exists via Lovable helper; not the primary path. |
| `useUserRole()` | `organizer` if `has_any_organizer_access(user_id)`, else `attendee`. |
| `user_roles` enum | `admin` / `editor` / `viewer` — lightly used (`useIsAdmin` for landing editor). |

Organizer routes wrap `OrganizerOnly` (attendees redirect to `/dashboard/home`). Cohosts count as organizers for that RPC, but `useEvents()` filters `events.user_id = current user`, so **cohosts often see an empty event list**. If you touch events listing, fix that (query by access, not owner id).

## Routes

Public: `/`, `/auth`, `/reset-password`, `/register/:slug`, `/ticket/:id`, `/unsubscribe`, `/cohost/accept`.

Dashboard: `/dashboard` role-redirects. Organizer: `events`, `events/:id`, `attendees`, `analytics`, `integrations`, `landing-editor`, `company`. Shared: `settings`. Attendee: `home`.

`App.tsx` **eagerly imports** dashboard pages. A missing named export in Integrations (or similar) blanks the entire SPA, including `/`. Prefer lucide-react icons. Do not import `SiSlack` / `SiTwilio` from `react-icons/si` — Simple Icons removed them.

## Event studio (`/dashboard/events/:id`)

Create = insert “Untitled event” and navigate here. No wizard. Sections: overview, landing page (modules), tickets/form, branding, promotion, attendees, check-in, settings (email toggles).

Public page is **one** cinematic template: `PublicEventPage` (hero, sticky CTA, modules, in-page form). Ignore leftover variant types in `src/lib/publicUrl.ts` and `/register/:slug/:variant`. Do not revive minimal/split/stacked/cards.

Modules (`event_modules.type`): `why_attend`, `schedule`, `speakers`, `location`, `faq`, `sponsors`, `custom`. Form field types: `text`, `email`, `tel`, `url`. Name/email/phone are collected by default.

## Data rules

- Read/write through hooks in `src/hooks/` (`useEvents`, `useRegistrations`, `useEventModules`, `useFormFields`, …). Match existing React Query keys and invalidate them after mutations.
- **Register** only via RPC `register_for_event` (capacity + waitlist). Never `insert` into `registrations` from the client for public signup.
- **Check-in** via `check_in_attendee`. **Waitlist promote** via `promote_from_waitlist`.
- Email config is owner-only: `get_event_email_config` / `update_event_email_config`. Do not select `email_intro` / send flags on the public `events` query (`EVENT_COLS` in `useEvents.ts` is intentional).
- **Mail from the browser:** `supabase.functions.invoke("notify", { body: { kind, …id } })`. Kinds are rebuilt from DB (registration, waitlist, cohost, reminders). Never invoke `send-transactional-email` from the client (service_role only; phishing-hardened).
- Ticket `price` is display. Do not imply checkout until a real payment path exists. Prefer hiding paid UX over fake “pay” buttons.

## Tables (high level)

`events`, `event_modules`, `form_fields`, `registrations`, `event_tracking_links`, `profiles`, `user_roles`, `cohosts`, `cohost_invitations`, `email_templates`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `landing_sections`, `event_image_library`, `image_generation_jobs`.

Statuses: events `draft | live | past`. Registrations `registered | waitlisted | checked_in | attended | no_show | cancelled`.

## Decision defaults

1. Extend existing hooks, RPCs, and modules. Do not add a second backend.
2. Treat `types.ts` as schema. If you need a new column, say so; do not silently assume it exists remotely.
3. Keep public pages fast and cinematic; dashboard can be denser.
4. Brand with `event.primary_color` / `color_mode`, not a new global theme.
5. Do not run `npm audit fix --force`. Node 20 works with a supabase-js engine warning; Node 22 is preferred.
6. Fonts load from `index.html`. Do not put CSS `@import` after `@tailwind`.
7. Tests are almost absent (`src/test/example.test.ts` is a stub). If adding tests, cover RPCs/waitlist/check-in, not placeholders.

## Key files

| Area | Path |
|---|---|
| Routes | `src/App.tsx` |
| Auth | `src/contexts/AuthContext.tsx` |
| Supabase | `src/integrations/supabase/client.ts`, `types.ts` |
| Event CRUD | `src/hooks/useEvents.ts` |
| Public page | `src/pages/Register.tsx`, `src/components/event-public/` |
| Studio | `src/pages/dashboard/EventDetail.tsx` |
| Mail | `supabase/functions/notify/index.ts` |
| Landing CMS | `src/pages/dashboard/LandingEditor.tsx`, `landing_sections` |

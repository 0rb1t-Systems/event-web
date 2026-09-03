# Event detail (`/events/:id`) — overrides Master

Cover-photo conference on white. Pulse teal accent. Not house chrome, not night-lineup.

## Context and goals

Attendee lands from Browse, reads the event, and taps **Register** to open in-page checkout on the same route. Hero + black facts bar stay from the prior cover-photo language; body below matches the white-card conference reference.

## Design tokens

Local palette (`src/components/event-public/pulseTheme.ts`):

- White canvas `#FFFFFF`
- Teal `#2ECFC2` (Register, time pills, accents)
- Black island `#0B0B0B` (facts bar only)
- Navy / sky for hero fallback gradient

Type: Outfit (`font-display`) + Source Sans 3. Page wrapper: `.pulse-event` (follows `html.dark`).

## Keep unchanged

### Hero

Rounded cover island at industry scale (`text-[1.875rem]`–`lg:text-[3rem]`), taller cover (~24–36rem), bottom-left type, countdown, Register CTA on cover. **`PublicSiteHeader`** (Home, Browse events, Rooms, My Tickets) sits above the hero — not `EventPulseHeader` on the cover.

### Facts bar

Black rounded island overlapping hero: Date / Time / Venue / Access. Roomier padding and `text-sm`/`text-base` values. Aligned to `max-w-6xl` with the hero inset. 2×2 phones, 4-col desktop.

## Body layout (below facts bar)

Two columns `max-w-6xl`: left ~2/3, right ~1/3.

### Left column — white cards (`EventCard`)

- **About the event:** description only (separate card from why-attend).
- **Why attend this event:** own titled card with bullet list.
- **Featured speakers:** circular headshots, name + role only (no teal field).
- **Agenda:** vertical timeline, teal time pills, day tabs only when multi-day. Room is the only sublabel.
- **Gallery:** full-width section below the two-column block; grid layout (featured first image + square thumbs); no carousel.

### Right column — sticky rail

- **Starting from** + lowest available ticket price (or Free).
- Full-width teal **Register** (locked label per CTA lock).
- **Share** (copy / native share).
- **Event Detail:** date, time, venue/address with teal icons, View on Map + embed when physical.
- **Organized by** when `organizer_business_name` present. No Follow.
- **Partners / sponsors** below organizer on white card.

`StickyRegisterBar` remains after scroll. No `EventSectionNav`. No FAQ section.

## Checkout handoff

Register requires login. Opens in-page checkout (`design/pages/checkout.md`) — not an inline form on the detail page.

## Skip

FAQ, Save, Follow, sidebar date/time/location repeat (facts bar covers that).

## QA checklist

- [ ] Hero + black facts bar unchanged
- [ ] Two-column body; about and why-attend are separate cards
- [ ] Speakers circular; agenda timeline; gallery grid
- [ ] Register rail: starting price + Register + Share + Event Detail + organizer + partners
- [ ] No FAQ; Register opens checkout view
- [ ] Mobile 375: columns stack; sticky bar usable

# Event detail (`/events/:id`) — overrides Master

Pulse chrome + Vision Conf photography, in EventHub’s own light conference language. Not a Pulse clone, not a Vision clone, not night-lineup.

## Context and goals

Intent: an attendee lands from Browse, understands the event in one viewport, and registers without leaving the page.

The page is a **cover-photo conference**: a rounded island filled by the event banner, countdown and Register over a dark gradient, Pulse’s black facts bar, a row-style agenda, a navy partner grid, and a teal speaker field. EventHub’s touch is the ticket **Register** action (not an email field) and Laravel cover/session/sponsor data.

## Design tokens and foundations

Local palette (`src/components/event-public/pulseTheme.ts`):

- Warm paper `#F5F1EA` (Vision cream, not Pulse cool gray)
- Navy hero `#0A2156` → `#163D86` → sky `#4B8FE8`
- Teal `#2ECFC2` (Register, chips, speakers field)
- Mint `#D4F4F0` (featured session + featured why card)
- Black island `#0B0B0B` (facts bar)

Type: Outfit (`font-display`) for titles, Source Sans 3 for body. **No `font-lineup`.** No serif.

Radius: pills `rounded-full`; hero, photos, cards `1.75rem`–`2.5rem`.

Motion: framer-motion; honor `prefers-reduced-motion`. No photo rotation below `lg`.

Page wrapper: `.pulse-event`. `color_mode` does not flip this page to ink.

## What we steal vs what we invent

From **Pulse:** countdown `Days : H : M : S`, black four-column facts overlapping the hero, teal Register, teal speaker field, venue as two rounded frames.

From **Vision Conf:** white pill nav on the photo, navy partner logo grid with white marks, editorial about/register splits, day tabs, photo-first venue.

From **cover-photo reference:** rounded island filled by the banner, bottom-left type, black Register with teal label, dark bottom gradient so the image stays visible.

**EventHub-unique:** CTA is **Register** (ticket), never an email capture. Cover from `banner_url` / gallery. No fake session categories, testimonials, or attendee counts. Agenda rows have no extra CTAs.

## Component-level rules

### Hero

Anatomy: paper padding around a rounded island. The event cover (`background_image_url`) fills the island (`object-cover`). Dark gradient from the bottom so type stays readable. In-hero chrome is slim: logo, account / Log in, black **Register** with teal label. **No** white pill section links on the cover. After scroll, `EventSectionNav` is the page rail. Content is **bottom-left**: optional category/access badge, event name (industry scale, ~24–34px), short description (≤ 20 words), compact countdown, black Register. Fallback if no cover: navy-to-sky gradient. No overlapping portraits, no catalog poster, no email field.

States: Register disabled when gates lock; countdown hidden when `starts_at` is missing or past.

Responsive: cover island ~18–24rem tall, not a full viewport poster. Register stays in the header on small screens (not menu-only). Countdown uses `size="compact"`.

### Countdown

Shared `EventCountdown`. Compact in the hero, light tone in the coming-soon panel. `aria-live="polite"`.

### Facts bar

Black rounded island overlapping the hero (`-mt-10` / `sm:-mt-16` / `lg:-mt-20`). Date / Time / Venue / Access. 2×2 on phones, 4-col from `lg`. Omit empty cells. Copy link lives in the footer. Hero bottom padding is larger than the overlap so Register is not covered.

### About

Stacked program note: heading, then a teal left-rule block with the first sentence as a lead and the rest as `text-sm` body. Not a centered white card. Not a left-headline / right-paragraph split.

### Section rail

After scroll, fixed centered white pill with teal active chip. Real `<a href="#id">` links.

### Why attend

Mint lead band for the first Laravel bullet; remaining bullets in a compact 2-column white row grid. Max 6 bullets. No numbered `01` pills. No oversized bento cells.

### Schedule

Kicker “Our agenda” + heading (`Agenda` + grey remainder). Horizontal rows: start time + room (left), title and one-line description (center), speaker name (right). A cool-gray fill marks a session with no speaker, or the first row when every session has a speaker. `+` expands a clamped description. Day tabs only when `starts_at` spans more than one calendar day. **No** View schedule / Register CTAs in this section. Do not invent KEYNOTE/WORKSHOP categories; room is the only sublabel. On phones the row stacks: time and + on the first line, title under, speaker last.

### Partners

Full-bleed navy (`PULSE.navy`). Left-aligned white heading. Compact white logo tiles (2-col phones, 3-col `sm`, 4-col `lg`). Show the real mark (no invert). If the image is missing or fails, show the partner name. No giant star, no marquee.

### Speakers

Solid teal field. Compact white row-cards in a 2/3-col grid: 56px portrait, name, role, two-line bio. Do not restore the full-viewport focus stage or overlapping 4:5 posters. Pass through Laravel `bio`. Do not invent LinkedIn.

### Venue

Two rounded frames, photography-first: photo taller, map staggered down on desktop (`lg:mt-16`). Virtual: single frame, no maps, never expose `online_url`.

### Register + sticky CTA

Editorial split: heading left, white form card right. Light pill inputs. CTA label stays **Register**. Sticky bar is a floating white pill + teal Register after scroll.

### Footer

Shared house `SiteFooter` (brand, Platform, Account, New listings). Light-locked on this page even when `html.dark`. Do not restore the short Logo / Home / Browse / Copy link bar.

## Accessibility requirements and testable acceptance criteria

- WCAG 2.2 AA on paper and on navy for hero type.
- Visible `:focus-visible` ring (`ring-primary`, teal on this page).
- Countdown is a live region and still readable with reduced motion.
- Section links are `<a href="#id">`. Targets have matching `id` and `scroll-margin-top`.
- Form: label above input, error below, no placeholder-as-label.
- Images have empty alt when decorative; speaker/venue photos use the name or venue as alt.

## Content and tone

Locked CTAs only: Home · Browse events · Register.

Do: "Register", "Browse events", "Open in maps", "Copy link".
Don't: "Join Pulse", fake email capture, testimonials, fake attendee counts.

No em-dashes. Time ranges use a hyphen (`9:00 AM - 5:00 PM`).

## Anti-patterns and prohibited implementations

- Do not inherit night-lineup chrome (ink bed, 0px radius, `font-lineup`, emerald posters) on this page.
- Do not put the white pill section nav on the cover image.
- Do not restore `text-5xl` / `text-7xl` hero type.
- Do not center a navy-gradient hero that hides the cover image.
- Do not add agenda-section CTAs (View schedule / Register).
- Do not add a real email capture field.
- Do not invent session categories, testimonials, or map screenshots.
- Do not expose `online_url` on the public page.
- Home `/` and Browse `/events` stay night lineup until those pages are restyled separately.

## QA checklist

- [ ] Hero is a rounded cover-photo island; banner is visible; Register in the header on phones; no in-hero section pill
- [ ] After scroll, `EventSectionNav` is the only on-page section rail
- [ ] Type is industry scale (hero ~24–34px, section titles `text-lg`/`text-xl`, body `text-sm`)
- [ ] Countdown uses Days / H / M / S; hidden when start is past
- [ ] Facts bar is a black rounded island overlapping the hero; 2×2 on phones
- [ ] About is a stacked lead + body with a teal rule, not a centered white blob
- [ ] Why attend is a mint lead band plus compact rows; first bullet mint
- [ ] Agenda is time / title / speaker rows with no section CTAs; day tabs only for multi-day
- [ ] Speakers sit on a teal field as compact row-cards; bio shown when present
- [ ] Venue photo + staggered map; virtual has no maps and no join URL
- [ ] Partners is navy with white tiles and real-color logos (2-col phones)
- [ ] Register is split (heading + form); sticky label stays Register
- [ ] Footer is the shared `SiteFooter`
- [ ] Reduced motion: countdown static-looking; partner grid is static (no marquee)
- [ ] Mobile 375: cover visible, Register in header, agenda rows stack, CTA not covered by facts bar
- [ ] Home `/` and Browse `/events` unchanged

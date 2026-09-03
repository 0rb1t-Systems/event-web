# EventHub design system

Visual source of truth for the EventHub Web App.

Public discovery (Home, Browse) and the participant product are **the house**: a light ticket desk. Public event detail (`/events/:id`) is a **cover-photo conference** and does **not** inherit house chrome. Organizer surfaces follow the **org console** from `design/design-system.pen`.

## Context and goals

Intent: a visitor finds a real event, opens it, and keeps every admission in one wallet — on a daylight canvas that feels like EventHub, not a generic ticketing clone and not the retired night lineup.

The house is emerald on white. The venue (event detail) stays Pulse teal on white. That handoff is deliberate. Do not paint Home in `#2ECFC2` to “match” detail.

## Design tokens and foundations

### Dials

- Public Home / Browse: variance 6, motion 5, density 4
- Public event detail: variance 7, motion 6, density 4 (cover-photo conference — spec: `design-system/pages/event-detail.md`)
- Participant product: variance 4, motion 3, density 6
- Organizer (org console, pen): variance 3, motion 2, density 7

### Concept

- Public Home / Browse / Auth / participant chrome: **the house**. Slim masthead, rounded photography cards, admission-stub motif, Outfit display. Follows `html.dark` (cool zinc, emerald accent).
- Public event detail: **cover-photo conference**. Stays light-locked (`.pulse-event`). Spec: `design/pages/event-detail.md` + in-page checkout `design/pages/checkout.md`. Tokens in `pulseTheme.ts`.
- Organizer: **org console** per `design/design-system.pen`. Light: white canvas `#FFFFFF`, white 16px cards with hairline `--oc-line`, teal `#0F6E56`. Nested wells use cool `--oc-well` (not cream). Dark: warm ink canvas (`--oc-bg` ~150 16% 7%), elevated `--oc-surface`, teal brand kept. Active filter/tab pills are `bg-oc-ink text-oc-surface` (never `text-white` on ink — ink is light in dark). Status chips (`OrgChip`, studio/house status `Badge`s) are soft-outline: pale `--oc-*-soft` tint, mid-opacity stroke, tone-colored label. Desktop = persistent `OrgTopbar` (Dashboard / Events / Check-in / Finance; Settings in the account menu; theme toggle in the bar). Mobile = `OrgAppBar` + `OrgBottomNav`. Event Studio is the only left rail (`OrgStudioNav` section tabs under the global topbar; sticky, 12px labels). Dashboard Recent events is a table, not thumb-rows. Overview is the edit form, not a public-page snapshot. Check-in keeps the topbar; unlock is centered. Finance is one row: Payouts | Plans. Type: Funnel Sans (headings, H1 22/24px, dashboard greeting ~32/40px), Inter (body), IBM Plex Mono (data). Tokens: `.org-console` `--oc-*` vars in `src/index.css`; primitives in `src/components/organizer-console/`.
- Signature: the **admission stub** — notched ticket geometry, serial `EH-00012`, JetBrains Mono data, QR when the ticket is valid.

### Palette (house)

House pages wrap `.house-page` and follow `html.dark`. Public event detail stays `.pulse-event` light. Do not retune global `--primary` — organizer and event detail share those primitives.

| Role | Value |
| --- | --- |
| Canvas | white `#FFFFFF` |
| Mist | `#F4F6F8` |
| Ink | `#111827` |
| Muted | `#5B6472` |
| Accent | emerald `hsl(160 72% 34%)` (existing `--primary`) |
| On accent | white |
| Border | zinc-200 / `214 16% 90%` |
| Success (confirmed steps) | green `hsl(160 60% 32%)` |

Cool zinc only. Not cream. Not inspiration blue `#2E86FB`. Not orange, rose, or acid green.

### Type

- Display: Outfit Variable (`font-display`)
- Body: Source Sans 3 Variable
- Mono: JetBrains Mono (prices, times, serials)
- Do **not** use Barlow Condensed / `font-lineup` on house surfaces
- Event detail display: Outfit, not condensed

### Radius and chrome

- Controls: 12px
- Cards / images: 16–24px
- Primary CTAs on house pages: pill (`rounded-full`) via local class, not a global `Button` rewrite
- Header: slim full-width bar (`bg-background/90`), 1px bottom border, sticky, 56px tall; theme toggle in the right cluster
- Icons: organizer console = Heroicons 2 outline (`react-icons/hi2` via `orgIcons.ts`). House + shadcn primitives stay lucide.
- Motion: framer-motion; honor `prefers-reduced-motion`

### CTA lock

Home · Browse events · Register · Next event · My Tickets · Create event · Organizer

## Component-level rules

### PublicSiteHeader (house default)

Anatomy: logo left, nav center (Home, Browse events, Next event if signed in + upcoming, My Tickets if signed in), Login + Sign up + Organizer when logged out; avatar menu when logged in.

- Default / hover: ink at 16px medium; muted for idle links; emerald for Sign up pill
- Focus-visible: 2px ring `--ring` offset 2px
- Active route: ink, not a filled chip
- Disabled / loading: 32px spinner, `aria-busy` not required on the bar itself
- Mobile: icon button opens a right sheet with the same links
- Do not restore `tone="lineup"` ink bar
- Event detail uses shared `PublicSiteHeader` (Home, Browse events, Rooms, My Tickets) above the cover hero — not `EventPulseHeader` on the photo and not `EventSectionNav`

### EventCatalogCard

Variants: `grid` (Home and Browse), `row` (upcoming). `feature` remains in the component but is unused on Home.

Anatomy: rounded image, category pill on the photo, title, place, mono price, emerald **Register** (never Book).

- Hover: image scale 1.04 over 300ms; reduced-motion: no scale
- Focus-visible: 2px primary ring, offset on white
- Loading: skeleton matching the variant aspect
- Empty image: mist radial, no stock photo
- Long titles: 2-line clamp
- `loading="lazy"` except the first Home grid card (`eager`)

### SiteFooter

Mist (`#F4F6F8`) multi-column house footer. Shared by Home, Browse, Auth, participant layout, and public event detail (`/events/:id`). On event detail it is light-locked (the page itself stays `.pulse-event`).

- Brand: `Logo` size `sm` plus one short product sentence. No “world’s leading” copy. No social brand icons.
- Platform: Browse events, Create event, Home
- Account: Log in or My Tickets, Organizer
- New listings: email + Subscribe. Stores `eventhub.newsletter-email` in `localStorage`. No Laravel newsletter endpoint. Helper copy must not promise a live digest.
- Bottom bar: hairline, centered `© {year} {name}. All rights reserved.`
- Do not restore circular Search / Ticket / Organizer icon buttons. Do not invent Privacy, Terms, Pricing, Help, or social URLs.

### Admission stub (`PurchasedTicketStub`)

Light perforated pass: serial, date/door/type in mono, QR when `valid`. No QR when waitlisted, cancelled, or unpaid.

- Default: white card, mist notch, emerald spine label “Admit one”
- Hover (when linked): 1px border shift to emerald/30
- Focus-visible: ring on the link wrapper

### Search

Home: What + Where on a white bar overlapping the photo island; concatenates into Laravel `q`. No Date field.

Browse: one search field (title or city) + Search pill.

### Filters (Browse)

Left rail on `lg+`; Sheet on smaller viewports. Categories from `GET /event-categories`. Single select (API is one `filter[event_category_id]`). Clear all resets category + search + page.

Do not invent date or price filters.

### Pagination

Rounded squares. Current page: emerald fill, white type. Previous/Next disabled at ends. Include an accessible current-page name.

## Accessibility requirements

- Text on canvas: ink on white ≥ 4.5:1; muted `#5B6472` on white ≥ 4.5:1
- Primary button: white on emerald ≥ 4.5:1
- Every icon-only control has an accessible name (Open menu, Previous, Next, Filters)
- Focus-visible ring is never `outline: none` without a replacement ring
- `prefers-reduced-motion`: no marquee, no image zoom, framer-motion initial opacity only
- Search fields have visible or `sr-only` labels
- Category filter group has `role="group"` and an accessible name

## Content and tone

Concise, confident, helpful. Sentence case. Locked CTAs only.

- Do: “Browse events”, “Register”, “My Tickets”
- Do not: “Book Now”, “Watch video”, “Get Started For Free”, “on the bill”, fake attendee counts

Empty Browse: “No events match those filters.” Empty tickets: “You have not purchased any tickets yet.”

## Anti-patterns

- Do not clone inspiration blue, Inter/Poppins, Rupiah prices, Venue nav, or notification bells
- Do not restore night-lineup chrome (ink bed, 0px radius, `font-lineup`, 3:4 posters) on house pages
- Do not put house chrome on `/events/:id`
- Do not retune global `--primary`, `--radius`, or `button.tsx` defaults
- Do not invent testimonials, ratings, category photos, or event counts
- Do not add a Date search facet until Laravel supports it
- Do not extract checkout to a separate URL — checkout is an in-page view on `/events/:id`

## QA checklist

- [ ] Home, Browse, Auth, My Tickets, registration detail, event-room shell use `.house-page` and the slim header
- [ ] Dark theme: house + organizer follow `html.dark`; `/events/:id` stays `.pulse-event` light; QR pads stay white
- [ ] `/events/:id` uses `.pulse-event`; hero + black facts bar; two-column white-card body; Register opens in-page checkout; footer is `SiteFooter`
- [ ] Organizer chrome: `OrgTopbar` desktop, `OrgAppBar` + `OrgBottomNav` mobile; studio uses sticky section `OrgStudioNav` (EVENT / PEOPLE / MANAGE) under the topbar with native page scroll; Check-in is not immersive
- [ ] Phone: document scrolls with touch/wheel; studio section chips swipe horizontally; tables become stacked cards or sit in `.h-scroll`; no clipped “half page”
- [ ] Catalog Register goes to `/events/:id`
- [ ] Browse search and category hit confirmed `GET /events` params only
- [ ] Ticket QR hidden unless `paid` / `not_required` and not waitlisted/cancelled
- [ ] Keyboard: tab to header, search, cards, pagination; visible focus
- [ ] Reduced-motion: no zoom, no carousel autoplay (there is none)
- [ ] Mobile: Browse filters in a sheet; Home hero island + search stack; catalog is a uniform card grid
- [ ] Home organizer CTA uses **Create event**, not “Get Started For Free”, and is not inspiration blue
- [ ] Footer has no circular Search / Ticket / Organizer icons; newsletter field is labeled

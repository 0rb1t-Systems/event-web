# Landing (`/`) — overrides Master

Public Home is the house: a catalog desk, not a SaaS marketing page and not a night lineup.

- `PublicSiteHeader` default: slim white bar. Wrapper: `.house-page`. Do not restyle the header here; it is shared with Browse / Auth / tickets.
- Hero: contained hall photograph (`src/assets/hero-bg.jpg`) in a rounded island, Outfit headline at industry scale (`text-[1.75rem]` to `lg:text-[2.25rem]`), short subtext, no event cards in the hero. Search (What + Where → Laravel `q`) overlaps the island on a white bar. Search is the primary action. No uppercase season/locale kicker. No fake city stats.
- Signed-in with a next event: slim “Next up” bar above the hero.
- Events (`#events`): live `GET /events`. Uniform `EventCatalogCard` grid (`text-sm` titles, 16:9 thumbs, 4 columns at `xl`). Category chips (`filter[event_category_id]`). **Browse events** opens `/events` with the same filters. No featured lead. No fake thumbnails, attending counts, or totals beyond Laravel `total`.
- After the catalog: one organizer CTA island (same hall photo, grayscale + dark overlay, centered type). Button is **Create event** (emerald pill) to `/organizer/register`, or `/organizer/events` if an organizer session is already live. Do not use “Get Started For Free” or a blue CTA. Do not restore How it works or the pass specimen on this page.
- Footer: shared mist `SiteFooter` — brand + Platform + Account + New listings email field. No circular icon shortcuts. No fake social brands or Privacy/Terms routes. Newsletter stores the address in `localStorage` only (no Laravel digest route).
- Type on this page is industry scale (hero ~24–32px, section titles `text-lg`/`text-xl`, body `text-sm`, card titles `text-sm`). Browse, event detail, and My Tickets share the same tighter display scale.
- Copy uses locked CTAs. No fake social proof. No marquee. No `font-lineup`.

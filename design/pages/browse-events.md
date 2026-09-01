# Browse events (`/events`) — overrides Master

Same house language as Home.

- `PublicSiteHeader` default. Wrapper: `.house-page`.
- Masthead: Outfit “Upcoming events” (or “Browse events”) + listing count in muted type, not a giant condensed numeral.
- Search field + Search pill. Reads `q`, `category`, `page` from the URL so Home search lands here.
- Filters rail (`lg+`): category list from `GET /event-categories`, Clear all. Single select. Mobile: Filters sheet.
- Results: 1 / 2 / 3 column `grid` cards (`EventCatalogCard variant="grid"`).
- Pagination: numbered rounded squares; current page emerald fill.
- Empty: “No events match those filters.”
- Do not restore ink posters, category chips-on-ink, or “on the bill” copy.

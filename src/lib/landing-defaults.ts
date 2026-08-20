// Default copy for each Landing section. Use `{brand}` where the platform
// name should appear — Landing interpolates via `applyBrandName`.
// Fake Lovable testimonials were removed (no real quotes yet; do not invent a CMS).

export type LandingSectionKey =
  | "hero"
  | "popular_events"
  | "features"
  | "cta";

export interface HeroContent {
  badge: string;
  headline_prefix: string;
  rotating_words: string[];
  subhead: string;
  cta: string;
}

export interface PopularEventsContent {
  title_line_1: string;
  title_line_2: string;
  subhead: string;
  cta_label: string;
}

export interface FeaturesContent {
  eyebrow: string;
  title_line_1: string;
  title_line_2: string;
  subhead: string;
  items: { tag: string; title: string; description: string }[];
}

export interface CtaContent {
  title_line_1: string;
  title_line_2: string;
  subhead: string;
  cta_label: string;
}

/** Replace `{brand}` (and legacy `eventspark`) with the live platform name. */
export function applyBrandName(text: string, brandName: string): string {
  return text
    .replaceAll("{brand}", brandName)
    .replaceAll(/eventspark/gi, brandName);
}

export const LANDING_DEFAULTS = {
  hero: {
    badge: "For organizers everywhere",
    headline_prefix: "The event platform where ideas become",
    rotating_words: ["events.", "experiences.", "communities.", "connections."],
    subhead:
      "Whatever your event — from workshops to conferences — build branded registration pages, track attendees, and grow your community. No code required.",
    cta: "Get started",
  } as HeroContent,
  popular_events: {
    title_line_1: "Popular events",
    title_line_2: "on {brand}",
    subhead: "A glimpse at the experiences our community is hosting right now.",
    cta_label: "Browse all events",
  } as PopularEventsContent,
  features: {
    eyebrow: "Built for organizers",
    title_line_1: "Everything you need to",
    title_line_2: "run amazing events.",
    subhead: "From page creation to post-event analytics, {brand} has you covered.",
    items: [
      { tag: "Pages", title: "Pages in minutes", description: "Beautiful registration pages that make your event shine — no design skills needed." },
      { tag: "Insights", title: "Understand everything", description: "Live dashboards that show where attendees come from, drop off, and convert." },
      { tag: "Integrations", title: "Integrate with everything", description: "Connect Zoom, HubSpot, Mailchimp, and 20+ tools in a few clicks." },
      { tag: "Audience", title: "One hub for everyone", description: "Manage, message, and track every attendee from a single beautiful dashboard." },
    ],
  } as FeaturesContent,
  cta: {
    title_line_1: "Ready to launch",
    title_line_2: "your next event?",
    subhead: "Join thousands of organizers who use {brand} to build better events.",
    cta_label: "Get started for free",
  } as CtaContent,
};

export type LandingContentMap = {
  hero: HeroContent;
  popular_events: PopularEventsContent;
  features: FeaturesContent;
  cta: CtaContent;
};

export const LANDING_SECTION_LABELS: Record<LandingSectionKey, string> = {
  hero: "Hero",
  popular_events: "Popular events heading",
  features: "Features grid",
  cta: "Final call to action",
};

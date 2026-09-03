import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCard } from "./EventCard";
import { PULSE } from "./pulseTheme";

type EventModule = any;

interface ModuleProps {
  module: EventModule;
  brandColor: string;
  index: number;
  fullWidth?: boolean;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function WhyAttend({ module: m }: ModuleProps) {
  const c = m.content || {};
  const bullets: string[] = Array.isArray(c.bullets) ? c.bullets : [];
  if (bullets.length === 0) return null;

  return (
    <EventCard id={m.id} heading={c.heading || "Why attend this event"}>
      <ul className="space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: PULSE.teal }}
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </EventCard>
  );
}

type ScheduleItem = {
  time: string;
  endTime?: string;
  title: string;
  description?: string;
  room?: string;
  starts_at?: string | null;
  speaker?: { name: string; avatar?: string };
};

function dayKey(iso: string | null | undefined, fallback: string) {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string | null | undefined, fallback: string) {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function Schedule({ module: m }: ModuleProps) {
  const c = m.content || {};
  const items: ScheduleItem[] = Array.isArray(c.items) ? c.items : [];
  const days = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: ScheduleItem[] }>();
    items.forEach((it, i) => {
      const key = dayKey(it.starts_at, "day");
      const existing = map.get(key);
      if (existing) existing.items.push(it);
      else map.set(key, { key, label: dayLabel(it.starts_at, `Day ${i + 1}`), items: [it] });
    });
    return Array.from(map.values());
  }, [items]);

  const [day, setDay] = useState(days[0]?.key ?? "day");
  const selected = days.find((d) => d.key === day) ?? days[0];
  const list = selected?.items ?? items;
  const showTabs = days.length > 1;

  return (
    <EventCard id={m.id} heading={c.heading || "Agenda"}>
      {showTabs && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((d) => {
            const on = d.key === selected?.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDay(d.key)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  on ? "text-white" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                style={on ? { background: PULSE.teal } : undefined}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      )}

      <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-border">
        {list.map((it, i) => (
          <motion.li key={`${it.title}-${i}`} {...fadeUp} className="relative pl-12">
            <div
              className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
              style={{ color: PULSE.teal }}
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-sm font-semibold tracking-tight sm:text-base">
                  {it.title}
                </h3>
                {it.time ? (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
                    style={{ background: `${PULSE.teal}1a`, color: PULSE.tealDark }}
                  >
                    {it.time}
                  </span>
                ) : null}
              </div>
              {(it.room || it.speaker?.name) ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {[it.room, it.speaker?.name].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {it.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.description}</p>
              ) : null}
            </article>
          </motion.li>
        ))}
      </ol>
    </EventCard>
  );
}

type Person = { name: string; role: string; avatar?: string; bio?: string };

function Speakers({ module: m }: ModuleProps) {
  const c = m.content || {};
  const people: Person[] = Array.isArray(c.people) ? c.people : [];
  if (people.length === 0) return null;

  return (
    <EventCard id={m.id} heading={c.heading || "Featured speakers"}>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {people.map((p, i) => (
          <li key={`${p.name}-${i}`} className="flex flex-col items-center text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-muted sm:h-[5.5rem] sm:w-[5.5rem]">
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-white"
                  style={{ background: PULSE.navy }}
                >
                  {(p.name || "?").charAt(0)}
                </div>
              )}
            </div>
            <p className="mt-3 font-display text-sm font-semibold leading-snug">
              {p.name}
            </p>
            {p.role ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.role}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </EventCard>
  );
}

function longDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function detailTimeRange(start?: string | null, end?: string | null) {
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} - ${b}`;
  return a || b || "";
}

type EventDetailProps = {
  event: {
    event_date?: string | null;
    event_end_date?: string | null;
    city?: string | null;
    location?: string | null;
    location_type?: string | null;
  };
  module?: EventModule;
};

export function EventDetailSidebar({ event, module: m }: EventDetailProps) {
  const c = m?.content || {};
  const venue =
    c.venue ||
    (event.location_type === "virtual" ? "Online event" : event.city) ||
    undefined;
  const address =
    c.address ||
    (event.location_type !== "virtual" ? event.location : undefined) ||
    undefined;
  const dateLabel = longDate(event.event_date);
  const timeLabel = detailTimeRange(event.event_date, event.event_end_date);
  const query = [address, venue].filter(Boolean).join(", ");
  const showMap =
    c.showMap !== false &&
    event.location_type !== "virtual" &&
    !!query;
  const mapHref = query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : c.mapUrl;
  const embedSrc = showMap && query
    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
    : null;

  if (!dateLabel && !timeLabel && !venue && !address) return null;

  return (
    <EventCard id={m?.id ?? "event-detail"} heading="Event Detail">
      <ul className="space-y-3 text-sm text-muted-foreground">
        {dateLabel ? (
          <li className="flex gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PULSE.teal }} strokeWidth={2} />
            <span>{dateLabel}</span>
          </li>
        ) : null}
        {timeLabel ? (
          <li className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PULSE.teal }} strokeWidth={2} />
            <span>{timeLabel}</span>
          </li>
        ) : null}
        {(venue || address) ? (
          <li className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PULSE.teal }} strokeWidth={2} />
            <div>
              {venue ? <p className="font-medium text-foreground">{venue}</p> : null}
              {address ? <p className={venue ? "mt-0.5 text-muted-foreground" : undefined}>{address}</p> : null}
            </div>
          </li>
        ) : null}
      </ul>
      {embedSrc ? (
        <div className="mt-4">
          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold hover:underline"
              style={{ color: PULSE.tealDark }}
            >
              View on Map
            </a>
          ) : null}
          <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-xl bg-muted">
            <iframe
              title="Venue map"
              src={embedSrc}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      ) : null}
    </EventCard>
  );
}

function PartnerLogo({ name, logo }: { name?: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = !!logo && !failed;

  if (showImg) {
    return (
      <img
        src={logo}
        alt={name || ""}
        onError={() => setFailed(true)}
        className="h-8 max-h-8 w-auto max-w-[7rem] object-contain sm:h-9 sm:max-h-9 sm:max-w-[8rem]"
      />
    );
  }

  return (
    <span className="px-1 text-center text-xs font-semibold leading-snug text-foreground">
      {name || "Partner"}
    </span>
  );
}

export function Sponsors({ module: m }: ModuleProps) {
  const c = m.content || {};
  const logos: string[] = Array.isArray(c.logos) ? c.logos : [];
  const named: { name?: string; logo?: string }[] = Array.isArray(c.partners)
    ? c.partners.filter((p: { name?: string; logo?: string }) => p?.name || p?.logo)
    : logos.map((logo) => ({ logo }));
  if (named.length === 0) return null;

  return (
    <EventCard id={m.id} heading={c.heading || "Partners"}>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {named.map((partner, i) => (
          <li
            key={`${partner.logo || partner.name}-${i}`}
            className="flex h-16 items-center justify-center rounded-xl border border-border bg-muted px-3"
          >
            <PartnerLogo name={partner.name} logo={partner.logo} />
          </li>
        ))}
      </ul>
    </EventCard>
  );
}

function Custom({ module: m }: ModuleProps) {
  const c = m.content || {};
  const body: string = c.body || "";
  const imageUrl: string | undefined = c.image_url;

  return (
    <EventCard id={m.id} heading={c.heading}>
      {imageUrl && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img src={imageUrl} alt="" className="h-auto max-h-[40vh] w-full object-cover" />
        </div>
      )}
      <div className="relative">
        <Quote className="absolute -left-0.5 -top-1 h-6 w-6 text-muted" />
        <div className="whitespace-pre-wrap pl-8 text-sm leading-relaxed text-muted-foreground">{body}</div>
      </div>
    </EventCard>
  );
}

function Gallery({ module: m, fullWidth }: ModuleProps) {
  const c = m.content || {};
  const images: string[] = Array.isArray(c.images)
    ? c.images.filter((u: unknown): u is string => typeof u === "string" && !!u)
    : c.image_url
      ? [c.image_url]
      : [];

  if (images.length === 0) return null;

  return (
    <EventCard id={m.id} heading={c.heading || "Gallery"}>
      <div
        className={cn(
          "grid gap-2 sm:gap-2.5",
          fullWidth
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={cn(
              "overflow-hidden rounded-xl bg-muted",
              i === 0 && images.length > 1
                ? fullWidth
                  ? "col-span-2 aspect-[16/10] sm:col-span-3 lg:col-span-4"
                  : "col-span-2 aspect-[16/10] sm:col-span-3"
                : "aspect-square",
            )}
          >
            <img
              src={src}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </EventCard>
  );
}

export function PublicModule(props: ModuleProps) {
  switch (props.module.type) {
    case "why_attend": return <WhyAttend {...props} />;
    case "schedule":   return <Schedule {...props} />;
    case "speakers":   return <Speakers {...props} />;
    case "location":   return null;
    case "faq":        return null;
    case "sponsors":   return null;
    case "gallery":    return <Gallery {...props} />;
    case "custom":     return <Custom {...props} />;
    default:           return null;
  }
}

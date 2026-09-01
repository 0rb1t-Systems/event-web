import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Plus, Quote } from "lucide-react";
type EventModule = any;
import SectionIcon from "@/components/event-detail/SectionIcon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { PULSE } from "./pulseTheme";

interface ModuleProps {
  module: EventModule;
  brandColor: string;
  index: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function SectionShell({
  id,
  heading,
  children,
  className,
  invert,
}: {
  id?: string;
  heading?: string;
  children: React.ReactNode;
  className?: string;
  invert?: boolean;
}) {
  return (
    <section id={id} className={cn("relative w-full scroll-mt-24 px-5 py-8 sm:px-8 sm:py-12", className)}>
      <div className="mx-auto max-w-5xl">
        {heading && (
          <motion.div {...fadeUp} className="mb-6 sm:mb-8">
            <h2
              className={cn(
                "max-w-xl font-display text-lg font-semibold tracking-tight sm:text-xl",
                invert ? "text-white" : "text-slate-900",
              )}
            >
              {heading}
            </h2>
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}

function WhyAttend({ module: m }: ModuleProps) {
  const c = m.content || {};
  const bullets: string[] = Array.isArray(c.bullets) ? c.bullets : [];
  const heading = c.heading || "Why attend";
  const [featured, ...rest] = bullets;

  return (
    <SectionShell id={m.id} heading={heading}>
      <div className="space-y-3">
        {featured ? (
          <motion.div
            {...fadeUp}
            className="rounded-2xl px-5 py-5 sm:px-6 sm:py-6"
            style={{ background: PULSE.mint }}
          >
            <p className="max-w-[46ch] text-base font-medium leading-snug text-slate-800 sm:text-lg">
              {featured}
            </p>
          </motion.div>
        ) : null}

        {rest.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((b, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                className="rounded-2xl bg-white px-5 py-4"
              >
                <p className="text-sm leading-relaxed text-slate-600">{b}</p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </SectionShell>
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

function sessionTime(it: ScheduleItem) {
  return it.time || "";
}

function splitHeading(heading: string) {
  const parts = heading.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { lead: heading, rest: "" };
  return { lead: parts[0], rest: parts.slice(1).join(" ") };
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
  const [open, setOpen] = useState<number | null>(null);
  const selected = days.find((d) => d.key === day) ?? days[0];
  const list = selected?.items ?? items;
  const showTabs = days.length > 1;
  const heading = c.heading || "Agenda overview";
  const { lead, rest } = splitHeading(heading);
  const allHaveSpeakers = list.length > 0 && list.every((row) => !!row.speaker?.name);

  return (
    <section id={m.id} className="scroll-mt-24 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp}>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            Our agenda
          </p>
          <h2 className="mt-2 font-display text-lg font-semibold tracking-tight sm:text-xl">
            <span className="text-slate-900">{lead}</span>
            {rest ? <span className="font-semibold text-slate-400"> {rest}</span> : null}
          </h2>
        </motion.div>

        {showTabs && (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {days.map((d) => {
              const on = d.key === selected?.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setDay(d.key);
                    setOpen(null);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    on ? "text-white" : "bg-white text-slate-600 hover:text-slate-900",
                  )}
                  style={on ? { background: PULSE.teal } : undefined}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}

        <ol className="mt-8 space-y-3">
          {list.map((it, i) => {
            const isOpen = open === i;
            const hasBody = !!it.description;
            const accent = !it.speaker?.name || (allHaveSpeakers && i === 0);
            return (
              <li key={`${it.title}-${i}`}>
                <article
                  className={cn(
                    "rounded-2xl px-5 py-5 sm:rounded-[1.25rem] sm:px-7 sm:py-6",
                    accent
                      ? "bg-[#E8EEF2]"
                      : "bg-white shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)]",
                  )}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:gap-x-8">
                    <div className="col-start-1">
                      <p className="text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                        {sessionTime(it)}
                      </p>
                      {it.room ? (
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {it.room}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
                      <h3 className="font-display text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                        {it.title}
                      </h3>
                      {hasBody ? (
                        <p className={cn(
                          "mt-1.5 text-sm leading-relaxed text-slate-500",
                          !isOpen && "line-clamp-2 sm:line-clamp-1",
                        )}>
                          {it.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-start-2 row-start-1 flex items-start gap-3 sm:col-start-3 sm:row-start-1 sm:min-w-[9rem] sm:justify-end">
                      {it.speaker?.name ? (
                        <div className="hidden min-w-0 sm:block sm:text-right">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Speaker</p>
                          <p className="truncate text-sm font-semibold text-slate-900">{it.speaker.name}</p>
                        </div>
                      ) : null}
                      {hasBody ? (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide session details" : "Show session details"}
                          onClick={() => setOpen(isOpen ? null : i)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-900"
                        >
                          <Plus className="h-5 w-5 transition-transform" strokeWidth={1.75} style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }} />
                        </button>
                      ) : null}
                    </div>
                    {it.speaker?.name ? (
                      <p className="col-span-2 text-sm font-semibold text-slate-900 sm:hidden">
                        <span className="mr-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Speaker</span>
                        {it.speaker.name}
                      </p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

type Person = { name: string; role: string; avatar?: string; bio?: string };

function Speakers({ module: m }: ModuleProps) {
  const c = m.content || {};
  const people: Person[] = Array.isArray(c.people) ? c.people : [];
  if (people.length === 0) return null;

  return (
    <section id={m.id} className="scroll-mt-24 px-5 py-8 sm:px-8 sm:py-10" style={{ background: PULSE.teal }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
          {c.heading || "Meet our speakers"}
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p, i) => (
            <li
              key={`${p.name}-${i}`}
              className="flex items-start gap-3 rounded-2xl bg-white p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-display text-base font-bold text-white"
                    style={{ background: PULSE.navy }}
                  >
                    {(p.name || "?").charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-display text-sm font-semibold leading-snug text-slate-900">{p.name}</p>
                {p.role ? <p className="mt-0.5 truncate text-xs text-slate-500">{p.role}</p> : null}
                {p.bio ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{p.bio}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Location({ module: m }: ModuleProps) {
  const c = m.content || {};
  const imageUrl: string | undefined = c.image_url;
  const showMap = c.showMap !== false && !!(c.address || c.venue);
  const query = [c.address, c.venue].filter(Boolean).join(", ");
  const mapHref = query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : c.mapUrl;
  const embedSrc = query
    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
    : null;

  return (
    <SectionShell id={m.id} heading={c.heading || "Find us here"}>
      <div className={cn("grid grid-cols-1 gap-4", showMap ? "lg:grid-cols-2 lg:items-start" : "")}>
        <div className="relative min-h-[240px] overflow-hidden rounded-2xl sm:min-h-[320px] lg:min-h-[400px]">
          {imageUrl ? (
            <img src={imageUrl} alt={c.venue || "Venue"} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${PULSE.navy}, ${PULSE.sky})` }} />
          )}
          {(c.venue || c.address) ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 sm:p-8">
              {c.venue ? <p className="font-display text-xl font-semibold text-white">{c.venue}</p> : null}
              {c.address ? <p className="mt-1 text-sm text-white/80">{c.address}</p> : null}
            </div>
          ) : null}
        </div>
        {showMap ? (
          <div className="relative min-h-[240px] overflow-hidden rounded-2xl bg-slate-100 sm:min-h-[320px] lg:mt-10 lg:min-h-[360px]">
            {embedSrc ? (
              <iframe
                title="Venue map"
                src={embedSrc}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col justify-end p-8">
                {c.address ? <p className="text-slate-600">{c.address}</p> : null}
                {mapHref ? (
                  <a href={mapHref} target="_blank" rel="noreferrer" className="mt-4 font-semibold" style={{ color: PULSE.tealDark }}>
                    Open in maps
                  </a>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function Faq({ module: m }: ModuleProps) {
  const c = m.content || {};
  const items: { q: string; a: string }[] = Array.isArray(c.items) ? c.items : [];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SectionShell id={m.id} heading={c.heading || "FAQ"}>
      <div className="space-y-3">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-2xl bg-white">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-start justify-between gap-6 p-5 text-left sm:p-6">
                <span className="font-semibold text-slate-900">{f.q}</span>
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700" style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} className="overflow-hidden">
                <p className="max-w-3xl px-5 pb-5 text-slate-500 sm:px-6 sm:pb-6">{f.a}</p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </SectionShell>
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
        className="h-10 max-h-10 w-auto max-w-[8.5rem] object-contain sm:h-11 sm:max-h-11 sm:max-w-[10rem]"
      />
    );
  }

  return (
    <span className="px-1 text-center text-xs font-semibold leading-snug text-slate-800">
      {name || "Partner"}
    </span>
  );
}

function Sponsors({ module: m }: ModuleProps) {
  const c = m.content || {};
  const logos: string[] = Array.isArray(c.logos) ? c.logos : [];
  const named: { name?: string; logo?: string }[] = Array.isArray(c.partners)
    ? c.partners.filter((p: { name?: string; logo?: string }) => p?.name || p?.logo)
    : logos.map((logo) => ({ logo }));
  if (named.length === 0) return null;

  return (
    <section
      id={m.id}
      className="scroll-mt-24 py-10 sm:py-14"
      style={{ background: PULSE.navy }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
          {c.heading || "Partners"}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 lg:grid-cols-4">
          {named.map((partner, i) => (
            <li
              key={`${partner.logo || partner.name}-${i}`}
              className="flex h-[5.25rem] items-center justify-center rounded-2xl bg-white px-4 sm:h-24"
            >
              <PartnerLogo name={partner.name} logo={partner.logo} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Custom({ module: m }: ModuleProps) {
  const c = m.content || {};
  const body: string = c.body || "";
  const imageUrl: string | undefined = c.image_url;

  return (
    <SectionShell id={m.id} heading={c.heading}>
      {imageUrl && (
        <div className="mb-8 overflow-hidden rounded-[1.75rem]">
          <img src={imageUrl} alt="" className="h-auto max-h-[60vh] w-full object-cover" />
        </div>
      )}
      <div className="relative max-w-2xl">
        <Quote className="absolute -left-1 -top-2 h-8 w-8 text-slate-200" />
        <div className="whitespace-pre-wrap pl-10 text-sm leading-relaxed text-slate-600">{body}</div>
      </div>
    </SectionShell>
  );
}

function Gallery({ module: m }: ModuleProps) {
  const c = m.content || {};
  const images: string[] = Array.isArray(c.images)
    ? c.images.filter((u: unknown): u is string => typeof u === "string" && !!u)
    : c.image_url
      ? [c.image_url]
      : [];

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || images.length < 2 || paused) return;
    const id = window.setInterval(() => api.scrollNext(), 4000);
    return () => window.clearInterval(id);
  }, [api, images.length, paused]);

  if (images.length === 0) return null;

  return (
    <SectionShell id={m.id} heading={c.heading || "Gallery"}>
      <div
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        {images.length === 1 ? (
          <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
            <img src={images[0]} alt="" className="h-full w-full object-cover" />
          </div>
        ) : images.length <= 3 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={cn(
                  "overflow-hidden rounded-2xl bg-slate-100",
                  i === 0 ? "col-span-2 aspect-[16/10] lg:col-span-3 lg:aspect-[4/3]" : "aspect-square lg:col-span-2",
                )}
              >
                <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Carousel setApi={setApi} opts={{ loop: true, align: "start" }} className="w-full">
              <CarouselContent className="-ml-0">
                {images.map((src, i) => (
                  <CarouselItem key={`${src}-${i}`} className="basis-full pl-0">
                    <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                      <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3 h-10 w-10 rounded-full border-0 bg-white text-slate-900 shadow" />
              <CarouselNext className="right-3 h-10 w-10 rounded-full border-0 bg-white text-slate-900 shadow" />
            </Carousel>
            <div className="mt-4 flex items-center justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={cn("h-2 rounded-full", i === current ? "w-6" : "w-2 bg-slate-300")}
                  style={i === current ? { background: PULSE.teal } : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </SectionShell>
  );
}

export function PublicModule(props: ModuleProps) {
  switch (props.module.type) {
    case "why_attend": return <WhyAttend {...props} />;
    case "schedule":   return <Schedule {...props} />;
    case "speakers":   return <Speakers {...props} />;
    case "location":   return <Location {...props} />;
    case "faq":        return <Faq {...props} />;
    case "sponsors":   return <Sponsors {...props} />;
    case "gallery":    return <Gallery {...props} />;
    case "custom":     return <Custom {...props} />;
    default: {
      const c = props.module.content || {};
      return (
        <SectionShell id={props.module.id} heading={c.heading}>
          <div className="flex items-center gap-3 text-slate-400">
            <SectionIcon type={props.module.type} color={PULSE.teal} size={24} />
            <span className="text-sm">Section</span>
          </div>
        </SectionShell>
      );
    }
  }
}

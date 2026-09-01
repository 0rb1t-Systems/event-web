import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Hero } from "./Hero";
import { StickyRegisterBar } from "./StickyRegisterBar";
import { PublicModule } from "./PublicModule";
import { EventFactsBar } from "./EventFactsBar";
import { EventSectionNav, type EventSectionLink } from "./EventSectionNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";
import { PULSE } from "./pulseTheme";

type Event = any;
type EventModule = any;

const MODULE_RAIL: Record<string, string> = {
  why_attend: "Why attend",
  schedule: "Agenda",
  speakers: "Speakers",
  location: "Venue",
  sponsors: "Partners",
  gallery: "Gallery",
  faq: "FAQ",
  custom: "Notes",
};

interface Props {
  event: Event;
  modules: EventModule[];
  formSlot: React.ReactNode;
  registerLabel?: string;
  registerDisabled?: boolean;
}

function dateOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function timeOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function timeRange(start?: string | null, end?: string | null) {
  const a = timeOnly(start);
  const b = timeOnly(end);
  if (a && b) return `${a} - ${b}`;
  return a || b || "";
}

function splitLead(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?[.!?])(?:\s+|$)([\s\S]*)$/);
  if (!match || !match[2]?.trim()) return { lead: trimmed, rest: "" };
  return { lead: match[1], rest: match[2].trim() };
}

export function PublicEventPage({
  event,
  modules,
  formSlot,
  registerLabel,
  registerDisabled,
}: Props) {
  const registerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRegisterClick = () => {
    if (registerDisabled) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/events/${event.id}`)}`);
      return;
    }
    scrollToRegister();
  };

  const visibleModules = useMemo(
    () =>
      modules
        .filter((m) => m.enabled)
        .sort((a, b) => a.position - b.position),
    [modules],
  );

  const locationLabel =
    event.location_type === "physical" ? "In-Person" :
    event.location_type === "hybrid" ? "Hybrid" : "Virtual";

  const venueLabel =
    event.location_type === "virtual"
      ? "Online"
      : event.city || event.location || null;

  const sections = useMemo<EventSectionLink[]>(() => {
    const list: EventSectionLink[] = [];
    if (event.description) list.push({ id: "about", label: "About" });
    for (const m of visibleModules) {
      const label = MODULE_RAIL[m.type] || m.title;
      if (label && m.id) list.push({ id: String(m.id), label });
    }
    list.push({ id: "register", label: "Register" });
    return list;
  }, [event.description, visibleModules]);

  const aboutCopy = event.description ? splitLead(event.description) : null;

  return (
    <div className="pulse-event min-h-screen overflow-x-hidden" style={{ background: PULSE.paper, color: PULSE.ink }}>
      <Hero
        event={event}
        sections={sections}
        onRegisterClick={handleRegisterClick}
        registerLabel={registerLabel}
        registerDisabled={registerDisabled}
      />

      <EventFactsBar
        dateLabel={dateOnly(event.event_date) || null}
        timeLabel={timeRange(event.event_date, event.event_end_date) || null}
        venueLabel={venueLabel}
        accessLabel={locationLabel}
      />

      {aboutCopy && (
        <section id="about" className="scroll-mt-24 px-5 py-8 sm:px-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="mx-auto max-w-5xl"
          >
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              About this event
            </h2>
            <div className="mt-4 max-w-[62ch] border-l-2 pl-4 sm:mt-5 sm:pl-5" style={{ borderColor: PULSE.teal }}>
              <p className="font-display text-base font-medium leading-snug tracking-tight text-slate-900 sm:text-lg">
                {aboutCopy.lead}
              </p>
              {aboutCopy.rest ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {aboutCopy.rest}
                </p>
              ) : null}
            </div>
          </motion.div>
        </section>
      )}

      <EventSectionNav sections={sections} />

      <StickyRegisterBar
        brandColor={PULSE.teal}
        eventName={event.name}
        onRegisterClick={handleRegisterClick}
        registerLabel={registerLabel}
        registerDisabled={registerDisabled}
      />

      {visibleModules.map((m, i) => (
        <PublicModule key={m.id} module={m} brandColor={PULSE.teal} index={i} />
      ))}

      <section
        ref={registerRef}
        id="register"
        className="scroll-mt-24 px-5 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Register
            </h2>
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              for {event.name}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-8">
            {formSlot}
          </div>
        </div>
      </section>

      <div className="house-page">
        <SiteFooter onLight />
      </div>
      <div className="h-24" aria-hidden />
    </div>
  );
}

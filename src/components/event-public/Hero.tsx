import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EventCountdown } from "./EventCountdown";
import { EventPulseHeader } from "./EventPulseHeader";
import type { EventSectionLink } from "./EventSectionNav";
import { PULSE } from "./pulseTheme";

type Event = {
  name: string;
  description?: string | null;
  event_date?: string | null;
  background_image_url?: string;
  category_name?: string;
  location_type?: string;
};

interface Props {
  event: Event;
  sections: EventSectionLink[];
  onRegisterClick: () => void;
  registerLabel?: string;
  registerDisabled?: boolean;
}

function trimWords(text: string, max = 20) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return text.trim();
  return `${words.slice(0, max).join(" ").replace(/[,;:]$/, "")}.`;
}

function accessBadge(event: Event) {
  if (event.category_name) return event.category_name;
  if (event.location_type === "physical") return "In person";
  if (event.location_type === "hybrid") return "Hybrid";
  if (event.location_type === "virtual") return "Online";
  return null;
}

export function Hero({
  event,
  sections,
  onRegisterClick,
  registerLabel = "Register",
  registerDisabled = false,
}: Props) {
  const reduce = useReducedMotion();
  const cover = event.background_image_url;
  const blurb = event.description ? trimWords(event.description) : "";
  const badge = accessBadge(event);

  return (
    <div className="px-2.5 pt-2.5 sm:px-4 sm:pt-3 lg:px-5">
      <section className="relative min-h-[18rem] overflow-hidden rounded-[1.25rem] text-white sm:min-h-[22rem] sm:rounded-[1.5rem] lg:min-h-[24rem] lg:rounded-[1.75rem]">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(165deg, ${PULSE.navy} 0%, ${PULSE.navyMid} 50%, ${PULSE.sky} 100%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <EventPulseHeader
          sections={sections}
          onRegisterClick={onRegisterClick}
          registerLabel={registerLabel}
          registerDisabled={registerDisabled}
        />

        <div className="relative z-10 flex min-h-[16rem] flex-col justify-end px-4 pb-16 pt-4 sm:min-h-[20rem] sm:px-8 sm:pb-24 lg:px-10 lg:pb-28">
          <div className="max-w-xl">
            {badge ? (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm"
                style={{ color: PULSE.teal }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: PULSE.teal }} />
                {badge}
              </motion.p>
            ) : null}

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="break-words font-display text-[1.5rem] font-bold leading-[1.15] tracking-tight sm:text-[1.75rem] lg:text-[2.125rem]"
            >
              {event.name}
            </motion.h1>

            {blurb ? (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="mt-3 max-w-md text-sm leading-relaxed text-white/85"
              >
                {blurb}
              </motion.p>
            ) : null}

            <EventCountdown targetIso={event.event_date} tone="dark" size="compact" className="mt-4 justify-start sm:mt-5" />

            <motion.button
              type="button"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              disabled={registerDisabled}
              onClick={onRegisterClick}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/80 px-4 text-sm font-semibold backdrop-blur-sm disabled:opacity-60 sm:mt-5"
              style={{ color: PULSE.teal }}
            >
              {registerLabel}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
}

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PULSE } from "./pulseTheme";

export type EventSectionLink = {
  id: string;
  label: string;
};

type Props = {
  sections: EventSectionLink[];
};

export function EventSectionNav({ sections }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [show, setShow] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setShow(v > 300));

  useEffect(() => {
    if (sections.length === 0) return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActive(top);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2 || !show) return null;

  return (
    <nav aria-label="On this page" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-2 sm:top-4 sm:px-3">
      <div className="pointer-events-auto flex max-w-[calc(100%-1rem)] gap-0.5 overflow-x-auto rounded-full bg-white/95 p-1 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] backdrop-blur-md scrollbar-none sm:max-w-[calc(100%-1.5rem)]">
        {sections.map((section) => {
          const on = active === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:py-1.5",
                on ? "text-white" : "text-slate-600 hover:text-slate-900",
              )}
              style={on ? { background: PULSE.teal } : undefined}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

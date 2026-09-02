import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { EventSection } from "@/lib/organizerStudioRoutes";
import { studioSectionPath } from "@/lib/organizerStudioRoutes";
import { EVENT_STATUS_LABELS } from "@/lib/organizerEventAdapters";
import { cn } from "@/lib/utils";
import { OrgChip } from "./OrgChip";
import { orgEventStatusTone } from "./orgTheme";
import {
  IconArrowLeft,
  IconBanknotes,
  IconCalendar,
  IconDashboard,
  IconMic,
  IconPhoto,
  IconQr,
  IconSettings,
  IconTicket,
  IconUsers,
  IconWheel,
  type OrgIconType,
} from "./orgIcons";

interface StudioNavItem {
  key: EventSection;
  label: string;
  icon: OrgIconType;
}

const STUDIO_GROUPS: Array<{ label: string; items: StudioNavItem[] }> = [
  {
    label: "EVENT",
    items: [
      { key: "overview", label: "Overview", icon: IconDashboard },
      { key: "tickets", label: "Tickets", icon: IconTicket },
      { key: "content", label: "Program", icon: IconMic },
      { key: "branding", label: "Invitation", icon: IconPhoto },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { key: "attendees", label: "Attendees", icon: IconUsers },
      { key: "scanner", label: "Check-in", icon: IconQr },
      { key: "lucky-wheel", label: "Lucky wheel", icon: IconWheel },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { key: "finance", label: "Finance", icon: IconBanknotes },
      { key: "settings", label: "Settings", icon: IconSettings },
    ],
  },
];

export const STUDIO_NAV_FLAT = STUDIO_GROUPS.flatMap((g) => g.items);

interface StudioNavProps {
  eventId: number;
  active: EventSection;
  eventName: string;
  status: string;
  bannerUrl?: string | null;
}

/** Desktop Event Studio section sidebar — sticky while the page scrolls. */
export function OrgStudioNav({ eventId, active, eventName, status, bannerUrl }: StudioNavProps) {
  const statusLabel = EVENT_STATUS_LABELS[status] || status;

  return (
    <aside className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-oc-line py-5 pr-5 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
      <Link
        to="/organizer/events"
        className="flex items-center gap-2 px-2 py-2 rounded-[10px] text-[12px] font-medium text-oc-muted hover:text-oc-ink hover:bg-oc-surface transition-colors"
      >
        <IconArrowLeft className="w-3.5 h-3.5" />
        All events
      </Link>

      <div className="flex items-center gap-2.5 px-2 py-3 mb-2">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-9 h-9 rounded-[10px] object-cover shrink-0" />
        ) : (
          <span className="w-9 h-9 rounded-[10px] shrink-0 bg-[linear-gradient(145deg,#12876A,#0A5140)] flex items-center justify-center">
            <IconCalendar className="w-4 h-4 text-white/80" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-oc-ink truncate">{eventName}</p>
          <OrgChip label={statusLabel} tone={orgEventStatusTone(status)} size="sm" className="mt-1" />
        </div>
      </div>

      <nav className="flex flex-col gap-5" aria-label="Event studio sections">
        {STUDIO_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-bold tracking-[1.2px] text-oc-faint px-3">{group.label}</p>
            {group.items.map((item) => {
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  to={studioSectionPath(eventId, item.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[12px] transition-colors",
                    isActive
                      ? "bg-oc-brand-soft text-oc-brand-strong font-semibold"
                      : "text-oc-muted font-medium hover:text-oc-ink hover:bg-oc-surface",
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Mobile studio section chips — swipe horizontally; does not widen the page. */
export function OrgStudioMobileNav({ eventId, active }: { eventId: number; active: EventSection }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav
      className="lg:hidden -mx-4 border-b border-oc-line"
      aria-label="Event studio sections"
    >
      <div className="h-scroll scrollbar-none touch-pan-x">
        <div className="flex items-center gap-1 min-w-max h-11 px-4">
          {STUDIO_NAV_FLAT.map((item) => {
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                ref={isActive ? activeRef : undefined}
                to={studioSectionPath(eventId, item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 h-full -mb-px border-b-2 px-2.5 text-[12px] whitespace-nowrap transition-colors",
                  isActive
                    ? "border-oc-brand text-oc-ink font-semibold"
                    : "border-transparent text-oc-muted font-medium",
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

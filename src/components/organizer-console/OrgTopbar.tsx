import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";
import { orgInitials } from "./orgTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  IconBanknotes,
  IconCalendar,
  IconDashboard,
  IconLogoMark,
  IconLogout,
  IconQr,
  IconSettings,
  type OrgIconType,
} from "./orgIcons";

/** Primary organizer nav — shared by the desktop topbar and the mobile bottom tabs. */
export const ORG_NAV_ITEMS: Array<{
  title: string;
  url: string;
  icon: OrgIconType;
  end: boolean;
}> = [
  { title: "Dashboard", url: "/organizer/dashboard", icon: IconDashboard, end: true },
  { title: "Events", url: "/organizer/events", icon: IconCalendar, end: false },
  { title: "Check-in", url: "/organizer/scanner", icon: IconQr, end: true },
  { title: "Finance", url: "/organizer/finance", icon: IconBanknotes, end: false },
];

export function OrgLogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="bg-oc-brand rounded-[8px] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <IconLogoMark className="text-white" style={{ width: size * 0.53, height: size * 0.53 }} />
    </span>
  );
}

function AccountMenu() {
  const { organizer, logout } = useOrganizer();
  const navigate = useNavigate();
  const businessName = organizer?.business_name || organizer?.contact_name || "Organizer";
  const contactName = organizer?.contact_name || organizer?.business_name || "Organizer";
  const email = organizer?.email || "";

  const handleSignOut = async () => {
    await logout();
    navigate("/organizer/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-oc-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-brand"
        >
          <span className="w-[30px] h-[30px] rounded-full bg-oc-accent-soft text-oc-accent flex items-center justify-center text-xs font-bold shrink-0">
            {orgInitials(contactName)}
          </span>
          <span className="hidden xl:block text-sm font-semibold text-oc-ink max-w-[140px] truncate">
            {businessName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-oc-ink truncate">{businessName}</span>
          {email ? <span className="text-xs font-normal text-oc-muted truncate">{email}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/organizer/settings">
            <IconSettings className="w-3.5 h-3.5 mr-2" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <IconLogout className="w-3.5 h-3.5 mr-2" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Persistent desktop console chrome — logo, nav tabs, account. */
export function OrgTopbar() {
  const { name: platformName } = useBranding();

  return (
    <header className="hidden lg:block sticky top-0 z-30 border-b border-oc-line bg-oc-bg/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center gap-6">
        <Link to="/organizer/dashboard" className="flex items-center gap-2.5 shrink-0" aria-label={platformName}>
          <OrgLogoMark />
          <span className="font-head font-bold text-lg text-oc-ink tracking-tight">{platformName}</span>
        </Link>

        <nav className="flex items-center gap-1 h-full" aria-label="Organizer">
          {ORG_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-2 h-full -mb-px border-b-2 px-3 text-sm transition-colors",
                  isActive
                    ? "border-oc-brand text-oc-ink font-semibold"
                    : "border-transparent text-oc-muted font-medium hover:text-oc-ink",
                )
              }
            >
              <item.icon className="w-[17px] h-[17px] shrink-0" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <ThemeToggle tone="org" />
        <AccountMenu />
      </div>
    </header>
  );
}

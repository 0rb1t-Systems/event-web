import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { IconLogout, IconSettings } from "./orgIcons";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { useBranding } from "@/contexts/BrandingContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ORG_NAV_ITEMS, OrgLogoMark } from "./OrgTopbar";
import { orgInitials } from "./orgTheme";

/** Mobile top bar — AppBar from design-system.pen mobile frames. */
export function OrgAppBar() {
  const { organizer, logout } = useOrganizer();
  const { name: platformName } = useBranding();
  const navigate = useNavigate();
  const contactName = organizer?.contact_name || organizer?.business_name || "Organizer";

  const handleSignOut = async () => {
    await logout();
    navigate("/organizer/login");
  };

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-2.5 sticky top-0 z-30 bg-oc-bg/95 backdrop-blur">
      <Link to="/organizer/dashboard" className="flex items-center gap-2">
        <OrgLogoMark size={28} />
        <span className="font-head font-bold text-[17px] text-oc-ink tracking-tight">{platformName}</span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle tone="org" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Organizer menu"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oc-brand"
            >
              <span className="w-[30px] h-[30px] rounded-full bg-oc-accent-soft text-oc-accent flex items-center justify-center text-[11px] font-bold">
                {orgInitials(contactName)}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <p className="px-2 py-1.5 text-xs text-muted-foreground truncate">{organizer?.email}</p>
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
      </div>
    </header>
  );
}

/** Mobile bottom tab bar — BottomNav from design-system.pen mobile frames. */
export function OrgBottomNav() {
  return (
    <nav
      aria-label="Organizer"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-oc-surface border-t border-oc-line px-6 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] flex items-center justify-between"
    >
      {ORG_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-[3px] px-1 py-0.5 rounded-md min-w-[44px] min-h-[44px] justify-center",
              isActive ? "text-oc-brand" : "text-oc-faint",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-5 h-5" />
              <span className={cn("text-[11px]", isActive ? "font-bold" : "font-medium")}>
                {item.title}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

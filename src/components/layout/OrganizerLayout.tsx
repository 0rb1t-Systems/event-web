import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";

const organizerNavItems = [
  { title: "Dashboard", url: "/organizer/dashboard", icon: LayoutDashboard },
  { title: "Events", url: "/organizer/events", icon: CalendarDays },
  { title: "Payouts", url: "/organizer/payouts", icon: Wallet },
  { title: "Settings", url: "/organizer/settings", icon: Settings },
];

export function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { organizer, logout } = useOrganizer();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate("/organizer/login");
  };

  const displayName = organizer?.business_name || organizer?.contact_name || organizer?.email || "Organizer";
  const initials = (organizer?.business_name?.[0] ?? organizer?.contact_name?.[0] ?? organizer?.email?.[0] ?? "O").toUpperCase();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className="h-14 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 border-b border-border/40">
        <Link to="/organizer/dashboard" className="lg:mr-4 shrink-0">
          <Logo size="sm" />
        </Link>

        <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground px-2.5 py-1 rounded-full bg-muted">
          Organizer Portal
        </span>

        <div className="hidden lg:flex flex-1 items-center h-full">
          <div className="flex items-center gap-1">
            {organizerNavItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
              >
                {item.title}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex-1 lg:hidden" />

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Organizer account menu"
                className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity hover:opacity-80"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-foreground text-background text-xs font-semibold uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{displayName}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/organizer/settings"><Settings className="w-3.5 h-3.5 mr-2" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-3.5 h-3.5 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden h-10 w-10 -mr-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0 flex flex-col">
            <div className="h-14 flex items-center px-5 border-b border-border/40">
              <div>
                <Logo size="sm" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  Organizer Portal
                </p>
              </div>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {organizerNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-4 h-11 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                    activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border/40 space-y-1">
              {organizer && (
                <div className="px-3 py-2 text-xs text-muted-foreground truncate">{displayName}</div>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 h-11 text-sm font-medium text-destructive rounded-full hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <main ref={mainRef} className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
    </div>
  );
}

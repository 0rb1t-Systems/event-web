import { useEffect, useRef, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearNewEventDraft } from "@/lib/eventDraft";
import { getMediaUrl } from "@/lib/mediaUrl";
import {
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  Ticket,
  LayoutDashboard,
} from "lucide-react";

/** Participant shell only — organizer nav lives under OrganizerLayout. */
const participantNavItems = [
  { title: "Browse Events", url: "/", icon: CalendarDays },
  { title: "My Registrations", url: "/dashboard/home", icon: Ticket },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { isAuthenticated: organizerAuthed } = useOrganizer();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    clearNewEventDraft();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className="h-14 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 border-b border-border/40">
        <Link to="/dashboard/home" className="lg:mr-6 shrink-0">
          <Logo size="sm" />
        </Link>

        <div className="hidden lg:flex flex-1 items-center h-full">
          <div className="flex items-center gap-1">
            {participantNavItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.title}
              </NavLink>
            ))}
            {organizerAuthed && (
              <NavLink
                to="/organizer/dashboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
              >
                Organizer Dashboard
              </NavLink>
            )}
          </div>
        </div>

        <div className="flex-1 lg:hidden" />

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Participant account menu"
                className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity hover:opacity-80"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={getMediaUrl(user?.profile_image)}
                    alt={user?.name || user?.email || "Account"}
                  />
                  <AvatarFallback className="bg-foreground text-background text-xs font-semibold uppercase">
                    {(user?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user.name || user.email}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings className="w-3.5 h-3.5 mr-2" /> Account settings
                </Link>
              </DropdownMenuItem>
              {organizerAuthed && (
                <DropdownMenuItem asChild>
                  <Link to="/organizer/dashboard">
                    <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Organizer Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
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
              className="lg:hidden h-11 w-11 -mr-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0 flex flex-col">
            <div className="h-14 flex items-center px-5">
              <Logo size="sm" />
            </div>
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {participantNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.url === "/"}
                    className="flex items-center gap-3 px-4 h-11 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                    activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
              {organizerAuthed && (
                <NavLink
                  to="/organizer/dashboard"
                  className="flex items-center gap-3 px-4 h-11 text-sm font-medium text-muted-foreground rounded-full transition-colors hover:text-foreground hover:bg-muted"
                  activeClassName="bg-foreground text-background hover:bg-foreground hover:text-background"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Organizer Dashboard</span>
                </NavLink>
              )}
            </nav>
            <div className="p-3 border-t border-border/40 space-y-1">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getMediaUrl(user.profile_image)} alt={user.name || user.email} />
                    <AvatarFallback className="bg-foreground text-background text-xs font-semibold uppercase">
                      {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground truncate">{user.name || user.email}</div>
                  </div>
                </div>
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
      <main ref={mainRef} className="flex-1 p-4 sm:p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

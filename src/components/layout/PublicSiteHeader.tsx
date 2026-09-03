import { Link, NavLink } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getMediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";
import { CalendarDays, Home, LayoutDashboard, LogOut, Menu, Settings, Ticket, Users } from "lucide-react";
import { useState, type ComponentType } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Props = {
  className?: string;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 h-10 inline-flex items-center rounded-full text-base font-medium transition-colors",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex w-full min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
    isActive ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
  );

function MobileNavItem({
  to,
  end,
  icon: Icon,
  children,
  onNavigate,
}: {
  to: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <NavLink to={to} end={end} className={mobileNavClass} onClick={onNavigate}>
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </NavLink>
  );
}

export function PublicSiteHeader({ className }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAuthenticated: organizerAuthed, isLoading: organizerLoading } = useOrganizer();
  const [open, setOpen] = useState(false);

  const organizerHref = organizerAuthed ? "/organizer/dashboard" : "/organizer/login";

  return (
    <div className={cn("sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl", className)}>
      <header className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="shrink-0 px-1">
          <Logo size="sm" />
        </Link>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/events" end className={navClass}>
            Browse events
          </NavLink>
          {user && (
            <NavLink to="/dashboard/rooms" className={navClass}>
              Rooms
            </NavLink>
          )}
          {user && (
            <NavLink to="/dashboard/home" className={navClass}>
              My Tickets
            </NavLink>
          )}
        </nav>

        <div className="hidden lg:flex ml-auto items-center gap-2">
          <ThemeToggle />
          {authLoading || organizerLoading ? (
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={getMediaUrl(user.profile_image)} alt={user.name || user.email || "Account"} />
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold uppercase">
                      {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.name || user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/home">
                    <Ticket className="w-3.5 h-3.5 mr-2" /> My Tickets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">
                    <Settings className="w-3.5 h-3.5 mr-2" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={organizerHref}>
                    <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Organizer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void signOut()}>
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="rounded-full" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/auth">Sign up</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to={organizerHref}>Organizer</Link>
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 sm:max-w-xs [&>button]:top-5 [&>button]:right-4"
            >
              <div className="flex h-16 shrink-0 items-center border-b border-border px-5 pr-14">
                <Logo size="sm" />
              </div>

              <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
                  <MobileNavItem to="/" end icon={Home} onNavigate={() => setOpen(false)}>
                    Home
                  </MobileNavItem>
                  <MobileNavItem to="/events" end icon={CalendarDays} onNavigate={() => setOpen(false)}>
                    Browse events
                  </MobileNavItem>
                  {user ? (
                    <>
                      <MobileNavItem to="/dashboard/rooms" icon={Users} onNavigate={() => setOpen(false)}>
                        Rooms
                      </MobileNavItem>
                      <MobileNavItem to="/dashboard/home" icon={Ticket} onNavigate={() => setOpen(false)}>
                        My Tickets
                      </MobileNavItem>
                    </>
                  ) : null}
                </div>

                {user ? (
                  <>
                    <div className="my-3 border-t border-border" />
                    <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
                      <MobileNavItem to="/dashboard/settings" icon={Settings} onNavigate={() => setOpen(false)}>
                        Settings
                      </MobileNavItem>
                      <MobileNavItem to={organizerHref} icon={LayoutDashboard} onNavigate={() => setOpen(false)}>
                        Organizer
                      </MobileNavItem>
                    </div>
                  </>
                ) : null}
              </nav>

              <div className="shrink-0 border-t border-border px-4 py-4">
                {authLoading || organizerLoading ? (
                  <div className="flex h-12 items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : user ? (
                  <button
                    type="button"
                    className="flex w-full min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                    Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="h-12 w-full rounded-xl text-base" asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">Log in</Link>
                    </Button>
                    <Button className="h-12 w-full rounded-xl text-base" asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">Sign up</Link>
                    </Button>
                    <Button variant="ghost" className="h-12 w-full rounded-xl text-base" asChild onClick={() => setOpen(false)}>
                      <Link to={organizerHref}>Organizer</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </div>
  );
}

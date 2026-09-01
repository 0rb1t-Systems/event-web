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
import { useMyParticipations } from "@/hooks/queries/useParticipations";
import { pickNextParticipation } from "@/lib/nextEvent";
import { getMediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LogOut, Menu, Settings, Ticket } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Props = {
  className?: string;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 h-9 inline-flex items-center rounded-full text-sm font-medium transition-colors",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

export function PublicSiteHeader({ className }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAuthenticated: organizerAuthed, isLoading: organizerLoading } = useOrganizer();
  const { data: parts } = useMyParticipations(!!user);
  const next = user ? pickNextParticipation(parts?.items ?? []) : null;
  const [open, setOpen] = useState(false);

  const organizerHref = organizerAuthed ? "/organizer/dashboard" : "/organizer/login";

  return (
    <div className={cn("sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl", className)}>
      <header className="mx-auto flex h-14 w-full min-w-0 max-w-7xl items-center gap-2 px-4 sm:px-6">
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
          {user && next && (
            <NavLink to="/dashboard/rooms" className={navClass}>
              Next event
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

        <div className="ml-auto lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-80 flex-col p-0">
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <Logo size="sm" />
                <ThemeToggle />
              </div>
              <nav className="flex-1 px-3 py-3 space-y-1" onClick={() => setOpen(false)}>
                <NavLink to="/" end className={navClass}>
                  Home
                </NavLink>
                <NavLink to="/events" end className={navClass}>
                  Browse events
                </NavLink>
                {user && next && (
                  <NavLink to="/dashboard/rooms" className={navClass}>
                    Next event
                  </NavLink>
                )}
                {user && (
                  <NavLink to="/dashboard/home" className={navClass}>
                    My Tickets
                  </NavLink>
                )}
                {user ? (
                  <>
                    <NavLink to="/dashboard/settings" className={navClass}>
                      Settings
                    </NavLink>
                    <NavLink to={organizerHref} className={navClass}>
                      Organizer
                    </NavLink>
                    <button
                      type="button"
                      className="w-full text-left px-3 h-10 rounded-full text-sm font-medium text-destructive hover:bg-destructive/10"
                      onClick={() => void signOut()}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/auth" className={navClass}>
                      Log in
                    </NavLink>
                    <NavLink to="/auth" className={navClass}>
                      Sign up
                    </NavLink>
                    <NavLink to={organizerHref} className={navClass}>
                      Organizer
                    </NavLink>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </div>
  );
}

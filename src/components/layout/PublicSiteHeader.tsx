import { Link } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getMediaUrl } from "@/lib/mediaUrl";
import { LogOut, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** When true, bar is always visible (non-landing pages). */
  solid?: boolean;
  className?: string;
};

/**
 * Public site navbar. Participant and organizer sessions may coexist —
 * they are never merged into one identity.
 */
export function PublicSiteHeader({ solid, className }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAuthenticated: organizerAuthed, isLoading: organizerLoading } = useOrganizer();

  const organizerHref = organizerAuthed ? "/organizer/dashboard" : "/organizer/login";
  const organizerLabel = organizerAuthed ? "Organizer Dashboard" : "Organizer Portal";

  return (
    <header
      className={cn(
        "w-full z-50",
        solid ? "relative border-b border-border/40 bg-background" : "bg-background/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-[72px] px-6 lg:px-8 gap-3">
        <Link to="/" className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <Button variant="ghost" className="text-sm font-medium h-11 px-3" asChild>
            <Link to="/">Browse Events</Link>
          </Button>

          {authLoading || organizerLoading ? (
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {user ? (
                <>
                  <Button variant="ghost" className="hidden sm:inline-flex text-sm font-medium h-11 px-3" asChild>
                    <Link to="/dashboard/home">My Registrations</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Participant account menu"
                        className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity hover:opacity-80 ml-1"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={getMediaUrl(user.profile_image)}
                            alt={user.name || user.email || "Account"}
                          />
                          <AvatarFallback className="bg-foreground text-background text-xs font-semibold uppercase">
                            {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                        {user.name || user.email}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/home">My Registrations</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/settings">
                          <Settings className="w-3.5 h-3.5 mr-2" /> Account settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => void signOut()}
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2" /> Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="text-sm font-medium h-11 px-3" asChild>
                    <Link to="/auth">Log in</Link>
                  </Button>
                  <Button className="hidden sm:inline-flex text-sm font-semibold h-11" asChild>
                    <Link to="/auth">Sign up</Link>
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                className="text-sm font-medium h-11 px-3 rounded-full"
                asChild
              >
                <Link to={organizerHref}>
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                  {organizerLabel}
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

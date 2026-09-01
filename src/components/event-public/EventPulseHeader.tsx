import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
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
import { ArrowUpRight, LayoutDashboard, LogOut, Menu, Settings, Ticket } from "lucide-react";
import { useState } from "react";
import { PULSE } from "./pulseTheme";
import type { EventSectionLink } from "./EventSectionNav";

type Props = {
  sections: EventSectionLink[];
  onRegisterClick: () => void;
  registerLabel: string;
  registerDisabled?: boolean;
};

function RegisterButton({
  label,
  disabled,
  onClick,
  className,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-90",
        className,
      )}
      style={{ color: PULSE.teal }}
    >
      {label}
      <ArrowUpRight className="hidden h-3.5 w-3.5 sm:block" strokeWidth={2.25} />
    </button>
  );
}

export function EventPulseHeader({
  sections,
  onRegisterClick,
  registerLabel,
  registerDisabled,
}: Props) {
  const { user, loading, signOut } = useAuth();
  const { isAuthenticated: organizerAuthed } = useOrganizer();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const organizerHref = organizerAuthed ? "/organizer/dashboard" : "/organizer/login";

  return (
    <div className="relative z-20 flex items-center gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
      <Link to="/" className="min-w-0 shrink">
        <Logo size="sm" onDark className="max-w-[7.5rem] [&_.font-display]:text-white [&_img]:max-w-full sm:max-w-[9.5rem]" />
      </Link>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          {loading ? (
            <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Account menu" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getMediaUrl(user.profile_image)} alt={user.name || user.email || "Account"} />
                    <AvatarFallback className="bg-white/20 text-xs font-semibold text-white">
                      {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.name || user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/home">
                    <Ticket className="mr-2 h-3.5 w-3.5" /> My Tickets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/events">Browse events</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">
                    <Settings className="mr-2 h-3.5 w-3.5" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={organizerHref}>
                    <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Organizer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              className="hidden rounded-full px-2.5 py-1.5 text-sm font-medium text-white/90 hover:text-white lg:inline-flex"
              onClick={() => navigate("/auth")}
            >
              Log in
            </button>
          )}
        </div>

        <RegisterButton
          label={registerLabel}
          disabled={registerDisabled}
          onClick={onRegisterClick}
        />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" aria-label="Open menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(20rem,88vw)] p-0">
            <div className="flex flex-col gap-1 p-4">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-xl px-3 py-3 text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  {section.label}
                </a>
              ))}
              <Link to="/events" className="rounded-xl px-3 py-3 text-sm font-medium" onClick={() => setOpen(false)}>
                Browse events
              </Link>
              {!user ? (
                <button
                  type="button"
                  className="rounded-xl px-3 py-3 text-left text-sm font-medium"
                  onClick={() => {
                    setOpen(false);
                    navigate("/auth");
                  }}
                >
                  Log in
                </button>
              ) : (
                <Link to="/dashboard/home" className="rounded-xl px-3 py-3 text-sm font-medium" onClick={() => setOpen(false)}>
                  My Tickets
                </Link>
              )}
              <button
                type="button"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
                style={{ background: PULSE.black, color: PULSE.teal }}
                onClick={() => {
                  setOpen(false);
                  onRegisterClick();
                }}
              >
                {registerLabel}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

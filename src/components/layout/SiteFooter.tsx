import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";

const NEWSLETTER_KEY = "event24.newsletter-email";

function readSavedEmail() {
  try {
    return localStorage.getItem(NEWSLETTER_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

type SiteFooterProps = {
  /** Keep the light wordmark (event detail stays light-locked). */
  onLight?: boolean;
};

export function SiteFooter({ onLight = false }: SiteFooterProps) {
  const { name } = useBranding();
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const [email, setEmail] = useState(readSavedEmail);
  const [saved, setSaved] = useState(() => Boolean(readSavedEmail()));

  const onSubscribe = (e: FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!next) return;
    try {
      localStorage.setItem(NEWSLETTER_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    setSaved(true);
    toast.success("Saved on this device.");
  };

  return (
    <footer className="border-t border-border bg-muted text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <Link to="/" className="inline-block">
              <Logo size="sm" onLight={onLight} />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Find events in the public catalog, register on the event page, and keep every pass in My Tickets.
            </p>
          </div>

          <nav aria-label="Platform">
            <p className="text-sm font-semibold text-foreground">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/events" className="transition-colors hover:text-foreground">
                  Browse events
                </Link>
              </li>
              <li>
                <Link to="/organizer/register" className="transition-colors hover:text-foreground">
                  Create event
                </Link>
              </li>
              <li>
                <Link to="/" className="transition-colors hover:text-foreground">
                  Home
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <p className="text-sm font-semibold text-foreground">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                {user ? (
                  <Link to="/dashboard/home" className="transition-colors hover:text-foreground">
                    My Tickets
                  </Link>
                ) : (
                  <Link to="/auth" className="transition-colors hover:text-foreground">
                    Log in
                  </Link>
                )}
              </li>
              <li>
                <Link to="/organizer/login" className="transition-colors hover:text-foreground">
                  Organizer
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-sm font-semibold text-foreground">New listings</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Leave an email for catalog notes. There is no live digest yet.
            </p>
            {saved ? (
              <div className="mt-3">
                <p className="text-sm text-foreground">Saved: {email}</p>
                <button
                  type="button"
                  className="mt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setSaved(false)}
                >
                  Change email
                </button>
              </div>
            ) : (
              <form onSubmit={onSubscribe} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="footer-newsletter">
                  Email
                </label>
                <Input
                  id="footer-newsletter"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-background"
                />
                <Button type="submit" className="h-10 shrink-0 rounded-full">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-5">
          <p className="text-center text-xs text-muted-foreground">
            © {year} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

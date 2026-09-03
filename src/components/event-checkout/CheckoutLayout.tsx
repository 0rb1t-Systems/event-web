import { Link } from "react-router-dom";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CheckoutStepper, type CheckoutStepId } from "./CheckoutStepper";

type Props = {
  eventId: number;
  eventName: string;
  current: CheckoutStepId;
  children: React.ReactNode;
  onBackToEvent?: () => void;
};

export function CheckoutLayout({ eventId, eventName, current, children, onBackToEvent }: Props) {
  return (
    <div className="pulse-event min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="px-1.5">/</span>
          {onBackToEvent ? (
            <button type="button" onClick={onBackToEvent} className="hover:text-foreground">
              Event
            </button>
          ) : (
            <Link to={`/events/${eventId}`} className="hover:text-foreground">Event</Link>
          )}
          <span className="px-1.5">/</span>
          <span className="font-medium text-foreground">Checkout</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Checkout
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{eventName}</p>
          </div>
          <CheckoutStepper current={current} />
        </div>

        <div className="mt-6 sm:mt-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

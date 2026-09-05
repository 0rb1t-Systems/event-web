import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ticket } from "lucide-react";
import { useMyParticipations } from "@/hooks/queries/useParticipations";
import { PurchasedTicketStub } from "@/components/participant/PurchasedTicketStub";
import { attendeeTicketStatusBadge } from "@/lib/statusBadges";
import { purchasedParticipations } from "@/lib/nextEvent";

export default function AttendeeHome() {
  const { data, isLoading, isError, refetch, error } = useMyParticipations();
  const tickets = purchasedParticipations(data?.items ?? []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Home / My Tickets</p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">My Tickets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every ticket you purchased. Open one for the pass and details.
          </p>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="house-card rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Could not load your tickets."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="house-card rounded-2xl border border-border bg-card p-10 text-center space-y-4">
          <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You have not purchased any tickets yet.</p>
          <Button className="rounded-full" asChild>
            <Link to="/events">Browse events</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-5">
          {tickets.map((p) => {
            const badge = attendeeTicketStatusBadge(p);
            return (
              <li key={p.id}>
                <PurchasedTicketStub
                  href={`/registrations/${p.id}`}
                  ticket={{
                    id: p.id,
                    title: p.event?.title ?? "Event",
                    location: [p.event?.address, p.event?.city].filter(Boolean).join(", ") || null,
                    startsAt: p.event?.starts_at,
                    endsAt: p.event?.ends_at,
                    eventStatus: p.event?.status,
                    status: p.status,
                    ticketType: p.ticket_type?.name,
                    qrToken: p.qr_token,
                    valid: true,
                    statusLabel: badge?.label ?? null,
                    statusBadgeClass: badge?.badgeClass,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

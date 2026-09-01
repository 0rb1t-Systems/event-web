import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { catalogPlaceLabel } from "@/lib/eventMode";
import { pickHeroBackgroundImage, type PublicEventCatalogItem } from "@/lib/publicEventsAdapters";

function minPriceLabel(event: PublicEventCatalogItem) {
  const tickets = event.ticket_types ?? event.ticketTypes ?? [];
  const prices = tickets
    .map((t) => Number(t.price))
    .filter((n) => Number.isFinite(n));
  if (!prices.length) return "Free";
  const min = Math.min(...prices);
  return min > 0 ? `From $${Math.round(min)}` : "Free";
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  event: PublicEventCatalogItem;
  variant?: "feature" | "grid" | "row";
  eager?: boolean;
};

export function EventCatalogCard({ event, variant = "grid", eager = false }: Props) {
  const img = pickHeroBackgroundImage(event);
  const place = catalogPlaceLabel(event);
  const price = minPriceLabel(event);
  const category = event.category?.name;
  const when = formatWhen(event.starts_at);

  if (variant === "row") {
    return (
      <Link
        to={`/events/${event.id}`}
        className="group block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <article className="house-card flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:p-3">
          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-[4.5rem] sm:w-[7.5rem]">
            {img ? (
              <img
                src={img}
                alt=""
                loading={eager ? "eager" : "lazy"}
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : null}
            {category ? (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-medium text-primary">
                {category}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 text-primary" />
              {when}
            </p>
            <h3 className="mt-0.5 font-display text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
              {event.title}
            </h3>
            {place ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                {place}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p className="font-mono text-xs font-medium text-primary">{price}</p>
            <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground">
              Register
            </span>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full cursor-pointer flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <article className="house-card flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {img ? (
            <img
              src={img}
              alt=""
              loading={eager ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)),hsl(var(--muted))_62%)]" />
          )}
          {category ? (
            <span className="absolute left-2 top-2 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-medium text-primary">
              {category}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="font-display text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
            {event.title}
          </h3>
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3 shrink-0 text-primary" />
            {when}
          </p>
          {place ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="line-clamp-1">{place}</span>
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <p className="font-mono text-xs font-medium text-primary">{price}</p>
            <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground">
              Register
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

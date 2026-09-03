import { CalendarDays, Clock, MapPin } from "lucide-react";
import { getMediaUrl } from "@/lib/mediaUrl";
import { PULSE } from "@/components/event-public/pulseTheme";

type Props = {
  title: string;
  bannerUrl?: string | null;
  bannerPath?: string | null;
  categoryName?: string | null;
  location?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatTimeRange(start?: string | null, end?: string | null) {
  const a = formatTime(start);
  const b = formatTime(end);
  if (a && b) return `${a} - ${b}`;
  return a || b || null;
}

export function ConfirmationEventCard({
  title,
  bannerUrl,
  bannerPath,
  categoryName,
  location,
  startsAt,
  endsAt,
}: Props) {
  const image = bannerUrl || (bannerPath ? getMediaUrl(bannerPath) : null);
  const dateLabel = formatDate(startsAt);
  const timeLabel = formatTimeRange(startsAt, endsAt);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative h-36 bg-muted sm:h-40">
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${PULSE.navy}, ${PULSE.sky})` }}
          />
        )}
      </div>
      <div className="space-y-3 p-5">
        {categoryName ? (
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {categoryName}
          </span>
        ) : null}
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {location ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: PULSE.teal }} />
            {location}
          </p>
        ) : null}
        {(dateLabel || timeLabel) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {dateLabel ? (
              <div className="rounded-xl bg-muted px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" style={{ color: PULSE.teal }} />
                  Date
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{dateLabel}</p>
              </div>
            ) : null}
            {timeLabel ? (
              <div className="rounded-xl bg-muted px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" style={{ color: PULSE.teal }} />
                  Time
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{timeLabel}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

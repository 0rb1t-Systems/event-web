type Fact = { label: string; value: string };

type Props = {
  dateLabel?: string | null;
  timeLabel?: string | null;
  venueLabel?: string | null;
  accessLabel?: string | null;
};

export function EventFactsBar({ dateLabel, timeLabel, venueLabel, accessLabel }: Props) {
  const facts: Fact[] = [
    dateLabel ? { label: "Date", value: dateLabel } : null,
    timeLabel ? { label: "Time", value: timeLabel } : null,
    venueLabel ? { label: "Venue", value: venueLabel } : null,
    accessLabel ? { label: "Access", value: accessLabel } : null,
  ].filter((f): f is Fact => !!f);

  if (facts.length === 0) return null;

  return (
    <section className="relative z-10 -mt-8 px-3 sm:-mt-10 sm:px-5 lg:-mt-12 lg:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-[#0B0B0B] px-5 py-4 text-white sm:gap-x-6 sm:px-6 sm:py-5 lg:grid-cols-4 lg:py-6">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-white/50">
              {fact.label}
            </p>
            <p className="mt-1 font-display text-sm font-semibold leading-snug tracking-tight sm:text-base">
              {fact.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

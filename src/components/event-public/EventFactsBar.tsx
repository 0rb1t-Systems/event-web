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
    <section className="relative z-10 -mt-7 px-3 sm:-mt-9 sm:px-6 lg:-mt-10 lg:px-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-[#0B0B0B] px-4 py-4 text-white sm:gap-6 sm:px-6 sm:py-5 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <p className="text-[11px] text-white/50">{fact.label}</p>
            <p className="mt-0.5 font-display text-sm font-semibold leading-snug tracking-tight">
              {fact.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

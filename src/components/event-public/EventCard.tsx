import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  heading?: string;
  children: React.ReactNode;
  className?: string;
};

export function EventCard({ id, heading, children, className }: Props) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:rounded-[1.125rem] sm:p-6",
        className,
      )}
    >
      {heading ? (
        <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
          {heading}
        </h2>
      ) : null}
      <div className={heading ? "mt-4 sm:mt-5" : undefined}>{children}</div>
    </section>
  );
}

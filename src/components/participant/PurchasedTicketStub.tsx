import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export type TicketStubModel = {
  id: number;
  title: string;
  location?: string | null;
  startsAt?: string | null;
  ticketType?: string | null;
  qrToken?: string | null;
  valid: boolean;
  statusLabel?: string | null;
};

function padId(id: number) {
  return `EH-${String(id).padStart(5, "0")}`;
}

function dayPart(iso: string | null | undefined) {
  if (!iso) return { day: "--", month: "TBA" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
  };
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function PurchasedTicketStub({
  ticket,
  href,
  className,
}: {
  ticket: TicketStubModel;
  href?: string;
  className?: string;
}) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!ticket.valid || !ticket.qrToken) {
      setQr("");
      return;
    }
    QRCode.toDataURL(ticket.qrToken, {
      width: 240,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [ticket.valid, ticket.qrToken]);

  const when = dayPart(ticket.startsAt);
  const location = (ticket.location || "").trim();
  const serial = padId(ticket.id);

  const body = (
    <article
      className={cn(
        "house-card relative overflow-hidden rounded-2xl border border-border bg-card text-foreground",
        className,
      )}
    >
      <div className="relative flex min-h-[9.5rem] flex-col sm:flex-row">
        <div className="flex h-10 shrink-0 items-center justify-between bg-primary px-4 sm:h-auto sm:w-11 sm:flex-col sm:justify-center sm:px-0 sm:py-5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-primary-foreground sm:[writing-mode:vertical-rl] sm:rotate-180">
            Admit one
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              EventHub pass · {serial}
            </p>
            {ticket.statusLabel ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                {ticket.statusLabel}
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold leading-snug tracking-tight sm:text-xl">
              {ticket.title}
            </h3>
            {location ? <p className="mt-2 text-sm text-muted-foreground">{location}</p> : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Date" value={`${when.day} ${when.month}`} />
            <Field label="Door" value={formatTime(ticket.startsAt)} />
            <Field label="Type" value={ticket.ticketType || "General"} />
          </div>
        </div>

        <div className="relative flex shrink-0 flex-col items-center justify-center gap-3 border-t border-dashed border-border px-5 py-5 sm:w-44 sm:border-l sm:border-t-0">
          <div className="flex h-[5.75rem] w-[5.75rem] items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-border">
            {ticket.valid && qr ? (
              <img src={qr} alt="" className="h-full w-full" />
            ) : (
              <p className="px-3 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
                {ticket.valid ? "Encoding" : "Locked"}
              </p>
            )}
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Door chip</p>
        </div>
      </div>
    </article>
  );

  if (!href) return body;
  return (
    <Link to={href} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}

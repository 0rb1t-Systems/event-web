/**
 * Organizer console design helpers — tokens from design/design-system.pen.
 * The console palette itself lives in `index.css` under `.org-console`.
 */

export type OrgChipTone = "brand" | "plain" | "faint" | "amber" | "bad";

/** Active filter / tab pills. `text-white` on `bg-oc-ink` disappears in dark (ink is light). */
export const orgFilterOnClass = "bg-oc-ink text-oc-surface";
export const orgFilterOffClass =
  "bg-oc-surface border border-oc-line text-oc-muted hover:text-oc-ink";

/** White pill on dark scanner / result panels — never use `text-oc-ink` (flips light in dark mode). */
export const orgOnWhiteBtnClass =
  "bg-white text-[hsl(156_28%_7%)] hover:bg-white/90 disabled:opacity-60";

/** Soft-outline status chip: pale tint, mid-opacity stroke, tone-colored label. */
export const orgChipToneClass: Record<OrgChipTone, string> = {
  brand: "bg-oc-brand-soft border-oc-brand/40 text-oc-brand-strong",
  plain: "bg-oc-well border-oc-line text-oc-muted",
  faint: "bg-oc-well border-oc-faint/35 text-oc-faint",
  amber: "bg-oc-accent-soft border-oc-accent/45 text-oc-accent-strong",
  bad: "bg-oc-bad-soft border-oc-bad/40 text-oc-bad",
};

/** Deterministic cover-thumb gradient per event (teal/amber/slate rotation). */
const THUMB_CLASSES = [
  "org-thumb-teal",
  "org-thumb-amber",
  "org-thumb-slate",
] as const;

export function orgThumbClass(seed: number | string | null | undefined): string {
  const key = String(seed ?? "event");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return THUMB_CLASSES[hash % THUMB_CLASSES.length];
}

/** Chip tone for an event status. */
export function orgEventStatusTone(status: string | null | undefined): OrgChipTone {
  switch (status) {
    case "published":
    case "registration_open":
    case "ongoing":
      return "brand";
    case "sold_out":
    case "registration_closed":
      return "amber";
    case "cancelled":
      return "bad";
    case "completed":
      return "faint";
    case "draft":
    default:
      return "plain";
  }
}

/** Chip tone for a participation status. */
export function orgParticipationTone(status: string | null | undefined): OrgChipTone {
  switch (status) {
    case "paid":
    case "checked_in":
    case "joined":
      return "brand";
    case "waitlisted":
      return "amber";
    case "cancelled":
      return "bad";
    default:
      return "plain";
  }
}

/** Chip tone for a payment status. */
export function orgPaymentTone(status: string | null | undefined): OrgChipTone {
  switch (status) {
    case "paid":
      return "brand";
    case "pending":
      return "amber";
    case "failed":
      return "bad";
    case "refunded":
    case "not_required":
      return "plain";
    default:
      return "plain";
  }
}

/** Chip tone for a payout request status. */
export function orgPayoutTone(status: string | null | undefined): OrgChipTone {
  switch (status) {
    case "paid":
      return "brand";
    case "approved":
      return "brand";
    case "requested":
      return "amber";
    case "rejected":
      return "bad";
    default:
      return "plain";
  }
}

export function formatOrgMoney(amount: number | null | undefined, currency = "USD"): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

export function orgGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Initials from a display name, max two letters. */
export function orgInitials(name: string | null | undefined, fallback = "O"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

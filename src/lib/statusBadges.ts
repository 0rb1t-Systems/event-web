/**
 * Theme-safe status badge classes for participant + public surfaces.
 * Prefer these over raw `bg-*-50 text-*-800` pairs that break in dark mode.
 */

import { orgChipToneClass, type OrgChipTone } from "@/components/organizer-console/orgTheme";

export const STATUS_BADGE_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize whitespace-nowrap";

/** Participant / house pages — explicit light + dark pairs. */
export const statusBadgeToneClass = {
  brand: "bg-emerald-500/12 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  success: "bg-emerald-500/12 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  warning: "bg-amber-500/12 text-amber-900 border-amber-500/30 dark:text-amber-300",
  danger: "bg-red-500/12 text-red-800 border-red-500/30 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/12 text-primary border-primary/30",
  plain: "bg-muted/60 text-muted-foreground border-border",
} as const;

export type StatusBadgeTone = keyof typeof statusBadgeToneClass;

export function statusBadgeClass(tone: StatusBadgeTone): string {
  return `${STATUS_BADGE_BASE} ${statusBadgeToneClass[tone]}`;
}

/** Organizer console badges — oc-* tokens that flip under `.dark .org-console`. */
export function orgStatusBadgeClass(tone: OrgChipTone): string {
  return `${STATUS_BADGE_BASE} ${orgChipToneClass[tone]}`;
}

export function participationStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
    case "checked_in":
    case "joined":
      return statusBadgeClass("success");
    case "waitlisted":
      return statusBadgeClass("warning");
    case "cancelled":
      return statusBadgeClass("danger");
    default:
      return statusBadgeClass("plain");
  }
}

export function paymentStatusBadgeClass(payment: string): string {
  switch (payment) {
    case "paid":
      return statusBadgeClass("success");
    case "pending":
      return statusBadgeClass("warning");
    case "failed":
      return statusBadgeClass("danger");
    case "refunded":
      return statusBadgeClass("neutral");
    case "not_required":
      return statusBadgeClass("plain");
    default:
      return statusBadgeClass("plain");
  }
}

export function orgParticipationStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
    case "checked_in":
    case "joined":
      return orgStatusBadgeClass("brand");
    case "waitlisted":
      return orgStatusBadgeClass("amber");
    case "cancelled":
    case "failed":
      return orgStatusBadgeClass("bad");
    default:
      return orgStatusBadgeClass("plain");
  }
}

export function orgPaymentStatusBadgeClass(payment: string): string {
  switch (payment) {
    case "paid":
      return orgStatusBadgeClass("brand");
    case "pending":
      return orgStatusBadgeClass("amber");
    case "failed":
      return orgStatusBadgeClass("bad");
    case "refunded":
    case "not_required":
      return orgStatusBadgeClass("plain");
    default:
      return orgStatusBadgeClass("plain");
  }
}

export type RegistrationBadgeMeta = {
  label: string;
  badgeClass: string;
};

/** Composite label + class for ticket / registration detail pages. */
export function registrationStatusBadge(
  status: string,
  paymentStatus: string,
): RegistrationBadgeMeta {
  if (status === "cancelled") {
    return { label: "Cancelled", badgeClass: statusBadgeClass("neutral") };
  }
  if (status === "waitlisted") {
    return { label: "Waitlisted", badgeClass: statusBadgeClass("warning") };
  }
  if (status === "checked_in") {
    return { label: "Checked in", badgeClass: statusBadgeClass("success") };
  }
  if (paymentStatus === "pending") {
    return { label: "Awaiting payment", badgeClass: statusBadgeClass("warning") };
  }
  if (paymentStatus === "failed") {
    return { label: "Payment failed", badgeClass: statusBadgeClass("danger") };
  }
  if (paymentStatus === "refunded") {
    return { label: "Payment refunded", badgeClass: statusBadgeClass("neutral") };
  }
  if (paymentStatus === "paid" || status === "paid") {
    return { label: "Confirmed · Paid", badgeClass: statusBadgeClass("success") };
  }
  return { label: "Registered", badgeClass: statusBadgeClass("primary") };
}

export function attendeeTicketStatusBadge(p: {
  status: string;
  payment_status: string;
}): RegistrationBadgeMeta | null {
  if (p.status === "cancelled") {
    return { label: "Cancelled", badgeClass: statusBadgeClass("neutral") };
  }
  if (p.payment_status === "pending") {
    return { label: "Awaiting payment", badgeClass: statusBadgeClass("warning") };
  }
  if (p.payment_status === "failed") {
    return { label: "Payment failed", badgeClass: statusBadgeClass("danger") };
  }
  if (p.payment_status === "refunded") {
    return { label: "Refunded", badgeClass: statusBadgeClass("neutral") };
  }
  if (p.status === "checked_in") {
    return { label: "Checked in", badgeClass: statusBadgeClass("success") };
  }
  return null;
}

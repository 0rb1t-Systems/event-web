import type { ApiParticipation } from "@/services/participationService";

export function canEnterEventRoom(p: ApiParticipation) {
  if (p.status === "cancelled") return false;
  return (
    p.payment_status === "paid" ||
    p.payment_status === "not_required" ||
    p.status === "waitlisted"
  );
}

/** Soonest upcoming or currently active registration that can open a room. */
export function pickNextParticipation(items: ApiParticipation[]): ApiParticipation | null {
  const eligible = items.filter((p) => p.status !== "cancelled" && canEnterEventRoom(p));
  if (eligible.length === 0) return null;

  const now = Date.now();

  const active = eligible.filter((p) => {
    const start = p.event?.starts_at ? new Date(p.event.starts_at).getTime() : NaN;
    const end = p.event?.ends_at ? new Date(p.event.ends_at).getTime() : NaN;
    if (!Number.isFinite(start)) return false;
    const endAt = Number.isFinite(end) ? end : start + 24 * 60 * 60 * 1000;
    return start <= now && now <= endAt;
  });
  if (active[0]) return active[0];

  const upcoming = eligible
    .filter((p) => {
      if (!p.event?.starts_at) return true;
      return new Date(p.event.starts_at).getTime() >= now;
    })
    .sort((a, b) => {
      const ta = a.event?.starts_at ? new Date(a.event.starts_at).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.event?.starts_at ? new Date(b.event.starts_at).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });

  return upcoming[0] ?? eligible[0] ?? null;
}

export function roomSwitcherList(items: ApiParticipation[]): ApiParticipation[] {
  return items
    .filter((p) => p.status !== "cancelled" && canEnterEventRoom(p))
    .sort((a, b) => {
      const ta = a.event?.starts_at ? new Date(a.event.starts_at).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.event?.starts_at ? new Date(b.event.starts_at).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
}

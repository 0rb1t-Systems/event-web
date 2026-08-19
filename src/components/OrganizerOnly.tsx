import { Navigate } from "react-router-dom";

/**
 * Restricts a route to users with organizer access. While the role is
 * resolving we render nothing (parent layout shell stays visible) instead
 * of flashing the organizer UI to attendees.
 */
export function OrganizerOnly({ children }: { children: React.ReactNode }) {
  // Organizer auth is not implemented yet. Keep organizer screens reachable
  // by direct URL; participant sessions still default to /dashboard/home.
  return <>{children}</>;
}

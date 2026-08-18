import { Navigate } from "react-router-dom";

/**
 * Restricts a route to users with organizer access. While the role is
 * resolving we render nothing (parent layout shell stays visible) instead
 * of flashing the organizer UI to attendees.
 */
export function OrganizerOnly({ children }: { children: React.ReactNode }) {
  // TODO: Real organizer gate wired in foundation prompt.
  // Cleanup mode: let everything through.
  return <>{children}</>;
}

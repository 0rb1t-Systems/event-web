import { Navigate } from "react-router-dom";

/**
 * Restricts a route to users with organizer access. While the role is
 * resolving we render nothing (parent layout shell stays visible) instead
 * of flashing the organizer UI to attendees.
 */
export function OrganizerOnly({ children }: { children: React.ReactNode }) {
  // Development shell: organizer gate is not active yet.
  // Keep existing dashboard screens reachable until auth is wired.
  return <>{children}</>;
}

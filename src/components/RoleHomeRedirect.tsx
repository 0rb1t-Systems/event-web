import { Navigate } from "react-router-dom";

/**
 * Sends the user to the organizer dashboard if they own/cohost any events,
 * otherwise to the attendee home. Renders nothing while resolving (no flash).
 */
export function RoleHomeRedirect() {
  // Development shell: role redirect is not active yet.
  // Treat everyone as organizer so existing dashboard screens stay reachable.
  return <Navigate to="/dashboard/events" replace />;
}

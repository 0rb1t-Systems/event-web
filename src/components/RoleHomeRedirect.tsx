import { Navigate } from "react-router-dom";

/**
 * Sends the user to the organizer dashboard if they own/cohost any events,
 * otherwise to the attendee home. Renders nothing while resolving (no flash).
 */
export function RoleHomeRedirect() {
  // TODO: real role redirect wired in foundation prompt.
  // Cleanup mode: treat everyone as organizer.
  return <Navigate to="/dashboard/events" replace />;
}

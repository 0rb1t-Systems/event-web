import { Navigate } from "react-router-dom";

/**
 * Participant sessions land on attendee home.
 * Organizer-auth is not wired yet; do not send participants to /dashboard/events.
 */
export function RoleHomeRedirect() {
  return <Navigate to="/dashboard/home" replace />;
}

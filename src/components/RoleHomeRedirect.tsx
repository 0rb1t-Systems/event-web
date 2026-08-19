import { Navigate } from "react-router-dom";

/**
 * Participant sessions land on attendee home.
 * Organizers use /organizer/dashboard — never mix those identities here.
 */
export function RoleHomeRedirect() {
  return <Navigate to="/dashboard/home" replace />;
}

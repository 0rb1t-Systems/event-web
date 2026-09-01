import { Navigate } from "react-router-dom";
import { readLastStudioEventId } from "@/lib/lastStudioEvent";

export default function StudioAnalyticsRedirect() {
  const id = readLastStudioEventId();
  if (id) return <Navigate to={`/organizer/events/${id}/analytics`} replace />;
  return <Navigate to="/organizer/events" replace />;
}

import { Navigate, useLocation } from "react-router-dom";
import { useOrganizer } from "@/contexts/OrganizerContext";

export function OrganizerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useOrganizer();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/organizer/login?redirect=${encodeURIComponent(redirectTarget)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}

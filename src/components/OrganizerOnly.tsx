import { Navigate } from "react-router-dom";
import { useOrganizer } from "@/contexts/OrganizerContext";

/**
 * Restricts a route to users with a valid organizer session.
 * While booting we render nothing so the parent layout shell stays visible.
 */
export function OrganizerOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useOrganizer();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/organizer/login" replace />;
  }

  return <>{children}</>;
}

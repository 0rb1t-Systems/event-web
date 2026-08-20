import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizerProvider } from "@/contexts/OrganizerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OrganizerProtectedRoute } from "@/components/OrganizerProtectedRoute";
import { RoleHomeRedirect } from "@/components/RoleHomeRedirect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrganizerLayout } from "@/components/layout/OrganizerLayout";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import RegistrationDetail from "./pages/RegistrationDetail";
import Events from "./pages/dashboard/Events";
const EventDetailEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}`} replace />;
};
const EventStudioPageRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}/content`} replace />;
};
const EventStudioInvitationRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}/branding`} replace />;
};
import EventDetail from "./pages/dashboard/EventDetail";
import EventStudioOverview from "./pages/dashboard/event-studio/EventStudioOverview";
import EventStudioTickets from "./pages/dashboard/event-studio/EventStudioTickets";
import EventStudioForm from "./pages/dashboard/event-studio/EventStudioForm";
import EventStudioContent from "./pages/dashboard/event-studio/EventStudioContent";
import EventStudioBranding from "./pages/dashboard/event-studio/EventStudioBranding";
import EventStudioSettings from "./pages/dashboard/event-studio/EventStudioSettings";
import EventStudioAttendees from "./pages/dashboard/event-studio/EventStudioAttendees";
import EventStudioFinance from "./pages/dashboard/event-studio/EventStudioFinance";
import { EventStudioCheckInPlaceholder } from "./pages/dashboard/event-studio/EventStudioPlaceholder";
import AttendeeHome from "./pages/dashboard/AttendeeHome";
import Attendees from "./pages/dashboard/Attendees";
import Analytics from "./pages/dashboard/Analytics";
import SettingsPage from "./pages/dashboard/SettingsPage";
import OrganizerLogin from "./pages/organizer/OrganizerLogin";
import OrganizerRegister from "./pages/organizer/OrganizerRegister";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerEventCreate from "./pages/organizer/OrganizerEventCreate";
import OrganizerSettings from "./pages/organizer/OrganizerSettings";
import OrganizerPayouts from "./pages/organizer/OrganizerPayouts";
import NotFound from "./pages/NotFound";

const PublicRegisterRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/events/${id}`} replace />;
};

const TicketRedirect = () => {
  const { registrationId } = useParams();
  return <Navigate to={`/registrations/${registrationId}`} replace />;
};

const LegacyDashboardEventRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}`} replace />;
};

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="app-theme">
      <AuthProvider>
        <OrganizerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <SmoothScroll />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/events/:id" element={<Register />} />
              <Route path="/register/:id" element={<PublicRegisterRedirect />} />
              <Route path="/registrations/:registrationId" element={<RegistrationDetail />} />
              <Route path="/ticket/:registrationId" element={<TicketRedirect />} />

              {/* Organizer auth (no organizer session required) */}
              <Route path="/organizer/login" element={<OrganizerLogin />} />
              <Route path="/organizer/register" element={<OrganizerRegister />} />

              {/* Organizer app */}
              <Route path="/organizer" element={<Navigate to="/organizer/dashboard" replace />} />
              <Route path="/organizer/*" element={
                <OrganizerProtectedRoute>
                  <OrganizerLayout>
                    <Routes>
                      <Route path="dashboard" element={<OrganizerDashboard />} />
                      <Route path="events" element={<Events />} />
                      <Route path="events/new" element={<OrganizerEventCreate />} />
                      <Route path="events/create" element={<Navigate to="/organizer/events/new" replace />} />
                      <Route path="events/:id/edit" element={<EventDetailEditRedirect />} />
                      <Route path="events/:id" element={<EventDetail />}>
                        <Route index element={<EventStudioOverview />} />
                        <Route path="tickets" element={<EventStudioTickets />} />
                        <Route path="form" element={<EventStudioForm />} />
                        <Route path="content" element={<EventStudioContent />} />
                        <Route path="page" element={<EventStudioPageRedirect />} />
                        <Route path="branding" element={<EventStudioBranding />} />
                        <Route path="invitation" element={<EventStudioInvitationRedirect />} />
                        <Route path="promotion" element={<Navigate to=".." relative="path" replace />} />
                        <Route path="attendees" element={<EventStudioAttendees />} />
                        <Route path="checkin" element={<EventStudioCheckInPlaceholder />} />
                        <Route path="finance" element={<EventStudioFinance />} />
                        <Route path="settings" element={<EventStudioSettings />} />
                      </Route>
                      <Route path="attendees" element={<Attendees />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="payouts" element={<OrganizerPayouts />} />
                      <Route path="settings" element={<OrganizerSettings />} />
                    </Routes>
                  </OrganizerLayout>
                </OrganizerProtectedRoute>
              } />

              {/* Participant dashboard */}
              <Route path="/dashboard" element={<ProtectedRoute><RoleHomeRedirect /></ProtectedRoute>} />
              <Route path="/dashboard/events/create" element={<Navigate to="/organizer/events/new" replace />} />
              <Route path="/dashboard/events/:id" element={<LegacyDashboardEventRedirect />} />
              <Route path="/dashboard/events" element={<Navigate to="/organizer/events" replace />} />
              <Route path="/dashboard/attendees" element={<Navigate to="/organizer/attendees" replace />} />
              <Route path="/dashboard/analytics" element={<Navigate to="/organizer/analytics" replace />} />
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="home" element={<AttendeeHome />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </OrganizerProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

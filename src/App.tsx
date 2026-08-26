import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { OrganizerProvider } from "@/contexts/OrganizerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OrganizerProtectedRoute } from "@/components/OrganizerProtectedRoute";
import { RoleHomeRedirect } from "@/components/RoleHomeRedirect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrganizerLayout } from "@/components/layout/OrganizerLayout";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { RouteFallback } from "@/components/RouteFallback";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

/** Heavy / secondary screens — code-split for faster initial load. */
const Register = lazy(() => import("./pages/Register"));
const RegistrationDetail = lazy(() => import("./pages/RegistrationDetail"));
const Events = lazy(() => import("./pages/dashboard/Events"));
const EventDetail = lazy(() => import("./pages/dashboard/EventDetail"));
const EventStudioOverview = lazy(() => import("./pages/dashboard/event-studio/EventStudioOverview"));
const EventStudioTickets = lazy(() => import("./pages/dashboard/event-studio/EventStudioTickets"));
const EventStudioForm = lazy(() => import("./pages/dashboard/event-studio/EventStudioForm"));
const EventStudioContent = lazy(() => import("./pages/dashboard/event-studio/EventStudioContent"));
const EventStudioBranding = lazy(() => import("./pages/dashboard/event-studio/EventStudioBranding"));
const EventStudioSettings = lazy(() => import("./pages/dashboard/event-studio/EventStudioSettings"));
const EventStudioAttendees = lazy(() => import("./pages/dashboard/event-studio/EventStudioAttendees"));
const EventStudioFinance = lazy(() => import("./pages/dashboard/event-studio/EventStudioFinance"));
const EventStudioScanner = lazy(() => import("./pages/dashboard/event-studio/EventStudioScanner"));
const AttendeeHome = lazy(() => import("./pages/dashboard/AttendeeHome"));
const Attendees = lazy(() => import("./pages/dashboard/Attendees"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const OrganizerLogin = lazy(() => import("./pages/organizer/OrganizerLogin"));
const OrganizerRegister = lazy(() => import("./pages/organizer/OrganizerRegister"));
const OrganizerDashboard = lazy(() => import("./pages/organizer/OrganizerDashboard"));
const OrganizerEventCreate = lazy(() => import("./pages/organizer/OrganizerEventCreate"));
const OrganizerSettings = lazy(() => import("./pages/organizer/OrganizerSettings"));
const OrganizerPayouts = lazy(() => import("./pages/organizer/OrganizerPayouts"));
const OrganizerSubscription = lazy(() => import("./pages/organizer/OrganizerSubscription"));
const OrganizerScannerPage = lazy(() => import("./pages/organizer/OrganizerScannerPage"));

/** Cheap bookmark redirects — keep until traffic dies down. */
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
const EventStudioCheckInRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/organizer/events/${id}/scanner`} replace />;
};
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
      <BrandingProvider>
      <AuthProvider>
        <OrganizerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <SmoothScroll />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/events/:id" element={<Register />} />
                  <Route path="/register/:id" element={<PublicRegisterRedirect />} />
                  <Route path="/ticket/:registrationId" element={<TicketRedirect />} />

                  {/* Participant */}
                  <Route path="/registrations/:registrationId" element={<RegistrationDetail />} />
                  <Route path="/dashboard" element={<ProtectedRoute><RoleHomeRedirect /></ProtectedRoute>} />
                  <Route
                    path="/dashboard/*"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Suspense fallback={<RouteFallback />}>
                            <Routes>
                              <Route path="home" element={<AttendeeHome />} />
                              <Route path="settings" element={<SettingsPage />} />
                              <Route path="events/create" element={<Navigate to="/organizer/events/new" replace />} />
                              <Route path="events/:id" element={<LegacyDashboardEventRedirect />} />
                              <Route path="events" element={<Navigate to="/organizer/events" replace />} />
                              <Route path="attendees" element={<Navigate to="/organizer/attendees" replace />} />
                              <Route path="analytics" element={<Navigate to="/organizer/analytics" replace />} />
                              <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
                            </Routes>
                          </Suspense>
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Organizer auth */}
                  <Route path="/organizer/login" element={<OrganizerLogin />} />
                  <Route path="/organizer/register" element={<OrganizerRegister />} />

                  {/* Organizer app */}
                  <Route path="/organizer" element={<Navigate to="/organizer/dashboard" replace />} />
                  <Route
                    path="/organizer/*"
                    element={
                      <OrganizerProtectedRoute>
                        <OrganizerLayout>
                          <Suspense fallback={<RouteFallback />}>
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
                                <Route path="scanner" element={<EventStudioScanner />} />
                                <Route path="checkin" element={<EventStudioCheckInRedirect />} />
                                <Route path="finance" element={<EventStudioFinance />} />
                                <Route path="settings" element={<EventStudioSettings />} />
                              </Route>
                              <Route path="scanner" element={<OrganizerScannerPage />} />
                              <Route path="attendees" element={<Attendees />} />
                              <Route path="analytics" element={<Analytics />} />
                              <Route path="subscription" element={<OrganizerSubscription />} />
                              <Route path="billing" element={<Navigate to="/organizer/subscription" replace />} />
                              <Route path="payouts" element={<OrganizerPayouts />} />
                              <Route path="settings" element={<OrganizerSettings />} />
                            </Routes>
                          </Suspense>
                        </OrganizerLayout>
                      </OrganizerProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </OrganizerProvider>
      </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

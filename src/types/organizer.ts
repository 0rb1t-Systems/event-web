export type OrganizerStatus = "active" | "suspended" | string;

export type Organizer = {
  id: number;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: OrganizerStatus;
};

export type OrganizerProfileUpdate = {
  business_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string | null;
};

export type OrganizerRegisterBody = {
  business_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  password: string;
  password_confirmation: string;
};

export type OrganizerChangePasswordBody = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type OrganizerDashboardEvent = {
  id: number;
  title?: string;
  name?: string;
  status?: string;
  starts_at?: string | null;
  event_date?: string | null;
  registrations_count?: number;
  category?: { id: number; name: string } | null;
  created_at?: string;
};

/** Matches Laravel EventQuota::usagePayload */
export type OrganizerQuota = {
  quota: number | null;
  unlimited: boolean;
  zero_quota: boolean;
  events_created: number;
  can_create_event: boolean;
  remaining: number | null;
};

export type OrganizerDashboardData = {
  organizer: Organizer;
  active_subscription: unknown | null;
  total_events: number;
  total_registrations: number;
  total_revenue: number;
  available_payout: number;
  pending_payout: number;
  recent_events: OrganizerDashboardEvent[];
  quota?: OrganizerQuota;
};

export type ParticipantStatus = "active" | "inactive" | "suspended";
export type ParticipantUserType = "user" | "admin";

export type ParticipantUser = {
  id: number;
  name: string;
  email: string;
  status: ParticipantStatus | string;
  user_type?: ParticipantUserType | string | null;
  phone?: string | null;
  address?: string | null;
  profile_image?: string | null;
  email_verified_at?: string | null;
};

export type ParticipantProfileUpdate = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
};

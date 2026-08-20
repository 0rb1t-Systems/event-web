import { participantApi, publicApi } from "@/lib/api";
import type { ParticipantProfileUpdate, ParticipantUser } from "@/types/participant";

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type LoginPayload = {
  user: ParticipantUser;
  token: string;
  token_ability?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pickUser(value: unknown): ParticipantUser {
  const record = asRecord(value);
  const rawId = record?.id;
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!record || !Number.isFinite(id) || typeof record.email !== "string") {
    throw new Error("Unexpected user payload from the server.");
  }

  return {
    id,
    name: typeof record.name === "string" ? record.name : "",
    email: record.email,
    status: typeof record.status === "string" ? record.status : "active",
    user_type: typeof record.user_type === "string" ? record.user_type : null,
    phone: typeof record.phone === "string" ? record.phone : null,
    address: typeof record.address === "string" ? record.address : null,
    profile_image: typeof record.profile_image === "string" ? record.profile_image : null,
    email_verified_at:
      typeof record.email_verified_at === "string" ? record.email_verified_at : null,
  };
}

export const participantAuthService = {
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ user: ParticipantUser }> => {
    const { data } = await publicApi.post<Envelope<{ user: ParticipantUser }>>(
      "/auth/register",
      payload,
    );
    return { user: pickUser(data.data?.user) };
  },

  login: async (email: string, password: string): Promise<LoginPayload> => {
    const { data } = await publicApi.post<Envelope<LoginPayload>>("/auth/login", {
      email,
      password,
    });
    const inner = data.data;
    if (!inner?.token) {
      throw new Error("Login did not return a session token.");
    }
    return {
      user: pickUser(inner.user),
      token: inner.token,
      token_ability: inner.token_ability,
    };
  },

  googleLogin: async (accessToken: string): Promise<LoginPayload> => {
    const { data } = await publicApi.post<Envelope<LoginPayload>>("/auth/google/login", {
      access_token: accessToken,
    });
    const inner = data.data;
    if (!inner?.token) {
      throw new Error("Google login did not return a session token.");
    }
    return {
      user: pickUser(inner.user),
      token: inner.token,
      token_ability: inner.token_ability,
    };
  },

  verify: async (email: string, verification_code: string): Promise<ParticipantUser> => {
    const { data } = await publicApi.post<Envelope<{ user: ParticipantUser }>>("/auth/verify", {
      email,
      verification_code,
    });
    return pickUser(data.data?.user);
  },

  resendVerification: async (email: string): Promise<void> => {
    await publicApi.post("/auth/resend-verification", { email });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await publicApi.post("/auth/forgot-password", { email });
  },

  resetPassword: async (payload: {
    email: string;
    reset_code: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> => {
    await publicApi.post("/auth/reset-password", payload);
  },

  me: async (): Promise<ParticipantUser> => {
    const { data } = await participantApi.get<Envelope<{ user: ParticipantUser }>>("/auth/me", {
      skipAuthRedirect: true,
    });
    return pickUser(data.data?.user);
  },

  logout: async (): Promise<void> => {
    await participantApi.post("/auth/logout", {}, { skipAuthRedirect: true });
  },

  updateProfile: async (payload: ParticipantProfileUpdate): Promise<ParticipantUser> => {
    const { data } = await participantApi.put<{ success?: boolean; user?: ParticipantUser }>(
      "/auth/profile",
      payload,
    );
    return pickUser(data.user);
  },

  updateProfilePicture: async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("profile_image", file);
    const { data } = await participantApi.post<{ success?: boolean; profile_image?: string }>(
      "/auth/profile-picture",
      body,
    );
    if (typeof data.profile_image !== "string" || !data.profile_image) {
      throw new Error("The server did not return a profile image.");
    }
    return data.profile_image;
  },

  changePassword: async (payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> => {
    await participantApi.post("/auth/change-password", payload);
  },
};

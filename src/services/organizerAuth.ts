/**
 * Organizer Web App auth — separate from participant auth.
 * Register/login use publicApi (X-API-Key only).
 * Protected routes use organizerApi (X-API-Key + Bearer organizer_token).
 */

import { organizerApi, publicApi } from "@/lib/api";
import type {
  Organizer,
  OrganizerChangePasswordBody,
  OrganizerProfileUpdate,
  OrganizerRegisterBody,
} from "@/types/organizer";

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type LoginPayload = {
  organizer: Organizer;
  token: string;
  token_ability?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pickOrganizer(value: unknown): Organizer {
  const record = asRecord(value);
  const rawId = record?.id;
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!record || !Number.isFinite(id) || typeof record.email !== "string") {
    throw new Error("Unexpected organizer payload from the server.");
  }

  return {
    id,
    business_name: typeof record.business_name === "string" ? record.business_name : "",
    contact_name: typeof record.contact_name === "string" ? record.contact_name : "",
    email: record.email,
    phone: typeof record.phone === "string" ? record.phone : null,
    status: typeof record.status === "string" ? record.status : "active",
  };
}

export const organizerAuthService = {
  register: async (payload: OrganizerRegisterBody): Promise<LoginPayload> => {
    const { data } = await publicApi.post<Envelope<LoginPayload>>(
      "/organizer-auth/register",
      payload,
    );
    const inner = data.data;
    if (!inner?.token) {
      throw new Error("Registration did not return a session token.");
    }
    return {
      organizer: pickOrganizer(inner.organizer),
      token: inner.token,
      token_ability: inner.token_ability,
    };
  },

  login: async (email: string, password: string): Promise<LoginPayload> => {
    const { data } = await publicApi.post<Envelope<LoginPayload>>(
      "/organizer-auth/login",
      { email, password },
    );
    const inner = data.data;
    if (!inner?.token) {
      throw new Error("Login did not return a session token.");
    }
    return {
      organizer: pickOrganizer(inner.organizer),
      token: inner.token,
      token_ability: inner.token_ability,
    };
  },

  me: async (): Promise<Organizer> => {
    const { data } = await organizerApi.get<Envelope<{ organizer: Organizer }>>(
      "/organizer-auth/me",
      { skipAuthRedirect: true },
    );
    return pickOrganizer(data.data?.organizer);
  },

  logout: async (): Promise<void> => {
    await organizerApi.post("/organizer-auth/logout", {}, { skipAuthRedirect: true });
  },

  updateProfile: async (payload: OrganizerProfileUpdate): Promise<Organizer> => {
    const { data } = await organizerApi.patch<Envelope<{ organizer: Organizer }>>(
      "/organizer-auth/profile",
      payload,
    );
    return pickOrganizer(data.data?.organizer);
  },

  changePassword: async (payload: OrganizerChangePasswordBody): Promise<void> => {
    await organizerApi.post("/organizer-auth/change-password", payload);
  },
};

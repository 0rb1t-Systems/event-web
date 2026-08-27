import { organizerApi } from "@/lib/api";
import type { OrganizerEventListMeta } from "@/services/organizerEvents";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

type Paged<T> = WrappedSuccess<{ items: T[]; pagination: OrganizerEventListMeta }>;

export type OrganizerSpeaker = {
  id: number;
  event_id: number;
  name: string;
  photo_path: string | null;
  photo_url?: string | null;
  title: string | null;
  organization: string | null;
  bio: string | null;
  social_links: unknown;
  sort_order: number;
};

export type SpeakerWriteBody = {
  name?: string;
  photo_path?: string | null;
  title?: string | null;
  organization?: string | null;
  bio?: string | null;
  social_links?: Record<string, string> | null;
  sort_order?: number;
};

export type SponsorTier = "platinum" | "gold" | "silver" | "partner";

export type OrganizerSponsor = {
  id: number;
  event_id: number;
  name: string;
  logo_path: string | null;
  tier: SponsorTier | string;
  sort_order: number;
};

export type SponsorWriteBody = {
  name?: string;
  logo_path?: string | null;
  tier?: SponsorTier;
  sort_order?: number;
};

export type OrganizerSession = {
  id: number;
  event_id: number;
  speaker_id: number | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  room: string | null;
  description: string | null;
  sort_order: number;
  speaker?: OrganizerSpeaker | null;
};

export type SessionWriteBody = {
  speaker_id?: number | null;
  title?: string;
  starts_at?: string;
  ends_at?: string | null;
  room?: string | null;
  description?: string | null;
  sort_order?: number;
};

async function listPaged<T>(url: string): Promise<T[]> {
  const { data } = await organizerApi.get<Paged<T>>(url, { params: { per_page: 100 } });
  return data.data.items;
}

export async function listOrganizerSpeakers(eventId: number): Promise<OrganizerSpeaker[]> {
  return listPaged<OrganizerSpeaker>(`/organizer/events/${eventId}/speakers`);
}

export async function createOrganizerSpeaker(
  eventId: number,
  body: SpeakerWriteBody,
  photo?: File | null,
): Promise<OrganizerSpeaker> {
  if (photo) {
    const form = new FormData();
    if (body.name) form.append("name", body.name);
    if (body.title) form.append("title", body.title);
    if (body.organization) form.append("organization", body.organization);
    if (body.bio) form.append("bio", body.bio);
    if (body.sort_order != null) form.append("sort_order", String(body.sort_order));
    form.append("photo", photo);
    const { data } = await organizerApi.post<WrappedSuccess<OrganizerSpeaker>>(
      `/organizer/events/${eventId}/speakers`,
      form,
    );
    return data.data;
  }
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerSpeaker>>(
    `/organizer/events/${eventId}/speakers`,
    body,
  );
  return data.data;
}

export async function updateOrganizerSpeaker(id: number, body: SpeakerWriteBody): Promise<OrganizerSpeaker> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerSpeaker>>(`/organizer/speakers/${id}`, body);
  return data.data;
}

/** Multipart field `photo` — jpeg/png/jpg/gif/webp, max 4096 KB. */
export async function uploadOrganizerSpeakerPhoto(id: number, file: File): Promise<OrganizerSpeaker> {
  const form = new FormData();
  form.append("photo", file);
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerSpeaker>>(
    `/organizer/speakers/${id}/photo`,
    form,
  );
  return data.data;
}

export async function deleteOrganizerSpeaker(id: number): Promise<void> {
  await organizerApi.delete(`/organizer/speakers/${id}`);
}

export async function listOrganizerSponsors(eventId: number): Promise<OrganizerSponsor[]> {
  return listPaged<OrganizerSponsor>(`/organizer/events/${eventId}/sponsors`);
}

export async function createOrganizerSponsor(eventId: number, body: SponsorWriteBody): Promise<OrganizerSponsor> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerSponsor>>(
    `/organizer/events/${eventId}/sponsors`,
    body,
  );
  return data.data;
}

export async function updateOrganizerSponsor(id: number, body: SponsorWriteBody): Promise<OrganizerSponsor> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerSponsor>>(`/organizer/sponsors/${id}`, body);
  return data.data;
}

export async function deleteOrganizerSponsor(id: number): Promise<void> {
  await organizerApi.delete(`/organizer/sponsors/${id}`);
}

export async function listOrganizerSessions(eventId: number): Promise<OrganizerSession[]> {
  return listPaged<OrganizerSession>(`/organizer/events/${eventId}/sessions`);
}

export async function createOrganizerSession(eventId: number, body: SessionWriteBody): Promise<OrganizerSession> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerSession>>(
    `/organizer/events/${eventId}/sessions`,
    body,
  );
  return data.data;
}

export async function updateOrganizerSession(id: number, body: SessionWriteBody): Promise<OrganizerSession> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerSession>>(`/organizer/sessions/${id}`, body);
  return data.data;
}

export async function deleteOrganizerSession(id: number): Promise<void> {
  await organizerApi.delete(`/organizer/sessions/${id}`);
}

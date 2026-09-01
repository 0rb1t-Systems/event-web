import { publicApi } from "@/lib/api";
import type {
  PublicEventCatalogResponse,
  PublicEventCategoriesResponse,
  PublicEventDetail,
  PublicEventFormFieldResponse,
  WrappedSuccess,
} from "@/lib/publicEventsAdapters";

export type PublicEventListParams = {
  page?: number;
  per_page?: number;
  q?: string;
  categoryId?: number | "";
};

export async function listPublicEvents(params: PublicEventListParams = {}): Promise<PublicEventCatalogResponse> {
  const { page = 1, per_page = 12, q, categoryId } = params;
  const { data } = await publicApi.get<PublicEventCatalogResponse>("/events", {
    params: {
      page,
      per_page,
      ...(q?.trim() ? { q: q.trim() } : {}),
      ...(categoryId !== "" && categoryId != null ? { "filter[event_category_id]": categoryId } : {}),
    },
  });
  return data;
}

export async function listPublicCategories(): Promise<PublicEventCategoriesResponse> {
  const { data } = await publicApi.get<PublicEventCategoriesResponse>("/event-categories", {
    params: { per_page: 200, page: 1 },
  });
  return data;
}

export async function getPublicEvent(id: number): Promise<PublicEventDetail> {
  const { data } = await publicApi.get<WrappedSuccess<PublicEventDetail>>(`/events/${id}`);
  return data.data;
}

export async function getPublicEventFormFields(id: number): Promise<PublicEventFormFieldResponse> {
  const { data } = await publicApi.get<PublicEventFormFieldResponse>(`/events/${id}/form-fields`);
  return data;
}

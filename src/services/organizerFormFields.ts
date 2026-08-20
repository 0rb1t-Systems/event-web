import { organizerApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type OrganizerFormFieldType = "text" | "number" | "select" | "checkbox" | "date";

export type OrganizerFormField = {
  id: number;
  event_id: number;
  key: string;
  label: string;
  type: OrganizerFormFieldType | string;
  options: unknown;
  required: boolean;
  sort_order: number;
  active: boolean;
};

export type FormFieldWriteBody = {
  key?: string;
  label?: string;
  type?: OrganizerFormFieldType;
  options?: string[] | null;
  required?: boolean;
  sort_order?: number;
  active?: boolean;
};

type ListResponse = WrappedSuccess<{
  event_id: number;
  form_fields: OrganizerFormField[];
}>;

type DestroyResponse = WrappedSuccess<{
  action: "deactivated" | "deleted";
  form_field: OrganizerFormField | null;
}>;

export async function listOrganizerFormFields(eventId: number): Promise<OrganizerFormField[]> {
  const { data } = await organizerApi.get<ListResponse>(`/organizer/events/${eventId}/form-fields`);
  return data.data.form_fields;
}

export async function createOrganizerFormField(
  eventId: number,
  body: FormFieldWriteBody,
): Promise<OrganizerFormField> {
  const { data } = await organizerApi.post<WrappedSuccess<OrganizerFormField>>(
    `/organizer/events/${eventId}/form-fields`,
    body,
  );
  return data.data;
}

export async function updateOrganizerFormField(
  fieldId: number,
  body: FormFieldWriteBody,
): Promise<OrganizerFormField> {
  const { data } = await organizerApi.patch<WrappedSuccess<OrganizerFormField>>(
    `/organizer/form-fields/${fieldId}`,
    body,
  );
  return data.data;
}

export async function reorderOrganizerFormFields(
  eventId: number,
  ordered_ids: number[],
): Promise<OrganizerFormField[]> {
  const { data } = await organizerApi.patch<ListResponse>(
    `/organizer/events/${eventId}/form-fields/reorder`,
    { ordered_ids },
  );
  return data.data.form_fields;
}

export async function deleteOrganizerFormField(fieldId: number): Promise<{
  action: "deactivated" | "deleted";
  form_field: OrganizerFormField | null;
}> {
  const { data } = await organizerApi.delete<DestroyResponse>(`/organizer/form-fields/${fieldId}`);
  return data.data;
}

export function slugifyFormKey(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
  if (!slug) return "field";
  return /^[a-z]/.test(slug) ? slug : `f_${slug}`;
}

export function formFieldOptionsList(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object" && "value" in o) return String((o as { value: unknown }).value);
    return String(o);
  }).filter(Boolean);
}

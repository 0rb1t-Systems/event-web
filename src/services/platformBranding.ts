/**
 * Public platform branding (API-key only).
 * Driven by Admin Settings → Organization.
 */

import { publicApi } from "@/lib/api";
import type { WrappedSuccess } from "@/lib/publicEventsAdapters";

export type PlatformBranding = {
  name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  icon_url: string | null;
};

type BrandingResponse = WrappedSuccess<PlatformBranding>;

export async function getPlatformBranding(): Promise<PlatformBranding> {
  const { data } = await publicApi.get<BrandingResponse>("/platform/branding");
  return (
    data.data ?? {
      name: null,
      logo_url: null,
      logo_dark_url: null,
      icon_url: null,
    }
  );
}

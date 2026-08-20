import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { env } from "@/lib/env";
import { getMediaUrl } from "@/lib/mediaUrl";
import {
  getPlatformBranding,
  type PlatformBranding,
} from "@/services/platformBranding";

export type BrandingState = {
  name: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  iconUrl?: string;
  loading: boolean;
};

const BrandingContext = createContext<BrandingState | undefined>(undefined);

function applyDocumentBranding(name: string, iconUrl?: string) {
  if (name) {
    document.title = name;
  }

  const existing = document.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );
  existing.forEach((link) => link.remove());

  if (!iconUrl) return;

  let mimeType = "image/x-icon";
  const lower = iconUrl.toLowerCase();
  if (lower.endsWith(".svg")) mimeType = "image/svg+xml";
  else if (lower.endsWith(".png")) mimeType = "image/png";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mimeType = "image/jpeg";
  else if (lower.endsWith(".gif")) mimeType = "image/gif";
  else if (lower.endsWith(".webp")) mimeType = "image/webp";

  for (const rel of ["icon", "shortcut icon"] as const) {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = mimeType;
    link.href = iconUrl;
    document.head.appendChild(link);
  }
}

function toState(payload: PlatformBranding | null): Omit<BrandingState, "loading"> {
  const name = payload?.name?.trim() || env.appName;
  return {
    name,
    logoUrl: getMediaUrl(payload?.logo_url),
    logoDarkUrl: getMediaUrl(payload?.logo_dark_url),
    iconUrl: getMediaUrl(payload?.icon_url),
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<Omit<BrandingState, "loading">>(() =>
    toState(null),
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getPlatformBranding();
        if (cancelled) return;
        const next = toState(payload);
        setBranding(next);
        applyDocumentBranding(next.name, next.iconUrl);
      } catch {
        if (cancelled) return;
        const fallback = toState(null);
        setBranding(fallback);
        applyDocumentBranding(fallback.name, fallback.iconUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BrandingState>(
    () => ({ ...branding, loading }),
    [branding, loading],
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): BrandingState {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      name: env.appName,
      loading: false,
    };
  }
  return ctx;
}

import { env } from "./env";

function laravelOrigin(): string {
  return env.apiBaseUrl.replace(/\/api\/v\d+$/i, "");
}

/** Prefix Laravel relative upload paths so <img> can load them. */
export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const origin = laravelOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

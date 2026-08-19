const DEFAULT_PARTICIPANT_HOME = "/dashboard";

function decodeRedirectParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

/**
 * Only allow in-app paths. Reject protocol-relative, absolute, and /auth loops.
 */
export function getSafeInternalPath(
  raw: string | null | undefined,
  fallback = DEFAULT_PARTICIPANT_HOME,
): string {
  if (!raw) return fallback;

  const path = decodeRedirectParam(raw);
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("://")) return fallback;
  if (path.startsWith("/auth")) return fallback;

  return path;
}

export { DEFAULT_PARTICIPANT_HOME };

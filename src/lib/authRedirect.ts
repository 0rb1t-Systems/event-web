const DEFAULT_PARTICIPANT_HOME = "/dashboard";
const DEFAULT_ORGANIZER_HOME = "/organizer/dashboard";

function decodeRedirectParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

function isSafeInternalPath(path: string, blockedPrefixes: string[]): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("://")) return false;
  return !blockedPrefixes.some((prefix) => path.startsWith(prefix));
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
  if (!isSafeInternalPath(path, ["/auth"])) return fallback;
  return path;
}

/** Organizer redirect — blocks /organizer/login and /organizer/register loops. */
export function getSafeOrganizerInternalPath(
  raw: string | null | undefined,
  fallback = DEFAULT_ORGANIZER_HOME,
): string {
  if (!raw) return fallback;
  const path = decodeRedirectParam(raw);
  if (!isSafeInternalPath(path, ["/organizer/login", "/organizer/register"])) return fallback;
  return path;
}

export { DEFAULT_PARTICIPANT_HOME, DEFAULT_ORGANIZER_HOME };

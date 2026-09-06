const STORAGE_KEY = "event24:lastStudioEventId";

export function rememberStudioEventId(id: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLastStudioEventId(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

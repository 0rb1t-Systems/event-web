/**
 * Independent participant vs organizer localStorage keys.
 * Never share a single auth_token. Product rule: only one role session per browser —
 * logging into one role clears the other (storage + in-memory React context).
 */

export const AUTH_STORAGE_KEYS = {
  participantToken: "participant_token",
  participantUser: "participant_user",
  organizerToken: "organizer_token",
  organizer: "organizer_organizer",
} as const;

/** Fired after a role’s localStorage session is cleared so React contexts can reset. */
export const SESSION_CLEARED_EVENT = "event24:session-cleared";

export type SessionRole = "participant" | "organizer";

function getItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function setItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

function notifySessionCleared(role: SessionRole): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SESSION_CLEARED_EVENT, { detail: { role } }),
  );
}

export const participantSessionStorage = {
  getToken: () => getItem(AUTH_STORAGE_KEYS.participantToken),

  setToken: (token: string) =>
    setItem(AUTH_STORAGE_KEYS.participantToken, token),

  getUserJson: () => getItem(AUTH_STORAGE_KEYS.participantUser),

  setUserJson: (value: string) =>
    setItem(AUTH_STORAGE_KEYS.participantUser, value),

  clear: () => {
    removeItem(AUTH_STORAGE_KEYS.participantToken);
    removeItem(AUTH_STORAGE_KEYS.participantUser);
    notifySessionCleared("participant");
  },
};

export const organizerSessionStorage = {
  getToken: () => getItem(AUTH_STORAGE_KEYS.organizerToken),

  setToken: (token: string) =>
    setItem(AUTH_STORAGE_KEYS.organizerToken, token),

  getOrganizerJson: () => getItem(AUTH_STORAGE_KEYS.organizer),

  setOrganizerJson: (value: string) =>
    setItem(AUTH_STORAGE_KEYS.organizer, value),

  clear: () => {
    removeItem(AUTH_STORAGE_KEYS.organizerToken);
    removeItem(AUTH_STORAGE_KEYS.organizer);
    notifySessionCleared("organizer");
  },
};

/**
 * Independent participant vs organizer localStorage.
 * Never share a single auth_token. A browser may hold both sessions at once.
 */

export const AUTH_STORAGE_KEYS = {
  participantToken: "participant_token",
  participantUser: "participant_user",
  organizerToken: "organizer_token",
  organizer: "organizer_organizer",
} as const;

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
  },
};

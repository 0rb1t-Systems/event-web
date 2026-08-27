import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { organizerSessionStorage, participantSessionStorage, SESSION_CLEARED_EVENT } from "@/lib/authStorage";
import { requestGoogleAccessToken } from "@/lib/googleSignIn";
import { organizerAuthService } from "@/services/organizerAuth";
import type {
  Organizer,
  OrganizerChangePasswordBody,
  OrganizerProfileUpdate,
  OrganizerRegisterBody,
} from "@/types/organizer";

interface OrganizerContextType {
  organizer: Organizer | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: OrganizerRegisterBody) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: OrganizerProfileUpdate) => Promise<Organizer>;
  changePassword: (payload: OrganizerChangePasswordBody) => Promise<void>;
  refreshOrganizer: () => Promise<void>;
}

const OrganizerContext = createContext<OrganizerContextType | undefined>(undefined);

export const useOrganizer = () => {
  const ctx = useContext(OrganizerContext);
  if (!ctx) throw new Error("useOrganizer must be used inside OrganizerProvider");
  return ctx;
};

function persistOrganizer(token: string, nextOrganizer: Organizer) {
  organizerSessionStorage.setToken(token);
  organizerSessionStorage.setOrganizerJson(JSON.stringify(nextOrganizer));
}

function readCachedOrganizer(): Organizer | null {
  const raw = organizerSessionStorage.getOrganizerJson();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Organizer;
  } catch {
    return null;
  }
}

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(() => readCachedOrganizer());
  const [token, setToken] = useState<string | null>(() => organizerSessionStorage.getToken());
  const [isLoading, setIsLoading] = useState(() => Boolean(organizerSessionStorage.getToken()));

  const applyOrganizer = useCallback((next: Organizer | null) => {
    setOrganizer(next);
    const currentToken = organizerSessionStorage.getToken();
    setToken(currentToken);
    if (next && currentToken) {
      persistOrganizer(currentToken, next);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const storedToken = organizerSessionStorage.getToken();
      if (!storedToken) {
        if (!cancelled) {
          setOrganizer(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await organizerAuthService.me();
        if (!cancelled) {
          applyOrganizer(me);
        }
      } catch {
        if (!cancelled) {
          organizerSessionStorage.clear();
          setOrganizer(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void boot();
    return () => { cancelled = true; };
  }, [applyOrganizer]);

  // Participant login clears organizer storage — drop in-memory session immediately
  // so Organizer Portal does not look authenticated with a missing Bearer token.
  useEffect(() => {
    const onCleared = (event: Event) => {
      const role = (event as CustomEvent<{ role?: string }>).detail?.role;
      if (role !== "organizer") return;
      setOrganizer(null);
      setToken(null);
      setIsLoading(false);
    };
    window.addEventListener(SESSION_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onCleared);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await organizerAuthService.login(email, password);
    participantSessionStorage.clear();
    persistOrganizer(result.token, result.organizer);
    setToken(result.token);
    setOrganizer(result.organizer);

    try {
      const me = await organizerAuthService.me();
      persistOrganizer(result.token, me);
      setOrganizer(me);
    } catch {
      // Login payload is enough to start the session.
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const accessToken = await requestGoogleAccessToken();
    const result = await organizerAuthService.googleLogin(accessToken);
    participantSessionStorage.clear();
    persistOrganizer(result.token, result.organizer);
    setToken(result.token);
    setOrganizer(result.organizer);

    try {
      const me = await organizerAuthService.me();
      persistOrganizer(result.token, me);
      setOrganizer(me);
    } catch {
      // Login payload is enough to start the session.
    }
  }, []);

  const register = useCallback(async (payload: OrganizerRegisterBody) => {
    const result = await organizerAuthService.register(payload);
    participantSessionStorage.clear();
    persistOrganizer(result.token, result.organizer);
    setToken(result.token);
    setOrganizer(result.organizer);
  }, []);

  const logout = useCallback(async () => {
    try {
      await organizerAuthService.logout();
    } catch {
      // Clear locally either way. Participant token is untouched.
    } finally {
      organizerSessionStorage.clear();
      setOrganizer(null);
      setToken(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: OrganizerProfileUpdate) => {
    const next = await organizerAuthService.updateProfile(payload);
    applyOrganizer(next);
    return next;
  }, [applyOrganizer]);

  const changePassword = useCallback(async (payload: OrganizerChangePasswordBody) => {
    await organizerAuthService.changePassword(payload);
  }, []);

  const refreshOrganizer = useCallback(async () => {
    const me = await organizerAuthService.me();
    applyOrganizer(me);
  }, [applyOrganizer]);

  const value = useMemo<OrganizerContextType>(
    () => ({
      organizer,
      token,
      isLoading,
      isAuthenticated: Boolean(organizer && token),
      login,
      loginWithGoogle,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshOrganizer,
    }),
    [organizer, token, isLoading, login, loginWithGoogle, register, logout, updateProfile, changePassword, refreshOrganizer],
  );

  return <OrganizerContext.Provider value={value}>{children}</OrganizerContext.Provider>;
}

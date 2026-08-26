import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { organizerSessionStorage, participantSessionStorage } from "@/lib/authStorage";
import { requestGoogleAccessToken } from "@/lib/googleSignIn";
import { participantAuthService } from "@/services/participantAuth";
import type { ParticipantProfileUpdate, ParticipantUser } from "@/types/participant";

interface AuthContextType {
  session: null;
  user: ParticipantUser | null;
  organizer: null;
  isLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<ParticipantUser>;
  verifyEmail: (email: string, code: string) => Promise<ParticipantUser>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    resetCode: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  updateProfile: (payload: ParticipantProfileUpdate) => Promise<ParticipantUser>;
  updateProfilePicture: (file: File) => Promise<ParticipantUser>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

function persistParticipant(token: string, nextUser: ParticipantUser) {
  participantSessionStorage.setToken(token);
  participantSessionStorage.setUserJson(JSON.stringify(nextUser));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ParticipantUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(participantSessionStorage.getToken()));

  const applyUser = useCallback((nextUser: ParticipantUser | null) => {
    setUser(nextUser);
    const token = participantSessionStorage.getToken();
    if (nextUser && token) {
      persistParticipant(token, nextUser);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const token = participantSessionStorage.getToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await participantAuthService.me();
        if (!cancelled) applyUser(me);
      } catch {
        if (!cancelled) {
          participantSessionStorage.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await participantAuthService.login(email, password);
    organizerSessionStorage.clear();
    persistParticipant(result.token, result.user);
    setUser(result.user);

    try {
      const me = await participantAuthService.me();
      persistParticipant(result.token, me);
      setUser(me);
    } catch {
      // Login payload is enough to start the session.
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const accessToken = await requestGoogleAccessToken();
    const result = await participantAuthService.googleLogin(accessToken);
    organizerSessionStorage.clear();
    persistParticipant(result.token, result.user);
    setUser(result.user);

    try {
      const me = await participantAuthService.me();
      persistParticipant(result.token, me);
      setUser(me);
    } catch {
      // Login payload is enough to start the session.
    }
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      passwordConfirmation: string,
    ) => {
      const result = await participantAuthService.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      return result.user;
    },
    [],
  );

  const verifyEmail = useCallback(async (email: string, code: string) => {
    return participantAuthService.verify(email, code);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await participantAuthService.resendVerification(email);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await participantAuthService.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (
      email: string,
      resetCode: string,
      password: string,
      passwordConfirmation: string,
    ) => {
      await participantAuthService.resetPassword({
        email,
        reset_code: resetCode,
        password,
        password_confirmation: passwordConfirmation,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await participantAuthService.logout();
    } catch {
      // Session is cleared locally either way. Organizer token is untouched.
    } finally {
      participantSessionStorage.clear();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: ParticipantProfileUpdate) => {
    const next = await participantAuthService.updateProfile(payload);
    applyUser(next);
    return next;
  }, [applyUser]);

  const updateProfilePicture = useCallback(async (file: File) => {
    const profileImage = await participantAuthService.updateProfilePicture(file);
    const current = user;
    if (current) {
      const next = { ...current, profile_image: profileImage };
      applyUser(next);
      return next;
    }
    const me = await participantAuthService.me();
    applyUser(me);
    return me;
  }, [applyUser, user]);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      newPasswordConfirmation: string,
    ) => {
      await participantAuthService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const me = await participantAuthService.me();
    applyUser(me);
  }, [applyUser]);

  const value = useMemo<AuthContextType>(
    () => ({
      session: null,
      user,
      organizer: null,
      isLoading,
      loading: isLoading,
      signOut: logout,
      login,
      loginWithGoogle,
      logout,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      updateProfile,
      updateProfilePicture,
      changePassword,
      refreshUser,
    }),
    [
      user,
      isLoading,
      logout,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      updateProfile,
      updateProfilePicture,
      changePassword,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

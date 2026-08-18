import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

type StubUser = { id: string; email?: string } | null;

interface AuthContextType {
  session: null;
  user: StubUser;
  organizer: null;
  isLoading: boolean;
  // Legacy fields used throughout the app
  loading: boolean;
  signOut: () => Promise<void>;
  // Foundation prompt auth stubs (not wired yet)
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Cleanup mode: no real auth yet (Supabase removed).
  const [user, setUser] = useState<StubUser>({ id: "mock-user-1", email: "ahmed@techhub.so" });
  const isLoading = false;
  const value = useMemo<AuthContextType>(
    () => ({
      session: null,
      user,
      organizer: null,
      isLoading,
      loading: false,
      signOut: async () => {
        setUser(null);
      },
      login: async () => {},
      logout: async () => {
        setUser(null);
      },
      register: async () => {},
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

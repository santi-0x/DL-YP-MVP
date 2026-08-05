import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { SessionUser } from "./types";

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api<{ user: SessionUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    ready,
    async login(email, password) {
      const res = await api<{ token: string; user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setUser(res.user);
    },
    async register(email, password) {
      const res = await api<{ token: string; user: SessionUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setUser(res.user);
    },
    logout() {
      setToken(null);
      setUser(null);
    },
  }), [user, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Auth missing");
  return ctx;
}

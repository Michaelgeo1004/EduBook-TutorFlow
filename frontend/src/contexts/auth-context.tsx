"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  clearAuth,
  getStoredToken,
  getStoredUser,
  persistAuth,
  type User,
} from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    email: string;
    password: string;
    full_name: string;
    role: "student" | "tutor";
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getStoredToken();
    const u = getStoredUser();
    setToken(t);
    setUser(u);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persistAuth(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      role: "student" | "tutor";
    }) => {
      const data = await api<{ token: string; user: User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      persistAuth(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return;
    const data = await api<{ user: User }>("/auth/me");
    setUser(data.user);
    localStorage.setItem("edubook_user", JSON.stringify(data.user));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, token, loading, login, signup, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

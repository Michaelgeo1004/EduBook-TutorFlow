import { API_URL } from "./config";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
  created_at?: string;
};

const TOKEN_KEY = "edubook_token";
const USER_KEY = "edubook_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function persistAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: { error?: string } & Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    data = { error: text || "Request failed" };
  }

  if (!res.ok) {
    throw new Error((data.error as string) || res.statusText || "Request failed");
  }
  return data as T;
}

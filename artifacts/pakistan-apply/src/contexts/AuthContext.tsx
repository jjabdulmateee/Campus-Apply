import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  studentId: string;
  role: "student" | "admin";
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserAvatar: (avatarUrl: string) => void;
}

interface RegisterData {
  fullName: string;
  email: string;
  mobileNumber?: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = "pakapp_token";

const AuthContext = createContext<AuthState | null>(null);

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((t: string | null) => {
    setToken(t);
    setAuthTokenGetter(t ? () => t : null);
  }, []);

  const loadUserWithToken = useCallback(
    async (stored: string) => {
      const u = await apiFetch<AuthUser>("/api/auth/me", {
        headers: { Authorization: `Bearer ${stored}` },
      });
      const accountData = await apiFetch<{ avatarUrl: string | null }>("/api/account/me", {
        headers: { Authorization: `Bearer ${stored}` },
      }).catch(() => ({ avatarUrl: null }));
      setUser({ ...u, avatarUrl: accountData.avatarUrl });
      applyToken(stored);
    },
    [applyToken],
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      loadUserWithToken(stored)
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [loadUserWithToken]);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const u = await apiFetch<AuthUser>("/api/auth/me", {
        headers: { Authorization: `Bearer ${stored}` },
      });
      const accountData = await apiFetch<{ avatarUrl: string | null }>("/api/account/me", {
        headers: { Authorization: `Bearer ${stored}` },
      }).catch(() => ({ avatarUrl: null }));
      setUser({ ...u, avatarUrl: accountData.avatarUrl });
    } catch {
      // silently fail refresh
    }
  }, []);

  const setUserAvatar = useCallback((avatarUrl: string) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl } : prev));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: t, user: u } = await apiFetch<AuthResponse>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      localStorage.setItem(TOKEN_KEY, t);
      applyToken(t);
      const accountData = await apiFetch<{ avatarUrl: string | null }>("/api/account/me", {
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => ({ avatarUrl: null }));
      setUser({ ...u, avatarUrl: accountData.avatarUrl });
    },
    [applyToken],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { token: t, user: u } = await apiFetch<AuthResponse>(
        "/api/auth/register",
        { method: "POST", body: JSON.stringify(data) },
      );
      localStorage.setItem(TOKEN_KEY, t);
      applyToken(t);
      setUser({ ...u, avatarUrl: null });
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
        refreshUser,
        setUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

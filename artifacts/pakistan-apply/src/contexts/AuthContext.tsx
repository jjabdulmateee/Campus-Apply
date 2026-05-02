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
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
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

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      // Validate token by hitting /api/auth/me
      apiFetch<AuthUser>("/api/auth/me", {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then((u) => {
          setUser(u);
          applyToken(stored);
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: t, user: u } = await apiFetch<AuthResponse>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      localStorage.setItem(TOKEN_KEY, t);
      applyToken(t);
      setUser(u);
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
      setUser(u);
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
        login,
        register,
        logout,
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

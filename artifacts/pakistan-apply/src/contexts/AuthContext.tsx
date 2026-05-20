import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  studentId: string | null;
  role: "student" | "admin" | "counselor";
  universityId?: number | null;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCounselor: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
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
  user: AuthUser;
}

const AuthContext = createContext<AuthState | null>(null);

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
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

async function loadSessionUser(): Promise<AuthUser | null> {
  try {
    const u = await apiFetch<AuthUser>("/api/auth/me");
    const accountData = await apiFetch<{ avatarUrl: string | null }>("/api/account/me").catch(
      () => ({ avatarUrl: null }),
    );
    return { ...u, avatarUrl: accountData.avatarUrl };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessionUser()
      .then((sessionUser) => setUser(sessionUser))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshUser = useCallback(async () => {
    const sessionUser = await loadSessionUser();
    if (sessionUser) setUser(sessionUser);
  }, []);

  const setUserAvatar = useCallback((avatarUrl: string) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl } : prev));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const accountData = await apiFetch<{ avatarUrl: string | null }>("/api/account/me").catch(
      () => ({ avatarUrl: null }),
    );
    const fullUser = { ...u, avatarUrl: accountData.avatarUrl };
    setUser(fullUser);
    return fullUser;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const { user: u } = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setUser({ ...u, avatarUrl: null });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isCounselor: user?.role === "counselor",
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
  if (!ctx) throw new Error("useAuth must use AuthProvider");
  return ctx;
}

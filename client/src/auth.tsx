import { createContext, type ReactNode, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (username: string, password: string, name: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me,
    retry: false,
    // A 401 here just means "not signed in yet" — not an error to surface.
    throwOnError: false,
  });

  const registerMutation = useMutation({
    mutationFn: (v: { username: string; password: string; name: string }) =>
      api.register(v.username, v.password, v.name),
    meta: { silent: true },
  });
  const loginMutation = useMutation({
    mutationFn: (v: { username: string; password: string }) => api.login(v.username, v.password),
    meta: { silent: true },
  });
  const updateProfileMutation = useMutation({
    mutationFn: (name: string) => api.updateProfile(name),
    meta: { silent: true },
  });

  async function register(username: string, password: string, name: string) {
    const user = await registerMutation.mutateAsync({ username, password, name });
    queryClient.setQueryData(["auth", "me"], user);
  }

  async function login(username: string, password: string) {
    const user = await loginMutation.mutateAsync({ username, password });
    queryClient.setQueryData(["auth", "me"], user);
  }

  async function updateProfile(name: string) {
    const user = await updateProfileMutation.mutateAsync(name);
    queryClient.setQueryData(["auth", "me"], user);
  }

  function logout() {
    void api.logout().finally(() => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    });
  }

  const pendingError = registerMutation.error ?? loginMutation.error;
  const authError = pendingError instanceof ApiError || pendingError instanceof Error ? pendingError.message : null;

  function clearAuthError() {
    registerMutation.reset();
    loginMutation.reset();
  }

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    register,
    login,
    logout,
    updateProfile,
    authError,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

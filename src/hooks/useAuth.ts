import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

export type AuthInfo = {
  ok: true;
  appName?: string;
};

export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: () => apiFetch<AuthInfo>("/api/auth/me"),
    retry: false,
    staleTime: 60_000
  });
}

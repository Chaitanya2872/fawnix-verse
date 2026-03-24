import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRefreshToken, hasStoredSession } from "@/services/api-client";
import { fetchCurrentUser, login, logout, requestOtp, verifyOtp } from "./api";
import type { LoginRequest, RequestOtpRequest, VerifyOtpRequest } from "./types";

export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "me"] as const,
};

export function useCurrentUser(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? hasStoredSession();

  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: fetchCurrentUser,
    enabled: isEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => login(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.currentUser(), session.user);
    },
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (request: RequestOtpRequest) => requestOtp(request),
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: VerifyOtpRequest) => verifyOtp(request),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.currentUser(), session.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => logout(getRefreshToken()),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

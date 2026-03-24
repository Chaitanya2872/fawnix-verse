import {
  api,
  clearAuthTokens,
  ensureApiSession,
  storeAuthTokens,
  rawApi,
} from "@/services/api-client";
import type {
  AuthTokens,
  CurrentUser,
  LoginRequest,
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
} from "./types";

export async function login(request: LoginRequest) {
  const response = await rawApi.post<AuthTokens>("/auth/login", request);
  storeAuthTokens(response.data);
  return response.data;
}

export async function requestOtp(request: RequestOtpRequest) {
  const response = await rawApi.post<RequestOtpResponse>("/auth/request-otp", request);
  return response.data;
}

export async function verifyOtp(request: VerifyOtpRequest) {
  const response = await rawApi.post<AuthTokens>("/auth/verify-otp", request);
  storeAuthTokens(response.data);
  return response.data;
}

export async function logout(refreshToken?: string | null) {
  try {
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  } finally {
    clearAuthTokens();
  }
}

export async function fetchCurrentUser() {
  await ensureApiSession();
  const response = await api.get<CurrentUser>("/auth/me");
  return response.data;
}

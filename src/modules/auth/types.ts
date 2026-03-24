export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}

export interface RequestOtpRequest {
  emp_code: string;
}

export interface RequestOtpResponse {
  expires_in_minutes?: number;
  message?: string;
  success?: boolean;
}

export interface VerifyOtpRequest {
  emp_code: string;
  otp: string;
}

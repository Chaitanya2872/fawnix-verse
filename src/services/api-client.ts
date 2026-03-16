import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const ACCESS_TOKEN_KEY = "fawnix.accessToken";
const REFRESH_TOKEN_KEY = "fawnix.refreshToken";

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const rawApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

let ensureSessionPromise: Promise<void> | null = null;
let refreshSessionPromise: Promise<void> | null = null;

export class MissingSessionError extends Error {
  constructor() {
    super("No active session found.");
    this.name = "MissingSessionError";
  }
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getRefreshToken() {
  return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function hasStoredSession() {
  return Boolean(getAccessToken() || getRefreshToken());
}

export function storeAuthTokens(tokens: TokenResponse) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}

function isAuthRoute(url?: string) {
  return Boolean(url && url.includes("/auth/"));
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new MissingSessionError();
  }

  const response = await rawApi.post<TokenResponse>("/auth/refresh", { refreshToken });
  storeAuthTokens(response.data);
}

export async function ensureApiSession() {
  if (getAccessToken()) {
    return;
  }

  if (ensureSessionPromise) {
    return ensureSessionPromise;
  }

  ensureSessionPromise = (async () => {
    try {
      await refreshSession();
    } catch (error) {
      clearAuthTokens();
      throw error;
    } finally {
      ensureSessionPromise = null;
    }
  })();

  return ensureSessionPromise;
}

function withAuthHeader(config: InternalAxiosRequestConfig) {
  const token = getAccessToken();
  if (token) {
    if (!(config.headers instanceof AxiosHeaders)) {
      config.headers = AxiosHeaders.from(config.headers);
    }
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
}

api.interceptors.request.use((config) => withAuthHeader(config));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const config = error.config as RetryConfig | undefined;

    if (
      !config ||
      config._retry ||
      error.response?.status !== 401 ||
      isAuthRoute(config.url)
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      if (!getRefreshToken()) {
        clearAuthTokens();
        return Promise.reject(error);
      }

      if (!refreshSessionPromise) {
        refreshSessionPromise = (async () => {
          try {
            await refreshSession();
          } catch (refreshError) {
            clearAuthTokens();
            throw refreshError;
          } finally {
            refreshSessionPromise = null;
          }
        })();
      }

      await refreshSessionPromise;
      return api(withAuthHeader(config));
    } catch (refreshError) {
      clearAuthTokens();
      return Promise.reject(refreshError);
    }
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError<{ message?: string; fieldErrors?: Record<string, string> }>(error)) {
    const responseMessage = error.response?.data?.message;
    if (responseMessage) {
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export { rawApi };

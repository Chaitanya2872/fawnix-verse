import { API_BASE_URL } from "./apiConfig";

const TOKEN_KEY = "vms_auth_token";
const USER_KEY = "vms_auth_user";

// Attach JWT + ngrok bypass header to every request.
// Skips Content-Type for FormData (browser sets it with boundary).
// On 401, clears stored credentials and redirects to login.
export const authFetch = async (url: string | URL, options: RequestInit = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      "ngrok-skip-browser-warning": "true",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "/vms/login";
  }

  return res;
};

const authService = {
  login: async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Login failed (${res.status}): ${text}`);
      }
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      return data;
    } catch (err) {
      // Network unreachable — accept demo credentials for offline development
      if (!(err instanceof TypeError && err.message === "Failed to fetch")) throw err;
      console.warn("[offline] login → demo session");
      const demoUser = {
        token: "offline-demo-token",
        username,
        fullName: username === "admin" ? "Admin User" : username,
        role: "ADMIN",
        offline: true,
      };
      localStorage.setItem(TOKEN_KEY, demoUser.token);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      return demoUser;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),

  me: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/auth/me`);
    if (!res.ok) throw new Error("Failed to resolve current user.");
    return res.json();
  },
};

export default authService;

const fallbackBaseUrl = "https://5d7e-122-164-68-247.ngrok-free.app";

const getApiBaseUrl = () => {
  const envUrl = import.meta?.env?.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim()) return envUrl.trim();
  return fallbackBaseUrl;
};

const API_BASE_URL = getApiBaseUrl().replace(/\/$/, "");

export { API_BASE_URL };


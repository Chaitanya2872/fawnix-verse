const getApiBaseUrl = () => {
  const envUrl = import.meta?.env?.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim()) return envUrl.trim();
  return "";
};

const configuredBaseUrl = getApiBaseUrl().replace(/\/$/, "");
const API_BASE_URL = configuredBaseUrl.endsWith("/api") ? configuredBaseUrl.slice(0, -4) : configuredBaseUrl;

export { API_BASE_URL };


import { API_BASE_URL } from "./apiConfig";
import { authFetch } from "./authService";
import { normalize } from "./visitorRequestService";

const validationService = {
  // POST /api/visitor-requests/verify-qr
  validateVisitor: async ({ qrCodeData, action = "CHECK_IN" }) => {
    const res = await authFetch(`${API_BASE_URL}/api/visitor-requests/verify-qr`, {
      method: "POST",
      body: JSON.stringify({ qrCodeData, action }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Validation failed (${res.status}): ${text}`);
    }

    const data = await res.json().catch(() => ({}));
    return normalize(data);
  },
};

export default validationService;

import { API_BASE_URL } from "./apiConfig";

const visitorService = {
  createVisitor: async (data) => {
    const res = await fetch(`${API_BASE_URL}/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to create visitor (${res.status}): ${text}`);
    }

    return res.json().catch(() => ({}));
  },
};

export default visitorService;

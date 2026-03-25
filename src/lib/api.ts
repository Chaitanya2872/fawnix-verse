import { api, rawApi } from "@/services/api-client";

const normalizeRole = (roles: string[] | undefined): string => {
  if (!roles || roles.length === 0) return "employee";
  const primary = roles[0];
  return primary.replace("ROLE_", "").toLowerCase();
};

export default api;

export const recruitmentApi = {
  getHiringRequests: (params?: object) =>
    api.get("/recruitment/hiring-requests", { params }),
  getHiringRequest: (id: string) =>
    api.get(`/recruitment/hiring-requests/${id}`),
  createHiringRequest: (data: object) =>
    api.post("/recruitment/hiring-requests", data),
  approveHiringRequest: (id: string, data: object) =>
    api.post(`/recruitment/hiring-requests/${id}/approve`, data),
  getPositions: (params?: object) =>
    api.get("/recruitment/positions", { params }),
  getPosition: (id: string) => api.get(`/recruitment/positions/${id}`),
  createPosition: (data: object) =>
    api.post("/recruitment/positions", data),
  updatePosition: (id: string, data: object) =>
    api.patch(`/recruitment/positions/${id}`, data),
  getPostings: () => api.get("/recruitment/postings"),
  getPosting: (id: string) => api.get(`/recruitment/postings/${id}`),
  createPosting: (data: object) =>
    api.post("/recruitment/postings", data),
  updatePosting: (id: string, data: object) =>
    api.patch(`/recruitment/postings/${id}`, data),
  publishPosting: (id: string, data: object) =>
    api.post(`/recruitment/postings/${id}/publish`, data),
  closePosting: (id: string) => api.post(`/recruitment/postings/${id}/close`),
  getForms: () => api.get("/recruitment/forms"),
  getForm: (id: string) => api.get(`/recruitment/forms/${id}`),
  createForm: (data: object) => api.post("/recruitment/forms", data),
  updateForm: (id: string, data: object) =>
    api.patch(`/recruitment/forms/${id}`, data),
  publishForm: (id: string) => api.post(`/recruitment/forms/${id}/publish`),
  archiveForm: (id: string) => api.post(`/recruitment/forms/${id}/archive`),
  listFormTemplates: () => api.get("/recruitment/forms/templates"),
  createFormTemplate: (data: object) =>
    api.post("/recruitment/forms/templates", data),
  toggleFormTemplateFavorite: (id: string) =>
    api.post(`/recruitment/forms/templates/${id}/favorite`),
  getFormSubmissions: (id: string, params?: object) =>
    api.get(`/recruitment/forms/${id}/submissions`, { params }),
};

export const candidatesApi = {
  list: (params?: object) => api.get("/candidates", { params }),
  listApplications: (params?: object) =>
    api.get("/candidates/applications", { params }),
  get: (id: string) => api.get(`/candidates/${id}`),
  create: (data: object) => api.post("/candidates", data),
  getPipeline: (positionId?: string) =>
    api.get("/candidates/pipeline/all", { params: { position_id: positionId } }),
  updateStatus: (appId: string, data: object) =>
    api.patch(`/candidates/applications/${appId}/status`, data),
};

export const interviewsApi = {
  list: (params?: object) => api.get("/interviews", { params }),
  get: (id: string) => api.get(`/interviews/${id}`),
  create: (data: object) => api.post("/interviews", data),
  update: (id: string, data: object) =>
    api.patch(`/interviews/${id}`, data),
  addFeedback: (id: string, data: object) =>
    api.post(`/interviews/${id}/feedback`, data),
};

export const offersApi = {
  list: (params?: object) => api.get("/offers", { params }),
  get: (id: string) => api.get(`/offers/${id}`),
  create: (data: object) => api.post("/offers", data),
  sendForApproval: (id: string) =>
    api.post(`/offers/${id}/send-for-approval`),
  approve: (id: string, data: object) => api.post(`/offers/${id}/approve`, data),
  updateStatus: (id: string, data: object) =>
    api.post(`/offers/${id}/status`, data),
};

export const analyticsApi = {
  dashboard: () => api.get("/analytics/dashboard"),
};

export const approvalFlowsApi = {
  list: () => api.get("/approval-flows"),
  get: (id: string) => api.get(`/approval-flows/${id}`),
  create: (data: object) => api.post("/approval-flows", data),
};

export const departmentsApi = {
  list: () => api.get("/departments"),
};

export const usersApi = {
  list: async () => {
    const response = await api.get("/users");
    const data = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    return {
      data: data.map((user: any) => ({
        id: user.id,
        full_name: user.fullName ?? user.full_name ?? user.name ?? "",
        email: user.email ?? "",
        role: normalizeRole(user.roles),
        roles: user.roles ?? [],
        permissions: user.permissions ?? [],
        phone_number: user.phoneNumber ?? user.phone_number ?? "",
        language: user.language ?? "",
        is_active: user.active ?? user.isActive ?? true,
      })),
    };
  },
};

export const portalCredentialsApi = {
  list: () => api.get("/settings/portal-credentials"),
  upsert: (data: object) => api.post("/settings/portal-credentials", data),
};

export const calendarApi = {
  listConnections: () => api.get("/calendar/connections"),
  authorize: (provider: string, returnUrl?: string) =>
    api.post(`/calendar/oauth/${provider}/authorize`, { return_url: returnUrl }),
  disconnect: (provider: string) =>
    api.delete(`/calendar/connections/${provider}`),
};

export const publicFormsApi = {
  getForm: (slug: string) => rawApi.get(`/public/forms/${slug}`),
  submitForm: (slug: string, data: FormData) =>
    rawApi.post(`/public/forms/${slug}/submit`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

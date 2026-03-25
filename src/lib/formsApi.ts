import api from "@/lib/api";

export type FormStatus = "draft" | "published" | "archived";
export type FormVisibility = "hr" | "it" | "manager" | "candidate";
export type FormModule = "recruitment" | "preboarding" | "internal" | "general";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "file"
  | "section";

export type FieldConfig = {
  placeholder?: string;
  help_text?: string;
};

export type FormField = {
  field_key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  config?: FieldConfig;
  order?: number;
};

export type Form = {
  id: string;
  name: string;
  description?: string;
  status: FormStatus;
  owner: string;
  version: string;
  visibility: FormVisibility[];
  tags: string[];
  module: FormModule;
  collection_id?: string;
  public_slug?: string;
  created_at: string;
  updated_at: string;
  fields: FormField[];
  position_id?: string;
  position_title?: string;
};

export type FormTemplate = {
  id: string;
  name: string;
  description?: string;
  is_favorite?: boolean;
  fields: FormField[];
  created_at: string;
};

export type FormCollection = {
  id: string;
  name: string;
  description?: string;
  module: FormModule;
  owner: string;
  form_ids: string[];
  created_at: string;
  updated_at: string;
};

export type FormLinkStatus = "active" | "expired" | "disabled";

export type FormLink = {
  id: string;
  form_id: string;
  form_name: string;
  candidate_name: string;
  candidate_email: string;
  module: FormModule;
  status: FormLinkStatus;
  url: string;
  expires_at: string;
  created_at: string;
  last_sent_at?: string;
};

export type FormAnalyticsPoint = {
  label: string;
  submissions: number;
  completed: number;
};

export type FormAnalytics = {
  total_forms: number;
  published_forms: number;
  submissions_last_7: number;
  completion_rate: number;
  avg_completion_time_days: number;
  trend: FormAnalyticsPoint[];
};

export type FormSubmission = {
  id: string;
  candidate_name: string;
  candidate_email: string;
  submitted_at: string;
};

type FormFilters = {
  status?: FormStatus | "";
  search?: string;
  collection_id?: string;
  module?: FormModule | "";
};

const normalizeArray = <T>(value: any, fallback: T[] = []): T[] =>
  Array.isArray(value) ? value : fallback;

const normalizeForm = (value: any): Form => {
  const createdAt = value?.created_at || new Date().toISOString();
  return {
    id: value.id,
    name: value.name,
    description: value.description || "",
    status: value.status as FormStatus,
    owner: value.owner || "HR Operations",
    version: value.version || "v1.0",
    visibility: normalizeArray<FormVisibility>(value.visibility),
    tags: normalizeArray<string>(value.tags),
    module: (value.module || "recruitment") as FormModule,
    collection_id: value.collection_id || undefined,
    public_slug: value.public_slug || undefined,
    created_at: createdAt,
    updated_at: value.updated_at || createdAt,
    fields: normalizeArray<FormField>(value.fields),
    position_id: value.position_id || undefined,
    position_title: value.position_title || undefined,
  };
};

const normalizeTemplate = (value: any): FormTemplate => ({
  id: value.id,
  name: value.name,
  description: value.description || "",
  is_favorite: value.is_favorite,
  fields: normalizeArray<FormField>(value.fields),
  created_at: value.created_at,
});

const normalizeCollection = (value: any): FormCollection => ({
  id: value.id,
  name: value.name,
  description: value.description || "",
  module: (value.module || "recruitment") as FormModule,
  owner: value.owner || "HR Operations",
  form_ids: normalizeArray<string>(value.form_ids),
  created_at: value.created_at,
  updated_at: value.updated_at || value.created_at,
});

const normalizeLink = (value: any): FormLink => ({
  id: value.id,
  form_id: value.form_id,
  form_name: value.form_name || "Form",
  candidate_name: value.candidate_name,
  candidate_email: value.candidate_email,
  module: (value.module || "recruitment") as FormModule,
  status: value.status as FormLinkStatus,
  url: value.url,
  expires_at: value.expires_at,
  created_at: value.created_at,
  last_sent_at: value.last_sent_at || undefined,
});

const listForms = async (filters: FormFilters = {}) => {
  const params: Record<string, any> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params[key] = value;
  });
  const res = await api.get("/recruitment/forms", { params });
  const data = normalizeArray<any>(res.data?.data).map(normalizeForm);
  return { data };
};

const getForm = async (id: string) => {
  const res = await api.get(`/recruitment/forms/${id}`);
  return { data: normalizeForm(res.data) };
};

const createForm = (payload: object) => api.post("/recruitment/forms", payload);

const updateForm = (id: string, payload: object) =>
  api.patch(`/recruitment/forms/${id}`, payload);

const publishForm = (id: string) => api.post(`/recruitment/forms/${id}/publish`);

const archiveForm = (id: string) => api.post(`/recruitment/forms/${id}/archive`);

const listTemplates = async () => {
  const res = await api.get("/recruitment/forms/templates");
  const data = normalizeArray<any>(res.data?.data).map(normalizeTemplate);
  return { data };
};

const createTemplate = (payload: {
  name: string;
  description?: string;
  fields: FormField[];
}) => api.post("/recruitment/forms/templates", payload);

const toggleTemplateFavorite = (id: string) =>
  api.post(`/recruitment/forms/templates/${id}/favorite`);

const listCollections = async () => {
  const res = await api.get("/recruitment/forms/collections");
  const data = normalizeArray<any>(res.data?.data).map(normalizeCollection);
  return { data };
};

const createCollection = (payload: {
  name: string;
  description?: string;
  module: FormModule;
  owner: string;
  form_ids: string[];
}) => api.post("/recruitment/forms/collections", payload);

const listLinks = async () => {
  const res = await api.get("/recruitment/forms/links");
  const data = normalizeArray<any>(res.data?.data).map(normalizeLink);
  return { data };
};

const expireLink = (id: string) => api.post(`/recruitment/forms/links/${id}/expire`);

const resendLink = (id: string) => api.post(`/recruitment/forms/links/${id}/resend`);

const listAnalytics = async () => {
  const res = await api.get("/recruitment/forms/analytics");
  return { data: res.data as FormAnalytics };
};

const getFormSubmissions = async (id: string) => {
  const res = await api.get(`/recruitment/forms/${id}/submissions`);
  return res.data;
};

export const formsApi = {
  listForms,
  getForm,
  createForm,
  updateForm,
  publishForm,
  archiveForm,
  listTemplates,
  createTemplate,
  toggleTemplateFavorite,
  listCollections,
  createCollection,
  listLinks,
  expireLink,
  resendLink,
  listAnalytics,
  getFormSubmissions,
};

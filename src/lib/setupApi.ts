import api from "@/lib/api";

export type CompanyProfile = {
  name: string;
  legal_entity: string;
  country: string;
  timezone: string;
};

export type SetupUserStatus = "active" | "invited";

export type SetupUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  phoneNumber?: string;
  language?: string;
  status: SetupUserStatus;
};

export type RolePermission = {
  id: string;
  role: string;
  module: string;
  access: "none" | "view" | "edit";
};

export type SetupPolicy = {
  id: string;
  name: string;
  status: "not_configured" | "configured";
  owner: string;
};

export type WorkflowConfig = {
  id: string;
  name: string;
  description: string;
  approvers: string[];
};

export type SetupProgress = {
  company: boolean;
  users: boolean;
  organization: boolean;
  locations: boolean;
  employees: boolean;
  hierarchy: boolean;
  policies: boolean;
  workflows: boolean;
  activate: boolean;
};

export type SetupEmployee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  manager: string;
};

const defaultProgress: SetupProgress = {
  company: false,
  users: false,
  organization: false,
  locations: false,
  employees: false,
  hierarchy: false,
  policies: false,
  workflows: false,
  activate: false,
};

const normalizeRole = (roles: string[] | undefined): string => {
  if (!roles || roles.length === 0) return "employee";
  return roles[0].replace("ROLE_", "").toLowerCase();
};

const mapCompany = (profile: any): CompanyProfile => ({
  name: profile?.name ?? "",
  legal_entity: profile?.legalEntity ?? profile?.legal_entity ?? "",
  country: profile?.country ?? "",
  timezone: profile?.timezone ?? "",
});

const mapUser = (user: any): SetupUser => ({
  id: user?.id ?? "",
  name: user?.fullName ?? user?.full_name ?? user?.name ?? "",
  email: user?.email ?? "",
  role: normalizeRole(user?.roles),
  roles: user?.roles ?? [],
  permissions: user?.permissions ?? [],
  phoneNumber: user?.phoneNumber ?? user?.phone_number ?? "",
  language: user?.language ?? "",
  status: user?.active ?? user?.is_active ?? user?.isActive ? "active" : "invited",
});

const mapPermission = (permission: any): RolePermission => {
  const accessRaw = (permission?.access ?? "view").toString().toLowerCase();
  const access =
    accessRaw === "edit" ? "edit" : accessRaw === "none" ? "none" : "view";
  return {
    id: permission?.id ?? "",
    role: permission?.role ?? "",
    module: permission?.module ?? "",
    access,
  };
};

const mapPolicy = (policy: any): SetupPolicy => {
  const statusRaw = (policy?.status ?? "not_configured").toString().toLowerCase();
  const status = statusRaw === "configured" ? "configured" : "not_configured";
  return {
    id: policy?.id ?? "",
    name: policy?.name ?? "",
    status,
    owner: policy?.owner ?? "",
  };
};

const mapWorkflow = (flow: any): WorkflowConfig => {
  const approvers = Array.isArray(flow?.stages)
    ? flow.stages.map(
        (stage: any) =>
          stage?.role || stage?.approver_user_id || stage?.approverUserId || "approver"
      )
    : [];
  return {
    id: flow?.id ?? "",
    name: flow?.name ?? "",
    description: flow?.description ?? "",
    approvers,
  };
};

const mapEmployee = (employee: any): SetupEmployee => ({
  id: employee?.id ?? "",
  name: employee?.name ?? "",
  email: employee?.email ?? "",
  department: employee?.department ?? "",
  role: employee?.role ?? "",
  manager: employee?.manager ?? "",
});

export const setupApi = {
  getCompany: async () => {
    const res = await api.get("/setup/company");
    return { data: mapCompany(res.data?.data) };
  },
  updateCompany: async (payload: CompanyProfile) => {
    const res = await api.put("/setup/company", payload);
    return { data: mapCompany(res.data?.data) };
  },

  listUsers: async () => {
    const res = await api.get("/users");
    const users = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    return { data: users.map(mapUser) };
  },
  addUser: async (payload: {
    name: string;
    email: string;
    role: string;
    phoneNumber: string;
    password: string;
    language?: string;
  }) => {
    const res = await api.post("/users", {
      fullName: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      language: payload.language ?? "en",
      password: payload.password,
      role: payload.role,
    });
    return { data: mapUser(res.data?.data ?? res.data) };
  },
  updateUserRole: async (id: string, role: string) => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return { data: mapUser(res.data?.data ?? res.data) };
  },

  listPermissions: async () => {
    const res = await api.get("/permissions");
    const permissions = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: permissions.map(mapPermission) };
  },
  updatePermission: async (id: string, access: RolePermission["access"]) => {
    const res = await api.patch(`/permissions/${id}`, { access });
    return { data: mapPermission(res.data?.data ?? res.data) };
  },

  listEmployees: async () => {
    const res = await api.get("/setup/employees");
    const employees = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: employees.map(mapEmployee) };
  },
  addEmployee: async (payload: Omit<SetupEmployee, "id">) => {
    const res = await api.post("/setup/employees", payload);
    return { data: mapEmployee(res.data?.data ?? res.data) };
  },
  importEmployees: async () => {
    const res = await api.post("/setup/employees/import");
    return { data: res.data?.data ?? res.data };
  },

  listPolicies: async () => {
    const res = await api.get("/setup/policies");
    const policies = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: policies.map(mapPolicy) };
  },

  listWorkflows: async () => {
    const res = await api.get("/approval-flows");
    const flows = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: flows.map(mapWorkflow) };
  },
  updateWorkflow: async (id: string, payload: Partial<WorkflowConfig>) => {
    const res = await api.patch(`/approval-flows/${id}`, payload);
    return { data: mapWorkflow(res.data?.data ?? res.data) };
  },

  getProgress: async () => {
    const res = await api.get("/setup/progress");
    return { data: { ...defaultProgress, ...(res.data?.data ?? {}) } };
  },
  activate: async () => {
    const res = await api.post("/setup/activate");
    return { data: { ...defaultProgress, ...(res.data?.data ?? {}) } };
  },
};

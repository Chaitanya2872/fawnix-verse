import api from "@/lib/api";

export type OrgNode = {
  id: string;
  name: string;
  role: string;
  department: string;
  manager_id?: string;
  level: number;
};

export type Department = { id: string; name: string; head: string };
export type BusinessUnit = { id: string; name: string; owner: string };
export type Team = { id: string; name: string; department: string };
export type RoleMapping = { id: string; role: string; department: string };
export type Vacancy = {
  id: string;
  role: string;
  department: string;
  headcount: number;
  filled: number;
  status: "open" | "closed";
};
export type Location = { id: string; name: string };
export type Designation = { id: string; name: string };

type StructureAddPayload = {
  name: string;
  owner?: string;
  head?: string;
  department?: string;
};

const mapNode = (node: any): OrgNode => ({
  id: node?.id ?? "",
  name: node?.name ?? "",
  role: node?.role ?? "",
  department: node?.department ?? "",
  manager_id: node?.managerId ?? node?.manager_id ?? undefined,
  level: node?.level ?? 0,
});

const mapDepartment = (department: any): Department => ({
  id: department?.id ?? "",
  name: department?.name ?? "",
  head: department?.headName ?? department?.head_name ?? department?.head ?? "Unassigned",
});

const mapBusinessUnit = (unit: any): BusinessUnit => ({
  id: unit?.id ?? "",
  name: unit?.name ?? "",
  owner: unit?.owner ?? "Unassigned",
});

const mapTeam = (team: any): Team => ({
  id: team?.id ?? "",
  name: team?.name ?? "",
  department: team?.department ?? "Unassigned",
});

const mapRoleMapping = (mapping: any): RoleMapping => ({
  id: mapping?.id ?? "",
  role: mapping?.role ?? "",
  department: mapping?.department ?? "",
});

const mapVacancy = (vacancy: any): Vacancy => {
  const statusRaw = (vacancy?.status ?? "open").toString().toLowerCase();
  const status = statusRaw === "closed" ? "closed" : "open";
  return {
    id: vacancy?.id ?? "",
    role: vacancy?.role ?? "",
    department: vacancy?.department ?? "",
    headcount: vacancy?.headcount ?? 0,
    filled: vacancy?.filled ?? 0,
    status,
  };
};

const mapLocation = (location: any): Location => ({
  id: location?.id ?? "",
  name: location?.name ?? "",
});

const mapDesignation = (designation: any): Designation => ({
  id: designation?.id ?? "",
  name: designation?.name ?? "",
});

export const orgApi = {
  listOrgNodes: async () => {
    const res = await api.get("/org/nodes");
    const nodes = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: nodes.map(mapNode) };
  },

  listDepartments: async () => {
    const res = await api.get("/departments");
    const departments = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: departments.map(mapDepartment) };
  },
  addDepartment: async (payload: StructureAddPayload) => {
    const res = await api.post("/departments", {
      name: payload.name,
      head: payload.head,
    });
    return { data: res.data?.data ?? res.data };
  },

  listBusinessUnits: async () => {
    const res = await api.get("/org/business-units");
    const units = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: units.map(mapBusinessUnit) };
  },
  addBusinessUnit: async (payload: StructureAddPayload) => {
    const res = await api.post("/org/business-units", {
      name: payload.name,
      owner: payload.owner,
    });
    return { data: res.data?.data ?? res.data };
  },

  listTeams: async () => {
    const res = await api.get("/org/teams");
    const teams = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: teams.map(mapTeam) };
  },
  addTeam: async (payload: StructureAddPayload) => {
    const res = await api.post("/org/teams", {
      name: payload.name,
      department: payload.department,
    });
    return { data: res.data?.data ?? res.data };
  },

  listRoleMappings: async () => {
    const res = await api.get("/org/role-mappings");
    const mappings = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: mappings.map(mapRoleMapping) };
  },
  updateRoleMapping: async (id: string, department: string) => {
    const res = await api.patch(`/org/role-mappings/${id}`, { department });
    return { data: mapRoleMapping(res.data?.data ?? res.data) };
  },

  listVacancies: async () => {
    const res = await api.get("/org/vacancies");
    const vacancies = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: vacancies.map(mapVacancy) };
  },
  updateVacancyStatus: async (id: string, status: Vacancy["status"]) => {
    const res = await api.patch(`/org/vacancies/${id}`, { status });
    return { data: mapVacancy(res.data?.data ?? res.data) };
  },

  listLocations: async () => {
    const res = await api.get("/org/locations");
    const locations = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: locations.map(mapLocation) };
  },
  addLocation: async (name: string) => {
    const res = await api.post("/org/locations", { name });
    return { data: res.data?.data ?? res.data };
  },

  listDesignations: async () => {
    const res = await api.get("/org/designations");
    const designations = Array.isArray(res.data?.data) ? res.data.data : [];
    return { data: designations.map(mapDesignation) };
  },
  addDesignation: async (name: string) => {
    const res = await api.post("/org/designations", { name });
    return { data: res.data?.data ?? res.data };
  },

  updateManager: async (nodeId: string, managerId?: string) => {
    const res = await api.patch(`/org/nodes/${nodeId}/manager`, {
      manager_id: managerId ?? "",
    });
    return { data: mapNode(res.data?.data ?? res.data) };
  },
};

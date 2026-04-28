export const PROJECT_STATUS_OPTIONS = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
] as const;

export const PROJECT_HEALTH_OPTIONS = [
  "On Track",
  "Needs Attention",
  "At Risk",
  "Completed",
] as const;

export const PROJECT_STAGE_OPTIONS = [
  "Discovery",
  "Planning",
  "Design",
  "Execution",
  "Handover",
] as const;

export const MILESTONE_STATUS_OPTIONS = [
  "Upcoming",
  "In Progress",
  "Delivered",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number];
export type ProjectHealth = (typeof PROJECT_HEALTH_OPTIONS)[number];
export type ProjectStage = (typeof PROJECT_STAGE_OPTIONS)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUS_OPTIONS)[number];

export interface ProjectStakeholder {
  id: string;
  name: string;
  title: string;
  influence: string;
  focusArea: string;
}

export interface ProjectCoordinator {
  id: string;
  name: string;
  function: string;
  timezone: string;
  cadence: string;
}

export interface ProjectTeamMember {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  allocation: number;
}

export interface ProjectMilestone {
  id: string;
  label: string;
  dueDate: string;
  owner: string;
  status: MilestoneStatus;
}

export interface ProjectBudget {
  currency: string;
  approved: number;
  committed: number;
  spent: number;
  forecast: number;
}

export interface ProjectFormData {
  name: string;
  client: string;
  sector: string;
  owner: string;
  status: ProjectStatus;
  health: ProjectHealth;
  stage: ProjectStage;
  location: string;
  startDate: string;
  targetDate: string;
  nextReview: string;
  progress: number;
  description: string;
  objective: string;
  deliveryNotes: string;
  budget: ProjectBudget;
  stakeholders: ProjectStakeholder[];
  coordinators: ProjectCoordinator[];
  teamMembers: ProjectTeamMember[];
  milestones: ProjectMilestone[];
  tags: string[];
  risks: string[];
}

export interface ProjectRecord extends ProjectFormData {
  id: string;
  code: string;
  lastUpdated: string;
}

export const TASK_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "BLOCKED",
  "UNDER_REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const TASK_VISIBILITIES = ["PRIVATE", "TEAM", "PROJECT", "ORGANIZATION"] as const;
export const TASK_APPROVAL_STATUSES = [
  "NOT_REQUIRED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "REWORK_REQUESTED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskVisibility = (typeof TASK_VISIBILITIES)[number];
export type TaskApprovalStatus = (typeof TASK_APPROVAL_STATUSES)[number];

export type TaskSummary = {
  id: string;
  taskCode: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  approvalStatus: TaskApprovalStatus;
  visibility: TaskVisibility;
  startDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  projectRef: string | null;
  moduleRef: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedTeamName: string | null;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  checklistCompleted: number;
  checklistTotal: number;
  overdue: boolean;
  updatedAt: string;
};

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

export type TaskChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  completedById: string | null;
  completedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  contentType: string | null;
  fileSize: number | null;
  uploadedByName: string | null;
  createdAt: string;
};

export type TaskDependency = {
  id: string;
  taskId: string;
  taskCode: string | null;
  title: string | null;
};

export type TaskAssignmentHistory = {
  id: string;
  assignedById: string;
  assignedByName: string;
  assignedToId: string;
  assignedToName: string;
  assignedToEmail: string | null;
  assignedTeamName: string | null;
  active: boolean;
  assignedAt: string;
  endedAt: string | null;
};

export type TaskActivity = {
  id: string;
  activityType: string;
  actorId: string | null;
  actorName: string | null;
  message: string;
  createdAt: string;
};

export type TaskTimeLog = {
  id: string;
  userId: string;
  userName: string;
  startedAt: string;
  endedAt: string | null;
  durationHours: number | null;
  note: string | null;
  createdAt: string;
};

export type TaskDetail = {
  task: TaskSummary;
  comments: TaskComment[];
  checklistItems: TaskChecklistItem[];
  attachments: TaskAttachment[];
  dependencies: TaskDependency[];
  assignments: TaskAssignmentHistory[];
  activity: TaskActivity[];
  timeLogs: TaskTimeLog[];
};

export type TaskDashboard = {
  kpis: Record<string, number>;
  statusDistribution: Record<string, number>;
  recentActivity: TaskActivity[];
  upcomingDeadlines: Array<{
    id: string;
    taskCode: string;
    title: string;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    assignedToName: string | null;
  }>;
  workload: Array<{
    assigneeId: string;
    assigneeName: string;
    assigned: number;
    completed: number;
    overdue: number;
    loggedHours: number;
  }>;
  assignmentMetrics: {
    assigned: number;
    completed: number;
  };
};

export type TaskListResponse = {
  data: TaskSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TaskFilter = {
  search: string;
  status: string;
  priority: string;
  scope: "all" | "my" | "team";
  assigneeId: string;
  projectRef: string;
  moduleRef: string;
  approvalStatus: string;
  overdue: boolean;
  dueToday: boolean;
  page: number;
  pageSize: number;
};

export type TaskRequest = {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  projectRef?: string | null;
  moduleRef?: string | null;
  estimatedHours?: number;
  approvalRequired?: boolean;
  approvalStatus?: TaskApprovalStatus;
  visibility?: TaskVisibility;
  reminderMinutesBefore?: number | null;
  workflowName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  assignedTeamName?: string | null;
  approverId?: string | null;
  approverName?: string | null;
  tags?: Array<{ name: string }>;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    contentType?: string | null;
    fileSize?: number | null;
  }>;
  dependencies?: Array<{
    taskId: string;
    taskCode?: string | null;
    title?: string | null;
  }>;
  checklistItems?: Array<{ label: string }>;
};

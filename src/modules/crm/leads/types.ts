// ---------------------------------------------------------------------------
// Enums - erasableSyntaxOnly-safe const objects
// ---------------------------------------------------------------------------

export const LeadStatus = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  FOLLOW_UP: "FOLLOW_UP",
  QUALIFIED: "QUALIFIED",
  UNQUALIFIED: "UNQUALIFIED",
  ASSIGNED_TO_SALESPERSON: "ASSIGNED_TO_SALESPERSON",
  PROPOSAL_SENT: "PROPOSAL_SENT",
  CONVERTED: "CONVERTED",
  LOST: "LOST",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LeadSource = {
  WEBSITE: "WEBSITE",
  REFERRAL: "REFERRAL",
  COLD_CALL: "COLD_CALL",
  EMAIL: "EMAIL",
  SOCIAL: "SOCIAL",
  EVENT: "EVENT",
  OTHER: "OTHER",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type LeadPriority = (typeof LeadPriority)[keyof typeof LeadPriority];

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface LeadRemarkVersion {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface LeadRemark {
  id: string;
  leadId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  versions: LeadRemarkVersion[];
}

export interface LeadContactRecording {
  id: string;
  audioFileName: string;
  audioContentType: string | null;
  audioSize: number;
  transcript: string;
  remarksSummary: string;
  conversationSummary: string | null;
  createdBy: string;
  contactedAt: string;
  createdAt: string;
}

export type LeadActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "status_change"
  | "assignment_change"
  | "remark_added"
  | "remark_edited"
  | "converted";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  assignedTo: string;
  assignedToUserId: string | null;
  estimatedValue: number;
  notes: string;
  tags: string[];
  remarks: LeadRemark[];
  contactRecordings: LeadContactRecording[];
  activities: LeadActivity[];
  lastContactedAt: string | null;
  followUpAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Filter & form types
// ---------------------------------------------------------------------------

export interface LeadFilter {
  search: string;
  status: LeadStatus | "ALL";
  source: LeadSource | "ALL";
  assignedTo: string;
  priority: LeadPriority | "ALL";
  page: number;
  pageSize: number;
}

export type LeadFormData = Pick<
  Lead,
  | "name"
  | "company"
  | "email"
  | "phone"
  | "status"
  | "source"
  | "priority"
  | "assignedTo"
  | "assignedToUserId"
  | "estimatedValue"
  | "notes"
  | "tags"
  | "followUpAt"
>;

export type LeadUpdateData = Partial<
  LeadFormData & {
    convertedAt: string | null;
    lastContactedAt: string | null;
    followUpAt: string | null;
  }
>;

export interface AssignLeadInput {
  assignedTo: string;
  assignedToUserId?: string | null;
  assignedBy?: string;
}

export interface CreateLeadRemarkInput {
  content: string;
  createdBy?: string;
}

export interface EditLeadRemarkInput {
  content: string;
  editedBy?: string;
}

export interface ContactLeadRecordingInput {
  audioFile: File;
  contactedAt?: string | null;
}

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
}

export interface LeadsSummary {
  totalPipelineValue: number;
  newCount: number;
  qualifiedCount: number;
  convertedCount: number;
  statusCounts: Partial<Record<LeadStatus, number>>;
}

export interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: LeadsSummary;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  ASSIGNED_TO_SALESPERSON: "Assigned to Salesperson",
  PROPOSAL_SENT: "Proposal Sent",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.FOLLOW_UP,
  LeadStatus.QUALIFIED,
  LeadStatus.UNQUALIFIED,
  LeadStatus.ASSIGNED_TO_SALESPERSON,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.CONVERTED,
  LeadStatus.LOST,
];

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: [LeadStatus.CONTACTED, LeadStatus.LOST],
  CONTACTED: [LeadStatus.FOLLOW_UP, LeadStatus.LOST],
  FOLLOW_UP: [LeadStatus.QUALIFIED, LeadStatus.UNQUALIFIED, LeadStatus.LOST],
  QUALIFIED: [LeadStatus.ASSIGNED_TO_SALESPERSON, LeadStatus.LOST],
  UNQUALIFIED: [LeadStatus.ASSIGNED_TO_SALESPERSON, LeadStatus.LOST],
  ASSIGNED_TO_SALESPERSON: [LeadStatus.PROPOSAL_SENT, LeadStatus.LOST],
  PROPOSAL_SENT: [LeadStatus.CONVERTED, LeadStatus.LOST],
  CONVERTED: [],
  LOST: [],
};

export const TERMINAL_LEAD_STATUSES: LeadStatus[] = [LeadStatus.CONVERTED, LeadStatus.LOST];

export function getLeadStatusTransitions(status: LeadStatus) {
  return LEAD_STATUS_TRANSITIONS[status] ?? [];
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  COLD_CALL: "Cold Call",
  EMAIL: "Email Campaign",
  SOCIAL: "Social Media",
  EVENT: "Event",
  OTHER: "Other",
};

export const SALES_REPS = [
  "Sarah Kim",
  "Mike Rodriguez",
  "James Lee",
  "Priya Singh",
  "Alex Johnson",
  "Emma Davis",
] as const;

export type SalesRep = (typeof SALES_REPS)[number];

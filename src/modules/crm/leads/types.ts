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
  | "follow_up_reminder"
  | "scheduled"
  | "schedule_updated"
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
  externalLeadId: string | null;
  sourceMonth: string | null;
  sourceDate: string | null;
  alternativePhone: string | null;
  projectStage: string | null;
  expectedTimeline: string | null;
  propertyType: string | null;
  sqft: string | null;
  community: string | null;
  projectLocation: string | null;
  projectState: string | null;
  presalesResponse: string | null;
  demoVisit: string | null;
  presalesRemarks: string | null;
  adSetName: string | null;
  campaignName: string | null;
  metaLeadId: string | null;
  metaFormId: string | null;
  metaAdId: string | null;
  sourceCreatedAt: string | null;
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

export const LeadScheduleType = {
  VISIT: "VISIT",
  DEMO: "DEMO",
} as const;
export type LeadScheduleType =
  (typeof LeadScheduleType)[keyof typeof LeadScheduleType];

export const LeadScheduleStatus = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type LeadScheduleStatus =
  (typeof LeadScheduleStatus)[keyof typeof LeadScheduleStatus];

export const LeadScheduleMode = {
  ON_SITE: "ON_SITE",
  REMOTE: "REMOTE",
} as const;
export type LeadScheduleMode =
  (typeof LeadScheduleMode)[keyof typeof LeadScheduleMode];

export interface LeadSchedule {
  id: string;
  leadId: string;
  type: LeadScheduleType;
  status: LeadScheduleStatus;
  scheduledAt: string;
  location: string | null;
  mode: LeadScheduleMode | null;
  notes: string | null;
  assignedTo: string;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateLeadScheduleInput = {
  type: LeadScheduleType;
  scheduledAt: string;
  location?: string | null;
  mode?: LeadScheduleMode | null;
  notes?: string | null;
  assignedTo?: string | null;
  assignedToUserId?: string | null;
};

export type UpdateLeadScheduleInput = Partial<{
  type: LeadScheduleType;
  status: LeadScheduleStatus;
  scheduledAt: string;
  location: string | null;
  mode: LeadScheduleMode | null;
  notes: string | null;
  assignedTo: string | null;
  assignedToUserId: string | null;
}>;

export type LeadImportError = {
  row: number;
  message: string;
};

export type LeadImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: LeadImportError[];
};

export interface LeadWhatsappQuestionnaire {
  id: string;
  leadId: string;
  phone: string;
  waId: string | null;
  language: string | null;
  interestAreas: string[];
  demoPreference: string | null;
  callbackPreference: string | null;
  callbackTimeText: string | null;
  ownershipRole: string | null;
  step: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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

export interface LeadNotifications {
  newLeadCount: number;
  followUpDueCount: number;
  updatedAt: string;
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

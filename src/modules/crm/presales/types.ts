import { LeadStatus } from "@/modules/crm/leads/types";

export type LeadQuickView = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  assignedToName: string;
  lastContactedAt: string | null;
  createdAt: string;
};

export type PreSalesOverview = {
  statusCounts: Partial<Record<LeadStatus, number>>;
  myQueue: LeadQuickView[];
  needsContact: LeadQuickView[];
  followUps: LeadQuickView[];
  awaitingAssignment: LeadQuickView[];
};

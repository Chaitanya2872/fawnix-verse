import { LeadStatus } from "@/modules/crm/leads/types";

export type StageMetric = {
  status: LeadStatus;
  count: number;
};

export type SourceMetric = {
  source: string;
  total: number;
  converted: number;
  conversionRate: number;
};

export type RepMetric = {
  userId: string | null;
  name: string;
  assigned: number;
  active: number;
  converted: number;
  lost: number;
  pipelineValue: number;
};

export type OverviewResponse = {
  totalLeads: number;
  pipelineValue: number;
  convertedCount: number;
  lostCount: number;
  conversionRate: number;
  lossRate: number;
  statusCounts: Partial<Record<LeadStatus, number>>;
  stageMetrics: StageMetric[];
  sourcePerformance: SourceMetric[];
  repPerformance: RepMetric[];
  avgDaysToFirstContact: number;
  avgDaysInStage: Partial<Record<LeadStatus, number>>;
};

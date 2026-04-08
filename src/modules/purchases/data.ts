export type StepStatus = "complete" | "current" | "pending";

export type WorkflowStep = {
  id: string;
  title: string;
  status: StepStatus;
  timestamp: string;
  actor: string;
  note: string;
};

export type ApprovalStage = {
  role: "Management" | "Finance" | "CMD";
  status: "Approved" | "Pending" | "Rejected";
  timestamp?: string;
  actor?: string;
  remarks?: string;
};

export const SUMMARY_CARDS = [
  { label: "Source Team", value: "Sales / Client Team" },
  { label: "Estimated Budget", value: "INR 18.6L" },
  { label: "Current Stage", value: "Invoice Generated" },
  { label: "SLA Countdown", value: "2 days remaining" },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "received",
    title: "Requirement Received",
    status: "complete",
    timestamp: "Mar 28, 2026 - 10:12 AM",
    actor: "Aarav (Sales)",
    note: "Received from Sales team for client Orion Logistics.",
  },
  {
    id: "analysis",
    title: "Analysis & Budgeting",
    status: "complete",
    timestamp: "Mar 28, 2026 - 02:20 PM",
    actor: "Nila (Procurement)",
    note: "Estimated budget at INR 18.6L with a 5% buffer.",
  },
  {
    id: "invoice",
    title: "Invoice Generated",
    status: "current",
    timestamp: "Mar 29, 2026 - 09:40 AM",
    actor: "Nila (Procurement)",
    note: "Draft cost estimate v3 shared for internal approvals.",
  },
  {
    id: "internal-approval",
    title: "Internal Approval",
    status: "pending",
    timestamp: "Awaiting approvals",
    actor: "Management - Finance - CMD",
    note: "Multi-level approvals in progress.",
  },
  {
    id: "client-approval",
    title: "Client Approval",
    status: "pending",
    timestamp: "Pending",
    actor: "Client Review",
    note: "Client to confirm and sign the estimate.",
  },
  {
    id: "documents",
    title: "Document Received",
    status: "pending",
    timestamp: "Pending",
    actor: "Procurement Vault",
    note: "Signed document will be linked to request.",
  },
];

export const APPROVAL_STAGES: ApprovalStage[] = [
  {
    role: "Management",
    status: "Approved",
    timestamp: "Mar 29, 2026 - 11:15 AM",
    actor: "R. Kapoor",
    remarks: "Proceed with the revised scope.",
  },
  {
    role: "Finance",
    status: "Pending",
  },
  {
    role: "CMD",
    status: "Pending",
  },
];

export const AUDIT_LOG = [
  {
    id: "log-1",
    action: "Requirement logged",
    timestamp: "Mar 28, 2026 - 10:15 AM",
    actor: "Aarav (Sales)",
    detail: "Submitted via Sales portal.",
  },
  {
    id: "log-2",
    action: "Budget estimate uploaded",
    timestamp: "Mar 28, 2026 - 02:25 PM",
    actor: "Nila (Procurement)",
    detail: "Attached draft estimate v3.",
  },
  {
    id: "log-3",
    action: "Management approved",
    timestamp: "Mar 29, 2026 - 11:15 AM",
    actor: "R. Kapoor",
    detail: "Remarks added on pricing buffer.",
  },
  {
    id: "log-4",
    action: "Finance review started",
    timestamp: "Mar 29, 2026 - 02:40 PM",
    actor: "N. Sharma",
    detail: "Invoice verification initiated.",
  },
];

export const REQUEST_FIELDS = [
  { label: "Requirement Title", value: "Fleet GPS upgrade - Orion Logistics" },
  { label: "Source Team", value: "Sales / Client Team" },
  { label: "Category", value: "Hardware & Installation" },
  { label: "Priority", value: "High" },
  { label: "Required By", value: "Apr 05, 2026" },
  { label: "Client Name", value: "Orion Logistics Pvt Ltd" },
];

export const BUDGET_FIELDS = [
  { label: "Estimated Budget", value: "INR 18.6L" },
  { label: "Negotiated Value", value: "INR 17.9L" },
  { label: "Invoice Owner", value: "Nila (Procurement)" },
  { label: "Invoice Status", value: "Pending approvals" },
];

export const CLIENT_FIELDS = [
  { label: "Shared On", value: "Mar 29, 2026 - 04:10 PM" },
  { label: "Client Contact", value: "Meera Patel" },
  { label: "Approval Status", value: "Awaiting response" },
  { label: "Expected Sign-off", value: "Apr 02, 2026" },
];

export const INVOICE_VERSIONS = [
  { id: "v3", label: "Estimate v3", date: "Mar 29, 2026", status: "Submitted" },
  { id: "v2", label: "Estimate v2", date: "Mar 28, 2026", status: "Revised" },
  { id: "v1", label: "Estimate v1", date: "Mar 28, 2026", status: "Initial draft" },
];

export const SIGNED_DOCS = [
  { id: "doc-1", name: "Client confirmation receipt.pdf", date: "Pending upload" },
];

export const STATUS_STYLES: Record<StepStatus, { dot: string; badge: string }> = {
  complete: {
    dot: "bg-emerald-500 text-white",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  current: {
    dot: "bg-blue-600 text-white",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pending: {
    dot: "bg-slate-200 text-slate-500",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

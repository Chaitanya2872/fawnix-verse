import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  Handshake,
  Layers,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

export const P2P_NAV_ITEMS = [
  { label: "Dashboard", to: "/p2p", icon: <Layers className="h-4 w-4" />, end: true },
  { label: "PR Management", to: "/p2p/pr", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Budget Validation", to: "/p2p/budget", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Vendor Evaluation", to: "/p2p/vendors", icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: "Negotiation", to: "/p2p/negotiation", icon: <Handshake className="h-4 w-4" /> },
  { label: "Purchase Order", to: "/p2p/po", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Material Receipt", to: "/p2p/receipt", icon: <Truck className="h-4 w-4" /> },
  { label: "Invoice", to: "/p2p/invoice", icon: <FileText className="h-4 w-4" /> },
  { label: "Payment", to: "/p2p/payment", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Alerts / Queue", to: "/p2p/alerts", icon: <FileCheck2 className="h-4 w-4" /> },
  { label: "Reports", to: "/p2p/reports", icon: <BarChart3 className="h-4 w-4" /> },
];

export const P2P_NAV_SECTIONS = [
  {
    heading: "Workspace",
    items: [P2P_NAV_ITEMS[0], P2P_NAV_ITEMS[9], P2P_NAV_ITEMS[10]],
  },
  {
    heading: "Input Screens",
    items: [P2P_NAV_ITEMS[1], P2P_NAV_ITEMS[2], P2P_NAV_ITEMS[3], P2P_NAV_ITEMS[4]],
  },
  {
    heading: "Purchase Order Pages",
    items: [P2P_NAV_ITEMS[5], P2P_NAV_ITEMS[6], P2P_NAV_ITEMS[7], P2P_NAV_ITEMS[8]],
  },
] as const;

export const KPI_CARDS = [
  { label: "Active PRs", value: "28", delta: "+6.2%", note: "vs last week" },
  { label: "Open POs", value: "14", delta: "-3.1%", note: "in issuance" },
  { label: "Payments", value: "INR 42.8L", delta: "+9.4%", note: "this month" },
  { label: "Negotiation Time", value: "3.4 days", delta: "-0.6d", note: "avg cycle" },
];

export const WORKFLOW_STAGES = [
  { id: "pr", label: "PR", status: "complete" },
  { id: "budget", label: "Budget", status: "complete" },
  { id: "vendors", label: "Vendors", status: "current" },
  { id: "negotiation", label: "Negotiation", status: "pending" },
  { id: "po", label: "PO", status: "pending" },
  { id: "receipt", label: "Receipt", status: "pending" },
  { id: "invoice", label: "Invoice", status: "pending" },
  { id: "payment", label: "Payment", status: "pending" },
];

export const QUEUE_ALERTS = [
  { id: "q1", stage: "budget", title: "PR-248 stuck", detail: "Awaiting budget owner review", tone: "warning" },
  { id: "q2", stage: "po", title: "PO-901 delayed", detail: "Vendor confirmation overdue", tone: "danger" },
  { id: "q3", stage: "invoice", title: "Invoice-77 matched", detail: "Ready for payment run", tone: "success" },
];

export const NEXT_ACTIONS = [
  { id: "a1", stage: "vendors", action: "Review vendor shortlist", owner: "Procurement", due: "Today 3:00 PM" },
  { id: "a2", stage: "negotiation", action: "Finalize negotiation memo", owner: "Sourcing", due: "Tomorrow" },
  { id: "a3", stage: "receipt", action: "Schedule receipt check", owner: "Warehouse", due: "Apr 08" },
];

export const PR_ROWS = [
  { id: "pr-1", code: "PR-248", item: "RFID scanners", amount: "INR 5.6L", status: "Pending" },
  { id: "pr-2", code: "PR-249", item: "Warehouse racks", amount: "INR 9.2L", status: "Approved" },
  { id: "pr-3", code: "PR-250", item: "Fleet tracking kits", amount: "INR 3.8L", status: "Rejected" },
];

export const PR_DETAILS = [
  { label: "Request ID", value: "PR-248" },
  { label: "Category", value: "Operations Hardware" },
  { label: "Requested By", value: "A. Kapoor" },
  { label: "Needed By", value: "Apr 12, 2026" },
  { label: "Budget", value: "INR 6.2L" },
  { label: "Preferred Vendor", value: "Trackon Systems" },
];

export const BUDGET_CHECK = [
  { label: "Allocated Budget", value: "INR 6.2L" },
  { label: "Committed", value: "INR 4.1L" },
  { label: "Available", value: "INR 2.1L" },
];

export const VENDOR_ROWS = [
  { id: "v1", name: "Trackon Systems", price: "INR 5.4L", rating: "4.6", delivery: "7 days", status: "Best Value" },
  { id: "v2", name: "Nova Supplies", price: "INR 5.1L", rating: "4.1", delivery: "10 days", status: "Lowest Cost" },
  { id: "v3", name: "Apex Industrial", price: "INR 5.8L", rating: "4.8", delivery: "6 days", status: "Fastest" },
];

export const NEGOTIATION_HISTORY = [
  { id: "n1", date: "Apr 05", detail: "Vendor agreed to 4% discount on bulk order.", owner: "S. Malik" },
  { id: "n2", date: "Apr 04", detail: "Requested extended warranty at no extra cost.", owner: "S. Malik" },
  { id: "n3", date: "Apr 03", detail: "Introduced service-level clause for installation.", owner: "Legal" },
];

export const PO_INFO = [
  { label: "PO Number", value: "PO-901" },
  { label: "Vendor", value: "Trackon Systems" },
  { label: "Issue Date", value: "Apr 06, 2026" },
  { label: "PO Value", value: "INR 5.4L" },
];

export const RECEIPT_ITEMS = [
  { id: "r1", item: "RFID scanners", ordered: 40, received: 38, date: "Apr 08, 2026" },
  { id: "r2", item: "Installation kits", ordered: 40, received: 40, date: "Apr 08, 2026" },
];

export const INVOICE_ROWS = [
  { id: "i1", label: "Invoice Number", value: "INV-77" },
  { id: "i2", label: "Linked PO", value: "PO-901" },
  { id: "i3", label: "Amount", value: "INR 5.4L" },
  { id: "i4", label: "Tax", value: "INR 0.48L" },
];

export const PAYMENT_DETAILS = [
  { label: "Payment Run", value: "Apr 15, 2026" },
  { label: "Method", value: "NEFT" },
  { label: "Beneficiary", value: "Trackon Systems" },
  { label: "Amount", value: "INR 5.88L" },
];

export const ALERT_GROUPS = [
  {
    id: "alerts-pr",
    title: "Stuck PRs",
    items: [
      { id: "ap1", title: "PR-242 pending 6 days", detail: "Budget approval missing", tone: "warning" },
      { id: "ap2", title: "PR-239 rework needed", detail: "Scope mismatch with client", tone: "danger" },
    ],
  },
  {
    id: "alerts-approvals",
    title: "Pending Approvals",
    items: [
      { id: "ap3", title: "Finance approval", detail: "PO-901 waiting 2 days", tone: "warning" },
      { id: "ap4", title: "Legal review", detail: "Negotiation clause update", tone: "neutral" },
    ],
  },
  {
    id: "alerts-payments",
    title: "Delayed Payments",
    items: [
      { id: "ap5", title: "INV-70 overdue", detail: "Vendor follow-up required", tone: "danger" },
      { id: "ap6", title: "INV-72 due tomorrow", detail: "Payment run scheduled", tone: "success" },
    ],
  },
];

export const REPORT_SERIES = [
  { label: "PR to PO", value: 78 },
  { label: "Negotiation", value: 42 },
  { label: "Payment Delay", value: 28 },
];

export const PAYMENT_DELAYS = [
  { label: "0-3 days", value: 42 },
  { label: "4-7 days", value: 26 },
  { label: "8-14 days", value: 18 },
  { label: "15+ days", value: 14 },
];

import type { VisitorRecord, VisitorStats, VisitorStatus } from "../types";

const PURPOSE_LABELS: Record<string, string> = {
  OFFICIAL_MEETING: "Official Meeting",
  CONSULTANT_VISIT: "Consultant Visit",
  PERSONAL_VISIT: "Personal Visit",
  OTHERS: "Others",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
  checkedin: "Arrived",
  checkedout: "Completed",
  arrived: "Arrived",
};

export function normalizeStatus(status?: VisitorStatus) {
  return String(status || "Pending").trim().toLowerCase().replace(/\s+/g, "");
}

export function getDisplayStatus(status?: VisitorStatus) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || String(status || "Pending");
}

export function isPending(visitor: VisitorRecord) {
  return normalizeStatus(visitor.status) === "pending";
}

export function isRejected(visitor: VisitorRecord) {
  return normalizeStatus(visitor.status) === "rejected";
}

export function isCancelled(visitor: VisitorRecord) {
  return normalizeStatus(visitor.status) === "cancelled";
}

export function isCheckedOut(visitor: VisitorRecord) {
  const status = normalizeStatus(visitor.status);
  return Boolean(visitor.checkOut || status === "checkedout" || status === "completed");
}

export function isCheckedIn(visitor: VisitorRecord) {
  const status = normalizeStatus(visitor.status);
  return Boolean((visitor.checkIn && !visitor.checkOut) || status === "checkedin" || status === "arrived");
}

export function isApproved(visitor: VisitorRecord) {
  const status = normalizeStatus(visitor.status);
  return status === "approved" || isCheckedIn(visitor);
}

export function canApprove(visitor: VisitorRecord) {
  return isPending(visitor);
}

export function canReject(visitor: VisitorRecord) {
  return !isRejected(visitor) && !isCheckedOut(visitor) && !isCancelled(visitor);
}

export function canCheckIn(visitor: VisitorRecord) {
  return isApproved(visitor) && !visitor.checkIn && !isCheckedOut(visitor);
}

export function canCheckOut(visitor: VisitorRecord) {
  return Boolean(visitor.checkIn && !visitor.checkOut);
}

export function getPurposeLabel(value?: string) {
  if (!value) return "-";
  return PURPOSE_LABELS[value] || value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function getInitials(name = "Visitor") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "V";
}

export function getVisitWindowState(visitor?: VisitorRecord | null) {
  if (!visitor) return { state: "empty" as const, message: "No visitor selected." };
  if (visitor.checkIn) return { state: "active" as const, message: "Visitor has started the visit." };

  const now = new Date();
  const from = visitor.fromDateTime ? new Date(visitor.fromDateTime) : null;
  const to = visitor.toDateTime ? new Date(visitor.toDateTime) : null;

  if (to && !Number.isNaN(to.getTime()) && now > to) {
    return {
      state: "expired" as const,
      message: `Visit window expired ${formatDateTime(visitor.toDateTime)}.`,
    };
  }

  if (from && !Number.isNaN(from.getTime()) && now < from) {
    return {
      state: "early" as const,
      message: `Visit window starts ${formatDateTime(visitor.fromDateTime)}.`,
    };
  }

  return { state: "active" as const, message: "Visit window is active." };
}

export function sortVisitorsNewest(visitors: VisitorRecord[]) {
  return [...visitors].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.fromDateTime || 0).getTime();
    const bDate = new Date(b.createdAt || b.fromDateTime || 0).getTime();
    if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
      return Number(b.id) - Number(a.id);
    }
    return bDate - aDate;
  });
}

export function getVisitorStats(visitors: VisitorRecord[]): VisitorStats {
  return {
    totalRequests: visitors.length,
    pendingRequests: visitors.filter(isPending).length,
    approvedRequests: visitors.filter((visitor) => isApproved(visitor) && !isCheckedOut(visitor)).length,
    rejectedRequests: visitors.filter(isRejected).length,
    currentlyArrived: visitors.filter(isCheckedIn).length,
    completedRequests: visitors.filter(isCheckedOut).length,
    todayVisitors: visitors.filter((visitor) => isToday(visitor.fromDateTime) || isToday(visitor.createdAt)).length,
  };
}

export function getBadgePayload(visitor: VisitorRecord) {
  return visitor.qrCodeData || visitor.visitorId || String(visitor.id);
}

export function toVisitorCsv(visitors: VisitorRecord[]) {
  const rows = [
    [
      "Visitor ID",
      "Name",
      "Email",
      "Mobile",
      "Company",
      "Purpose",
      "Host",
      "From",
      "To",
      "Status",
      "Check In",
      "Check Out",
    ],
    ...visitors.map((visitor) => [
      visitor.visitorId || "",
      visitor.name || "",
      visitor.email || "",
      visitor.mobile || "",
      visitor.company || "",
      getPurposeLabel(visitor.purpose),
      visitor.employeeToMeet || "",
      visitor.fromDateTime || "",
      visitor.toDateTime || "",
      getDisplayStatus(visitor.status),
      visitor.checkIn || "",
      visitor.checkOut || "",
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

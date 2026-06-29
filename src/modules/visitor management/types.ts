import type { ReactNode } from "react";

export type VisitorStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Checked In"
  | "Checked Out"
  | "Completed"
  | "Arrived"
  | string;

export type VisitorRecord = {
  id: string | number;
  visitorId?: string;
  name: string;
  email?: string;
  mobile?: string;
  company?: string;
  purpose?: string;
  otherPurpose?: string;
  fromDateTime?: string;
  toDateTime?: string;
  status?: VisitorStatus;
  photo?: string | null;
  faceRegistered?: boolean;
  facePoses?: number;
  qrCodeData?: string;
  qrCodeUrl?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  createdAt?: string;
  employeeToMeet?: string;
  registrationToken?: string;
  rejectionReason?: string | null;
};

export type VisitorStats = {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  currentlyArrived: number;
  completedRequests: number;
  todayVisitors: number;
};

export type VisitorAction =
  | "approve"
  | "reject"
  | "delete"
  | "checkIn"
  | "checkOut";

export type NavItem = {
  label: string;
  to: string;
  icon?: ReactNode;
  aliases?: string[];
};

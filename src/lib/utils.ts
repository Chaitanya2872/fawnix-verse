import { clsx, type ClassValue } from "clsx"
import { format, formatDistanceToNow } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = "MMM d, yyyy") {
  return format(new Date(date), fmt)
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const STATUS_COLORS: Record<string, string> = {
  applied: "badge-gray",
  shortlisted: "badge-blue",
  hr_screening: "badge-yellow",
  interview_scheduled: "badge-purple",
  interview_completed: "badge-blue",
  selected: "badge-green",
  rejected: "badge-red",
  offer_sent: "badge-yellow",
  offer_accepted: "badge-green",
  offer_declined: "badge-red",
  hired: "badge-green",
  open: "badge-green",
  closed: "badge-red",
  paused: "badge-yellow",
  archived: "badge-gray",
  draft: "badge-gray",
  published: "badge-green",
  publishing: "badge-yellow",
  failed: "badge-red",
  pending: "badge-yellow",
  pending_approval: "badge-yellow",
  in_review: "badge-blue",
  approved: "badge-green",
  changes_requested: "badge-purple",
  sent: "badge-blue",
  accepted: "badge-green",
  declined: "badge-red",
  feedback_submitted: "badge-blue",
  completed: "badge-green",
  cancelled: "badge-red",
  overdue: "badge-red",
  talent_pool: "badge-purple",
}

export const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  hr_screening: "HR Screening",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Done",
  selected: "Selected",
  rejected: "Rejected",
  offer_sent: "Offer Sent",
  offer_accepted: "Offer Accepted",
  offer_declined: "Offer Declined",
  hired: "Hired",
  talent_pool: "Talent Pool",
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

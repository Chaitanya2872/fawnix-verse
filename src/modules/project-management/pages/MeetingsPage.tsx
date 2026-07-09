import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileText,
  Filter,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Upload,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { useProjectsContext } from '../context'
import type { Project } from '../types'
import {
  createProjectMeeting,
  fetchProjectMeetings,
  updateProjectMeeting,
  type BackendMeetingStatus,
  type ProjectMeetingPayload,
  type ProjectMeetingResponse,
} from '../api'

type MeetingStatus = 'Upcoming' | 'Completed' | 'Cancelled'
type MeetingType = 'Planning' | 'Review' | 'Design' | 'Retrospective' | 'Architecture'
type RsvpStatus = 'Accepted' | 'Pending' | 'Declined'

type ProjectOption = {
  id: string
  name: string
  code: string
  manager: string
  department: string
  team: string[]
}

type MeetingParticipant = {
  name: string
  role: string
  status: RsvpStatus
}

type MeetingAction = {
  title: string
  owner: string
  dueDate: string
}

type MeetingAttachment = {
  name: string
  size: string
  tone: string
}

type Meeting = {
  id: string
  title: string
  project: ProjectOption
  organizer: MeetingParticipant
  startAt: string
  endAt: string
  dateLabel: string
  dateShort: string
  time: string
  duration: string
  timezone: string
  platform: 'Google Meet' | 'Microsoft Teams' | 'Zoom'
  platformTone: string
  status: MeetingStatus
  type: MeetingType
  meetingId: string
  link: string
  reminder: string
  repeatRule: string
  description: string
  agenda: string[]
  participants: MeetingParticipant[]
  actions: MeetingAction[]
  attachments: MeetingAttachment[]
  notes: string[]
}

type DetailTab = 'Overview' | 'Agenda' | 'Participants' | 'Notes' | 'Action Items' | 'Attachments' | 'Activity'

type MeetingFormState = {
  title: string
  projectId: string
  description: string
  type: MeetingType
  platform: Meeting['platform']
  link: string
  date: string
  startTime: string
  endTime: string
  timezone: string
  participants: string[]
  agenda: string[]
  reminder: string
  repeat: string
  sendEmail: boolean
  attachments: MeetingAttachment[]
}

const fallbackProjects: ProjectOption[] = [
  {
    id: 'project-alpha',
    name: 'Project Alpha',
    code: 'ALP-102',
    manager: 'Vaishnavi',
    department: 'Product',
    team: ['Rohit Sharma', 'Anita Desai', 'Arjun Mehta', 'Priya Nair', 'Kiran Bose', 'Sneha Iyer'],
  },
  {
    id: 'project-beta',
    name: 'Project Beta',
    code: 'BET-204',
    manager: 'Rohit Sharma',
    department: 'Client Delivery',
    team: ['Vaishnavi', 'Maya Rao', 'Kabir Das', 'Aman Verma', 'Sneha Iyer'],
  },
  {
    id: 'project-gamma',
    name: 'Project Gamma',
    code: 'GAM-331',
    manager: 'Arjun Mehta',
    department: 'Engineering',
    team: ['Anita Desai', 'Rohit Sharma', 'Neha Kapoor', 'Aman Verma', 'Kiran Bose'],
  },
]

const participantRoles: Record<string, string> = {
  Vaishnavi: 'Product Manager',
  'Rohit Sharma': 'Project Manager',
  'Anita Desai': 'UI/UX Designer',
  'Arjun Mehta': 'Tech Lead',
  'Priya Nair': 'Business Analyst',
  'Kiran Bose': 'QA Engineer',
  'Sneha Iyer': 'Frontend Engineer',
  'Maya Rao': 'Client Partner',
  'Kabir Das': 'Backend Engineer',
  'Aman Verma': 'DevOps Engineer',
  'Neha Kapoor': 'Data Analyst',
}

const avatarTones = [
  'bg-slate-900 text-white',
  'bg-slate-100 text-slate-700',
  'bg-white text-slate-600 ring-1 ring-slate-200',
  'bg-slate-200 text-slate-700',
  'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
]

const statusStyles: Record<MeetingStatus, string> = {
  Upcoming: 'border-slate-200 bg-white text-slate-700',
  Completed: 'border-slate-200 bg-slate-50 text-slate-700',
  Cancelled: 'border-slate-200 bg-slate-50 text-slate-500',
}

const statStyles = {
  blue: 'border-slate-200 bg-slate-50 text-slate-600',
  indigo: 'border-slate-200 bg-slate-50 text-slate-600',
  emerald: 'border-slate-200 bg-slate-50 text-slate-600',
  rose: 'border-slate-200 bg-slate-50 text-slate-600',
}

const attachmentTone = 'border border-slate-200 bg-white text-slate-500'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function roleFor(name: string, fallback = 'Team Member') {
  return participantRoles[name] ?? fallback
}

function peopleFor(project: ProjectOption, count: number, offset = 0): MeetingParticipant[] {
  const uniqueNames = Array.from(new Set([project.manager, ...project.team, ...fallbackProjects.flatMap((p) => p.team)]))
  return uniqueNames.slice(offset, offset + count).map((name, index) => ({
    name,
    role: roleFor(name, index === 0 ? 'Organizer' : 'Team Member'),
    status: index % 5 === 3 ? 'Pending' : index % 7 === 4 ? 'Declined' : 'Accepted',
  }))
}

function toProjectOptions(projects: Project[]): ProjectOption[] {
  if (!projects.length) return fallbackProjects

  return projects.slice(0, 5).map((project, index) => {
    const fallback = fallbackProjects[index % fallbackProjects.length]
    const team = project.team?.length
      ? project.team.map((member) => member.name)
      : project.teamMembers?.length
        ? project.teamMembers
        : fallback.team

    return {
      id: project.id,
      name: project.name || fallback.name,
      code: project.projectCode || fallback.code,
      manager: project.manager || project.owner || fallback.manager,
      department: project.department || fallback.department,
      team,
    }
  })
}

function buildMeetings(projects: ProjectOption[]): Meeting[] {
  const projectAt = (index: number) => projects[index % projects.length] ?? fallbackProjects[0]
  const alpha = projectAt(0)
  const beta = projectAt(1)
  const gamma = projectAt(2)

  return [
    {
      id: 'meet-001',
      title: 'Sprint Planning',
      project: alpha,
      organizer: { name: alpha.manager, role: roleFor(alpha.manager, 'Product Manager'), status: 'Accepted' },
      startAt: '2025-05-02T10:00:00+05:30',
      endAt: '2025-05-02T11:30:00+05:30',
      dateLabel: '02 May 2025',
      dateShort: '02 May 2025',
      time: '10:00 AM - 11:30 AM',
      duration: '1h 30m',
      timezone: 'IST',
      platform: 'Google Meet',
      platformTone: 'bg-slate-400',
      status: 'Upcoming',
      type: 'Planning',
      meetingId: 'abc-defg-hij',
      link: 'https://meet.google.com/abc-defg-hij',
      reminder: '15 minutes before',
      repeatRule: 'Does not repeat',
      description: 'Sprint 15 planning meeting to discuss goals, tasks, timelines, and resource allocation.',
      agenda: ['Sprint Goals', 'Task Breakdown', 'Timeline and Milestones', 'Risks and Blockers', 'Q&A'],
      participants: peopleFor(alpha, 10, 0),
      actions: [
        { title: 'Review UI designs', owner: 'Anita Desai', dueDate: '04 May' },
        { title: 'API documentation', owner: 'Rohit Sharma', dueDate: '06 May' },
        { title: 'Database schema', owner: 'Arjun Mehta', dueDate: '07 May' },
        { title: 'Update sprint backlog', owner: 'Sneha Iyer', dueDate: '02 May' },
        { title: 'Client feedback report', owner: 'Vaishnavi', dueDate: '08 May' },
      ],
      attachments: [
        { name: 'Sprint-15-Plan.docx', size: '1.2 MB', tone: attachmentTone },
        { name: 'Requirements.pdf', size: '2.4 MB', tone: attachmentTone },
        { name: 'Design-Overview.pptx', size: '3.8 MB', tone: attachmentTone },
      ],
      notes: ['Confirm capacity before backlog lock.', 'Prepare release risks for review.'],
    },
    {
      id: 'meet-002',
      title: 'Client Review Meeting',
      project: beta,
      organizer: { name: beta.manager, role: roleFor(beta.manager, 'Project Manager'), status: 'Accepted' },
      startAt: '2025-05-02T15:00:00+05:30',
      endAt: '2025-05-02T15:45:00+05:30',
      dateLabel: '02 May 2025',
      dateShort: '02 May 2025',
      time: '03:00 PM - 03:45 PM',
      duration: '45m',
      timezone: 'IST',
      platform: 'Microsoft Teams',
      platformTone: 'bg-slate-400',
      status: 'Upcoming',
      type: 'Review',
      meetingId: 'teams-4829',
      link: 'https://teams.microsoft.com/l/meetup-join/client-review',
      reminder: '30 minutes before',
      repeatRule: 'Does not repeat',
      description: 'Client checkpoint for progress review, open decisions, and delivery confidence.',
      agenda: ['Progress Summary', 'Open Issues', 'Client Questions', 'Next Deliverables'],
      participants: peopleFor(beta, 8, 0),
      actions: [
        { title: 'Send client recap', owner: beta.manager, dueDate: '02 May' },
        { title: 'Update delivery notes', owner: 'Maya Rao', dueDate: '03 May' },
      ],
      attachments: [
        { name: 'Client-Review.pdf', size: '1.8 MB', tone: attachmentTone },
        { name: 'Delivery-Roadmap.xlsx', size: '980 KB', tone: attachmentTone },
      ],
      notes: ['Client wants a shorter status summary.', 'Budget note to be shared separately.'],
    },
    {
      id: 'meet-003',
      title: 'UI/UX Discussion',
      project: alpha,
      organizer: { name: 'Anita Desai', role: 'UI/UX Designer', status: 'Accepted' },
      startAt: '2025-05-03T10:00:00+05:30',
      endAt: '2025-05-03T12:00:00+05:30',
      dateLabel: '03 May 2025',
      dateShort: '03 May 2025',
      time: '10:00 AM - 12:00 PM',
      duration: '2h',
      timezone: 'IST',
      platform: 'Google Meet',
      platformTone: 'bg-slate-400',
      status: 'Upcoming',
      type: 'Design',
      meetingId: 'ux-4490',
      link: 'https://meet.google.com/uiux-review',
      reminder: '10 minutes before',
      repeatRule: 'Does not repeat',
      description: 'Design review for interaction flow, accessibility, and final screen readiness.',
      agenda: ['Prototype Walkthrough', 'Accessibility Review', 'Mobile States', 'Handoff Checklist'],
      participants: peopleFor(alpha, 7, 1),
      actions: [
        { title: 'Refresh empty states', owner: 'Anita Desai', dueDate: '05 May' },
        { title: 'Check mobile spacing', owner: 'Sneha Iyer', dueDate: '05 May' },
      ],
      attachments: [
        { name: 'UX-Flow.fig', size: '4.6 MB', tone: attachmentTone },
      ],
      notes: ['Use compact density for operations pages.'],
    },
    {
      id: 'meet-004',
      title: 'Team Retrospective',
      project: gamma,
      organizer: { name: gamma.manager, role: roleFor(gamma.manager, 'Tech Lead'), status: 'Accepted' },
      startAt: '2025-05-03T16:00:00+05:30',
      endAt: '2025-05-03T17:00:00+05:30',
      dateLabel: '03 May 2025',
      dateShort: '03 May 2025',
      time: '04:00 PM - 05:00 PM',
      duration: '1h',
      timezone: 'IST',
      platform: 'Zoom',
      platformTone: 'bg-slate-400',
      status: 'Upcoming',
      type: 'Retrospective',
      meetingId: 'zoom-153-882',
      link: 'https://zoom.us/j/153882',
      reminder: '15 minutes before',
      repeatRule: 'Does not repeat',
      description: 'Retrospective to capture wins, friction points, and action items for the next sprint.',
      agenda: ['Wins', 'Pain Points', 'Process Changes', 'Owners'],
      participants: peopleFor(gamma, 9, 0),
      actions: [
        { title: 'Publish retro notes', owner: gamma.manager, dueDate: '03 May' },
        { title: 'Prioritize process fixes', owner: 'Neha Kapoor', dueDate: '06 May' },
      ],
      attachments: [
        { name: 'Retro-Notes.docx', size: '720 KB', tone: attachmentTone },
      ],
      notes: ['Keep discussion time-boxed.'],
    },
    {
      id: 'meet-005',
      title: 'Architecture Review',
      project: alpha,
      organizer: { name: 'Rohit Sharma', role: 'Project Manager', status: 'Accepted' },
      startAt: '2025-05-01T10:00:00+05:30',
      endAt: '2025-05-01T11:00:00+05:30',
      dateLabel: '01 May 2025',
      dateShort: '01 May 2025',
      time: '10:00 AM - 11:00 AM',
      duration: '1h',
      timezone: 'IST',
      platform: 'Microsoft Teams',
      platformTone: 'bg-slate-400',
      status: 'Completed',
      type: 'Architecture',
      meetingId: 'arch-9112',
      link: 'https://teams.microsoft.com/l/meetup-join/architecture',
      reminder: 'No reminder',
      repeatRule: 'Does not repeat',
      description: 'Technical architecture review for service boundaries, integrations, and database changes.',
      agenda: ['Service Map', 'API Contracts', 'Database Schema', 'Deployment Notes'],
      participants: peopleFor(alpha, 8, 2),
      actions: [
        { title: 'Share API contract', owner: 'Arjun Mehta', dueDate: '02 May' },
        { title: 'Confirm migration order', owner: 'Aman Verma', dueDate: '04 May' },
      ],
      attachments: [
        { name: 'Architecture-Notes.pdf', size: '2.1 MB', tone: attachmentTone },
      ],
      notes: ['Approved with follow-up on migration sequencing.'],
    },
    {
      id: 'meet-006',
      title: 'Budget Alignment',
      project: beta,
      organizer: { name: 'Maya Rao', role: 'Client Partner', status: 'Accepted' },
      startAt: '2025-04-30T14:00:00+05:30',
      endAt: '2025-04-30T14:30:00+05:30',
      dateLabel: '30 Apr 2025',
      dateShort: '30 Apr 2025',
      time: '02:00 PM - 02:30 PM',
      duration: '30m',
      timezone: 'IST',
      platform: 'Google Meet',
      platformTone: 'bg-slate-400',
      status: 'Cancelled',
      type: 'Review',
      meetingId: 'budget-220',
      link: 'https://meet.google.com/budget-align',
      reminder: 'No reminder',
      repeatRule: 'Does not repeat',
      description: 'Budget alignment discussion moved to client review.',
      agenda: ['Budget Delta', 'Approval Owner', 'Next Decision'],
      participants: peopleFor(beta, 5, 1),
      actions: [
        { title: 'Move budget note to review', owner: 'Maya Rao', dueDate: '02 May' },
      ],
      attachments: [],
      notes: ['Cancelled after client requested combined review.'],
    },
  ]
}

function platformToneFor(_platform: Meeting['platform']) {
  return 'bg-slate-400'
}

function formatMeetingDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toDisplayTime(time: string) {
  const [hourText, minute = '00'] = time.split(':')
  const hour = Number(hourText)
  if (Number.isNaN(hour)) return time
  const period = hour >= 12 ? 'PM' : 'AM'
  const normalized = hour % 12 || 12
  return `${normalized}:${minute} ${period}`
}

function minutesBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  return Math.max(15, end - start)
}

function durationLabel(startTime: string, endTime: string) {
  const mins = minutesBetween(startTime, endTime)
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function fileSizeLabel(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formFromMeeting(meeting: Meeting): MeetingFormState {
  const startDate = new Date(meeting.startAt)
  const endDate = new Date(meeting.endAt)
  return {
    title: meeting.title,
    projectId: meeting.project.id,
    description: meeting.description,
    type: meeting.type,
    platform: meeting.platform,
    link: meeting.link,
    date: toDateInputValue(startDate),
    startTime: toTimeInputValue(startDate),
    endTime: toTimeInputValue(endDate),
    timezone: meeting.timezone,
    participants: meeting.participants.map((participant) => participant.name),
    agenda: meeting.agenda,
    reminder: meeting.reminder,
    repeat: meeting.repeatRule,
    sendEmail: true,
    attachments: meeting.attachments,
  }
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toTimeInputValue(date: Date) {
  return date.toTimeString().slice(0, 5)
}

function toBackendStatus(status: MeetingStatus): BackendMeetingStatus {
  if (status === 'Completed') return 'COMPLETED'
  if (status === 'Cancelled') return 'CANCELLED'
  return 'UPCOMING'
}

function fromBackendStatus(status: BackendMeetingStatus): MeetingStatus {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'CANCELLED') return 'Cancelled'
  return 'Upcoming'
}

function normalizeMeetingType(value?: string): MeetingType {
  const allowed: MeetingType[] = ['Planning', 'Review', 'Design', 'Retrospective', 'Architecture']
  return allowed.includes(value as MeetingType) ? value as MeetingType : 'Planning'
}

function normalizePlatform(value?: string): Meeting['platform'] {
  if (value === 'Microsoft Teams' || value === 'Zoom') return value
  return 'Google Meet'
}

function normalizeRsvp(value?: string): RsvpStatus {
  if (value === 'Pending' || value === 'Declined') return value
  return 'Accepted'
}

function toInstant(date: string, time: string, timezone: string) {
  const offset = timezone === 'IST' ? '+05:30' : 'Z'
  return `${date}T${time}:00${offset}`
}

function formatMeetingDateFromInstant(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMeetingTimeFromInstant(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function durationLabelFromInstants(startAt: string, endAt: string) {
  const mins = Math.max(15, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000))
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function mapBackendMeeting(meeting: ProjectMeetingResponse, projects: ProjectOption[]): Meeting {
  const participants = meeting.participants ?? []
  const organizerName = meeting.organizerName || 'Organizer'
  const projectName = meeting.projectName || 'Unassigned Project'
  const project = projects.find((item) => item.id === meeting.projectId) ?? {
    id: meeting.projectId ?? `project-${projectName}`,
    name: projectName,
    code: meeting.projectCode || '',
    manager: organizerName,
    department: '',
    team: participants.map((participant) => participant.name),
  }
  const startDate = formatMeetingDateFromInstant(meeting.startAt)
  const startTime = formatMeetingTimeFromInstant(meeting.startAt)
  const endTime = formatMeetingTimeFromInstant(meeting.endAt)

  return {
    id: meeting.id,
    title: meeting.title || 'Untitled Meeting',
    project,
    organizer: {
      name: organizerName,
      role: meeting.organizerRole || roleFor(organizerName, 'Organizer'),
      status: 'Accepted',
    },
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    dateLabel: startDate,
    dateShort: startDate,
    time: `${startTime} - ${endTime}`,
    duration: durationLabelFromInstants(meeting.startAt, meeting.endAt),
    timezone: meeting.timezone || 'IST',
    platform: normalizePlatform(meeting.platform),
    platformTone: platformToneFor(normalizePlatform(meeting.platform)),
    status: fromBackendStatus(meeting.status),
    type: normalizeMeetingType(meeting.meetingType),
    meetingId: meeting.meetingExternalId || meeting.id,
    link: meeting.meetingLink || '',
    reminder: meeting.reminder || '15 minutes before',
    repeatRule: meeting.repeatRule || 'Does not repeat',
    description: meeting.description || '',
    agenda: meeting.agenda ?? [],
    participants: participants.map((participant) => ({
      name: participant.name,
      role: participant.role,
      status: normalizeRsvp(participant.status),
    })),
    actions: meeting.actions ?? [],
    attachments: meeting.attachments ?? [],
    notes: meeting.notes ?? [],
  }
}

function toMeetingPayload(meeting: Meeting): ProjectMeetingPayload {
  return {
    projectId: meeting.project.id.startsWith('project-') ? null : meeting.project.id,
    projectName: meeting.project.name,
    projectCode: meeting.project.code,
    title: meeting.title,
    description: meeting.description,
    meetingType: meeting.type,
    platform: meeting.platform,
    status: toBackendStatus(meeting.status),
    organizerName: meeting.organizer.name,
    organizerRole: meeting.organizer.role,
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    timezone: meeting.timezone,
    meetingLink: meeting.link,
    meetingExternalId: meeting.meetingId,
    reminder: meeting.reminder,
    repeatRule: meeting.repeatRule,
    participants: meeting.participants,
    agenda: meeting.agenda,
    actions: meeting.actions,
    attachments: meeting.attachments,
    notes: meeting.notes,
  }
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  )
}

function Avatar({ name, index, size = 'h-8 w-8' }: { name: string; index: number; size?: string }) {
  return (
    <div
      title={name}
      className={`${size} flex shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-sm ${avatarTones[index % avatarTones.length]}`}
    >
      {initials(name)}
    </div>
  )
}

function AvatarStack({ people, limit = 4 }: { people: MeetingParticipant[]; limit?: number }) {
  const shown = people.slice(0, limit)
  const extra = people.length - shown.length

  return (
    <div className="flex items-center">
      {shown.map((person, index) => (
        <div key={person.name} className={index > 0 ? '-ml-2' : ''}>
          <Avatar name={person.name} index={index} size="h-7 w-7" />
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500 shadow-sm">
          +{extra}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: MeetingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${props.className ?? ''}`}
    />
  )
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${props.className ?? ''}`}
    />
  )
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  tone: keyof typeof statStyles
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${statStyles[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function SectionShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {children}
    </section>
  )
}

export default function ProjectsMeetingsPage() {
  const { projects } = useProjectsContext()
  const projectOptions = useMemo(() => toProjectOptions(projects), [projects])
  const seededMeetings = useMemo(() => buildMeetings(projectOptions), [projectOptions])

  const [meetings, setMeetings] = useState<Meeting[]>(() => buildMeetings(fallbackProjects))
  const [selectedId, setSelectedId] = useState('meet-001')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'ALL'>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY'>('ALL')
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview')
  const [page, setPage] = useState(1)
  const [menuMeetingId, setMenuMeetingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [noteText, setNoteText] = useState('')
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteSelected, setInviteSelected] = useState<string[]>([])
  const [inviteMessage, setInviteMessage] = useState('You are invited to the Sprint Planning meeting.\n\nSee you there!')
  const [scheduleForm, setScheduleForm] = useState<MeetingFormState>(() => formFromMeeting(buildMeetings(fallbackProjects)[0]))
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false)

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedId) ?? meetings[0] ?? seededMeetings[0] ?? buildMeetings(fallbackProjects)[0]

  useEffect(() => {
    let cancelled = false
    fetchProjectMeetings()
      .then((items) => {
        if (cancelled) return
        if (items.length === 0) {
          setMeetings((current) => current.some((meeting) => meeting.id.startsWith('meet-custom-')) ? current : seededMeetings)
          return
        }
        const mapped = items.map((item) => mapBackendMeeting(item, projectOptions))
        setMeetings(mapped)
        setSelectedId((current) => mapped.some((meeting) => meeting.id === current) ? current : mapped[0].id)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [projectOptions, seededMeetings])

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase()
    return meetings.filter((meeting) => {
      const matchesSearch = !query || [
        meeting.title,
        meeting.project.name,
        meeting.organizer.name,
        meeting.platform,
        meeting.type,
      ].join(' ').toLowerCase().includes(query)
      const matchesProject = projectFilter === 'ALL' || meeting.project.id === projectFilter
      const matchesStatus = statusFilter === 'ALL' || meeting.status === statusFilter
      const matchesType = typeFilter === 'ALL' || meeting.type === typeFilter
      const matchesDate = dateFilter === 'ALL' || meeting.dateShort === '02 May 2025'
      return matchesSearch && matchesProject && matchesStatus && matchesType && matchesDate
    })
  }, [dateFilter, meetings, projectFilter, search, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const todayMeetings = meetings.filter((meeting) => meeting.dateShort === '02 May 2025').length
    const upcomingMeetings = meetings.filter((meeting) => meeting.status === 'Upcoming').length
    const completedMeetings = meetings.filter((meeting) => meeting.status === 'Completed').length
    const cancelledMeetings = meetings.filter((meeting) => meeting.status === 'Cancelled').length
    return [
      { label: "Today's Meetings", value: todayMeetings, hint: 'View all', icon: Calendar, tone: 'blue' as const },
      { label: 'Upcoming Meetings', value: upcomingMeetings, hint: 'Next 7 days', icon: CalendarClock, tone: 'indigo' as const },
      { label: 'Completed Meetings', value: completedMeetings, hint: 'This month', icon: CheckCircle2, tone: 'emerald' as const },
      { label: 'Cancelled Meetings', value: cancelledMeetings, hint: 'This month', icon: XCircle, tone: 'rose' as const },
    ]
  }, [meetings])

  const accepted = selectedMeeting.participants.filter((person) => person.status === 'Accepted')
  const pending = selectedMeeting.participants.filter((person) => person.status === 'Pending')
  const declined = selectedMeeting.participants.filter((person) => person.status === 'Declined')
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / pageSize))
  const pageMeetings = filteredMeetings.slice((page - 1) * pageSize, page * pageSize)
  const allPeople = useMemo(
    () => Array.from(new Set(projectOptions.flatMap((project) => [project.manager, ...project.team]))),
    [projectOptions],
  )
  const inviteMatches = allPeople
    .filter((name) => !selectedMeeting.participants.some((participant) => participant.name === name))
    .filter((name) => !inviteSelected.includes(name))
    .filter((name) => name.toLowerCase().includes(inviteQuery.trim().toLowerCase()))
    .slice(0, 4)

  const clearFilters = () => {
    setSearch('')
    setProjectFilter('ALL')
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setDateFilter('ALL')
    setPage(1)
  }

  const openScheduler = () => {
    setScheduleForm(formFromMeeting(selectedMeeting))
    setIsSchedulerOpen(true)
    showMessage('Schedule form is ready')
  }

  const showMessage = (message: string) => {
    setActionMessage(message)
    window.setTimeout(() => setActionMessage(''), 2400)
  }

  const isPersistedMeeting = (meeting: Meeting) => !meeting.id.startsWith('meet-')

  const persistMeeting = async (meeting: Meeting) => {
    if (!isPersistedMeeting(meeting)) return
    try {
      const saved = await updateProjectMeeting(meeting.id, toMeetingPayload(meeting))
      const mapped = mapBackendMeeting(saved, projectOptions)
      setMeetings((current) => current.map((item) => item.id === mapped.id ? mapped : item))
    } catch {
      showMessage('Saved locally; backend unavailable')
    }
  }

  const updateMeeting = (meetingId: string, updater: (meeting: Meeting) => Meeting, persist = true) => {
    const currentMeeting = meetings.find((meeting) => meeting.id === meetingId)
    if (!currentMeeting) return
    const nextMeeting = updater(currentMeeting)
    setMeetings((current) => current.map((meeting) => (meeting.id === meetingId ? nextMeeting : meeting)))
    if (persist) void persistMeeting(nextMeeting)
  }

  const selectMeeting = (meeting: Meeting) => {
    setSelectedId(meeting.id)
    setScheduleForm(formFromMeeting(meeting))
    setInviteMessage(`You are invited to the ${meeting.title} meeting.\n\nSee you there!`)
    setInviteSelected([])
    setInviteQuery('')
    setActiveTab('Overview')
  }

  const openMeeting = (meeting: Meeting) => {
    window.open(meeting.link, '_blank', 'noopener,noreferrer')
    showMessage(`Opening ${meeting.title}`)
  }

  const copyMeetingLink = async (meeting: Meeting) => {
    try {
      await navigator.clipboard?.writeText(meeting.link)
      showMessage('Meeting link copied')
    } catch {
      showMessage('Copy failed. Select the link and copy it manually.')
    }
  }

  const shareMeeting = async (meeting: Meeting) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: meeting.title, text: meeting.description, url: meeting.link })
        showMessage('Share sheet opened')
        return
      } catch {
        return
      }
    }
    await copyMeetingLink(meeting)
  }

  const duplicateMeeting = (meeting: Meeting) => {
    const duplicate: Meeting = {
      ...meeting,
      id: `meet-custom-${Date.now()}`,
      title: `${meeting.title} Copy`,
      status: 'Upcoming',
      meetingId: `copy-${Math.random().toString(36).slice(2, 8)}`,
      notes: [...meeting.notes, 'Duplicated from an existing meeting.'],
    }
    setMeetings((current) => [duplicate, ...current])
    selectMeeting(duplicate)
    setMenuMeetingId(null)
    showMessage('Meeting duplicated')
  }

  const setMeetingStatus = (meetingId: string, status: MeetingStatus) => {
    updateMeeting(meetingId, (meeting) => ({
      ...meeting,
      status,
      notes: [`Status changed to ${status}.`, ...meeting.notes],
    }))
    setMenuMeetingId(null)
    showMessage(`Meeting marked ${status.toLowerCase()}`)
  }

  const updateScheduleField = <K extends keyof MeetingFormState>(field: K, value: MeetingFormState[K]) => {
    setScheduleForm((current) => ({ ...current, [field]: value }))
  }

  const createMeeting = async () => {
    if (!scheduleForm.title.trim()) {
      showMessage('Meeting title is required')
      return
    }
    const project = projectOptions.find((item) => item.id === scheduleForm.projectId) ?? projectOptions[0]
    const participants = Array.from(new Set([project.manager, ...scheduleForm.participants])).map((name, index) => ({
      name,
      role: roleFor(name, index === 0 ? 'Organizer' : 'Team Member'),
      status: index === 0 ? 'Accepted' as RsvpStatus : 'Pending' as RsvpStatus,
    }))
    const link = scheduleForm.link.trim() || `https://meet.google.com/${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}`
    const startAt = toInstant(scheduleForm.date, scheduleForm.startTime, scheduleForm.timezone)
    const endAt = toInstant(scheduleForm.date, scheduleForm.endTime, scheduleForm.timezone)
    const meeting: Meeting = {
      id: `meet-custom-${Date.now()}`,
      title: scheduleForm.title.trim(),
      project,
      organizer: participants[0],
      startAt,
      endAt,
      dateLabel: formatMeetingDate(scheduleForm.date),
      dateShort: formatMeetingDate(scheduleForm.date),
      time: `${toDisplayTime(scheduleForm.startTime)} - ${toDisplayTime(scheduleForm.endTime)}`,
      duration: durationLabel(scheduleForm.startTime, scheduleForm.endTime),
      timezone: scheduleForm.timezone,
      platform: scheduleForm.platform,
      platformTone: platformToneFor(scheduleForm.platform),
      status: 'Upcoming',
      type: scheduleForm.type,
      meetingId: `mtg-${Math.random().toString(36).slice(2, 8)}`,
      link,
      reminder: scheduleForm.reminder,
      repeatRule: scheduleForm.repeat,
      description: scheduleForm.description,
      agenda: scheduleForm.agenda.filter((item) => item.trim()),
      participants,
      actions: [],
      attachments: scheduleForm.attachments,
      notes: [
        `Meeting scheduled${scheduleForm.sendEmail ? ' and invitations queued' : ''}.`,
        scheduleForm.repeat,
      ],
    }
    try {
      const saved = await createProjectMeeting(toMeetingPayload(meeting))
      const mapped = mapBackendMeeting(saved, projectOptions)
      setMeetings((current) => [mapped, ...current.filter((item) => item.id !== mapped.id)])
      selectMeeting(mapped)
      setIsSchedulerOpen(false)
      showMessage('Meeting scheduled')
    } catch {
      setMeetings((current) => [meeting, ...current])
      selectMeeting(meeting)
      setIsSchedulerOpen(false)
      showMessage('Meeting scheduled locally; backend unavailable')
    }
  }

  const resetScheduleForm = () => {
    setScheduleForm(formFromMeeting(selectedMeeting))
    showMessage('Schedule form reset')
  }

  const addAgendaItem = () => {
    setScheduleForm((current) => ({ ...current, agenda: [...current.agenda, 'New agenda item'] }))
  }

  const addScheduleFiles = (files: FileList | null) => {
    if (!files?.length) return
    const nextFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: fileSizeLabel(file.size),
      tone: attachmentTone,
    }))
    setScheduleForm((current) => ({ ...current, attachments: [...current.attachments, ...nextFiles] }))
  }

  const addFilesToSelectedMeeting = (files: FileList | null) => {
    if (!files?.length) return
    const nextFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: fileSizeLabel(file.size),
      tone: attachmentTone,
    }))
    updateMeeting(selectedMeeting.id, (meeting) => ({
      ...meeting,
      attachments: [...meeting.attachments, ...nextFiles],
      notes: [`${nextFiles.length} attachment${nextFiles.length > 1 ? 's' : ''} added.`, ...meeting.notes],
    }))
    showMessage('Attachment added')
  }

  const updateParticipantStatus = (name: string, status: RsvpStatus) => {
    updateMeeting(selectedMeeting.id, (meeting) => ({
      ...meeting,
      participants: meeting.participants.map((participant) => (
        participant.name === name ? { ...participant, status } : participant
      )),
    }))
  }

  const sendInvitations = () => {
    if (!inviteSelected.length) {
      showMessage('Select at least one person to invite')
      return
    }
    const additions = inviteSelected.map((name) => ({
      name,
      role: roleFor(name),
      status: 'Pending' as RsvpStatus,
    }))
    updateMeeting(selectedMeeting.id, (meeting) => ({
      ...meeting,
      participants: [...meeting.participants, ...additions],
      notes: [`Invitation sent to ${inviteSelected.join(', ')}.`, ...meeting.notes],
    }))
    setInviteSelected([])
    setInviteQuery('')
    showMessage('Invitation sent')
  }

  const addNote = () => {
    const value = noteText.trim()
    if (!value) return
    updateMeeting(selectedMeeting.id, (meeting) => ({ ...meeting, notes: [value, ...meeting.notes] }))
    setNoteText('')
    showMessage('Note added')
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Project workspace</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">Meetings</h1>
            <p className="mt-1 text-sm text-slate-500">A focused board for schedules, attendance, notes, and follow-ups.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Filter className="h-3.5 w-3.5" />
              Clear filters
            </button>
            <button
              type="button"
              onClick={openScheduler}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Schedule meeting
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {actionMessage && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            {actionMessage}
          </div>
        )}

        {isSchedulerOpen && (
          <SectionShell className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Schedule a meeting</h2>
                <p className="mt-1 text-xs text-slate-500">Set the essentials first; reminders, repeat rules, and files are tucked into the same panel.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSchedulerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close scheduler"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Field label="Meeting Title">
                    <TextInput value={scheduleForm.title} onChange={(event) => updateScheduleField('title', event.target.value)} />
                  </Field>
                  <Field label="Project">
                    <SelectInput value={scheduleForm.projectId} onChange={(event) => updateScheduleField('projectId', event.target.value)}>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Date">
                    <TextInput type="date" value={scheduleForm.date} onChange={(event) => updateScheduleField('date', event.target.value)} />
                  </Field>
                  <Field label="Start">
                    <TextInput type="time" value={scheduleForm.startTime} onChange={(event) => updateScheduleField('startTime', event.target.value)} />
                  </Field>
                  <Field label="End">
                    <TextInput type="time" value={scheduleForm.endTime} onChange={(event) => updateScheduleField('endTime', event.target.value)} />
                  </Field>
                  <Field label="Time Zone">
                    <SelectInput value={scheduleForm.timezone} onChange={(event) => updateScheduleField('timezone', event.target.value)}>
                      <option value="IST">GMT+05:30 IST</option>
                      <option value="UTC">UTC</option>
                      <option value="PST">Pacific Time</option>
                    </SelectInput>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Meeting Type">
                    <SelectInput value={scheduleForm.type} onChange={(event) => updateScheduleField('type', event.target.value as MeetingType)}>
                      {(['Planning', 'Review', 'Design', 'Retrospective', 'Architecture'] as MeetingType[]).map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Platform">
                    <SelectInput value={scheduleForm.platform} onChange={(event) => updateScheduleField('platform', event.target.value as Meeting['platform'])}>
                      <option>Google Meet</option>
                      <option>Microsoft Teams</option>
                      <option>Zoom</option>
                    </SelectInput>
                  </Field>
                  <Field label="Reminder">
                    <SelectInput value={scheduleForm.reminder} onChange={(event) => updateScheduleField('reminder', event.target.value)}>
                      <option>15 minutes before</option>
                      <option>30 minutes before</option>
                      <option>1 hour before</option>
                      <option>No reminder</option>
                    </SelectInput>
                  </Field>
                  <Field label="Repeat">
                    <SelectInput value={scheduleForm.repeat} onChange={(event) => updateScheduleField('repeat', event.target.value)}>
                      <option>Does not repeat</option>
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </SelectInput>
                  </Field>
                </div>

                <Field label="Meeting URL">
                  <TextInput value={scheduleForm.link} onChange={(event) => updateScheduleField('link', event.target.value)} />
                </Field>

                <Field label="Description">
                  <textarea
                    value={scheduleForm.description}
                    onChange={(event) => updateScheduleField('description', event.target.value)}
                    className="min-h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <Field label="Participants">
                  <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                    {scheduleForm.participants.slice(0, 8).map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {name}
                        <button
                          type="button"
                          onClick={() => updateScheduleField('participants', scheduleForm.participants.filter((participant) => participant !== name))}
                          aria-label={`Remove ${name}`}
                        >
                          <X className="h-3 w-3 text-slate-400" />
                        </button>
                      </span>
                    ))}
                    <select
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) return
                        updateScheduleField('participants', Array.from(new Set([...scheduleForm.participants, event.target.value])))
                      }}
                      className="min-w-32 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 outline-none"
                    >
                      <option value="">Add person</option>
                      {allPeople.filter((name) => !scheduleForm.participants.includes(name)).map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </Field>

                <Field label="Agenda">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {scheduleForm.agenda.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{index + 1}</span>
                        <input
                          value={item}
                          onChange={(event) => updateScheduleField('agenda', scheduleForm.agenda.map((agendaItem, agendaIndex) => agendaIndex === index ? event.target.value : agendaItem))}
                          className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateScheduleField('agenda', scheduleForm.agenda.filter((_, agendaIndex) => agendaIndex !== index))}
                          className="text-slate-300 hover:text-slate-700"
                          aria-label="Remove agenda item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addAgendaItem} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950">
                    <Plus className="h-3 w-3" />
                    Add agenda item
                  </button>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Attachments">
                    <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <Upload className="h-3.5 w-3.5" />
                      Choose files
                      <input type="file" multiple className="sr-only" onChange={(event) => addScheduleFiles(event.target.files)} />
                    </label>
                  </Field>
                  <label className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={scheduleForm.sendEmail}
                      onChange={(event) => updateScheduleField('sendEmail', event.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-slate-700"
                    />
                    Send email invitation
                  </label>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button type="button" onClick={resetScheduleForm} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button>
                  <button type="button" onClick={createMeeting} className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800">Schedule meeting</button>
                </div>
              </div>
            </div>
          </SectionShell>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <SectionShell className="overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Meeting queue</h2>
                    <p className="mt-1 text-xs text-slate-500">{filteredMeetings.length} meetings match the current view</p>
                  </div>
                  <button
                    type="button"
                    onClick={openScheduler}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        setPage(1)
                      }}
                      placeholder="Search by title, project, organizer, or platform"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <SelectInput value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(1) }}>
                    <option value="ALL">All projects</option>
                    {projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </SelectInput>
                  <SelectInput value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as MeetingStatus | 'ALL'); setPage(1) }}>
                    <option value="ALL">All statuses</option>
                    {(['Upcoming', 'Completed', 'Cancelled'] as MeetingStatus[]).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </SelectInput>
                  <SelectInput value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as MeetingType | 'ALL'); setPage(1) }}>
                    <option value="ALL">All types</option>
                    {(['Planning', 'Review', 'Design', 'Retrospective', 'Architecture'] as MeetingType[]).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </SelectInput>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter((current) => current === 'TODAY' ? 'ALL' : 'TODAY')
                      setPage(1)
                    }}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                      dateFilter === 'TODAY'
                        ? 'border-slate-300 bg-slate-100 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Today only
                  </button>
                </div>
              </div>

              <div className="max-h-[620px] overflow-auto p-3 [scrollbar-gutter:stable]">
                <div className="space-y-2">
                  {filteredMeetings.length === 0 ? (
                    <div className="py-14 text-center">
                      <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">No meetings match your filters.</p>
                      <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-slate-700 hover:text-slate-950">
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    pageMeetings.map((meeting) => {
                      const selected = selectedMeeting.id === meeting.id
                      return (
                        <div
                          key={meeting.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectMeeting(meeting)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') selectMeeting(meeting)
                          }}
                          className={`rounded-lg border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 ${
                            selected ? 'border-slate-300 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-200">
                              <span className="text-[11px] font-semibold text-slate-500">{meeting.dateShort.split(' ')[1]}</span>
                              <span className="text-lg font-semibold leading-tight text-slate-950">{meeting.dateShort.split(' ')[0]}</span>
                              <span className="text-[10px] font-medium text-slate-400">{meeting.duration}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{meeting.title}</p>
                                  <p className="mt-1 truncate text-xs text-slate-500">{meeting.project.name} - {meeting.type}</p>
                                </div>
                                <StatusPill status={meeting.status} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                  {meeting.time}
                                </span>
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${meeting.platformTone}`} />
                                  <span className="truncate">{meeting.platform}</span>
                                </span>
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                  <Avatar name={meeting.organizer.name} index={1} size="h-6 w-6" />
                                  <span className="truncate">{meeting.organizer.name}</span>
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <AvatarStack people={meeting.participants} limit={4} />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openMeeting(meeting)
                                    }}
                                    className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                                  >
                                    Join
                                  </button>
                                  <div className="relative">
                            <button
                              type="button"
                              aria-label="More meeting actions"
                              onClick={(event) => {
                                event.stopPropagation()
                                setMenuMeetingId((current) => current === meeting.id ? null : meeting.id)
                              }}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-900"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuMeetingId === meeting.id && (
                              <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button type="button" onClick={(event) => { event.stopPropagation(); void copyMeetingLink(meeting) }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Copy link</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); duplicateMeeting(meeting) }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Duplicate</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); setMeetingStatus(meeting.id, 'Completed') }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Mark completed</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); setMeetingStatus(meeting.id, 'Cancelled') }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Cancel meeting</button>
                              </div>
                            )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Showing {filteredMeetings.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredMeetings.length)} of {filteredMeetings.length} meetings
                </p>
                <div className="flex items-center gap-1">
                  <IconButton label="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                        pageNumber === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <IconButton label="Next page" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </SectionShell>
          </div>

          <SectionShell className="min-w-0 overflow-hidden xl:sticky xl:top-4 xl:self-start">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Selected meeting</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold text-slate-950">{selectedMeeting.title}</h2>
                    <StatusPill status={selectedMeeting.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{selectedMeeting.dateLabel}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{selectedMeeting.time}</span>
                    <span className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-slate-400" />{selectedMeeting.duration}</span>
                    <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${selectedMeeting.platformTone}`} />{selectedMeeting.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMeeting(selectedMeeting)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareMeeting(selectedMeeting)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                  <IconButton label="Duplicate meeting" onClick={() => duplicateMeeting(selectedMeeting)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-5 flex overflow-x-auto rounded-lg bg-slate-100 p-1">
                {([
                  { id: 'Overview', label: 'Overview' },
                  { id: 'Agenda', label: 'Agenda' },
                  { id: 'Participants', label: `Participants (${selectedMeeting.participants.length})` },
                  { id: 'Notes', label: 'Notes' },
                  { id: 'Action Items', label: `Action Items (${selectedMeeting.actions.length})` },
                  { id: 'Attachments', label: 'Attachments' },
                  { id: 'Activity', label: 'Activity' },
                ] as { id: DetailTab; label: string }[]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${activeTab === 'Overview' ? 'grid' : 'hidden'} gap-4 p-5 2xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]`}>
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">Meeting Link</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a href={selectedMeeting.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 underline-offset-2 hover:text-slate-950 hover:underline">
                      {selectedMeeting.link}
                    </a>
                    <IconButton label="Copy meeting link" onClick={() => void copyMeetingLink(selectedMeeting)}>
                      <Copy className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openMeeting(selectedMeeting)}
                      className="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyMeetingLink(selectedMeeting)}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Meeting ID</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{selectedMeeting.meetingId}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Organizer</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar name={selectedMeeting.organizer.name} index={0} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{selectedMeeting.organizer.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{selectedMeeting.organizer.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Project</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{selectedMeeting.project.name}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Meeting Type</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Online - {selectedMeeting.type}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Platform</p>
                    <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <span className={`h-2 w-2 rounded-full ${selectedMeeting.platformTone}`} />
                      {selectedMeeting.platform}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">Reminder</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{selectedMeeting.reminder}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[11px] font-semibold text-slate-400">Description</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{selectedMeeting.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">RSVP summary</p>
                    <span className="text-[11px] font-medium text-slate-400">{selectedMeeting.participants.length} invited</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Accepted', value: accepted.length, icon: Check, tone: 'bg-slate-100 text-slate-600' },
                      { label: 'Pending', value: pending.length, icon: Clock3, tone: 'bg-slate-100 text-slate-600' },
                      { label: 'Declined', value: declined.length, icon: X, tone: 'bg-slate-100 text-slate-600' },
                    ].map((group) => {
                      const Icon = group.icon
                      return (
                        <div key={group.label} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${group.tone}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{group.label}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{group.value}</span>
                        </div>
                      )
                    })}
                  </div>
                  {pending.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateMeeting(selectedMeeting.id, (meeting) => ({
                            ...meeting,
                            participants: meeting.participants.map((participant) => participant.status === 'Pending' ? { ...participant, status: 'Accepted' } : participant),
                          }))
                          showMessage('Pending participants accepted')
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Accept pending
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateMeeting(selectedMeeting.id, (meeting) => ({
                            ...meeting,
                            participants: meeting.participants.map((participant) => participant.status === 'Pending' ? { ...participant, status: 'Declined' } : participant),
                          }))
                          showMessage('Pending participants declined')
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">Participants ({selectedMeeting.participants.length})</p>
                    <button type="button" onClick={() => setActiveTab('Participants')} className="text-[11px] font-semibold text-slate-700 hover:text-slate-950">View all</button>
                  </div>
                  <AvatarStack people={selectedMeeting.participants} limit={6} />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">Action Items ({selectedMeeting.actions.length})</p>
                    <button type="button" onClick={() => setActiveTab('Action Items')} className="text-[11px] font-semibold text-slate-700 hover:text-slate-950">View all action items</button>
                  </div>
                  <div className="space-y-3">
                    {selectedMeeting.actions.slice(0, 5).map((item) => (
                      <div key={`${item.title}-${item.owner}`} className="flex items-start gap-2">
                        <Avatar name={item.owner} index={selectedMeeting.participants.findIndex((person) => person.name === item.owner) + 1} size="h-7 w-7" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-700">{item.title}</p>
                          <p className="text-[11px] text-slate-400">{item.owner}<span className="mx-1">-</span>Due {item.dueDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-semibold text-slate-800">Agenda</p>
                  <ol className="space-y-2">
                    {selectedMeeting.agenda.map((item, index) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={() => setActiveTab('Agenda')} className="mt-3 text-[11px] font-semibold text-slate-700 hover:text-slate-950">View full agenda</button>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-semibold text-slate-800">Attachments ({selectedMeeting.attachments.length})</p>
                  {selectedMeeting.attachments.length ? (
                    <div className="space-y-2">
                      {selectedMeeting.attachments.map((attachment) => (
                        <div key={attachment.name} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${attachment.tone}`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-700">{attachment.name}</p>
                            <p className="text-[11px] text-slate-400">{attachment.size}</p>
                          </div>
                          <Download className="h-4 w-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No attachments uploaded.</p>
                  )}
                </div>
              </div>
            </div>

            {activeTab === 'Agenda' && (
              <div className="space-y-3 p-5">
                {selectedMeeting.agenda.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{index + 1}</span>
                    <input
                      value={item}
                      onChange={(event) => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        agenda: meeting.agenda.map((agendaItem, agendaIndex) => agendaIndex === index ? event.target.value : agendaItem),
                      }))}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        agenda: meeting.agenda.filter((_, agendaIndex) => agendaIndex !== index),
                      }))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({ ...meeting, agenda: [...meeting.agenda, 'New agenda item'] }))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Agenda Item
                </button>
              </div>
            )}

            {activeTab === 'Participants' && (
              <div className="space-y-3 p-5">
                {selectedMeeting.participants.map((participant, index) => (
                  <div key={participant.name} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <Avatar name={participant.name} index={index} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{participant.name}</p>
                      <p className="text-xs text-slate-400">{participant.role}</p>
                    </div>
                    <SelectInput
                      value={participant.status}
                      onChange={(event) => updateParticipantStatus(participant.name, event.target.value as RsvpStatus)}
                      className="max-w-[140px]"
                    >
                      <option>Accepted</option>
                      <option>Pending</option>
                      <option>Declined</option>
                    </SelectInput>
                    <button
                      type="button"
                      onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        participants: meeting.participants.filter((item) => item.name !== participant.name),
                      }))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Invite people</h3>
                    <p className="mt-1 text-xs text-slate-500">Add teammates to this meeting and send a short note.</p>
                  </div>

                  <Field label="Add people or email">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <TextInput
                        value={inviteQuery}
                        onChange={(event) => setInviteQuery(event.target.value)}
                        className="pl-9"
                        placeholder="Search by name or email"
                      />
                    </div>
                  </Field>

                  {inviteMatches.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {inviteMatches.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setInviteSelected((current) => [...current, name])
                            setInviteQuery('')
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <span>{name}</span>
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold text-slate-600">Selected ({inviteSelected.length || selectedMeeting.participants.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {(inviteSelected.length ? inviteSelected : selectedMeeting.participants.slice(0, 7).map((person) => person.name)).map((name, index) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setInviteSelected((current) => current.filter((item) => item !== name))}
                          title={inviteSelected.length ? `Remove ${name}` : name}
                        >
                          <Avatar name={name} index={index} />
                        </button>
                      ))}
                      {!inviteSelected.length && selectedMeeting.participants.length > 7 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                          +{selectedMeeting.participants.length - 7}
                        </div>
                      )}
                    </div>
                  </div>

                  <Field label="Message">
                    <textarea
                      value={inviteMessage}
                      onChange={(event) => setInviteMessage(event.target.value)}
                      className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </Field>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteSelected([])
                        setInviteQuery('')
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                    <button type="button" onClick={sendInvitations} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800">
                      <Send className="h-3.5 w-3.5" />
                      Send invitation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Add a meeting note..."
                    className="min-h-20 w-full resize-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={addNote} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                      Add Note
                    </button>
                  </div>
                </div>
                {selectedMeeting.notes.map((note, index) => (
                  <div key={`${note}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    {note}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Action Items' && (
              <div className="space-y-3 p-5">
                {selectedMeeting.actions.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_160px_100px_32px] sm:items-center">
                    <input
                      value={item.title}
                      onChange={(event) => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        actions: meeting.actions.map((action, actionIndex) => actionIndex === index ? { ...action, title: event.target.value } : action),
                      }))}
                      className="min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                    />
                    <SelectInput
                      value={item.owner}
                      onChange={(event) => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        actions: meeting.actions.map((action, actionIndex) => actionIndex === index ? { ...action, owner: event.target.value } : action),
                      }))}
                    >
                      {selectedMeeting.participants.map((participant) => (
                        <option key={participant.name}>{participant.name}</option>
                      ))}
                    </SelectInput>
                    <TextInput
                      value={item.dueDate}
                      onChange={(event) => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        actions: meeting.actions.map((action, actionIndex) => actionIndex === index ? { ...action, dueDate: event.target.value } : action),
                      }))}
                    />
                    <button
                      type="button"
                      onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({
                        ...meeting,
                        actions: meeting.actions.filter((_, actionIndex) => actionIndex !== index),
                      }))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({
                    ...meeting,
                    actions: [...meeting.actions, { title: 'New action item', owner: meeting.organizer.name, dueDate: 'Today' }],
                  }))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Action Item
                </button>
              </div>
            )}

            {activeTab === 'Attachments' && (
              <div className="space-y-3 p-5">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Files
                  <input type="file" multiple className="sr-only" onChange={(event) => addFilesToSelectedMeeting(event.target.files)} />
                </label>
                {selectedMeeting.attachments.map((attachment) => (
                  <div key={attachment.name} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${attachment.tone}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{attachment.name}</p>
                      <p className="text-xs text-slate-400">{attachment.size}</p>
                    </div>
                    <Download className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Activity' && (
              <div className="space-y-3 p-5">
                {[
                  `${selectedMeeting.organizer.name} organized the meeting.`,
                  `${selectedMeeting.participants.length} participants invited.`,
                  `${selectedMeeting.actions.length} action items tracked.`,
                  ...selectedMeeting.notes,
                ].map((activity, index) => (
                  <div key={`${activity}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-slate-300" />
                    <p className="text-sm text-slate-600">{activity}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>
        </div>

      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
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
  Mail,
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
  dateLabel: string
  dateShort: string
  time: string
  duration: string
  platform: 'Google Meet' | 'Microsoft Teams' | 'Zoom'
  platformTone: string
  status: MeetingStatus
  type: MeetingType
  meetingId: string
  link: string
  reminder: string
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
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-slate-700 text-white',
  'bg-cyan-600 text-white',
]

const statusStyles: Record<MeetingStatus, string> = {
  Upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
}

const statStyles = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  rose: 'border-rose-100 bg-rose-50 text-rose-700',
}

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
      dateLabel: '02 May 2025',
      dateShort: '02 May 2025',
      time: '10:00 AM - 11:30 AM',
      duration: '1h 30m',
      platform: 'Google Meet',
      platformTone: 'bg-emerald-500',
      status: 'Upcoming',
      type: 'Planning',
      meetingId: 'abc-defg-hij',
      link: 'https://meet.google.com/abc-defg-hij',
      reminder: '15 minutes before',
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
        { name: 'Sprint-15-Plan.docx', size: '1.2 MB', tone: 'text-blue-600 bg-blue-50' },
        { name: 'Requirements.pdf', size: '2.4 MB', tone: 'text-rose-600 bg-rose-50' },
        { name: 'Design-Overview.pptx', size: '3.8 MB', tone: 'text-amber-600 bg-amber-50' },
      ],
      notes: ['Confirm capacity before backlog lock.', 'Prepare release risks for review.'],
    },
    {
      id: 'meet-002',
      title: 'Client Review Meeting',
      project: beta,
      organizer: { name: beta.manager, role: roleFor(beta.manager, 'Project Manager'), status: 'Accepted' },
      dateLabel: '02 May 2025',
      dateShort: '02 May 2025',
      time: '03:00 PM - 03:45 PM',
      duration: '45m',
      platform: 'Microsoft Teams',
      platformTone: 'bg-blue-600',
      status: 'Upcoming',
      type: 'Review',
      meetingId: 'teams-4829',
      link: 'https://teams.microsoft.com/l/meetup-join/client-review',
      reminder: '30 minutes before',
      description: 'Client checkpoint for progress review, open decisions, and delivery confidence.',
      agenda: ['Progress Summary', 'Open Issues', 'Client Questions', 'Next Deliverables'],
      participants: peopleFor(beta, 8, 0),
      actions: [
        { title: 'Send client recap', owner: beta.manager, dueDate: '02 May' },
        { title: 'Update delivery notes', owner: 'Maya Rao', dueDate: '03 May' },
      ],
      attachments: [
        { name: 'Client-Review.pdf', size: '1.8 MB', tone: 'text-rose-600 bg-rose-50' },
        { name: 'Delivery-Roadmap.xlsx', size: '980 KB', tone: 'text-emerald-600 bg-emerald-50' },
      ],
      notes: ['Client wants a shorter status summary.', 'Budget note to be shared separately.'],
    },
    {
      id: 'meet-003',
      title: 'UI/UX Discussion',
      project: alpha,
      organizer: { name: 'Anita Desai', role: 'UI/UX Designer', status: 'Accepted' },
      dateLabel: '03 May 2025',
      dateShort: '03 May 2025',
      time: '10:00 AM - 12:00 PM',
      duration: '2h',
      platform: 'Google Meet',
      platformTone: 'bg-emerald-500',
      status: 'Upcoming',
      type: 'Design',
      meetingId: 'ux-4490',
      link: 'https://meet.google.com/uiux-review',
      reminder: '10 minutes before',
      description: 'Design review for interaction flow, accessibility, and final screen readiness.',
      agenda: ['Prototype Walkthrough', 'Accessibility Review', 'Mobile States', 'Handoff Checklist'],
      participants: peopleFor(alpha, 7, 1),
      actions: [
        { title: 'Refresh empty states', owner: 'Anita Desai', dueDate: '05 May' },
        { title: 'Check mobile spacing', owner: 'Sneha Iyer', dueDate: '05 May' },
      ],
      attachments: [
        { name: 'UX-Flow.fig', size: '4.6 MB', tone: 'text-violet-600 bg-violet-50' },
      ],
      notes: ['Use compact density for operations pages.'],
    },
    {
      id: 'meet-004',
      title: 'Team Retrospective',
      project: gamma,
      organizer: { name: gamma.manager, role: roleFor(gamma.manager, 'Tech Lead'), status: 'Accepted' },
      dateLabel: '03 May 2025',
      dateShort: '03 May 2025',
      time: '04:00 PM - 05:00 PM',
      duration: '1h',
      platform: 'Zoom',
      platformTone: 'bg-sky-500',
      status: 'Upcoming',
      type: 'Retrospective',
      meetingId: 'zoom-153-882',
      link: 'https://zoom.us/j/153882',
      reminder: '15 minutes before',
      description: 'Retrospective to capture wins, friction points, and action items for the next sprint.',
      agenda: ['Wins', 'Pain Points', 'Process Changes', 'Owners'],
      participants: peopleFor(gamma, 9, 0),
      actions: [
        { title: 'Publish retro notes', owner: gamma.manager, dueDate: '03 May' },
        { title: 'Prioritize process fixes', owner: 'Neha Kapoor', dueDate: '06 May' },
      ],
      attachments: [
        { name: 'Retro-Notes.docx', size: '720 KB', tone: 'text-blue-600 bg-blue-50' },
      ],
      notes: ['Keep discussion time-boxed.'],
    },
    {
      id: 'meet-005',
      title: 'Architecture Review',
      project: alpha,
      organizer: { name: 'Rohit Sharma', role: 'Project Manager', status: 'Accepted' },
      dateLabel: '01 May 2025',
      dateShort: '01 May 2025',
      time: '10:00 AM - 11:00 AM',
      duration: '1h',
      platform: 'Microsoft Teams',
      platformTone: 'bg-blue-600',
      status: 'Completed',
      type: 'Architecture',
      meetingId: 'arch-9112',
      link: 'https://teams.microsoft.com/l/meetup-join/architecture',
      reminder: 'No reminder',
      description: 'Technical architecture review for service boundaries, integrations, and database changes.',
      agenda: ['Service Map', 'API Contracts', 'Database Schema', 'Deployment Notes'],
      participants: peopleFor(alpha, 8, 2),
      actions: [
        { title: 'Share API contract', owner: 'Arjun Mehta', dueDate: '02 May' },
        { title: 'Confirm migration order', owner: 'Aman Verma', dueDate: '04 May' },
      ],
      attachments: [
        { name: 'Architecture-Notes.pdf', size: '2.1 MB', tone: 'text-rose-600 bg-rose-50' },
      ],
      notes: ['Approved with follow-up on migration sequencing.'],
    },
    {
      id: 'meet-006',
      title: 'Budget Alignment',
      project: beta,
      organizer: { name: 'Maya Rao', role: 'Client Partner', status: 'Accepted' },
      dateLabel: '30 Apr 2025',
      dateShort: '30 Apr 2025',
      time: '02:00 PM - 02:30 PM',
      duration: '30m',
      platform: 'Google Meet',
      platformTone: 'bg-emerald-500',
      status: 'Cancelled',
      type: 'Review',
      meetingId: 'budget-220',
      link: 'https://meet.google.com/budget-align',
      reminder: 'No reminder',
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

function platformToneFor(platform: Meeting['platform']) {
  if (platform === 'Microsoft Teams') return 'bg-blue-600'
  if (platform === 'Zoom') return 'bg-sky-500'
  return 'bg-emerald-500'
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
  return {
    title: meeting.title,
    projectId: meeting.project.id,
    description: meeting.description,
    type: meeting.type,
    platform: meeting.platform,
    link: meeting.link,
    date: '2025-05-02',
    startTime: '10:00',
    endTime: '11:30',
    timezone: 'IST',
    participants: meeting.participants.map((participant) => participant.name),
    agenda: meeting.agenda,
    reminder: meeting.reminder,
    repeat: 'Does not repeat',
    sendEmail: true,
    attachments: meeting.attachments,
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
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
      className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ${props.className ?? ''}`}
    />
  )
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ${props.className ?? ''}`}
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

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedId) ?? meetings[0] ?? seededMeetings[0] ?? buildMeetings(fallbackProjects)[0]

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

  const updateMeeting = (meetingId: string, updater: (meeting: Meeting) => Meeting) => {
    setMeetings((current) => current.map((meeting) => (meeting.id === meetingId ? updater(meeting) : meeting)))
  }

  const showMessage = (message: string) => {
    setActionMessage(message)
    window.setTimeout(() => setActionMessage(''), 2400)
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

  const createMeeting = () => {
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
    const meeting: Meeting = {
      id: `meet-custom-${Date.now()}`,
      title: scheduleForm.title.trim(),
      project,
      organizer: participants[0],
      dateLabel: formatMeetingDate(scheduleForm.date),
      dateShort: formatMeetingDate(scheduleForm.date),
      time: `${toDisplayTime(scheduleForm.startTime)} - ${toDisplayTime(scheduleForm.endTime)}`,
      duration: durationLabel(scheduleForm.startTime, scheduleForm.endTime),
      platform: scheduleForm.platform,
      platformTone: platformToneFor(scheduleForm.platform),
      status: 'Upcoming',
      type: scheduleForm.type,
      meetingId: `mtg-${Math.random().toString(36).slice(2, 8)}`,
      link,
      reminder: scheduleForm.reminder,
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
    setMeetings((current) => [meeting, ...current])
    selectMeeting(meeting)
    showMessage('Meeting scheduled')
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
      tone: 'text-blue-600 bg-blue-50',
    }))
    setScheduleForm((current) => ({ ...current, attachments: [...current.attachments, ...nextFiles] }))
  }

  const addFilesToSelectedMeeting = (files: FileList | null) => {
    if (!files?.length) return
    const nextFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: fileSizeLabel(file.size),
      tone: 'text-blue-600 bg-blue-50',
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
    <div className="flex flex-col">
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Meetings</h1>
            <p className="text-sm text-slate-400">Plan, organize and track all your project meetings</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setScheduleForm(formFromMeeting(selectedMeeting))
              showMessage('Schedule form is ready')
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {actionMessage && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
            {actionMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search meetings..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
              <SelectInput value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(1) }} className="max-w-[180px]">
                <option value="ALL">Project</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </SelectInput>
              <SelectInput value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as MeetingStatus | 'ALL'); setPage(1) }} className="max-w-[150px]">
                <option value="ALL">Status</option>
                {(['Upcoming', 'Completed', 'Cancelled'] as MeetingStatus[]).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </SelectInput>
              <SelectInput value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as MeetingType | 'ALL'); setPage(1) }} className="max-w-[160px]">
                <option value="ALL">Meeting Type</option>
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
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                  dateFilter === 'TODAY'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Today
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <SectionShell className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">All Meetings</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Sprint Planning</p>
                  <p className="text-xs text-slate-400">{filteredMeetings.length} meetings matching current filters</p>
                </div>
                <IconButton label="Filter meetings">
                  <Filter className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="max-h-[360px] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
                <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid lg:min-w-[1120px] lg:grid-cols-[minmax(180px,1.35fr)_minmax(120px,0.9fr)_minmax(120px,0.95fr)_minmax(145px,1.05fr)_120px_120px_96px_82px] lg:gap-4">
                  <span>Meeting Title</span>
                  <span>Project</span>
                  <span>Organizer</span>
                  <span>Date & Time</span>
                  <span>Participants</span>
                  <span>Platform</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredMeetings.length === 0 ? (
                    <div className="py-14 text-center">
                      <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">No meetings match your filters.</p>
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
                          className={`grid w-full gap-3 px-5 py-3 text-left text-sm transition hover:bg-blue-50/50 lg:min-w-[1120px] lg:grid-cols-[minmax(180px,1.35fr)_minmax(120px,0.9fr)_minmax(120px,0.95fr)_minmax(145px,1.05fr)_120px_120px_96px_82px] lg:items-center lg:gap-4 ${
                            selected ? 'bg-blue-50/70' : 'bg-white'
                          }`}
                        >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{meeting.title}</p>
                          <p className="text-[11px] text-slate-400">{meeting.type} meeting</p>
                        </div>
                        <p className="truncate text-xs font-medium text-slate-600">{meeting.project.name}</p>
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar name={meeting.organizer.name} index={1} size="h-7 w-7" />
                          <span className="truncate text-xs text-slate-600">{meeting.organizer.name}</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">{meeting.dateShort}</p>
                          <p className="text-[11px] text-slate-400">{meeting.time}</p>
                        </div>
                        <AvatarStack people={meeting.participants} limit={3} />
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${meeting.platformTone}`} />
                          <span className="truncate text-xs text-slate-600">{meeting.platform}</span>
                        </div>
                        <StatusPill status={meeting.status} />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openMeeting(meeting)
                            }}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
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
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-blue-700"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuMeetingId === meeting.id && (
                              <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button type="button" onClick={(event) => { event.stopPropagation(); void copyMeetingLink(meeting) }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Copy link</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); duplicateMeeting(meeting) }} className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Duplicate</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); setMeetingStatus(meeting.id, 'Completed') }} className="block w-full px-3 py-2 text-left text-xs text-emerald-700 hover:bg-emerald-50">Mark completed</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); setMeetingStatus(meeting.id, 'Cancelled') }} className="block w-full px-3 py-2 text-left text-xs text-rose-700 hover:bg-rose-50">Cancel meeting</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
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
                        pageNumber === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
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

          <SectionShell className="min-w-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setProjectFilter('ALL')
                  setStatusFilter('ALL')
                  setTypeFilter('ALL')
                  setDateFilter('ALL')
                  setPage(1)
                }}
                className="mb-5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Meetings
              </button>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold text-slate-900">{selectedMeeting.title}</h2>
                    <StatusPill status={selectedMeeting.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-blue-500" />{selectedMeeting.dateLabel}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-blue-500" />{selectedMeeting.time}</span>
                    <span className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-blue-500" />{selectedMeeting.duration}</span>
                    <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${selectedMeeting.platformTone}`} />{selectedMeeting.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMeeting(selectedMeeting)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
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

              <div className="mt-5 flex overflow-x-auto border-b border-slate-100">
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
                    className={`shrink-0 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                      activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'
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
                    <a href={selectedMeeting.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-medium text-blue-700 hover:underline">
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
                      className="inline-flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
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
                    <p className="mt-1 text-xs font-semibold text-blue-700">{selectedMeeting.project.name}</p>
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
                    <p className="text-xs font-semibold text-slate-800">Participants ({selectedMeeting.participants.length})</p>
                    <button type="button" onClick={() => setActiveTab('Participants')} className="text-[11px] font-semibold text-blue-700 hover:text-blue-800">View all</button>
                  </div>
                  <AvatarStack people={selectedMeeting.participants} limit={6} />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">Action Items ({selectedMeeting.actions.length})</p>
                    <button type="button" onClick={() => setActiveTab('Action Items')} className="text-[11px] font-semibold text-blue-700 hover:text-blue-800">View all action items</button>
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
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={() => setActiveTab('Agenda')} className="mt-3 text-[11px] font-semibold text-blue-700 hover:text-blue-800">View full agenda</button>
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
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{index + 1}</span>
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateMeeting(selectedMeeting.id, (meeting) => ({ ...meeting, agenda: [...meeting.agenda, 'New agenda item'] }))}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
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
                    <button type="button" onClick={addNote} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Action Item
                </button>
              </div>
            )}

            {activeTab === 'Attachments' && (
              <div className="space-y-3 p-5">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100">
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
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-sm text-slate-600">{activity}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>
        </div>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.68fr)_minmax(260px,0.55fr)]">
          <SectionShell className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Schedule Meeting</h2>
              <p className="text-xs text-slate-400">Create a project meeting and notify the selected participants.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
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
                <Field label="Description">
                  <textarea
                    value={scheduleForm.description}
                    onChange={(event) => updateScheduleField('description', event.target.value)}
                    className="min-h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
                <Field label="Meeting URL">
                  <TextInput value={scheduleForm.link} onChange={(event) => updateScheduleField('link', event.target.value)} />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Date">
                    <TextInput type="date" value={scheduleForm.date} onChange={(event) => updateScheduleField('date', event.target.value)} />
                  </Field>
                  <Field label="Start Time">
                    <TextInput type="time" value={scheduleForm.startTime} onChange={(event) => updateScheduleField('startTime', event.target.value)} />
                  </Field>
                  <Field label="End Time">
                    <TextInput type="time" value={scheduleForm.endTime} onChange={(event) => updateScheduleField('endTime', event.target.value)} />
                  </Field>
                  <Field label="Time Zone">
                    <SelectInput value={scheduleForm.timezone} onChange={(event) => updateScheduleField('timezone', event.target.value)}>
                      <option value="IST">GMT+05:30 India Standard Time</option>
                      <option value="UTC">UTC</option>
                      <option value="PST">Pacific Time</option>
                    </SelectInput>
                  </Field>
                </div>

                <Field label="Participants">
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    {scheduleForm.participants.slice(0, 6).map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {name}
                        <button
                          type="button"
                          onClick={() => updateScheduleField('participants', scheduleForm.participants.filter((participant) => participant !== name))}
                        >
                          <X className="h-3 w-3" />
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
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    {scheduleForm.agenda.map((item, index) => (
                      <div key={item} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                        <span className="text-[11px] font-semibold text-slate-400">{index + 1}</span>
                        <input
                          value={item}
                          onChange={(event) => updateScheduleField('agenda', scheduleForm.agenda.map((agendaItem, agendaIndex) => agendaIndex === index ? event.target.value : agendaItem))}
                          className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateScheduleField('agenda', scheduleForm.agenda.filter((_, agendaIndex) => agendaIndex !== index))}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addAgendaItem} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                    <Plus className="h-3 w-3" />
                    Add Agenda Item
                  </button>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Add Attachments">
                    <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      <Upload className="h-3.5 w-3.5" />
                      Choose Files
                      <input type="file" multiple className="sr-only" onChange={(event) => addScheduleFiles(event.target.files)} />
                    </label>
                  </Field>
                  <Field label="Add Reminder">
                    <SelectInput value={scheduleForm.reminder} onChange={(event) => updateScheduleField('reminder', event.target.value)}>
                      <option>15 minutes before</option>
                      <option>30 minutes before</option>
                      <option>1 hour before</option>
                      <option>No reminder</option>
                    </SelectInput>
                  </Field>
                </div>
                <Field label="Repeat">
                  <SelectInput value={scheduleForm.repeat} onChange={(event) => updateScheduleField('repeat', event.target.value)}>
                    <option>Does not repeat</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </SelectInput>
                </Field>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={scheduleForm.sendEmail}
                  onChange={(event) => updateScheduleField('sendEmail', event.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-blue-600"
                />
                Send email invitation
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={resetScheduleForm} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={createMeeting} className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">Schedule Meeting</button>
              </div>
            </div>
          </SectionShell>

          <SectionShell className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Invite People</h2>
              <p className="text-xs text-slate-400">Add people or send a quick invitation.</p>
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
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-600 hover:bg-blue-50"
                  >
                    <span>{name}</span>
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
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

            <Field label="Message (Optional)">
              <textarea
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
                className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
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
                Cancel
              </button>
              <button type="button" onClick={sendInvitations} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
                <Send className="h-3.5 w-3.5" />
                Send Invitation
              </button>
            </div>
          </SectionShell>

          <SectionShell className="p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-900">RSVP Status</h2>
              <p className="text-xs text-slate-400">Participant responses for this meeting.</p>
            </div>

            {[
              { label: 'Accepted', value: accepted.length, people: accepted, icon: Check, tone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Pending', value: pending.length, people: pending, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
              { label: 'Declined', value: declined.length, people: declined, icon: X, tone: 'bg-rose-50 text-rose-600' },
            ].map((group) => {
              const Icon = group.icon
              return (
                <div key={group.label} className="mb-4 flex items-center justify-between gap-3 last:mb-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${group.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{group.label} ({group.value})</p>
                      <p className="text-[11px] text-slate-400">{group.value ? 'Response recorded' : 'No responses yet'}</p>
                    </div>
                  </div>
                  <AvatarStack people={group.people} limit={4} />
                </div>
              )
            })}

            {pending.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateMeeting(selectedMeeting.id, (meeting) => ({
                      ...meeting,
                      participants: meeting.participants.map((participant) => participant.status === 'Pending' ? { ...participant, status: 'Accepted' } : participant),
                    }))
                    showMessage('Pending participants accepted')
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Accept Pending
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
                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Decline Pending
                </button>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <p className="text-xs leading-5 text-blue-800">Reminder emails are queued for pending participants 15 minutes before the meeting.</p>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  )
}

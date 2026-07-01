import { useEffect, useState } from 'react'
import { isAfter, parseISO } from 'date-fns'
import {
  Briefcase, Calendar, Check, CheckCircle, ChevronRight,
  Code2, DollarSign, FileText, GitBranch, Globe, Layers, Loader2, Lock,
  MessageSquare, Plus, Save, Shield, Trash2, UploadCloud, Users, X, Zap,
} from 'lucide-react'
import {
  allRolePermissions,
  branchStrategies,
  deadlineTypes,
  defaultPermissionsForRole,
  memberRoles,
  owners,
  projectCategories,
  projectTemplates,
  projectTypes,
  sprintDurations,
  techBackend,
  techDatabase,
  techFrontend,
  techOther,
} from '../data'
import type {
  MemberRole,
  Priority,
  ProjectFormState,
  ProjectModule,
  Risk,
  RolePermission,
  Sprint,
  TeamMember,
} from '../types'
import { useUsers } from '@/modules/users/hooks'
import { newId } from '../utils'
import { ComboSelect } from './ComboSelect'

/* ── Color maps ──────────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  'Web Application':     'sky',
  'Mobile Application':  'violet',
  'Desktop Application': 'indigo',
  'IoT Project':         'emerald',
  'AI/ML Project':       'purple',
  'API Development':     'orange',
  'Internal Tool':       'slate',
  'Client Project':      'rose',
  'Maintenance Project': 'amber',
  'Research Project':    'cyan',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Client Delivery': 'sky',
  'Internal':        'slate',
  'Product':         'violet',
  'Operations':      'emerald',
  'Compliance':      'amber',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low:      'slate',
  Medium:   'sky',
  High:     'orange',
  Critical: 'rose',
}

const DEADLINE_COLORS: Record<string, string> = {
  'Flexible':        'emerald',
  'Fixed Deadline':  'orange',
  'Urgent Delivery': 'rose',
}

/* ── Steps — Notion-style outline, each with a one-line descriptor ───────── */
const STEPS = [
  { id: 1, label: 'Basics',    icon: Briefcase,  hint: 'Name, type & description' },
  { id: 2, label: 'Client',    icon: Globe,      hint: 'Stakeholders & ownership' },
  { id: 3, label: 'Timeline',  icon: Zap,        hint: 'Dates & deadline type' },
  { id: 4, label: 'Team',      icon: Users,      hint: 'Manager & members' },
  { id: 5, label: 'Tech',      icon: Code2,      hint: 'Stack & repository' },
  { id: 6, label: 'Sprints',   icon: Layers,     hint: 'Phases & sprint plan' },
  { id: 7, label: 'Budget',    icon: DollarSign, hint: 'Costs & documents' },
  { id: 8, label: 'Review',    icon: Shield,     hint: 'Risks & approval' },
]

/* ── Shared style tokens — quiet, borderless-first, Notion-like ─────────── */
const labelCls  = 'mb-1 block text-[12px] font-medium text-slate-500'
// Inline "property" style: no visible border until hover/focus, like a Notion text block
const inputCls  = '-mx-2 w-[calc(100%+16px)] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] text-slate-800 placeholder:text-slate-350 outline-none transition-colors hover:bg-slate-100/70 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900/5'
const selectCls = '-mx-2 w-[calc(100%+16px)] cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] text-slate-700 outline-none transition-colors hover:bg-slate-100/70 focus:border-slate-300 focus:bg-white'

/* ── Field wrapper ─────────────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="ml-1 text-rose-400">·</span>}
      </span>
      {children}
    </div>
  )
}

/* ── Section — a quiet block with a small caption icon, divided by hairlines ── */
function Section({ icon: Icon, title, desc, action, children }: { icon: React.ElementType; title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-slate-800">{title}</p>
            {desc && <p className="mt-0.5 text-[12px] text-slate-400">{desc}</p>}
          </div>
        </div>
        {action ? <div className="flex flex-shrink-0 sm:pt-0.5">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

const ghostBtn = 'rounded-md px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
const chipCard = 'rounded-lg border border-slate-150 bg-slate-50/60 p-3'

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtSize(bytes: number) {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* ── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  formState: ProjectFormState
  onChange: (field: keyof ProjectFormState, value: ProjectFormState[keyof ProjectFormState]) => void
  onCancel: () => void
  onSave: (overrides?: Partial<ProjectFormState>) => void
  isSaving?: boolean
  isEdit?: boolean
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function ProjectForm({
  formState, onChange, onCancel, onSave, isSaving = false, isEdit = false,
}: Props) {
  const usersQuery          = useUsers()
  const [step, setStep]     = useState(1)
  const hasDateError        = isAfter(parseISO(formState.startDate), parseISO(formState.endDate))
  const isInvalid           = !formState.name.trim() || hasDateError
  const isInternalProject   = (formState.projectTypes ?? [formState.projectType]).includes('Internal Tool')

  /* Session-local option lists */
  const [extraTypes,      setExtraTypes]      = useState<string[]>([])
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [extraTags,       setExtraTags]       = useState<string[]>([])
  const [extraOwners,     setExtraOwners]     = useState<string[]>([])
  const allTypes      = [...projectTypes, ...extraTypes]
  const allCategories = [...projectCategories, ...extraCategories]
  const allOwners     = [...owners, ...extraOwners]
  const internalUserOptions = Array.from(
    new Set(
      (usersQuery.data ?? [])
        .filter((user) => user.active)
        .map((user) => user.name)
        .filter(Boolean),
    ),
  )

  /* Step-4 add-member state — hoisted to avoid hooks-in-render */
  const [pendingMember, setPendingMember] = useState('')
  const [pendingRole,   setPendingRole]   = useState<MemberRole>('Developer')
  const [pendingJoinedDate, setPendingJoinedDate] = useState(formState.startDate)
  const [pendingResponsibilities, setPendingResponsibilities] = useState('')

  useEffect(() => {
    if (!isInternalProject) return
    if (
      !formState.clientName &&
      !formState.clientCompany &&
      !formState.clientEmail &&
      !formState.clientPhone &&
      !formState.clientLocation
    ) {
      return
    }
    onChange('clientName', '')
    onChange('clientCompany', '')
    onChange('clientEmail', '')
    onChange('clientPhone', '')
    onChange('clientLocation', '')
  }, [
    formState.clientCompany,
    formState.clientEmail,
    formState.clientLocation,
    formState.clientName,
    formState.clientPhone,
    isInternalProject,
    onChange,
  ])

  /* ── Field helpers ──────────────────────────────────────────────────── */
  const updateTitle = (val: string) => {
    onChange('name', val)
    if (!formState.projectCode.trim()) {
      const code = val.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase()
      onChange('projectCode', `${code || 'PROJ'}-${new Date().getFullYear()}`)
    }
  }

  const setTypes = (vals: string[]) => {
    onChange('projectTypes', vals)
    if (vals.length > 0) onChange('projectType', vals[0] as ProjectFormState['projectType'])
  }

  const setTags = (vals: string[]) => {
    onChange('tags', vals)
    onChange('tagsText', vals.join(', '))
  }

  const importDoc = (file: File | undefined) => {
    if (!file) return
    onChange('requirementDocument', {
      id: newId('req'), name: file.name, type: file.type || 'Document',
      size: fmtSize(file.size), uploadedBy: formState.projectOwner,
      uploadedAt: new Date().toISOString().slice(0, 10),
    })
  }

  const addAttachment = (file: File | undefined) => {
    if (!file) return
    onChange('attachments', [
      ...(formState.attachments ?? []),
      { id: newId('att'), name: file.name, type: file.type || 'File', size: fmtSize(file.size), uploadedBy: formState.projectOwner, uploadedAt: new Date().toISOString().slice(0, 10) },
    ])
  }

  /* Team */
  const addTeamMember = (name: string, role: MemberRole, joinedDate: string, responsibilities: string) => {
    if (!name || formState.team.some((m) => m.name === name)) return
    const member: TeamMember = {
      name,
      role,
      joinedDate: joinedDate || formState.startDate,
      responsibilities: responsibilities.trim(),
      permissions: [...defaultPermissionsForRole[role]],
    }
    const next = [...formState.team, member]
    onChange('team', next)
    onChange('teamMembers', next.map((m) => m.name))
  }
  const removeTeamMember = (name: string) => {
    const next = formState.team.filter((m) => m.name !== name)
    onChange('team', next)
    onChange('teamMembers', next.map((m) => m.name))
  }
  const togglePermission = (memberName: string, perm: RolePermission) => {
    onChange('team', formState.team.map((m) => {
      if (m.name !== memberName) return m
      const has = m.permissions.includes(perm)
      return { ...m, permissions: has ? m.permissions.filter((p) => p !== perm) : [...m.permissions, perm] }
    }))
  }
  const updateTeamMember = (
    memberName: string,
    field: 'role' | 'joinedDate' | 'responsibilities',
    value: string,
  ) => {
    onChange('team', formState.team.map((m) => {
      if (m.name !== memberName) return m
      if (field === 'role') {
        const role = value as MemberRole
        return { ...m, role, permissions: [...defaultPermissionsForRole[role]] }
      }
      return { ...m, [field]: value }
    }))
  }

  /* Modules */
  const addModule    = () => onChange('modules', [...formState.modules, { id: newId('mod'), name: '', description: '', owner: formState.manager, priority: 'Medium' as Priority, startDate: formState.startDate, endDate: formState.endDate }])
  const updateModule = (id: string, field: keyof ProjectModule, value: string) => onChange('modules', formState.modules.map((m) => m.id === id ? { ...m, [field]: value } : m))
  const removeModule = (id: string) => onChange('modules', formState.modules.filter((m) => m.id !== id))

  /* Sprints */
  const addSprint    = () => onChange('sprints', [...formState.sprints, { id: newId('spr'), duration: '2 Weeks' as Sprint['duration'], startDate: formState.startDate, endDate: formState.endDate, goal: '' }])
  const updateSprint = (id: string, field: keyof Sprint, value: string) => onChange('sprints', formState.sprints.map((s) => s.id === id ? { ...s, [field]: value } : s))
  const removeSprint = (id: string) => onChange('sprints', formState.sprints.filter((s) => s.id !== id))

  /* Risks */
  const addRisk    = () => onChange('risks', [...formState.risks, { id: newId('risk'), name: '', level: 'Medium' as Risk['level'], impact: '', solution: '' }])
  const updateRisk = (id: string, field: keyof Risk, value: string) => onChange('risks', formState.risks.map((r) => r.id === id ? { ...r, [field]: value } : r))
  const removeRisk = (id: string) => onChange('risks', formState.risks.filter((r) => r.id !== id))

  /* ── Step renderers ─────────────────────────────────────────────────── */

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Title — treated like a Notion page title, oversized and borderless */}
      <div>
        <input
          className="w-full border-none bg-transparent text-[26px] font-semibold text-slate-900 placeholder:text-slate-300 outline-none"
          value={formState.name}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Untitled project"
          autoFocus
        />
        <p className="mt-1 text-[12.5px] text-slate-400">This becomes the project's display name across the workspace.</p>
      </div>

      <Section icon={Briefcase} title="Properties" desc="Classification used for filtering and reporting">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Type">
            <ComboSelect
              value={formState.projectTypes ?? [formState.projectType]}
              options={allTypes}
              onChange={setTypes}
              onCreateOption={(v) => setExtraTypes((p) => [...p, v])}
              colorMap={TYPE_COLORS}
              multi
              placeholder="Add type…"
            />
          </Field>

          <Field label="Category">
            <ComboSelect
              value={formState.projectCategory ? [formState.projectCategory] : []}
              options={allCategories}
              onChange={(v) => onChange('projectCategory', v[0] ?? '')}
              onCreateOption={(v) => setExtraCategories((p) => [...p, v])}
              colorMap={CATEGORY_COLORS}
              multi={false}
              placeholder="Select category…"
            />
          </Field>

          <Field label="Priority">
            <ComboSelect
              value={[formState.priority]}
              options={['Low', 'Medium', 'High', 'Critical']}
              onChange={(v) => onChange('priority', (v[0] ?? 'Medium') as Priority)}
              colorMap={PRIORITY_COLORS}
              multi={false}
              placeholder="Priority…"
            />
          </Field>

          <Field label="Project code">
            <input className={inputCls} value={formState.projectCode} onChange={(e) => onChange('projectCode', e.target.value)} placeholder="e.g. WEB-2025" />
          </Field>

          <Field label="Group / Department">
            <select className={selectCls} value={formState.department} onChange={(e) => onChange('department', e.target.value)}>
              {['Sales', 'Operations', 'Finance', 'HR', 'IT', 'Support'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="Template">
            <select className={selectCls} value={formState.projectTemplate} onChange={(e) => onChange('projectTemplate', e.target.value)}>
              {projectTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section icon={FileText} title="Description" desc="Goals, scope, and expected outcomes">
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          value={formState.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Write a short summary…"
        />
      </Section>

      <Section icon={Layers} title="Tags">
        <ComboSelect
          value={formState.tags}
          options={extraTags}
          onChange={setTags}
          onCreateOption={(v) => { setExtraTags((p) => [...p, v]); setTags([...formState.tags, v]) }}
          multi
          placeholder="Add tags…"
        />
      </Section>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-5">
      {isInternalProject ? (
        <div className="rounded-lg border border-slate-150 bg-slate-50/60 px-4 py-3.5">
          <p className="text-[13.5px] font-semibold text-slate-800">Internal project selected</p>
          <p className="mt-1 text-[12.5px] leading-5 text-slate-400">
            Client details aren't needed for internal projects, so this section is skipped automatically.
          </p>
        </div>
      ) : (
        <Section icon={Globe} title="Client" desc="External contact for this engagement">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="Client name">
              <input className={inputCls} value={formState.clientName} onChange={(e) => onChange('clientName', e.target.value)} placeholder="Contact name" />
            </Field>
            <Field label="Company">
              <input className={inputCls} value={formState.clientCompany} onChange={(e) => onChange('clientCompany', e.target.value)} placeholder="Company name" />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={formState.clientEmail} onChange={(e) => onChange('clientEmail', e.target.value)} placeholder="client@example.com" />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={formState.clientPhone} onChange={(e) => onChange('clientPhone', e.target.value)} placeholder="+1 555 0100" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Location">
                <input className={inputCls} value={formState.clientLocation} onChange={(e) => onChange('clientLocation', e.target.value)} placeholder="City, Country" />
              </Field>
            </div>
          </div>
        </Section>
      )}

      <Section icon={Users} title="Ownership" desc="Who's accountable for this project">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Project owner">
            <ComboSelect
              value={formState.projectOwner ? [formState.projectOwner] : []}
              options={allOwners}
              onChange={(v) => onChange('projectOwner', v[0] ?? '')}
              onCreateOption={(v) => setExtraOwners((prev) => prev.includes(v) ? prev : [...prev, v])}
              multi={false}
              placeholder="Select project owner…"
            />
          </Field>
          <Field label="Stakeholders">
            <ComboSelect
              value={formState.stakeholders}
              options={allOwners}
              onChange={(v) => onChange('stakeholders', v)}
              onCreateOption={(v) => setExtraOwners((prev) => prev.includes(v) ? prev : [...prev, v])}
              multi
              placeholder="Add stakeholders…"
            />
          </Field>
        </div>
      </Section>
    </div>
  )

  const renderStep3 = () => {
    const duration =
      formState.startDate && formState.endDate && !hasDateError
        ? Math.ceil((new Date(formState.endDate).getTime() - new Date(formState.startDate).getTime()) / 86_400_000)
        : null
    return (
      <div className="space-y-5">
        <Section icon={Calendar} title="Schedule" desc="Start, target and actual completion">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="Start date" required>
              <input type="date" className={inputCls} value={formState.startDate} onChange={(e) => onChange('startDate', e.target.value)} />
            </Field>
            <Field label="Expected end date" required>
              <div>
                <input type="date" className={inputCls} value={formState.endDate} onChange={(e) => onChange('endDate', e.target.value)} />
                {hasDateError && <p className="mt-1.5 text-[11.5px] text-rose-500">End date must be after start date.</p>}
              </div>
            </Field>
            <Field label="Actual end date">
              <input type="date" className={inputCls} value={formState.actualEndDate} onChange={(e) => onChange('actualEndDate', e.target.value)} />
            </Field>
            <Field label="Deadline type">
              <ComboSelect
                value={[formState.deadlineType]}
                options={[...deadlineTypes]}
                onChange={(v) => onChange('deadlineType', (v[0] ?? 'Flexible') as ProjectFormState['deadlineType'])}
                colorMap={DEADLINE_COLORS}
                multi={false}
                placeholder="Deadline type…"
              />
            </Field>
          </div>

          {duration !== null && (
            <div className="mt-4 flex items-center gap-2 text-[12.5px] text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Runs for <span className="font-semibold text-slate-700">{duration} days</span></span>
            </div>
          )}
        </Section>
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="space-y-5">
      <Section icon={Users} title="Leadership" desc="Manager and team lead for this project">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Project manager">
            <ComboSelect
              value={formState.manager ? [formState.manager] : []}
              options={internalUserOptions}
              onChange={(v) => onChange('manager', v[0] ?? '')}
              multi={false}
              placeholder={usersQuery.isLoading ? 'Loading users...' : 'Select manager...'}
            />
          </Field>
          <Field label="Team lead">
            <ComboSelect
              value={formState.teamLead ? [formState.teamLead] : []}
              options={internalUserOptions}
              onChange={(v) => onChange('teamLead', v[0] ?? '')}
              multi={false}
              placeholder={usersQuery.isLoading ? 'Loading users...' : 'Select team lead...'}
            />
          </Field>
        </div>
      </Section>

      <Section
        icon={Users}
        title="Team members"
        desc="Add each person with role, joined date, responsibilities and permissions"
        action={
          <button
            type="button"
            onClick={() => {
              addTeamMember(pendingMember, pendingRole, pendingJoinedDate, pendingResponsibilities)
              setPendingMember('')
              setPendingRole('Developer')
              setPendingJoinedDate(formState.startDate)
              setPendingResponsibilities('')
            }}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        <div className={`${chipCard} mb-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-4`}>
          <Field label="User">
            <ComboSelect
              value={pendingMember ? [pendingMember] : []}
              options={(internalUserOptions.length ? internalUserOptions : allOwners).filter((m) => !formState.team.some((t) => t.name === m))}
              onChange={(v) => setPendingMember(v[0] ?? '')}
              onCreateOption={(v) => setExtraOwners((prev) => prev.includes(v) ? prev : [...prev, v])}
              multi={false}
              placeholder={usersQuery.isLoading ? 'Loading users...' : 'Select or type a name...'}
            />
          </Field>
          <Field label="Role">
            <ComboSelect
              value={[pendingRole]}
              options={[...memberRoles]}
              onChange={(v) => setPendingRole((v[0] ?? 'Developer') as MemberRole)}
              multi={false}
              placeholder="Select role…"
            />
          </Field>
          <Field label="Project joined date">
            <input type="date" className={inputCls} value={pendingJoinedDate} onChange={(e) => setPendingJoinedDate(e.target.value)} />
          </Field>
          <div className="md:col-span-2 2xl:col-span-1">
            <Field label="Responsibilities">
              <input className={inputCls} value={pendingResponsibilities} onChange={(e) => setPendingResponsibilities(e.target.value)} placeholder="e.g. APIs, reviews, QA" />
            </Field>
          </div>
        </div>

        {formState.team.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No team members yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.team.map((member) => (
              <div key={member.name} className={chipCard}>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{member.name}</p>
                      <p className="text-[10.5px] text-slate-400">{member.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.name)}
                    className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <Field label="Role">
                    <ComboSelect
                      value={[member.role]}
                      options={[...memberRoles]}
                      onChange={(v) => updateTeamMember(member.name, 'role', v[0] ?? member.role)}
                      multi={false}
                      placeholder="Select role…"
                    />
                  </Field>
                  <Field label="Joined date">
                    <input
                      type="date"
                      className={inputCls}
                      value={member.joinedDate || formState.startDate}
                      onChange={(e) => updateTeamMember(member.name, 'joinedDate', e.target.value)}
                    />
                  </Field>
                  <Field label="Responsibilities">
                    <input
                      className={inputCls}
                      value={member.responsibilities || ''}
                      onChange={(e) => updateTeamMember(member.name, 'responsibilities', e.target.value)}
                      placeholder="Responsibilities"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allRolePermissions.map(({ key, label }) => {
                    const has = member.permissions.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(member.name, key)}
                        className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium leading-none transition-colors ${has ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                      >
                        {has && <Check className="mr-0.5 inline h-2.5 w-2.5" />}{label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-5">
      <Section icon={Code2} title="Technology stack" desc="What this project is built with">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Frontend">
            <ComboSelect value={formState.techStack.frontend} options={techFrontend} onChange={(v) => onChange('techStack', { ...formState.techStack, frontend: v })} multi placeholder="Select frontend…" />
          </Field>
          <Field label="Backend">
            <ComboSelect value={formState.techStack.backend} options={techBackend} onChange={(v) => onChange('techStack', { ...formState.techStack, backend: v })} multi placeholder="Select backend…" />
          </Field>
          <Field label="Database">
            <ComboSelect value={formState.techStack.database} options={techDatabase} onChange={(v) => onChange('techStack', { ...formState.techStack, database: v })} multi placeholder="Select database…" />
          </Field>
          <Field label="Infrastructure & DevOps">
            <ComboSelect value={formState.techStack.other} options={techOther} onChange={(v) => onChange('techStack', { ...formState.techStack, other: v })} multi placeholder="Select infra…" />
          </Field>
        </div>
      </Section>

      <Section icon={GitBranch} title="Repository & environments">
        <div className="space-y-4">
          <Field label="Git repository URL">
            <input className={inputCls} value={formState.repository.gitUrl} onChange={(e) => onChange('repository', { ...formState.repository, gitUrl: e.target.value })} placeholder="https://github.com/org/repo" />
          </Field>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="Branch strategy">
              <select className={selectCls} value={formState.repository.branchStrategy} onChange={(e) => onChange('repository', { ...formState.repository, branchStrategy: e.target.value })}>
                <option value="">— Select —</option>
                {branchStrategies.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Dev URL">
              <input className={inputCls} value={formState.repository.devUrl} onChange={(e) => onChange('repository', { ...formState.repository, devUrl: e.target.value })} placeholder="https://dev.example.com" />
            </Field>
            <Field label="QA / testing URL">
              <input className={inputCls} value={formState.repository.testingUrl} onChange={(e) => onChange('repository', { ...formState.repository, testingUrl: e.target.value })} placeholder="https://qa.example.com" />
            </Field>
            <Field label="Production URL">
              <input className={inputCls} value={formState.repository.productionUrl} onChange={(e) => onChange('repository', { ...formState.repository, productionUrl: e.target.value })} placeholder="https://app.example.com" />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-5">
      <Section
        icon={Layers}
        title="Project phases"
        desc="Break the project into stages with owners and timelines"
        action={<button type="button" onClick={addModule} className={ghostBtn}>+ Add phase</button>}
      >
        {formState.modules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Layers className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No phases added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.modules.map((mod) => (
              <div key={mod.id} className={chipCard}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Phase name</label>
                    <input className={inputCls} value={mod.name} onChange={(e) => updateModule(mod.id, 'name', e.target.value)} placeholder="e.g. Discovery, Build, UAT" />
                  </div>
                  <div>
                    <label className={labelCls}>Owner</label>
                    <ComboSelect
                      value={mod.owner ? [mod.owner] : []}
                      options={internalUserOptions}
                      onChange={(v) => updateModule(mod.id, 'owner', v[0] ?? '')}
                      multi={false}
                      placeholder={usersQuery.isLoading ? 'Loading users...' : 'Select owner...'}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Timeline start date</label>
                    <input type="date" className={inputCls} value={mod.startDate} onChange={(e) => updateModule(mod.id, 'startDate', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Timeline end date</label>
                    <input type="date" className={inputCls} value={mod.endDate} onChange={(e) => updateModule(mod.id, 'endDate', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => removeModule(mod.id)} className="mt-3 flex items-center gap-1 text-[11.5px] text-rose-400 transition-colors hover:text-rose-600">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Zap}
        title="Sprint configuration"
        action={<button type="button" onClick={addSprint} className={ghostBtn}>+ Add sprint</button>}
      >
        {formState.sprints.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Zap className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No sprints configured.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.sprints.map((spr, i) => (
              <div key={spr.id} className={chipCard}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-slate-500">Sprint {i + 1}</p>
                  <button type="button" onClick={() => removeSprint(spr.id)} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Duration</label>
                    <select className={selectCls} value={spr.duration} onChange={(e) => updateSprint(spr.id, 'duration', e.target.value)}>
                      {sprintDurations.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Sprint goal</label>
                    <input className={inputCls} value={spr.goal} onChange={(e) => updateSprint(spr.id, 'goal', e.target.value)} placeholder="Goal for this sprint…" />
                  </div>
                  <div>
                    <label className={labelCls}>Start</label>
                    <input type="date" className={inputCls} value={spr.startDate} onChange={(e) => updateSprint(spr.id, 'startDate', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>End</label>
                    <input type="date" className={inputCls} value={spr.endDate} onChange={(e) => updateSprint(spr.id, 'endDate', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )

  const renderStep7 = () => (
    <div className="space-y-5">
      <Section icon={DollarSign} title="Budget">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
          <Field label="Estimated ($)">
            <input type="number" min={0} className={inputCls} value={formState.budget || ''} onChange={(e) => onChange('budget', Number(e.target.value))} placeholder="0" />
          </Field>
          <Field label="Dev cost ($)">
            <input type="number" min={0} className={inputCls} value={formState.developmentCost || ''} onChange={(e) => onChange('developmentCost', Number(e.target.value))} placeholder="0" />
          </Field>
          <Field label="Resource cost ($)">
            <input type="number" min={0} className={inputCls} value={formState.resourceCost || ''} onChange={(e) => onChange('resourceCost', Number(e.target.value))} placeholder="0" />
          </Field>
        </div>
        {formState.budget > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/60 px-4 py-2.5 text-[13px]">
            <span className="text-slate-400">Remaining</span>
            <span className="font-semibold text-slate-800">${Math.max(0, formState.budget - formState.developmentCost - formState.resourceCost).toLocaleString()}</span>
          </div>
        )}
      </Section>

      <Section icon={FileText} title="Documents & files">
        <div className="space-y-2.5">
          <label className="flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-slate-300 hover:bg-slate-100/60">
            <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => importDoc(e.target.files?.[0])} />
            <UploadCloud className="h-4.5 w-4.5 text-slate-400" />
            <p className="text-[12px] text-slate-400">BRD / SRS / Requirement document</p>
          </label>

          {formState.requirementDocument && (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-150 bg-slate-50/60 px-3 py-2.5">
              <FileText className="h-4 w-4 flex-shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-slate-800">{formState.requirementDocument.name}</p>
                <p className="text-[10.5px] text-slate-400">{formState.requirementDocument.size}</p>
              </div>
              <button type="button" onClick={() => onChange('requirementDocument', null)} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-2.5 text-[12px] text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600">
            <input type="file" className="sr-only" onChange={(e) => addAttachment(e.target.files?.[0])} />
            <Plus className="h-3.5 w-3.5" /> Add file (wireframes, contracts, API docs…)
          </label>

          {(formState.attachments ?? []).map((att) => (
            <div key={att.id} className="flex items-center gap-2 rounded-lg border border-slate-150 bg-slate-50/60 px-3 py-2 text-[12px]">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span className="flex-1 truncate text-slate-700">{att.name}</span>
              <span className="text-slate-400">{att.size}</span>
              <button type="button" onClick={() => onChange('attachments', (formState.attachments ?? []).filter((a) => a.id !== att.id))} className="rounded-md p-0.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={MessageSquare} title="Communication">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Slack channel">
            <input className={inputCls} value={formState.communication.slackChannel} onChange={(e) => onChange('communication', { ...formState.communication, slackChannel: e.target.value })} placeholder="#project-channel" />
          </Field>
          <Field label="Teams channel">
            <input className={inputCls} value={formState.communication.teamsChannel} onChange={(e) => onChange('communication', { ...formState.communication, teamsChannel: e.target.value })} placeholder="Team channel name" />
          </Field>
          <Field label="Meeting link">
            <input className={inputCls} value={formState.communication.meetingLink} onChange={(e) => onChange('communication', { ...formState.communication, meetingLink: e.target.value })} placeholder="https://meet.google.com/…" />
          </Field>
          <Field label="Reporting frequency">
            <select className={selectCls} value={formState.communication.reportingFrequency} onChange={(e) => onChange('communication', { ...formState.communication, reportingFrequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' })}>
              {['Daily', 'Weekly', 'Monthly'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section icon={FileText} title="Internal notes">
        <textarea
          rows={2}
          className={`${inputCls} resize-none`}
          value={formState.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Assumptions, handoff details, internal comments…"
        />
      </Section>
    </div>
  )

  const renderStep8 = () => (
    <div className="space-y-5">
      <Section
        icon={Shield}
        title="Risk management"
        action={<button type="button" onClick={addRisk} className={ghostBtn}>+ Add risk</button>}
      >
        {formState.risks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Shield className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No risks identified.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.risks.map((risk) => (
              <div key={risk.id} className={chipCard}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Risk name</label>
                    <input className={inputCls} value={risk.name} onChange={(e) => updateRisk(risk.id, 'name', e.target.value)} placeholder="e.g. Integration delay" />
                  </div>
                  <div>
                    <label className={labelCls}>Level</label>
                    <select className={selectCls} value={risk.level} onChange={(e) => updateRisk(risk.id, 'level', e.target.value)}>
                      {['Low', 'Medium', 'High', 'Critical'].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Impact</label>
                    <input className={inputCls} value={risk.impact} onChange={(e) => updateRisk(risk.id, 'impact', e.target.value)} placeholder="What gets affected?" />
                  </div>
                  <div>
                    <label className={labelCls}>Mitigation</label>
                    <input className={inputCls} value={risk.solution} onChange={(e) => updateRisk(risk.id, 'solution', e.target.value)} placeholder="Strategy to mitigate…" />
                  </div>
                </div>
                <button type="button" onClick={() => removeRisk(risk.id)} className="mt-3 flex items-center gap-1 text-[11.5px] text-rose-400 transition-colors hover:text-rose-600">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Lock} title="Approval settings">
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-150 bg-white p-3.5 transition-colors hover:bg-slate-50/60">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-slate-900" checked={formState.approvalRequired} onChange={(e) => onChange('approvalRequired', e.target.checked)} />
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Require creation approval</p>
              <p className="mt-0.5 text-[12px] text-slate-400">Flow: Created by → Project manager → Department head → Active.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-150 bg-white p-3.5 transition-colors hover:bg-slate-50/60">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-slate-900" checked={formState.closureApprovalRequired} onChange={(e) => onChange('closureApprovalRequired', e.target.checked)} />
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Require closure approval</p>
              <p className="mt-0.5 text-[12px] text-slate-400">An authorized reviewer must approve before the project is marked complete.</p>
            </div>
          </label>
        </div>
      </Section>

      <Section icon={CheckCircle} title="Summary" desc="Quick check before you save">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Project',   formState.name || '—'],
            ['Type',      (formState.projectTypes ?? [formState.projectType]).join(', ') || '—'],
            ['Priority',  formState.priority],
            ['Timeline',  `${formState.startDate} → ${formState.endDate}`],
            ['Manager',   formState.manager || '—'],
            ['Team',      `${formState.team.length} members`],
            ['Budget',    formState.budget ? `$${formState.budget.toLocaleString()}` : '—'],
            ['Risks',     `${formState.risks.length} identified`],
          ].map(([label, val]) => (
            <div key={label} className="rounded-lg border border-slate-150 bg-slate-50/60 p-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{val}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )

  const stepRenderers = [
    renderStep1, renderStep2, renderStep3, renderStep4,
    renderStep5, renderStep6, renderStep7, renderStep8,
  ]
  const currentStepMeta = STEPS[step - 1]

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full bg-white">
      {/* Left rail — Notion-style page outline, click only navigates to a completed step */}
      <div className="hidden w-52 flex-shrink-0 flex-col border-r border-slate-100 bg-[#fbfbfa] px-3 py-4 sm:flex">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          {isEdit ? 'Edit project' : 'New project'}
        </p>
        <nav className="space-y-0.5">
          {STEPS.map((s) => {
            const Icon   = s.icon
            const done   = s.id < step
            const active = s.id === step
            const clickable = done || active
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => clickable && setStep(s.id)}
                className={[
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                  active ? 'bg-slate-200/70 text-slate-900' : done ? 'text-slate-500 hover:bg-slate-100' : 'cursor-default text-slate-300',
                ].join(' ')}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-slate-700' : 'text-slate-300'}`} />
                )}
                <span className={`truncate text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}>{s.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto px-2 pt-4 text-[11px] text-slate-300">
          Step {step} of {STEPS.length}
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile step indicator */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-[11px] text-slate-400 sm:hidden">
          <span>Step {step} of {STEPS.length}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-slate-700">{currentStepMeta.label}</span>
        </div>

        {/* Step body — generous page-like padding, single scroll column */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
            <p className="mb-4 text-[12px] font-medium text-slate-400">{currentStepMeta.hint}</p>
            {stepRenderers[step - 1]()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-3.5 sm:px-10">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
            className="rounded-md px-3 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-2.5">
            {step === STEPS.length ? (
              <>
                {!isEdit && (
                  <button
                    type="button"
                    disabled={isInvalid || isSaving}
                    onClick={() => onSave({ approvalRequired: true, approvalStatus: 'Pending', status: 'Approval Pending' })}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Send for approval
                  </button>
                )}
                <button
                  type="button"
                  disabled={isInvalid || isSaving}
                  onClick={() => onSave()}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isEdit ? 'Save changes' : 'Create project'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

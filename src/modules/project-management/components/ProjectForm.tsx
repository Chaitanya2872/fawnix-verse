import { useState } from 'react'
import { isAfter, parseISO } from 'date-fns'
import {
  Briefcase, Calendar, Check, CheckCircle, ChevronLeft, ChevronRight,
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

/* ── Steps ──────────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Basics',   icon: Briefcase  },
  { id: 2, label: 'Client',   icon: Globe      },
  { id: 3, label: 'Timeline', icon: Zap        },
  { id: 4, label: 'Team',     icon: Users      },
  { id: 5, label: 'Tech',     icon: Code2      },
  { id: 6, label: 'Sprints',  icon: Layers     },
  { id: 7, label: 'Budget',   icon: DollarSign },
  { id: 8, label: 'Review',   icon: Shield     },
]

/* ── Shared style tokens — identical to task-management ─────────────────── */
const labelCls  = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
const inputCls  = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
const selectCls = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none cursor-pointer transition hover:border-slate-300'

/* ── Field wrapper — mirrors task-management Field component ─────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </div>
  )
}

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
  const [step, setStep]     = useState(1)
  const hasDateError        = isAfter(parseISO(formState.startDate), parseISO(formState.endDate))
  const isInvalid           = !formState.name.trim() || hasDateError

  /* Session-local option lists */
  const [extraTypes,      setExtraTypes]      = useState<string[]>([])
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [extraTags,       setExtraTags]       = useState<string[]>([])
  const allTypes      = [...projectTypes, ...extraTypes]
  const allCategories = [...projectCategories, ...extraCategories]

  /* Step-4 add-member state — hoisted to avoid hooks-in-render */
  const [pendingMember, setPendingMember] = useState('')
  const [pendingRole,   setPendingRole]   = useState<MemberRole>('Developer')

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
  const addTeamMember = (name: string, role: MemberRole) => {
    if (!name || formState.team.some((m) => m.name === name)) return
    const member: TeamMember = { name, role, permissions: [...defaultPermissionsForRole[role]] }
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
    <div className="space-y-4 p-4">
      <Field label="Project Name" required>
        <input
          className={inputCls}
          value={formState.name}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="e.g. ERP Implementation Rollout"
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
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

        <Field label="Project Code">
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

      <Field label="Description">
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          value={formState.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Project goals, scope, and expected outcomes…"
        />
      </Field>

      <Field label="Tags">
        <ComboSelect
          value={formState.tags}
          options={extraTags}
          onChange={setTags}
          onCreateOption={(v) => { setExtraTags((p) => [...p, v]); setTags([...formState.tags, v]) }}
          multi
          placeholder="Add tags…"
        />
      </Field>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Client Name">
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

      <Field label="Project Owner">
        <select className={selectCls} value={formState.projectOwner} onChange={(e) => onChange('projectOwner', e.target.value)}>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>

      <Field label="Stakeholders">
        <ComboSelect
          value={formState.stakeholders}
          options={owners}
          onChange={(v) => onChange('stakeholders', v)}
          multi
          placeholder="Add stakeholders…"
        />
      </Field>
    </div>
  )

  const renderStep3 = () => {
    const duration =
      formState.startDate && formState.endDate && !hasDateError
        ? Math.ceil((new Date(formState.endDate).getTime() - new Date(formState.startDate).getTime()) / 86_400_000)
        : null
    return (
      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Start Date" required>
            <input type="date" className={inputCls} value={formState.startDate} onChange={(e) => onChange('startDate', e.target.value)} />
          </Field>
          <Field label="Expected End Date" required>
            <div>
              <input type="date" className={inputCls} value={formState.endDate} onChange={(e) => onChange('endDate', e.target.value)} />
              {hasDateError && <p className="mt-1.5 text-[11px] text-rose-500">End date must be after start date.</p>}
            </div>
          </Field>
          <Field label="Actual End Date">
            <input type="date" className={inputCls} value={formState.actualEndDate} onChange={(e) => onChange('actualEndDate', e.target.value)} />
          </Field>
          <Field label="Deadline Type">
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
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Duration:</span>
            <span className="text-sm font-semibold text-slate-900">{duration} days</span>
          </div>
        )}
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Project Manager">
          <select className={selectCls} value={formState.manager} onChange={(e) => onChange('manager', e.target.value)}>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Team Lead">
          <select className={selectCls} value={formState.teamLead} onChange={(e) => onChange('teamLead', e.target.value)}>
            <option value="">— None —</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      {/* Team members section — mirrors task-management section card */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Team Members</p>
            <p className="mt-0.5 text-xs text-slate-500">Add members and configure their permissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300"
              value={pendingMember} onChange={(e) => setPendingMember(e.target.value)}
            >
              <option value="">Select member…</option>
              {owners.filter((m) => !formState.team.some((t) => t.name === m)).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none hover:border-slate-300"
              value={pendingRole} onChange={(e) => setPendingRole(e.target.value as MemberRole)}
            >
              {memberRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              type="button"
              onClick={() => { addTeamMember(pendingMember, pendingRole); setPendingMember('') }}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {formState.team.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-xs text-slate-400">No team members yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.team.map((member) => (
              /* Member card — mirrors task-management member item */
              <div key={member.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700">
                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                      <p className="text-[10px] text-slate-400">{member.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.name)}
                    className="text-slate-300 transition-colors hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allRolePermissions.map(({ key, label }) => {
                    const has = member.permissions.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(member.name, key)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${has ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
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
      </section>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
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

      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Repository & Environments</p>
        </div>
        <Field label="Git Repository URL">
          <input className={inputCls} value={formState.repository.gitUrl} onChange={(e) => onChange('repository', { ...formState.repository, gitUrl: e.target.value })} placeholder="https://github.com/org/repo" />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Branch Strategy">
            <select className={selectCls} value={formState.repository.branchStrategy} onChange={(e) => onChange('repository', { ...formState.repository, branchStrategy: e.target.value })}>
              <option value="">— Select —</option>
              {branchStrategies.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Dev URL">
            <input className={inputCls} value={formState.repository.devUrl} onChange={(e) => onChange('repository', { ...formState.repository, devUrl: e.target.value })} placeholder="https://dev.example.com" />
          </Field>
          <Field label="QA / Testing URL">
            <input className={inputCls} value={formState.repository.testingUrl} onChange={(e) => onChange('repository', { ...formState.repository, testingUrl: e.target.value })} placeholder="https://qa.example.com" />
          </Field>
          <Field label="Production URL">
            <input className={inputCls} value={formState.repository.productionUrl} onChange={(e) => onChange('repository', { ...formState.repository, productionUrl: e.target.value })} placeholder="https://app.example.com" />
          </Field>
        </div>
      </section>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-4 p-4">
      {/* Modules */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Project Modules</p>
          <button type="button" onClick={addModule} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            + Add module
          </button>
        </div>

        {formState.modules.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
            <Layers className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-xs text-slate-400">No modules added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formState.modules.map((mod) => (
              <div key={mod.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Module Name</label>
                    <input className={inputCls} value={mod.name} onChange={(e) => updateModule(mod.id, 'name', e.target.value)} placeholder="e.g. Authentication Module" />
                  </div>
                  <div>
                    <label className={labelCls}>Owner</label>
                    <select className={selectCls} value={mod.owner} onChange={(e) => updateModule(mod.id, 'owner', e.target.value)}>
                      {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="date" className={inputCls} value={mod.endDate} onChange={(e) => updateModule(mod.id, 'endDate', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => removeModule(mod.id)} className="mt-3 flex items-center gap-1 text-xs text-rose-400 transition-colors hover:text-rose-600">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sprints */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Sprint Configuration</p>
          <button type="button" onClick={addSprint} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            + Add sprint
          </button>
        </div>

        {formState.sprints.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
            <Zap className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-xs text-slate-400">No sprints configured.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formState.sprints.map((spr, i) => (
              <div key={spr.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Sprint {i + 1}</p>
                  <button type="button" onClick={() => removeSprint(spr.id)} className="text-slate-300 transition-colors hover:text-rose-500">
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
                    <label className={labelCls}>Sprint Goal</label>
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
      </section>
    </div>
  )

  const renderStep7 = () => (
    <div className="space-y-4 p-4">
      {/* Budget */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Budget Details</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Estimated ($)">
            <input type="number" min={0} className={inputCls} value={formState.budget || ''} onChange={(e) => onChange('budget', Number(e.target.value))} placeholder="0" />
          </Field>
          <Field label="Dev Cost ($)">
            <input type="number" min={0} className={inputCls} value={formState.developmentCost || ''} onChange={(e) => onChange('developmentCost', Number(e.target.value))} placeholder="0" />
          </Field>
          <Field label="Resource Cost ($)">
            <input type="number" min={0} className={inputCls} value={formState.resourceCost || ''} onChange={(e) => onChange('resourceCost', Number(e.target.value))} placeholder="0" />
          </Field>
        </div>
        {formState.budget > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Remaining</span>
            <span className="font-semibold text-slate-900">${Math.max(0, formState.budget - formState.developmentCost - formState.resourceCost).toLocaleString()}</span>
          </div>
        )}
      </section>

      {/* Files */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Documents & Files</p>

        <label className="flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-sky-400 hover:bg-sky-50/50">
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => importDoc(e.target.files?.[0])} />
          <UploadCloud className="h-5 w-5 text-slate-400" />
          <p className="text-xs text-slate-400">BRD / SRS / Requirement Document</p>
        </label>

        {formState.requirementDocument && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <FileText className="h-4 w-4 flex-shrink-0 text-sky-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{formState.requirementDocument.name}</p>
              <p className="text-[10px] text-slate-400">{formState.requirementDocument.size}</p>
            </div>
            <button type="button" onClick={() => onChange('requirementDocument', null)} className="text-slate-300 transition-colors hover:text-rose-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 transition-colors hover:border-sky-400 hover:text-sky-600">
          <input type="file" className="sr-only" onChange={(e) => addAttachment(e.target.files?.[0])} />
          <Plus className="h-3.5 w-3.5" /> Add file (Wireframes, Contracts, API Docs…)
        </label>

        {(formState.attachments ?? []).map((att) => (
          <div key={att.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-slate-700">{att.name}</span>
            <span className="text-slate-400">{att.size}</span>
            <button type="button" onClick={() => onChange('attachments', (formState.attachments ?? []).filter((a) => a.id !== att.id))} className="text-slate-300 transition-colors hover:text-rose-500">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </section>

      {/* Communication */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Communication</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Slack Channel">
            <input className={inputCls} value={formState.communication.slackChannel} onChange={(e) => onChange('communication', { ...formState.communication, slackChannel: e.target.value })} placeholder="#project-channel" />
          </Field>
          <Field label="Teams Channel">
            <input className={inputCls} value={formState.communication.teamsChannel} onChange={(e) => onChange('communication', { ...formState.communication, teamsChannel: e.target.value })} placeholder="Team channel name" />
          </Field>
          <Field label="Meeting Link">
            <input className={inputCls} value={formState.communication.meetingLink} onChange={(e) => onChange('communication', { ...formState.communication, meetingLink: e.target.value })} placeholder="https://meet.google.com/…" />
          </Field>
          <Field label="Reporting Frequency">
            <select className={selectCls} value={formState.communication.reportingFrequency} onChange={(e) => onChange('communication', { ...formState.communication, reportingFrequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' })}>
              {['Daily', 'Weekly', 'Monthly'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <Field label="Internal Notes">
        <textarea
          rows={2}
          className={`${inputCls} resize-none`}
          value={formState.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Assumptions, handoff details, internal comments…"
        />
      </Field>
    </div>
  )

  const renderStep8 = () => (
    <div className="space-y-4 p-4">
      {/* Risks */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Risk Management</p>
          <button type="button" onClick={addRisk} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            + Add risk
          </button>
        </div>

        {formState.risks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
            <Shield className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-xs text-slate-400">No risks identified.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formState.risks.map((risk) => (
              <div key={risk.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Risk Name</label>
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
                <button type="button" onClick={() => removeRisk(risk.id)} className="mt-3 flex items-center gap-1 text-xs text-rose-400 transition-colors hover:text-rose-600">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approval */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Approval Settings</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-sky-600" checked={formState.approvalRequired} onChange={(e) => onChange('approvalRequired', e.target.checked)} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Require creation approval</p>
            <p className="mt-0.5 text-xs text-slate-500">Flow: Created By → Project Manager → Department Head → Active.</p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-sky-600" checked={formState.closureApprovalRequired} onChange={(e) => onChange('closureApprovalRequired', e.target.checked)} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Require closure approval</p>
            <p className="mt-0.5 text-xs text-slate-500">An authorized reviewer must approve before the project is marked complete.</p>
          </div>
        </label>
      </section>

      {/* Review summary */}
      <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Review Summary</p>
        <div className="grid grid-cols-2 gap-2">
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
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className={labelCls}>{label}</p>
              <p className="truncate text-sm font-semibold text-slate-900">{val}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const stepRenderers = [
    renderStep1, renderStep2, renderStep3, renderStep4,
    renderStep5, renderStep6, renderStep7, renderStep8,
  ]

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full flex-col">
      {/* Step tabs */}
      <div className="flex flex-shrink-0 items-center overflow-x-auto border-b border-slate-200 bg-white">
        {STEPS.map((s) => {
          const Icon   = s.icon
          const done   = s.id < step
          const active = s.id === step
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => (done || active) && setStep(s.id)}
              className={[
                'flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 transition-colors',
                'text-[11px] font-semibold uppercase tracking-[0.12em]',
                active ? 'border-sky-500 text-sky-600' : done ? 'border-transparent text-slate-400 hover:text-slate-700 cursor-pointer' : 'border-transparent text-slate-300 cursor-default',
              ].join(' ')}
            >
              {done ? <Check className="h-3 w-3 text-emerald-500" /> : <Icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {stepRenderers[step - 1]()}
      </div>

      {/* Footer — mirrors task-management form footer */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Send for Approval
                </button>
              )}
              <button
                type="button"
                disabled={isInvalid || isSaving}
                onClick={() => onSave()}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isEdit ? 'Save Changes' : 'Create Project'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

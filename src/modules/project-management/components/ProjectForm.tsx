import { useMemo, useState } from 'react'
import { isAfter, parseISO } from 'date-fns'
import {
  Briefcase,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Code2,
  DollarSign,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Save,
  Shield,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  X,
  Zap,
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

/* ── Shared styles ────────────────────────────────────────────────── */
const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors'
const labelCls = 'mb-1.5 block text-xs font-medium text-foreground'

/* ── Step definitions ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Basic Details',     icon: Briefcase  },
  { id: 2, label: 'Client Details',    icon: Globe      },
  { id: 3, label: 'Timeline',          icon: Zap        },
  { id: 4, label: 'Team',              icon: Users      },
  { id: 5, label: 'Technology',        icon: Code2      },
  { id: 6, label: 'Modules & Sprints', icon: Layers     },
  { id: 7, label: 'Budget & Files',    icon: DollarSign },
  { id: 8, label: 'Risk & Approval',   icon: Shield     },
]

/* ── Sub-components ───────────────────────────────────────────────── */
function TechChips({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button key={opt} type="button" onClick={() => onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${active ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-border bg-background text-muted-foreground hover:border-sky-300 hover:text-sky-600'}`}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/20 p-2 min-h-[42px]">
        {selected.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            {s}
            <button type="button" onClick={() => onChange(selected.filter((x) => x !== s))}><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        <select className="flex-1 min-w-[100px] bg-transparent text-xs text-muted-foreground outline-none" value=""
          onChange={(e) => { if (e.target.value && !selected.includes(e.target.value)) onChange([...selected, e.target.value]) }}>
          <option value="">+ Add…</option>
          {options.filter((o) => !selected.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* ── Props ────────────────────────────────────────────────────────── */
interface Props {
  formState: ProjectFormState
  onChange: (field: keyof ProjectFormState, value: ProjectFormState[keyof ProjectFormState]) => void
  onCancel: () => void
  onSave: (overrides?: Partial<ProjectFormState>) => void
  isSaving?: boolean
  isEdit?: boolean
}

/* ── Main component ───────────────────────────────────────────────── */
export function ProjectForm({ formState, onChange, onCancel, onSave, isSaving = false, isEdit = false }: Props) {
  const [step, setStep] = useState(1)
  const hasDateError = isAfter(parseISO(formState.startDate), parseISO(formState.endDate))
  const isInvalid = !formState.name.trim() || hasDateError

  const tags = useMemo(() => formState.tagsText.split(',').map((t) => t.trim()).filter(Boolean), [formState.tagsText])

  const updateTitle = (value: string) => {
    onChange('name', value)
    if (!formState.projectCode.trim()) {
      const code = value.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase()
      onChange('projectCode', `${code || 'PROJ'}-${new Date().getFullYear()}`)
    }
  }

  const updateTags = (value: string) => {
    onChange('tagsText', value)
    onChange('tags', value.split(',').map((t) => t.trim()).filter(Boolean))
  }

  const importDoc = (file: File | undefined) => {
    if (!file) return
    onChange('requirementDocument', { id: newId('req'), name: file.name, type: file.type || 'Document', size: formatFileSize(file.size), uploadedBy: formState.projectOwner, uploadedAt: new Date().toISOString().slice(0, 10) })
  }

  const addAttachment = (file: File | undefined) => {
    if (!file) return
    onChange('attachments', [...(formState.attachments ?? []), { id: newId('att'), name: file.name, type: file.type || 'File', size: formatFileSize(file.size), uploadedBy: formState.projectOwner, uploadedAt: new Date().toISOString().slice(0, 10) }])
  }

  /* Team */
  const addTeamMember = (name: string, role: MemberRole) => {
    if (!name || formState.team.some((m) => m.name === name)) return
    const member: TeamMember = { name, role, permissions: [...defaultPermissionsForRole[role]] }
    const updated = [...formState.team, member]
    onChange('team', updated)
    onChange('teamMembers', updated.map((m) => m.name))
  }
  const removeTeamMember = (name: string) => {
    const updated = formState.team.filter((m) => m.name !== name)
    onChange('team', updated)
    onChange('teamMembers', updated.map((m) => m.name))
  }
  const togglePermission = (memberName: string, perm: RolePermission) => {
    onChange('team', formState.team.map((m) => {
      if (m.name !== memberName) return m
      const has = m.permissions.includes(perm)
      return { ...m, permissions: has ? m.permissions.filter((p) => p !== perm) : [...m.permissions, perm] }
    }))
  }

  /* Modules */
  const addModule = () => onChange('modules', [...formState.modules, { id: newId('mod'), name: '', description: '', owner: formState.manager, priority: 'Medium' as Priority, startDate: formState.startDate, endDate: formState.endDate }])
  const updateModule = (id: string, field: keyof ProjectModule, value: string) => onChange('modules', formState.modules.map((m) => m.id === id ? { ...m, [field]: value } : m))
  const removeModule = (id: string) => onChange('modules', formState.modules.filter((m) => m.id !== id))

  /* Sprints */
  const addSprint = () => onChange('sprints', [...formState.sprints, { id: newId('spr'), duration: '2 Weeks' as Sprint['duration'], startDate: formState.startDate, endDate: formState.endDate, goal: '' }])
  const updateSprint = (id: string, field: keyof Sprint, value: string) => onChange('sprints', formState.sprints.map((s) => s.id === id ? { ...s, [field]: value } : s))
  const removeSprint = (id: string) => onChange('sprints', formState.sprints.filter((s) => s.id !== id))

  /* Risks */
  const addRisk = () => onChange('risks', [...formState.risks, { id: newId('risk'), name: '', level: 'Medium' as Risk['level'], impact: '', solution: '' }])
  const updateRisk = (id: string, field: keyof Risk, value: string) => onChange('risks', formState.risks.map((r) => r.id === id ? { ...r, [field]: value } : r))
  const removeRisk = (id: string) => onChange('risks', formState.risks.filter((r) => r.id !== id))

  /* ── Step renderers ───────────────────────────────────────────────── */
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Project Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={formState.name} onChange={(e) => updateTitle(e.target.value)} placeholder="e.g. ERP Implementation Rollout" />
        </div>
        <div>
          <label className={labelCls}>Project Code</label>
          <input className={inputCls} value={formState.projectCode} onChange={(e) => onChange('projectCode', e.target.value)} placeholder="Auto-generated" />
        </div>
        <div>
          <label className={labelCls}>Project Type</label>
          <select className={inputCls} value={formState.projectType} onChange={(e) => onChange('projectType', e.target.value as ProjectFormState['projectType'])}>
            {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={formState.projectCategory} onChange={(e) => onChange('projectCategory', e.target.value)}>
            {projectCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={formState.priority} onChange={(e) => onChange('priority', e.target.value as Priority)}>
            {['Low','Medium','High','Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Template</label>
          <select className={inputCls} value={formState.projectTemplate} onChange={(e) => onChange('projectTemplate', e.target.value)}>
            {projectTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Project Group</label>
          <select className={inputCls} value={formState.department} onChange={(e) => onChange('department', e.target.value)}>
            {['Sales','Operations','Finance','HR','IT','Support'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={formState.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Project goals, scope, and expected outcomes..." />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tags <span className="font-normal text-muted-foreground">(comma-separated)</span></label>
          <input className={inputCls} value={formState.tagsText} onChange={(e) => updateTags(e.target.value)} placeholder="e.g. crm, sales, q2" />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700"><Tag className="h-2.5 w-2.5" />{tag}</span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Client Name</label><input className={inputCls} value={formState.clientName} onChange={(e) => onChange('clientName', e.target.value)} placeholder="Contact name" /></div>
        <div><label className={labelCls}>Company Name</label><input className={inputCls} value={formState.clientCompany} onChange={(e) => onChange('clientCompany', e.target.value)} placeholder="Company" /></div>
        <div><label className={labelCls}>Client Email</label><input type="email" className={inputCls} value={formState.clientEmail} onChange={(e) => onChange('clientEmail', e.target.value)} placeholder="client@example.com" /></div>
        <div><label className={labelCls}>Contact Number</label><input className={inputCls} value={formState.clientPhone} onChange={(e) => onChange('clientPhone', e.target.value)} placeholder="+1 555 0100" /></div>
        <div><label className={labelCls}>Client Location</label><input className={inputCls} value={formState.clientLocation} onChange={(e) => onChange('clientLocation', e.target.value)} placeholder="City, Country" /></div>
        <div>
          <label className={labelCls}>Project Owner</label>
          <select className={inputCls} value={formState.projectOwner} onChange={(e) => onChange('projectOwner', e.target.value)}>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <MultiSelect label="Stakeholders" options={owners} selected={formState.stakeholders} onChange={(v) => onChange('stakeholders', v)} />
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Start Date <span className="text-rose-500">*</span></label>
          <input type="date" className={inputCls} value={formState.startDate} onChange={(e) => onChange('startDate', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Expected End Date <span className="text-rose-500">*</span></label>
          <input type="date" className={inputCls} value={formState.endDate} onChange={(e) => onChange('endDate', e.target.value)} />
          {hasDateError && <p className="mt-1 text-xs text-rose-500">End date must be after start date.</p>}
        </div>
        <div>
          <label className={labelCls}>Actual End Date</label>
          <input type="date" className={inputCls} value={formState.actualEndDate} onChange={(e) => onChange('actualEndDate', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Deadline Type</label>
          <select className={inputCls} value={formState.deadlineType} onChange={(e) => onChange('deadlineType', e.target.value as ProjectFormState['deadlineType'])}>
            {deadlineTypes.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {formState.startDate && formState.endDate && !hasDateError && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Duration: <span className="font-semibold text-foreground">
            {Math.ceil((new Date(formState.endDate).getTime() - new Date(formState.startDate).getTime()) / 86400000)} days
          </span>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => {
    const [pendingMember, setPendingMember] = useState('')
    const [pendingRole, setPendingRole] = useState<MemberRole>('Developer')
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Project Manager</label>
            <select className={inputCls} value={formState.manager} onChange={(e) => onChange('manager', e.target.value)}>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Team Lead</label>
            <select className={inputCls} value={formState.teamLead} onChange={(e) => onChange('teamLead', e.target.value)}>
              <option value="">— None —</option>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">Team Members & Permissions</p>
            <div className="flex items-center gap-2">
              <select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none" value={pendingMember} onChange={(e) => setPendingMember(e.target.value)}>
                <option value="">Select member…</option>
                {owners.filter((m) => !formState.team.some((t) => t.name === m)).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none" value={pendingRole} onChange={(e) => setPendingRole(e.target.value as MemberRole)}>
                {memberRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="button" onClick={() => { addTeamMember(pendingMember, pendingRole); setPendingMember('') }}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>
          {formState.team.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">No team members yet. Add members above.</div>
          ) : (
            <div className="space-y-3">
              {formState.team.map((member) => (
                <div key={member.name} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                        {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div><p className="text-xs font-semibold">{member.name}</p><p className="text-[10px] text-muted-foreground">{member.role}</p></div>
                    </div>
                    <button type="button" onClick={() => removeTeamMember(member.name)} className="text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allRolePermissions.map(({ key, label }) => {
                      const has = member.permissions.includes(key)
                      return (
                        <button key={key} type="button" onClick={() => togglePermission(member.name, key)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${has ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border text-muted-foreground hover:border-slate-300'}`}>
                          {has && <Check className="mr-0.5 inline h-2.5 w-2.5" />}{label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStep5 = () => (
    <div className="space-y-5">
      <div><p className="mb-2 text-xs font-semibold">Frontend</p><TechChips options={techFrontend} selected={formState.techStack.frontend} onChange={(v) => onChange('techStack', { ...formState.techStack, frontend: v })} /></div>
      <div><p className="mb-2 text-xs font-semibold">Backend</p><TechChips options={techBackend} selected={formState.techStack.backend} onChange={(v) => onChange('techStack', { ...formState.techStack, backend: v })} /></div>
      <div><p className="mb-2 text-xs font-semibold">Database</p><TechChips options={techDatabase} selected={formState.techStack.database} onChange={(v) => onChange('techStack', { ...formState.techStack, database: v })} /></div>
      <div><p className="mb-2 text-xs font-semibold">Infrastructure & DevOps</p><TechChips options={techOther} selected={formState.techStack.other} onChange={(v) => onChange('techStack', { ...formState.techStack, other: v })} /></div>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" /><p className="text-xs font-semibold">Repository & Environments</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={labelCls}>Git Repository URL</label><input className={inputCls} value={formState.repository.gitUrl} onChange={(e) => onChange('repository', { ...formState.repository, gitUrl: e.target.value })} placeholder="https://github.com/org/repo" /></div>
          <div>
            <label className={labelCls}>Branch Strategy</label>
            <select className={inputCls} value={formState.repository.branchStrategy} onChange={(e) => onChange('repository', { ...formState.repository, branchStrategy: e.target.value })}>
              <option value="">— Select —</option>
              {branchStrategies.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Development URL</label><input className={inputCls} value={formState.repository.devUrl} onChange={(e) => onChange('repository', { ...formState.repository, devUrl: e.target.value })} placeholder="https://dev.example.com" /></div>
          <div><label className={labelCls}>Testing URL</label><input className={inputCls} value={formState.repository.testingUrl} onChange={(e) => onChange('repository', { ...formState.repository, testingUrl: e.target.value })} placeholder="https://qa.example.com" /></div>
          <div><label className={labelCls}>Production URL</label><input className={inputCls} value={formState.repository.productionUrl} onChange={(e) => onChange('repository', { ...formState.repository, productionUrl: e.target.value })} placeholder="https://app.example.com" /></div>
        </div>
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold">Project Modules</p>
          <button type="button" onClick={addModule} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"><Plus className="h-3 w-3" /> Add Module</button>
        </div>
        {formState.modules.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">No modules added yet.</div>
        ) : (
          <div className="space-y-3">
            {formState.modules.map((mod) => (
              <div key={mod.id} className="rounded-xl border border-border bg-card p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>Module Name</label><input className={inputCls} value={mod.name} onChange={(e) => updateModule(mod.id, 'name', e.target.value)} placeholder="e.g. Authentication Module" /></div>
                  <div>
                    <label className={labelCls}>Owner</label>
                    <select className={inputCls} value={mod.owner} onChange={(e) => updateModule(mod.id, 'owner', e.target.value)}>
                      {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2"><label className={labelCls}>Description</label><input className={inputCls} value={mod.description} onChange={(e) => updateModule(mod.id, 'description', e.target.value)} placeholder="Module purpose..." /></div>
                  <div><label className={labelCls}>Start Date</label><input type="date" className={inputCls} value={mod.startDate} onChange={(e) => updateModule(mod.id, 'startDate', e.target.value)} /></div>
                  <div><label className={labelCls}>End Date</label><input type="date" className={inputCls} value={mod.endDate} onChange={(e) => updateModule(mod.id, 'endDate', e.target.value)} /></div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeModule(mod.id)} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"><Trash2 className="h-3 w-3" /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold">Sprint Configuration</p>
          <button type="button" onClick={addSprint} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"><Plus className="h-3 w-3" /> Add Sprint</button>
        </div>
        {formState.sprints.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">No sprints configured.</div>
        ) : (
          <div className="space-y-3">
            {formState.sprints.map((spr, i) => (
              <div key={spr.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Sprint {i + 1}</p>
                  <button type="button" onClick={() => removeSprint(spr.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3 w-3" /></button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Duration</label>
                    <select className={inputCls} value={spr.duration} onChange={(e) => updateSprint(spr.id, 'duration', e.target.value)}>
                      {sprintDurations.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Sprint Goal</label><input className={inputCls} value={spr.goal} onChange={(e) => updateSprint(spr.id, 'goal', e.target.value)} placeholder="Goal for this sprint..." /></div>
                  <div><label className={labelCls}>Start Date</label><input type="date" className={inputCls} value={spr.startDate} onChange={(e) => updateSprint(spr.id, 'startDate', e.target.value)} /></div>
                  <div><label className={labelCls}>End Date</label><input type="date" className={inputCls} value={spr.endDate} onChange={(e) => updateSprint(spr.id, 'endDate', e.target.value)} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderStep7 = () => (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-xs font-semibold">Budget Details</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className={labelCls}>Estimated Budget ($)</label><input type="number" min={0} className={inputCls} value={formState.budget || ''} onChange={(e) => onChange('budget', Number(e.target.value))} placeholder="0" /></div>
          <div><label className={labelCls}>Development Cost ($)</label><input type="number" min={0} className={inputCls} value={formState.developmentCost || ''} onChange={(e) => onChange('developmentCost', Number(e.target.value))} placeholder="0" /></div>
          <div><label className={labelCls}>Resource Cost ($)</label><input type="number" min={0} className={inputCls} value={formState.resourceCost || ''} onChange={(e) => onChange('resourceCost', Number(e.target.value))} placeholder="0" /></div>
        </div>
        {formState.budget > 0 && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            Remaining: <span className="font-semibold text-foreground">${Math.max(0, formState.budget - formState.developmentCost - formState.resourceCost).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold">Requirement Document</p>
        <label className="flex min-h-[70px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 hover:border-sky-400 hover:bg-sky-50/50 transition-colors">
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => importDoc(e.target.files?.[0])} />
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Upload BRD / SRS / Requirement Document</p>
        </label>
        {formState.requirementDocument && (
          <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-sky-600" />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{formState.requirementDocument.name}</p><p className="text-[10px] text-muted-foreground">{formState.requirementDocument.size}</p></div>
            <button type="button" onClick={() => onChange('requirementDocument', null)} className="text-muted-foreground hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold">Additional Files</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground hover:border-sky-400 hover:text-sky-600 transition-colors">
            <input type="file" className="sr-only" onChange={(e) => addAttachment(e.target.files?.[0])} />
            <Plus className="h-3.5 w-3.5" /> Add file (Wireframes, Contracts, API Docs…)
          </label>
          {(formState.attachments ?? []).map((att) => (
            <div key={att.id} className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate">{att.name}</span>
              <span className="text-muted-foreground">{att.size}</span>
              <button type="button" onClick={() => onChange('attachments', (formState.attachments ?? []).filter((a) => a.id !== att.id))} className="text-muted-foreground hover:text-rose-500"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /><p className="text-xs font-semibold">Communication Settings</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Slack Channel</label><input className={inputCls} value={formState.communication.slackChannel} onChange={(e) => onChange('communication', { ...formState.communication, slackChannel: e.target.value })} placeholder="#project-channel" /></div>
          <div><label className={labelCls}>Teams Channel</label><input className={inputCls} value={formState.communication.teamsChannel} onChange={(e) => onChange('communication', { ...formState.communication, teamsChannel: e.target.value })} placeholder="Team channel name" /></div>
          <div><label className={labelCls}>Meeting Link</label><input className={inputCls} value={formState.communication.meetingLink} onChange={(e) => onChange('communication', { ...formState.communication, meetingLink: e.target.value })} placeholder="https://meet.google.com/…" /></div>
          <div>
            <label className={labelCls}>Reporting Frequency</label>
            <select className={inputCls} value={formState.communication.reportingFrequency} onChange={(e) => onChange('communication', { ...formState.communication, reportingFrequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' })}>
              {['Daily','Weekly','Monthly'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <label className={labelCls}>Internal Notes</label>
        <textarea rows={2} className={`${inputCls} resize-none`} value={formState.notes} onChange={(e) => onChange('notes', e.target.value)} placeholder="Assumptions, handoff details, or internal comments..." />
      </div>
    </div>
  )

  const renderStep8 = () => (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold">Risk Management</p>
          <button type="button" onClick={addRisk} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"><Plus className="h-3 w-3" /> Add Risk</button>
        </div>
        {formState.risks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">No risks identified.</div>
        ) : (
          <div className="space-y-3">
            {formState.risks.map((risk) => (
              <div key={risk.id} className="rounded-xl border border-border bg-card p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>Risk Name</label><input className={inputCls} value={risk.name} onChange={(e) => updateRisk(risk.id, 'name', e.target.value)} placeholder="e.g. Integration delay" /></div>
                  <div>
                    <label className={labelCls}>Risk Level</label>
                    <select className={inputCls} value={risk.level} onChange={(e) => updateRisk(risk.id, 'level', e.target.value)}>
                      {['Low','Medium','High','Critical'].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Impact</label><input className={inputCls} value={risk.impact} onChange={(e) => updateRisk(risk.id, 'impact', e.target.value)} placeholder="What gets affected?" /></div>
                  <div><label className={labelCls}>Solution Plan</label><input className={inputCls} value={risk.solution} onChange={(e) => updateRisk(risk.id, 'solution', e.target.value)} placeholder="Mitigation strategy..." /></div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeRisk(risk.id)} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"><Trash2 className="h-3 w-3" /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /><p className="text-xs font-semibold">Approval Settings</p></div>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-sky-600" checked={formState.approvalRequired} onChange={(e) => onChange('approvalRequired', e.target.checked)} />
            <div><p className="text-sm font-medium">Require creation approval</p><p className="text-xs text-muted-foreground">Flow: Created By → Project Manager → Department Head → Project Active.</p></div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-sky-600" checked={formState.closureApprovalRequired} onChange={(e) => onChange('closureApprovalRequired', e.target.checked)} />
            <div><p className="text-sm font-medium">Require closure approval</p><p className="text-xs text-muted-foreground">An authorized reviewer must approve closure before the project is marked complete.</p></div>
          </label>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Review Summary</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['Project', formState.name || '—'],
            ['Type', formState.projectType],
            ['Priority', formState.priority],
            ['Timeline', `${formState.startDate} → ${formState.endDate}`],
            ['Manager', formState.manager || '—'],
            ['Team size', `${formState.team.length} members`],
            ['Budget', formState.budget ? `$${formState.budget.toLocaleString()}` : '—'],
            ['Risks', `${formState.risks.length} identified`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-muted/30 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-0.5 font-medium text-foreground truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7, renderStep8]

  return (
    <div className="flex w-full flex-col rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <p className="text-xs text-muted-foreground">{STEPS[step - 1].label} — Step {step} of {STEPS.length}</p>
        </div>
        <button type="button" onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step tabs */}
      <div className="flex items-center overflow-x-auto border-b border-border bg-muted/20">
        {STEPS.map((s) => {
          const Icon = s.icon
          const done = s.id < step
          const active = s.id === step
          return (
            <button key={s.id} type="button" onClick={() => done && setStep(s.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[11px] font-medium transition-colors ${active ? 'border-sky-600 text-sky-700' : done ? 'border-transparent text-muted-foreground hover:text-foreground cursor-pointer' : 'border-transparent text-muted-foreground/40 cursor-default'}`}>
              {done ? <Check className="h-3 w-3 text-emerald-500" /> : <Icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
        {stepRenderers[step - 1]()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <button type="button" onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />{step === 1 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex items-center gap-2.5">
          {step === STEPS.length ? (
            <>
              {!isEdit && (
                <button type="button" disabled={isInvalid || isSaving}
                  onClick={() => onSave({ approvalRequired: true, approvalStatus: 'Pending', status: 'Approval Pending' })}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50">
                  <CheckCircle className="h-3.5 w-3.5" /> Send for Approval
                </button>
              )}
              <button type="button" disabled={isInvalid || isSaving} onClick={() => onSave()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isEdit ? 'Save Changes' : 'Create Project'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

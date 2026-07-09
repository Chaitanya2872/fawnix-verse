import { useState, type ElementType, type ReactNode } from 'react'
import { isAfter, parseISO } from 'date-fns'
import {
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Code2,
  DollarSign,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import {
  allRolePermissions,
  deadlineTypes,
  defaultPermissionsForRole,
  departments,
  memberRoles,
  projectCategories,
  projectTemplates,
  sprintDurations,
} from '../data'
import {
  DEFAULT_PROJECT_TEMPLATE,
  getProjectTemplateConfig,
  resolveProjectTemplate,
  type TemplateBudgetStep,
  type TemplateFieldConfig,
  type TemplateFieldsStep,
  type TemplateIconKey,
  type TemplatePlanningStep,
  type TemplateTeamStep,
  type TemplateTimelineStep,
  type TemplateWizardStep,
} from '../template-config'
import type {
  MemberRole,
  Priority,
  ProjectFormState,
  ProjectModule,
  RolePermission,
  Sprint,
  TeamMember,
} from '../types'
import { DatePicker } from '@/components/ui/DatePicker'
import { useUserDirectory } from '@/modules/users/hooks'
import { newId } from '../utils'
import { ComboSelect } from './ComboSelect'

const CATEGORY_COLORS: Record<string, string> = {
  'Client Delivery': 'sky',
  Internal: 'slate',
  Product: 'violet',
  Operations: 'emerald',
  Compliance: 'amber',
  Marketing: 'cyan',
  Recruitment: 'rose',
  Finance: 'indigo',
  'Sales Enablement': 'orange',
  Design: 'purple',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'slate',
  Medium: 'sky',
  High: 'orange',
  Critical: 'rose',
}

const DEADLINE_COLORS: Record<string, string> = {
  Flexible: 'emerald',
  'Fixed Deadline': 'orange',
  'Urgent Delivery': 'rose',
}

const ICON_MAP: Record<TemplateIconKey | 'basics', ElementType> = {
  basics: Briefcase,
  briefcase: Briefcase,
  calendar: Calendar,
  code: Code2,
  dollar: DollarSign,
  file: FileText,
  git: GitBranch,
  layers: Layers,
  shield: Shield,
  users: Users,
  zap: Zap,
}

const labelCls = 'mb-1 block text-[12px] font-medium text-slate-500'
const inputCls = '-mx-2 w-[calc(100%+16px)] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] text-slate-800 placeholder:text-slate-350 outline-none transition-colors hover:bg-slate-100/70 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900/5'
const ghostBtn = 'rounded-md px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800'
const chipCard = 'rounded-lg border border-slate-150 bg-slate-50/60 p-3'

type WizardStepMeta = {
  id: string
  label: string
  hint: string
  icon: ElementType
  render: () => ReactNode
}

type ReviewSection = {
  title: string
  rows: { label: string; value: string }[]
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      {children}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  desc,
  action,
  children,
}: {
  icon: ElementType
  title: string
  desc?: string
  action?: ReactNode
  children: ReactNode
}) {
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

interface Props {
  formState: ProjectFormState
  onChange: (field: keyof ProjectFormState, value: ProjectFormState[keyof ProjectFormState]) => void
  onCancel: () => void
  onSave: (overrides?: Partial<ProjectFormState>) => void
  isSaving?: boolean
  isEdit?: boolean
}

export function ProjectForm({
  formState,
  onChange,
  onCancel,
  onSave,
  isSaving = false,
  isEdit = false,
}: Props) {
  const usersDirectoryQuery = useUserDirectory()
  const [step, setStep] = useState(1)
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [extraAssignees, setExtraAssignees] = useState<string[]>([])
  const [extraTemplateOptions, setExtraTemplateOptions] = useState<Record<string, string[]>>({})
  const [pendingMember, setPendingMember] = useState('')
  const [pendingRole, setPendingRole] = useState<MemberRole>('Developer')
  const [pendingJoinedDate, setPendingJoinedDate] = useState(formState.startDate)
  const [pendingResponsibilities, setPendingResponsibilities] = useState('')

  const hasDateError = isAfter(parseISO(formState.startDate), parseISO(formState.endDate))
  const selectedTemplateName = resolveProjectTemplate(formState.projectTemplate)
  const selectedTemplate = getProjectTemplateConfig(selectedTemplateName)
  const teamStep = selectedTemplate.steps.find((s): s is TemplateTeamStep => s.type === 'team')
  const roleOptionsForTemplate = teamStep?.roleOptions ?? memberRoles
  const defaultMemberRole = teamStep?.defaultRole ?? 'Developer'
  const effectivePendingRole = roleOptionsForTemplate.includes(pendingRole) ? pendingRole : defaultMemberRole
  const allCategories = [...projectCategories, ...extraCategories]
  const fetchedAssigneeOptions = Array.from(
    new Set(
      (usersDirectoryQuery.data ?? [])
        .map((user) => user.name)
        .filter(Boolean),
    ),
  )
  const assignableUserOptions = Array.from(new Set([...fetchedAssigneeOptions, ...extraAssignees]))
  const templateData = formState.templateData ?? {}

  const normalizeResponsibilities = (value: string) =>
    value
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s*/, '').trim())
      .filter(Boolean)
      .join('\n')

  const updateTitle = (value: string) => {
    onChange('name', value)
    if (!formState.projectCode.trim()) {
      const code = value.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 4).toUpperCase()
      onChange('projectCode', `${code || 'PROJ'}-${new Date().getFullYear()}`)
    }
  }

  const getFieldValue = (field: TemplateFieldConfig): string | string[] => {
    switch (field.binding ?? 'templateData') {
      case 'techStack.frontend':
        return formState.techStack.frontend
      case 'techStack.backend':
        return formState.techStack.backend
      case 'techStack.database':
        return formState.techStack.database
      case 'techStack.other':
        return formState.techStack.other
      case 'repository.gitUrl':
        return formState.repository.gitUrl
      case 'repository.devUrl':
        return formState.repository.devUrl
      case 'repository.testingUrl':
        return formState.repository.testingUrl
      case 'repository.productionUrl':
        return formState.repository.productionUrl
      case 'templateData':
      default:
        return templateData[field.key] ?? (field.input === 'multi' ? [] : '')
    }
  }

  const setFieldValue = (field: TemplateFieldConfig, value: string | string[]) => {
    switch (field.binding ?? 'templateData') {
      case 'techStack.frontend':
        onChange('techStack', { ...formState.techStack, frontend: Array.isArray(value) ? value : value ? [value] : [] })
        return
      case 'techStack.backend':
        onChange('techStack', { ...formState.techStack, backend: Array.isArray(value) ? value : value ? [value] : [] })
        return
      case 'techStack.database':
        onChange('techStack', { ...formState.techStack, database: Array.isArray(value) ? value : value ? [value] : [] })
        return
      case 'techStack.other':
        onChange('techStack', { ...formState.techStack, other: Array.isArray(value) ? value : value ? [value] : [] })
        return
      case 'repository.gitUrl':
        onChange('repository', { ...formState.repository, gitUrl: Array.isArray(value) ? value.join(', ') : value })
        return
      case 'repository.devUrl':
        onChange('repository', { ...formState.repository, devUrl: Array.isArray(value) ? value.join(', ') : value })
        return
      case 'repository.testingUrl':
        onChange('repository', { ...formState.repository, testingUrl: Array.isArray(value) ? value.join(', ') : value })
        return
      case 'repository.productionUrl':
        onChange('repository', { ...formState.repository, productionUrl: Array.isArray(value) ? value.join(', ') : value })
        return
      case 'templateData':
      default:
        onChange('templateData', { ...templateData, [field.key]: value })
    }
  }

  const getFieldOptions = (field: TemplateFieldConfig) =>
    Array.from(new Set([...(field.options ?? []), ...(extraTemplateOptions[field.key] ?? [])]))

  const addTemplateOption = (field: TemplateFieldConfig, option: string) => {
    setExtraTemplateOptions((current) => {
      const existing = current[field.key] ?? []
      if (existing.includes(option)) return current
      return { ...current, [field.key]: [...existing, option] }
    })
  }

  const fieldAsString = (field: TemplateFieldConfig) => {
    const value = getFieldValue(field)
    return Array.isArray(value) ? value.join(', ') : value
  }

  const fieldAsArray = (field: TemplateFieldConfig) => {
    const value = getFieldValue(field)
    return Array.isArray(value) ? value : value ? [value] : []
  }

  const isFieldMissing = (field: TemplateFieldConfig) => {
    const value = getFieldValue(field)
    return Array.isArray(value) ? value.length === 0 : !value.trim()
  }

  const addTeamMember = (name: string, role: MemberRole, joinedDate: string, responsibilities: string) => {
    if (!name || formState.team.some((member) => member.name === name)) return
    const member: TeamMember = {
      name,
      role,
      joinedDate: joinedDate || formState.startDate,
      responsibilities: normalizeResponsibilities(responsibilities),
      permissions: [...defaultPermissionsForRole[role]],
    }
    const next = [...formState.team, member]
    onChange('team', next)
    onChange('teamMembers', next.map((teamMember) => teamMember.name))
  }

  const removeTeamMember = (name: string) => {
    const next = formState.team.filter((member) => member.name !== name)
    onChange('team', next)
    onChange('teamMembers', next.map((member) => member.name))
  }

  const togglePermission = (memberName: string, permission: RolePermission) => {
    onChange('team', formState.team.map((member) => {
      if (member.name !== memberName) return member
      const hasPermission = member.permissions.includes(permission)
      return {
        ...member,
        permissions: hasPermission
          ? member.permissions.filter((item) => item !== permission)
          : [...member.permissions, permission],
      }
    }))
  }

  const updateTeamMember = (
    memberName: string,
    field: 'role' | 'joinedDate' | 'responsibilities',
    value: string,
  ) => {
    onChange('team', formState.team.map((member) => {
      if (member.name !== memberName) return member
      if (field === 'role') {
        const role = value as MemberRole
        return { ...member, role, permissions: [...defaultPermissionsForRole[role]] }
      }
      if (field === 'responsibilities') {
        return { ...member, responsibilities: normalizeResponsibilities(value) }
      }
      return { ...member, [field]: value }
    }))
  }

  const addModule = () => onChange('modules', [
    ...formState.modules,
    {
      id: newId('mod'),
      name: '',
      description: '',
      owner: formState.manager,
      priority: 'Medium' as Priority,
      startDate: formState.startDate,
      endDate: formState.endDate,
    },
  ])
  const updateModule = (id: string, field: keyof ProjectModule, value: string) =>
    onChange('modules', formState.modules.map((module) => module.id === id ? { ...module, [field]: value } : module))
  const removeModule = (id: string) => onChange('modules', formState.modules.filter((module) => module.id !== id))

  const addSprint = () => onChange('sprints', [
    ...formState.sprints,
    { id: newId('spr'), duration: '2 Weeks' as Sprint['duration'], startDate: formState.startDate, endDate: formState.endDate, goal: '' },
  ])
  const updateSprint = (id: string, field: keyof Sprint, value: string) =>
    onChange('sprints', formState.sprints.map((sprint) => sprint.id === id ? { ...sprint, [field]: value } : sprint))
  const removeSprint = (id: string) => onChange('sprints', formState.sprints.filter((sprint) => sprint.id !== id))

  const collectRequiredIssues = () => {
    const issues: string[] = []
    if (!formState.name.trim()) issues.push('Project Name')
    if (!formState.priority) issues.push('Priority')
    if (!formState.projectCategory) issues.push('Category')
    if (!formState.projectCode.trim()) issues.push('Project Code')
    if (!formState.department) issues.push('Department')
    if (!formState.projectTemplate) issues.push('Project Template')
    if (hasDateError) issues.push('Timeline dates')

    selectedTemplate.steps.forEach((templateStep) => {
      if (templateStep.type === 'fields') {
        templateStep.sections.forEach((section) => {
          section.fields.forEach((field) => {
            if (field.required && isFieldMissing(field)) issues.push(field.label)
          })
        })
      }
      if (templateStep.type === 'team' && templateStep.requireMembers && formState.team.length === 0) {
        issues.push(templateStep.memberTitle)
      }
      if (templateStep.type === 'budget' && templateStep.requireTotal && formState.budget <= 0) {
        issues.push(templateStep.totalLabel)
      }
    })

    return issues
  }

  const requiredIssues = collectRequiredIssues()
  const isInvalid = requiredIssues.length > 0

  const formatReviewValue = (value: string | string[] | number | undefined) => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '-'
    if (typeof value === 'number') return value > 0 ? `$${value.toLocaleString()}` : '-'
    return value?.trim() || '-'
  }

  const renderBasicsStep = () => (
    <div className="space-y-5">
      <div>
        <input
          className="w-full border-none bg-transparent text-[26px] font-semibold text-slate-900 placeholder:text-slate-300 outline-none"
          value={formState.name}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="Project Name"
          autoFocus
        />
        <p className="mt-1 text-[12.5px] text-slate-400">Choose the template first; the next steps will update instantly.</p>
      </div>

      <Section icon={Briefcase} title="Create Project" desc="Project identity, reporting fields and selected template">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Priority" required>
            <ComboSelect
              value={[formState.priority]}
              options={['Low', 'Medium', 'High', 'Critical']}
              onChange={(value) => onChange('priority', (value[0] ?? 'Medium') as Priority)}
              colorMap={PRIORITY_COLORS}
              multi={false}
              placeholder="Select priority..."
            />
          </Field>

          <Field label="Category" required>
            <ComboSelect
              value={formState.projectCategory ? [formState.projectCategory] : []}
              options={allCategories}
              onChange={(value) => onChange('projectCategory', value[0] ?? '')}
              onCreateOption={(value) => setExtraCategories((current) => current.includes(value) ? current : [...current, value])}
              colorMap={CATEGORY_COLORS}
              multi={false}
              placeholder="Select category..."
            />
          </Field>

          <Field label="Project Code" required>
            <input
              className={inputCls}
              value={formState.projectCode}
              onChange={(event) => onChange('projectCode', event.target.value)}
              placeholder="e.g. PRJ-2026"
            />
          </Field>

          <Field label="Department (reporting only)" required>
            <ComboSelect
              value={formState.department ? [formState.department] : []}
              options={departments}
              onChange={(value) => onChange('department', value[0] ?? 'Sales')}
              multi={false}
              placeholder="Select reporting department..."
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Project Template" required>
              <ComboSelect
                value={[selectedTemplateName]}
                options={projectTemplates}
                onChange={(value) => onChange('projectTemplate', value[0] ?? DEFAULT_PROJECT_TEMPLATE)}
                multi={false}
                placeholder="Select template..."
              />
            </Field>
            <div className="mt-3 rounded-lg border border-slate-150 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[12.5px] font-semibold text-slate-800">{selectedTemplate.name}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-slate-400">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )

  const renderTemplateField = (field: TemplateFieldConfig) => {
    const inputType = field.input ?? 'text'
    const wrapCls = inputType === 'textarea' ? 'md:col-span-2' : ''

    if (inputType === 'multi' || inputType === 'select') {
      return (
        <div key={field.key} className={wrapCls}>
          <Field label={field.label} required={field.required}>
            <ComboSelect
              value={inputType === 'multi' ? fieldAsArray(field) : fieldAsString(field) ? [fieldAsString(field)] : []}
              options={getFieldOptions(field)}
              onChange={(value) => setFieldValue(field, inputType === 'multi' ? value : value[0] ?? '')}
              onCreateOption={(value) => addTemplateOption(field, value)}
              multi={inputType === 'multi'}
              placeholder={field.placeholder}
            />
          </Field>
        </div>
      )
    }

    if (inputType === 'textarea') {
      return (
        <div key={field.key} className={wrapCls}>
          <Field label={field.label} required={field.required}>
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              value={fieldAsString(field)}
              onChange={(event) => setFieldValue(field, event.target.value)}
              placeholder={field.placeholder}
            />
          </Field>
        </div>
      )
    }

    return (
      <div key={field.key} className={wrapCls}>
        <Field label={field.label} required={field.required}>
          <input
            type={inputType === 'url' ? 'url' : 'text'}
            className={inputCls}
            value={fieldAsString(field)}
            onChange={(event) => setFieldValue(field, event.target.value)}
            placeholder={field.placeholder}
          />
        </Field>
      </div>
    )
  }

  const renderFieldsStep = (templateStep: TemplateFieldsStep) => {
    const Icon = ICON_MAP[templateStep.icon]
    return (
      <div className="space-y-5">
        {templateStep.sections.map((section) => (
          <Section key={section.title} icon={Icon} title={section.title} desc={section.description}>
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              {section.fields.map(renderTemplateField)}
            </div>
          </Section>
        ))}
      </div>
    )
  }

  const renderTimelineStep = (templateStep: TemplateTimelineStep) => {
    const duration =
      formState.startDate && formState.endDate && !hasDateError
        ? Math.ceil((new Date(formState.endDate).getTime() - new Date(formState.startDate).getTime()) / 86_400_000)
        : null

    return (
      <div className="space-y-5">
        <Section icon={Calendar} title={templateStep.title} desc={templateStep.hint}>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label={templateStep.startLabel} required>
              <DatePicker value={formState.startDate} onChange={(value) => onChange('startDate', value)} className={inputCls} placeholder="Pick start date" />
            </Field>
            <Field label={templateStep.endLabel} required>
              <div>
                <DatePicker value={formState.endDate} onChange={(value) => onChange('endDate', value)} className={inputCls} placeholder="Pick end date" />
                {hasDateError && <p className="mt-1.5 text-[11.5px] text-rose-500">End date must be after start date.</p>}
              </div>
            </Field>
            <Field label={templateStep.actualEndLabel}>
              <DatePicker value={formState.actualEndDate} onChange={(value) => onChange('actualEndDate', value)} className={inputCls} placeholder="Pick actual end date" />
            </Field>
            <Field label={templateStep.deadlineLabel}>
              <ComboSelect
                value={[formState.deadlineType]}
                options={[...deadlineTypes]}
                onChange={(value) => onChange('deadlineType', (value[0] ?? 'Flexible') as ProjectFormState['deadlineType'])}
                colorMap={DEADLINE_COLORS}
                multi={false}
                placeholder="Select deadline type..."
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

  const renderTeamStep = (templateStep: TemplateTeamStep) => {
    const roleOptions = templateStep.roleOptions ?? memberRoles

    return (
      <div className="space-y-5">
        <Section icon={Users} title={templateStep.leadershipTitle} desc={templateStep.leadershipDescription}>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label={templateStep.managerLabel}>
              <ComboSelect
                value={formState.manager ? [formState.manager] : []}
                options={assignableUserOptions}
                onChange={(value) => onChange('manager', value[0] ?? '')}
                onCreateOption={(value) => setExtraAssignees((current) => current.includes(value) ? current : [...current, value])}
                multi={false}
                placeholder={usersDirectoryQuery.isLoading ? 'Loading users...' : `Search ${templateStep.managerLabel.toLowerCase()}...`}
              />
            </Field>
            <Field label={templateStep.leadLabel}>
              <ComboSelect
                value={formState.teamLead ? [formState.teamLead] : []}
                options={assignableUserOptions}
                onChange={(value) => onChange('teamLead', value[0] ?? '')}
                onCreateOption={(value) => setExtraAssignees((current) => current.includes(value) ? current : [...current, value])}
                multi={false}
                placeholder={usersDirectoryQuery.isLoading ? 'Loading users...' : `Search ${templateStep.leadLabel.toLowerCase()}...`}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Users}
          title={templateStep.memberTitle}
          desc={templateStep.memberDescription}
          action={
            <button
              type="button"
              onClick={() => {
                addTeamMember(pendingMember, effectivePendingRole, pendingJoinedDate, pendingResponsibilities)
                setPendingMember('')
                setPendingRole(templateStep.defaultRole)
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
            <Field label={templateStep.memberPickerLabel}>
              <ComboSelect
                value={pendingMember ? [pendingMember] : []}
                options={assignableUserOptions.filter((member) => !formState.team.some((teamMember) => teamMember.name === member))}
                onChange={(value) => setPendingMember(value[0] ?? '')}
                onCreateOption={(value) => setExtraAssignees((current) => current.includes(value) ? current : [...current, value])}
                multi={false}
                placeholder={usersDirectoryQuery.isLoading ? 'Loading users...' : `Search ${templateStep.memberPickerLabel.toLowerCase()}...`}
              />
            </Field>
            <Field label="Role">
              <ComboSelect
                value={[effectivePendingRole]}
                options={[...roleOptions]}
                onChange={(value) => setPendingRole((value[0] ?? templateStep.defaultRole) as MemberRole)}
                multi={false}
                placeholder="Select role..."
              />
            </Field>
            <Field label="Project joined date">
              <DatePicker value={pendingJoinedDate} onChange={setPendingJoinedDate} className={inputCls} placeholder="Pick joined date" />
            </Field>
            <div className="md:col-span-2 2xl:col-span-1">
              <Field label="Responsibilities">
                <textarea
                  rows={3}
                  className={`${inputCls} resize-none`}
                  value={pendingResponsibilities}
                  onChange={(event) => setPendingResponsibilities(event.target.value)}
                  placeholder="One responsibility per line"
                />
              </Field>
            </div>
          </div>

          {formState.team.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-slate-300" />
              <p className="text-[12.5px] text-slate-400">No members added yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formState.team.map((member) => {
                const editableRoles = Array.from(new Set([...roleOptions, member.role]))

                return (
                  <div key={member.name} className={chipCard}>
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                          {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
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
                          options={editableRoles}
                          onChange={(value) => updateTeamMember(member.name, 'role', value[0] ?? member.role)}
                          multi={false}
                          placeholder="Select role..."
                        />
                      </Field>
                      <Field label="Joined date">
                        <DatePicker
                          value={member.joinedDate || formState.startDate}
                          onChange={(value) => updateTeamMember(member.name, 'joinedDate', value)}
                          className={inputCls}
                          placeholder="Pick joined date"
                        />
                      </Field>
                      <Field label="Responsibilities">
                        <textarea
                          rows={3}
                          className={`${inputCls} resize-none`}
                          value={member.responsibilities || ''}
                          onChange={(event) => updateTeamMember(member.name, 'responsibilities', event.target.value)}
                          placeholder="One responsibility per line"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allRolePermissions.map(({ key, label }) => {
                        const hasPermission = member.permissions.includes(key)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePermission(member.name, key)}
                            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium leading-none transition-colors ${hasPermission ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                          >
                            {hasPermission && <Check className="mr-0.5 inline h-2.5 w-2.5" />}{label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    )
  }

  const renderPlanningStep = (templateStep: TemplatePlanningStep) => (
    <div className="space-y-5">
      <Section
        icon={Layers}
        title={templateStep.phaseTitle}
        desc={templateStep.phaseDescription}
        action={<button type="button" onClick={addModule} className={ghostBtn}>+ Add phase</button>}
      >
        {formState.modules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Layers className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No phases added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.modules.map((module) => (
              <div key={module.id} className={chipCard}>
                <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
                  <div>
                    <label className={labelCls}>{templateStep.phaseNameLabel}</label>
                    <input className={inputCls} value={module.name} onChange={(event) => updateModule(module.id, 'name', event.target.value)} placeholder={templateStep.phaseNamePlaceholder} />
                  </div>
                  <div>
                    <label className={labelCls}>Owner</label>
                    <ComboSelect
                      value={module.owner ? [module.owner] : []}
                      options={assignableUserOptions}
                      onChange={(value) => updateModule(module.id, 'owner', value[0] ?? '')}
                      onCreateOption={(value) => setExtraAssignees((current) => current.includes(value) ? current : [...current, value])}
                      multi={false}
                      placeholder={usersDirectoryQuery.isLoading ? 'Loading users...' : 'Search owner...'}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                    <div>
                      <label className={labelCls}>Timeline start date</label>
                      <DatePicker value={module.startDate} onChange={(value) => updateModule(module.id, 'startDate', value)} className={inputCls} placeholder="Start date" />
                    </div>
                    <div>
                      <label className={labelCls}>Timeline end date</label>
                      <DatePicker value={module.endDate} onChange={(value) => updateModule(module.id, 'endDate', value)} className={inputCls} placeholder="End date" />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Description</label>
                    <textarea
                      rows={3}
                      className={`${inputCls} resize-none`}
                      value={module.description}
                      onChange={(event) => updateModule(module.id, 'description', event.target.value)}
                      placeholder="Describe the scope, goals and expected output for this phase."
                    />
                  </div>
                </div>
                <button type="button" onClick={() => removeModule(module.id)} className="mt-3 flex items-center gap-1 text-[11.5px] text-rose-400 transition-colors hover:text-rose-600">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Zap}
        title={templateStep.sprintTitle}
        action={<button type="button" onClick={addSprint} className={ghostBtn}>+ Add sprint</button>}
      >
        {formState.sprints.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <Zap className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">No sprints configured.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formState.sprints.map((sprint, index) => (
              <div key={sprint.id} className={chipCard}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-slate-500">Sprint {index + 1}</p>
                  <button type="button" onClick={() => removeSprint(sprint.id)} className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Duration</label>
                    <ComboSelect
                      value={sprint.duration ? [sprint.duration] : []}
                      options={[...sprintDurations]}
                      onChange={(value) => updateSprint(sprint.id, 'duration', value[0] ?? '2 Weeks')}
                      multi={false}
                      placeholder="Select duration..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{templateStep.sprintGoalLabel}</label>
                    <input className={inputCls} value={sprint.goal} onChange={(event) => updateSprint(sprint.id, 'goal', event.target.value)} placeholder={templateStep.sprintGoalPlaceholder} />
                  </div>
                  <div>
                    <label className={labelCls}>Start</label>
                    <DatePicker value={sprint.startDate} onChange={(value) => updateSprint(sprint.id, 'startDate', value)} className={inputCls} placeholder="Start date" />
                  </div>
                  <div>
                    <label className={labelCls}>End</label>
                    <DatePicker value={sprint.endDate} onChange={(value) => updateSprint(sprint.id, 'endDate', value)} className={inputCls} placeholder="End date" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )

  const renderBudgetStep = (templateStep: TemplateBudgetStep) => (
    <div className="space-y-5">
      <Section icon={DollarSign} title={templateStep.title} desc={templateStep.hint}>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
          <Field label={templateStep.totalLabel} required={templateStep.requireTotal}>
            <input type="number" min={0} className={inputCls} value={formState.budget || ''} onChange={(event) => onChange('budget', Number(event.target.value))} placeholder="0" />
          </Field>
          <Field label={templateStep.developmentLabel}>
            <input type="number" min={0} className={inputCls} value={formState.developmentCost || ''} onChange={(event) => onChange('developmentCost', Number(event.target.value))} placeholder="0" />
          </Field>
          <Field label={templateStep.resourceLabel}>
            <input type="number" min={0} className={inputCls} value={formState.resourceCost || ''} onChange={(event) => onChange('resourceCost', Number(event.target.value))} placeholder="0" />
          </Field>
        </div>
        {formState.budget > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-150 bg-slate-50/60 px-4 py-2.5 text-[13px]">
            <span className="text-slate-400">{templateStep.remainingLabel}</span>
            <span className="font-semibold text-slate-800">${Math.max(0, formState.budget - formState.developmentCost - formState.resourceCost).toLocaleString()}</span>
          </div>
        )}
      </Section>
    </div>
  )

  const buildReviewSections = (): ReviewSection[] => {
    const sections: ReviewSection[] = [
      {
        title: 'Project',
        rows: [
          { label: 'Project Name', value: formatReviewValue(formState.name) },
          { label: 'Project Code', value: formatReviewValue(formState.projectCode) },
          { label: 'Template', value: selectedTemplate.name },
          { label: 'Priority', value: formatReviewValue(formState.priority) },
          { label: 'Category', value: formatReviewValue(formState.projectCategory) },
          { label: 'Reporting Department', value: formatReviewValue(formState.department) },
        ],
      },
    ]

    selectedTemplate.steps.forEach((templateStep) => {
      if (templateStep.type === 'fields') {
        templateStep.sections.forEach((section) => {
          sections.push({
            title: section.title,
            rows: section.fields.map((field) => ({ label: field.label, value: formatReviewValue(getFieldValue(field)) })),
          })
        })
      }

      if (templateStep.type === 'planning') {
        sections.push({
          title: templateStep.title,
          rows: [
            { label: 'Phases', value: `${formState.modules.length} configured` },
            { label: 'Sprints', value: `${formState.sprints.length} configured` },
          ],
        })
      }

      if (templateStep.type === 'timeline') {
        sections.push({
          title: templateStep.title,
          rows: [
            { label: templateStep.startLabel, value: formatReviewValue(formState.startDate) },
            { label: templateStep.endLabel, value: formatReviewValue(formState.endDate) },
            { label: templateStep.actualEndLabel, value: formatReviewValue(formState.actualEndDate) },
            { label: templateStep.deadlineLabel, value: formatReviewValue(formState.deadlineType) },
          ],
        })
      }

      if (templateStep.type === 'team') {
        sections.push({
          title: templateStep.title,
          rows: [
            { label: templateStep.managerLabel, value: formatReviewValue(formState.manager) },
            { label: templateStep.leadLabel, value: formatReviewValue(formState.teamLead) },
            { label: templateStep.memberTitle, value: `${formState.team.length} members` },
          ],
        })
      }

      if (templateStep.type === 'budget') {
        sections.push({
          title: templateStep.title,
          rows: [
            { label: templateStep.totalLabel, value: formatReviewValue(formState.budget) },
            { label: templateStep.developmentLabel, value: formatReviewValue(formState.developmentCost) },
            { label: templateStep.resourceLabel, value: formatReviewValue(formState.resourceCost) },
          ],
        })
      }
    })

    return sections
  }

  const renderReviewStep = () => {
    const reviewSections = buildReviewSections()

    return (
      <div className="space-y-5">
        {requiredIssues.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-amber-900">Complete required fields before creating this project.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {requiredIssues.map((issue) => (
                <span key={issue} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                  {issue}
                </span>
              ))}
            </div>
          </div>
        )}

        <Section icon={CheckCircle} title="Review Summary" desc={`Summary generated from the ${selectedTemplate.name} template`}>
          <div className="space-y-4">
            {reviewSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {section.rows.map((row) => (
                    <div key={`${section.title}-${row.label}`} className="rounded-lg border border-slate-150 bg-slate-50/60 p-2.5">
                      <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{row.label}</p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Lock} title="Creation settings">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-150 bg-white p-3.5 transition-colors hover:bg-slate-50/60">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-slate-900" checked={formState.approvalRequired} onChange={(event) => onChange('approvalRequired', event.target.checked)} />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Require creation approval</p>
                <p className="mt-0.5 text-[12px] text-slate-400">The project will wait for approval before becoming active.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-150 bg-white p-3.5 transition-colors hover:bg-slate-50/60">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-slate-900" checked={formState.closureApprovalRequired} onChange={(event) => onChange('closureApprovalRequired', event.target.checked)} />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Require closure approval</p>
                <p className="mt-0.5 text-[12px] text-slate-400">An authorized reviewer must approve before the project is marked complete.</p>
              </div>
            </label>
          </div>
        </Section>
      </div>
    )
  }

  const renderTemplateStep = (templateStep: TemplateWizardStep) => {
    switch (templateStep.type) {
      case 'fields':
        return renderFieldsStep(templateStep)
      case 'planning':
        return renderPlanningStep(templateStep)
      case 'timeline':
        return renderTimelineStep(templateStep)
      case 'team':
        return renderTeamStep(templateStep)
      case 'budget':
        return renderBudgetStep(templateStep)
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  const wizardSteps: WizardStepMeta[] = [
    {
      id: 'basics',
      label: 'Basics',
      hint: 'Project name, priority, category, code, department and template',
      icon: Briefcase,
      render: renderBasicsStep,
    },
    ...selectedTemplate.steps.map((templateStep) => ({
      id: templateStep.id,
      label: templateStep.label,
      hint: templateStep.hint,
      icon: ICON_MAP[templateStep.icon],
      render: () => renderTemplateStep(templateStep),
    })),
  ]
  const currentStepNumber = Math.min(step, wizardSteps.length)
  const currentStepMeta = wizardSteps[currentStepNumber - 1] ?? wizardSteps[0]
  const isFinalStep = currentStepNumber === wizardSteps.length

  return (
    <div className="flex h-full w-full bg-white">
      <div className="hidden w-52 flex-shrink-0 flex-col border-r border-slate-100 bg-[#fbfbfa] px-3 py-4 sm:flex">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          {isEdit ? 'Edit project' : 'New project'}
        </p>
        <nav className="space-y-0.5">
          {wizardSteps.map((wizardStep, index) => {
            const Icon = wizardStep.icon
            const stepNumber = index + 1
            const done = stepNumber < currentStepNumber
            const active = stepNumber === currentStepNumber

            return (
              <button
                key={wizardStep.id}
                type="button"
                onClick={() => setStep(stepNumber)}
                className={[
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                  active ? 'bg-slate-200/70 text-slate-900' : 'text-slate-500 hover:bg-slate-100',
                ].join(' ')}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-slate-700' : 'text-slate-400'}`} />
                )}
                <span className={`truncate text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}>{wizardStep.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto px-2 pt-4 text-[11px] text-slate-300">
          Step {currentStepNumber} of {wizardSteps.length}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-[11px] text-slate-400 sm:hidden">
          <span>Step {currentStepNumber} of {wizardSteps.length}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-slate-700">{currentStepMeta.label}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
            <p className="mb-4 text-[12px] font-medium text-slate-400">{currentStepMeta.hint}</p>
            {currentStepMeta.render()}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-3.5 sm:px-10">
          <button
            type="button"
            onClick={() => (currentStepNumber > 1 ? setStep(currentStepNumber - 1) : onCancel())}
            className="rounded-md px-3 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            {currentStepNumber === 1 ? 'Cancel' : '<- Back'}
          </button>

          <div className="flex items-center gap-2.5">
            {isFinalStep ? (
              <>
                {!isEdit && (
                  <button
                    type="button"
                    disabled={isInvalid || isSaving}
                    onClick={() => onSave({ approvalRequired: true, approvalStatus: 'Pending', status: 'Approval Pending' })}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> {selectedTemplate.approvalActionLabel}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isInvalid || isSaving}
                  onClick={() => onSave()}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isEdit ? 'Save changes' : selectedTemplate.primaryActionLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStep(currentStepNumber + 1)}
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

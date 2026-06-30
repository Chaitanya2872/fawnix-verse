import { useState } from 'react'
import { Check, ChevronRight, GitBranch, Layers, Settings, Tag, ToggleLeft, ToggleRight } from 'lucide-react'

type WorkflowDef = {
  id: string
  label: string
  description: string
  enabled: boolean
  steps: { order: number; role: string }[]
}

const DEFAULT_WORKFLOWS: WorkflowDef[] = [
  {
    id: 'wf-creation',
    label: 'Project Creation',
    description: 'Triggered when a new project is submitted for review before it moves to Planned.',
    enabled: true,
    steps: [{ order: 1, role: 'APPROVER' }],
  },
  {
    id: 'wf-milestone',
    label: 'Milestone Completion',
    description: 'Triggered when a milestone is marked complete and requires a sign-off before closing.',
    enabled: true,
    steps: [{ order: 1, role: 'APPROVER' }],
  },
  {
    id: 'wf-closure',
    label: 'Project Closure',
    description: 'Triggered when closure is initiated on a fully delivered project.',
    enabled: true,
    steps: [{ order: 1, role: 'APPROVER' }],
  },
]

const CATEGORIES = [
  { name: 'Client Delivery', color: 'bg-sky-500',     description: 'External deliverables scoped for a client'       },
  { name: 'Internal',         color: 'bg-violet-500', description: 'Internal improvement and operational initiatives'  },
  { name: 'Product',          color: 'bg-emerald-500', description: 'Product development and roadmap execution'        },
  { name: 'Operations',       color: 'bg-amber-500',  description: 'Business operations and process improvement work'  },
  { name: 'Compliance',       color: 'bg-rose-500',   description: 'Regulatory and compliance-driven projects'         },
]

const PRIORITIES = [
  { name: 'High',   color: 'bg-rose-500',    description: 'Escalated items requiring immediate attention'        },
  { name: 'Medium', color: 'bg-amber-500',   description: 'Standard priority, on the normal delivery track'      },
  { name: 'Low',    color: 'bg-emerald-500', description: 'Background tasks with flexible delivery timelines'    },
]

const TEMPLATES = [
  { name: 'Blank',              description: 'Start from scratch with no predefined structure.'                       },
  { name: 'Implementation',      description: 'Software or system rollout with phases, UAT, and handoffs.'            },
  { name: 'Marketing Campaign',  description: 'Campaign planning with creative, launch, and review milestones.'       },
  { name: 'Product Launch',      description: 'End-to-end product launch covering dev, QA, and go-to-market.'         },
  { name: 'Internal Operations', description: 'Internal process improvement with clear ownership and checkpoints.'    },
]

export default function ProjectConfigPage() {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>(DEFAULT_WORKFLOWS)

  const toggleWorkflow = (id: string) =>
    setWorkflows((cur) => cur.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Configuration Management</h1>
        <p className="text-xs text-muted-foreground">
          Manage approval workflows, project categories, templates, and priority tiers.
        </p>
      </div>

      {/* Approval Workflows */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Approval Workflows</h2>
            <p className="text-xs text-muted-foreground">
              Multi-step approval chains for project lifecycle events.
            </p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {workflows.map((wf) => (
            <div key={wf.id} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-semibold">{wf.label}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      wf.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {wf.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{wf.description}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {wf.steps.map((step) => (
                    <div
                      key={step.order}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5"
                    >
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                        {step.order}
                      </div>
                      <span className="text-xs font-medium">{step.role}</span>
                    </div>
                  ))}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Resolved</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleWorkflow(wf.id)}
                className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title={wf.enabled ? 'Disable workflow' : 'Enable workflow'}
              >
                {wf.enabled
                  ? <ToggleRight className="h-7 w-7 text-sky-500" />
                  : <ToggleLeft className="h-7 w-7" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Categories + Priorities */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Categories */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Project Categories</h2>
              <p className="text-xs text-muted-foreground">Classify projects by business function.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 px-5 py-3">
                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${cat.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priorities */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Priority Levels</h2>
              <p className="text-xs text-muted-foreground">Urgency tiers applied to projects and milestones.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {PRIORITIES.map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-3">
                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${p.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Project Templates</h2>
            <p className="text-xs text-muted-foreground">
              Pre-configured starting structures for common project types.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <div
              key={t.name}
              className={`p-5 ${
                i < TEMPLATES.length - 1 ? 'border-b border-border sm:border-b-0 sm:border-r' : ''
              }`}
            >
              <p className="mb-1 text-sm font-semibold">{t.name}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{t.description}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

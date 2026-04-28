import type { ReactNode } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarRange,
  Clock3,
  MapPin,
  ShieldCheck,
  Target,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import {
  ProjectHealthBadge,
  ProjectStageBadge,
  ProjectStatusBadge,
} from "../project-ui";
import {
  formatProjectCurrency,
  formatProjectDate,
  getInitials,
  percentOf,
} from "../project-formatters";
import type { ProjectRecord } from "../types";

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function BudgetMeter({
  label,
  amount,
  total,
  currency,
  tone,
}: {
  label: string;
  amount: number;
  total: number;
  currency: string;
  tone: string;
}) {
  const width = percentOf(amount, total);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs font-medium text-slate-500">{width}%</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <p className="text-sm font-semibold text-slate-900">{formatProjectCurrency(amount, currency)}</p>
    </div>
  );
}

export function ProjectDetailPanel({
  project,
  onClose,
}: {
  project: ProjectRecord | null;
  onClose: () => void;
}) {
  if (!project) {
    return (
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Project unavailable</h2>
            <p className="text-sm text-slate-500">The selected project could not be found.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const availableBudget = Math.max(0, project.budget.approved - project.budget.spent);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {project.code}
              </span>
              <ProjectStatusBadge status={project.status} />
              <ProjectHealthBadge health={project.health} />
              <ProjectStageBadge stage={project.stage} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {project.client} · {project.sector} · {project.location}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,1)_50%,rgba(16,185,129,0.08))] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Delivery Progress</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{project.progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Approved Budget</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatProjectCurrency(project.budget.approved, project.budget.currency)}
              </p>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#10b981)]"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Started {formatProjectDate(project.startDate)}</span>
            <span>Target {formatProjectDate(project.targetDate)}</span>
            <span>Next review {formatProjectDate(project.nextReview)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <SummaryTile label="Owner" value={project.owner} helper="Delivery owner" />
          <SummaryTile label="Timeline" value={`${formatProjectDate(project.startDate)} to ${formatProjectDate(project.targetDate)}`} helper="Current delivery window" />
          <SummaryTile label="Available Budget" value={formatProjectCurrency(availableBudget, project.budget.currency)} helper="Approved minus spent" />
          <SummaryTile label="Last Updated" value={formatProjectDate(project.lastUpdated)} helper="Latest project sync" />
        </div>

        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<Target className="h-5 w-5" />}
              title="Project Overview"
              description="A crisp summary of what this program exists to deliver."
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Objective</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{project.objective || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Delivery Notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{project.deliveryNotes || "-"}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{project.description || "-"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.length > 0 ? (
                project.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No tags added yet.</span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<Wallet className="h-5 w-5" />}
              title="Budget Snapshot"
              description="Track committed, spent, and forecasted budget against the approved cap."
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <BudgetMeter
                label="Committed"
                amount={project.budget.committed}
                total={project.budget.approved}
                currency={project.budget.currency}
                tone="bg-sky-500"
              />
              <BudgetMeter
                label="Spent"
                amount={project.budget.spent}
                total={project.budget.approved}
                currency={project.budget.currency}
                tone="bg-emerald-500"
              />
              <BudgetMeter
                label="Forecast"
                amount={project.budget.forecast}
                total={project.budget.approved}
                currency={project.budget.currency}
                tone="bg-amber-500"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Stakeholders And Coordinators"
              description="The people keeping the program aligned and moving."
            />
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Stakeholders</p>
                {project.stakeholders.length > 0 ? (
                  project.stakeholders.map((stakeholder) => (
                    <div key={stakeholder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{stakeholder.name}</p>
                          <p className="text-xs text-slate-500">{stakeholder.title}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {stakeholder.influence}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{stakeholder.focusArea || "-"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No stakeholders added yet.</p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Coordinators</p>
                {project.coordinators.length > 0 ? (
                  project.coordinators.map((coordinator) => (
                    <div key={coordinator.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700">
                          {getInitials(coordinator.name || coordinator.function)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{coordinator.name || "-"}</p>
                          <p className="text-xs text-slate-500">{coordinator.function || "-"}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">{coordinator.timezone || "Timezone pending"}</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{coordinator.cadence || "Cadence pending"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No coordinators added yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<Users2 className="h-5 w-5" />}
              title="Team Responsibilities"
              description="The working team and the responsibility each person owns."
            />
            <div className="mt-4 space-y-3">
              {project.teamMembers.length > 0 ? (
                project.teamMembers.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700">
                          {getInitials(member.name || member.role)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.name || "-"}</p>
                          <p className="text-xs text-slate-500">{member.role || "-"}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {member.allocation}% allocation
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{member.responsibility || "-"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No team members added yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<CalendarRange className="h-5 w-5" />}
              title="Milestones"
              description="Upcoming and delivered checkpoints for the current program."
            />
            <div className="mt-4 space-y-3">
              {project.milestones.length > 0 ? (
                project.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{milestone.label}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatProjectDate(milestone.dueDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                          {milestone.owner || "-"}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {milestone.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No milestones mapped yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Risks And Watchouts"
              description="Items that deserve leadership attention before they affect delivery."
            />
            <div className="mt-4 space-y-3">
              {project.risks.length > 0 ? (
                project.risks.map((risk) => (
                  <div key={risk} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {risk}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  No active risks have been logged for this project.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Client</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BriefcaseBusiness className="h-4 w-4 text-sky-500" />
                {project.client}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Location</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-sky-500" />
                {project.location}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Owner</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Users2 className="h-4 w-4 text-sky-500" />
                {project.owner}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailPanel;

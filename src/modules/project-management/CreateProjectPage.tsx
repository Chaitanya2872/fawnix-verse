import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  Users2,
  Wallet,
} from "lucide-react";
import ProjectManagementLayout from "./layout";
import {
  MILESTONE_STATUS_OPTIONS,
  PROJECT_HEALTH_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectCoordinator,
  type ProjectFormData,
  type ProjectMilestone,
  type ProjectStakeholder,
  type ProjectTeamMember,
} from "./types";
import { createProjectRecord } from "./store";
import { ProjectHealthBadge, ProjectStageBadge, ProjectStatusBadge } from "./project-ui";
import { formatProjectCurrency } from "./project-formatters";

function createLocalId(prefix: string) {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return `${prefix}-${token}`;
}

function createStakeholder(): ProjectStakeholder {
  return {
    id: createLocalId("stakeholder"),
    name: "",
    title: "",
    influence: "",
    focusArea: "",
  };
}

function createCoordinator(): ProjectCoordinator {
  return {
    id: createLocalId("coordinator"),
    name: "",
    function: "",
    timezone: "IST",
    cadence: "",
  };
}

function createTeamMember(): ProjectTeamMember {
  return {
    id: createLocalId("team-member"),
    name: "",
    role: "",
    responsibility: "",
    allocation: 50,
  };
}

function createMilestone(): ProjectMilestone {
  return {
    id: createLocalId("milestone"),
    label: "",
    dueDate: "",
    owner: "",
    status: "Upcoming",
  };
}

const EMPTY_FORM: ProjectFormData = {
  name: "",
  client: "",
  sector: "",
  owner: "",
  status: "Planning",
  health: "On Track",
  stage: "Discovery",
  location: "",
  startDate: "",
  targetDate: "",
  nextReview: "",
  progress: 10,
  description: "",
  objective: "",
  deliveryNotes: "",
  budget: {
    currency: "INR",
    approved: 0,
    committed: 0,
    spent: 0,
    forecast: 0,
  },
  stakeholders: [createStakeholder()],
  coordinators: [createCoordinator()],
  teamMembers: [createTeamMember()],
  milestones: [createMilestone()],
  tags: [],
  risks: [],
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const remainingBudget = Math.max(0, form.budget.approved - form.budget.spent);

  function updateBudget<K extends keyof ProjectFormData["budget"]>(
    key: K,
    value: ProjectFormData["budget"][K]
  ) {
    setForm((previous) => ({
      ...previous,
      budget: {
        ...previous.budget,
        [key]: value,
      },
    }));
  }

  function removeStakeholder(id: string) {
    setForm((previous) => ({
      ...previous,
      stakeholders:
        previous.stakeholders.length > 1
          ? previous.stakeholders.filter((item) => item.id !== id)
          : previous.stakeholders,
    }));
  }

  function removeCoordinator(id: string) {
    setForm((previous) => ({
      ...previous,
      coordinators:
        previous.coordinators.length > 1
          ? previous.coordinators.filter((item) => item.id !== id)
          : previous.coordinators,
    }));
  }

  function removeTeamMember(id: string) {
    setForm((previous) => ({
      ...previous,
      teamMembers:
        previous.teamMembers.length > 1
          ? previous.teamMembers.filter((item) => item.id !== id)
          : previous.teamMembers,
    }));
  }

  function removeMilestone(id: string) {
    setForm((previous) => ({
      ...previous,
      milestones:
        previous.milestones.length > 1
          ? previous.milestones.filter((item) => item.id !== id)
          : previous.milestones,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.client.trim() || !form.owner.trim()) {
      setError("Project name, client, and owner are required.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const project = createProjectRecord(form);
      navigate(`/project-management/projects/${project.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create project.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProjectManagementLayout
      title="Add Project"
      description="Capture the project skeleton now so delivery, budget, and accountability all start with shared context."
      actionButton={
        <button
          onClick={() => navigate("/project-management/projects")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back To Projects
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard
            title="Project Snapshot"
            description="Define the high-level structure so the team knows what is being delivered and who owns it."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Project Name"
                value={form.name}
                onChange={(value) => setForm((previous) => ({ ...previous, name: value }))}
                placeholder="Atlas Heights Experience Center"
              />
              <TextField
                label="Client"
                value={form.client}
                onChange={(value) => setForm((previous) => ({ ...previous, client: value }))}
                placeholder="Client or business unit"
              />
              <TextField
                label="Sector"
                value={form.sector}
                onChange={(value) => setForm((previous) => ({ ...previous, sector: value }))}
                placeholder="Real Estate, Hospitality, Retail..."
              />
              <TextField
                label="Owner"
                value={form.owner}
                onChange={(value) => setForm((previous) => ({ ...previous, owner: value }))}
                placeholder="Delivery owner"
              />
              <SelectField
                label="Status"
                value={form.status}
                options={PROJECT_STATUS_OPTIONS}
                onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
              />
              <SelectField
                label="Health"
                value={form.health}
                options={PROJECT_HEALTH_OPTIONS}
                onChange={(value) => setForm((previous) => ({ ...previous, health: value }))}
              />
              <SelectField
                label="Stage"
                value={form.stage}
                options={PROJECT_STAGE_OPTIONS}
                onChange={(value) => setForm((previous) => ({ ...previous, stage: value }))}
              />
              <TextField
                label="Location"
                value={form.location}
                onChange={(value) => setForm((previous) => ({ ...previous, location: value }))}
                placeholder="City or region"
              />
              <TextField
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(value) => setForm((previous) => ({ ...previous, startDate: value }))}
              />
              <TextField
                label="Target Date"
                type="date"
                value={form.targetDate}
                onChange={(value) => setForm((previous) => ({ ...previous, targetDate: value }))}
              />
              <TextField
                label="Next Review"
                type="date"
                value={form.nextReview}
                onChange={(value) => setForm((previous) => ({ ...previous, nextReview: value }))}
              />
              <TextField
                label="Progress"
                type="number"
                value={form.progress}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    progress: Math.max(0, Math.min(100, Number(value) || 0)),
                  }))
                }
              />
            </div>

            <div className="mt-4 grid gap-4">
              <TextAreaField
                label="Objective"
                value={form.objective}
                onChange={(value) => setForm((previous) => ({ ...previous, objective: value }))}
                placeholder="What business outcome is this project trying to create?"
              />
              <TextAreaField
                label="Description"
                value={form.description}
                onChange={(value) => setForm((previous) => ({ ...previous, description: value }))}
                placeholder="Summarize the project scope and delivery shape."
              />
              <TextAreaField
                label="Delivery Notes"
                value={form.deliveryNotes}
                onChange={(value) => setForm((previous) => ({ ...previous, deliveryNotes: value }))}
                placeholder="Call out assumptions, dependencies, or critical expectations."
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Budget"
            description="Keep the money conversation visible from the beginning so delivery choices stay grounded."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Currency"
                value={form.budget.currency}
                onChange={(value) => updateBudget("currency", value.toUpperCase())}
                placeholder="INR"
              />
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Remaining Budget</p>
                <p className="mt-2 text-lg font-semibold text-emerald-900">
                  {formatProjectCurrency(remainingBudget, form.budget.currency || "INR")}
                </p>
              </div>
              <TextField
                label="Approved Budget"
                type="number"
                value={form.budget.approved}
                onChange={(value) => updateBudget("approved", Number(value) || 0)}
              />
              <TextField
                label="Committed Budget"
                type="number"
                value={form.budget.committed}
                onChange={(value) => updateBudget("committed", Number(value) || 0)}
              />
              <TextField
                label="Spent Budget"
                type="number"
                value={form.budget.spent}
                onChange={(value) => updateBudget("spent", Number(value) || 0)}
              />
              <TextField
                label="Forecast Budget"
                type="number"
                value={form.budget.forecast}
                onChange={(value) => updateBudget("forecast", Number(value) || 0)}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Stakeholders"
            description="Capture the people who influence the program and what each of them cares about."
          >
            <div className="space-y-4">
              {form.stakeholders.map((stakeholder, index) => (
                <div key={stakeholder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Stakeholder {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeStakeholder(stakeholder.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Name"
                      value={stakeholder.name}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          stakeholders: previous.stakeholders.map((item) =>
                            item.id === stakeholder.id ? { ...item, name: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Title"
                      value={stakeholder.title}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          stakeholders: previous.stakeholders.map((item) =>
                            item.id === stakeholder.id ? { ...item, title: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Influence"
                      value={stakeholder.influence}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          stakeholders: previous.stakeholders.map((item) =>
                            item.id === stakeholder.id ? { ...item, influence: value } : item
                          ),
                        }))
                      }
                      placeholder="Executive, High, Medium..."
                    />
                    <TextField
                      label="Focus Area"
                      value={stakeholder.focusArea}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          stakeholders: previous.stakeholders.map((item) =>
                            item.id === stakeholder.id ? { ...item, focusArea: value } : item
                          ),
                        }))
                      }
                      placeholder="Budget, launch timing, quality..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  stakeholders: [...previous.stakeholders, createStakeholder()],
                }))
              }
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Stakeholder
            </button>
          </SectionCard>

          <SectionCard
            title="Coordinators"
            description="These are the people keeping communication, ceremonies, and operating rhythm intact."
          >
            <div className="space-y-4">
              {form.coordinators.map((coordinator, index) => (
                <div key={coordinator.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Coordinator {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeCoordinator(coordinator.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Name"
                      value={coordinator.name}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          coordinators: previous.coordinators.map((item) =>
                            item.id === coordinator.id ? { ...item, name: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Function"
                      value={coordinator.function}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          coordinators: previous.coordinators.map((item) =>
                            item.id === coordinator.id ? { ...item, function: value } : item
                          ),
                        }))
                      }
                      placeholder="Program Coordinator, PMO..."
                    />
                    <TextField
                      label="Timezone"
                      value={coordinator.timezone}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          coordinators: previous.coordinators.map((item) =>
                            item.id === coordinator.id ? { ...item, timezone: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Cadence"
                      value={coordinator.cadence}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          coordinators: previous.coordinators.map((item) =>
                            item.id === coordinator.id ? { ...item, cadence: value } : item
                          ),
                        }))
                      }
                      placeholder="Daily standup, weekly steering..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  coordinators: [...previous.coordinators, createCoordinator()],
                }))
              }
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Coordinator
            </button>
          </SectionCard>

          <SectionCard
            title="Team Members"
            description="Document the working team and the responsibility each person is accountable for."
          >
            <div className="space-y-4">
              {form.teamMembers.map((member, index) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Team Member {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Name"
                      value={member.name}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          teamMembers: previous.teamMembers.map((item) =>
                            item.id === member.id ? { ...item, name: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Role"
                      value={member.role}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          teamMembers: previous.teamMembers.map((item) =>
                            item.id === member.id ? { ...item, role: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Allocation %"
                      type="number"
                      value={member.allocation}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          teamMembers: previous.teamMembers.map((item) =>
                            item.id === member.id
                              ? {
                                  ...item,
                                  allocation: Math.max(0, Math.min(100, Number(value) || 0)),
                                }
                              : item
                          ),
                        }))
                      }
                    />
                    <div />
                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Responsibility"
                        rows={3}
                        value={member.responsibility}
                        onChange={(value) =>
                          setForm((previous) => ({
                            ...previous,
                            teamMembers: previous.teamMembers.map((item) =>
                              item.id === member.id ? { ...item, responsibility: value } : item
                            ),
                          }))
                        }
                        placeholder="What does this person own in the project?"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  teamMembers: [...previous.teamMembers, createTeamMember()],
                }))
              }
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Team Member
            </button>
          </SectionCard>

          <SectionCard
            title="Milestones And Watchouts"
            description="Capture important checkpoints and any early warning items while the plan is still cheap to change."
          >
            <div className="space-y-4">
              {form.milestones.map((milestone, index) => (
                <div key={milestone.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Milestone {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeMilestone(milestone.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Milestone"
                      value={milestone.label}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          milestones: previous.milestones.map((item) =>
                            item.id === milestone.id ? { ...item, label: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Owner"
                      value={milestone.owner}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          milestones: previous.milestones.map((item) =>
                            item.id === milestone.id ? { ...item, owner: value } : item
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Due Date"
                      type="date"
                      value={milestone.dueDate}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          milestones: previous.milestones.map((item) =>
                            item.id === milestone.id ? { ...item, dueDate: value } : item
                          ),
                        }))
                      }
                    />
                    <SelectField
                      label="Status"
                      value={milestone.status}
                      options={MILESTONE_STATUS_OPTIONS}
                      onChange={(value) =>
                        setForm((previous) => ({
                          ...previous,
                          milestones: previous.milestones.map((item) =>
                            item.id === milestone.id ? { ...item, status: value } : item
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  milestones: [...previous.milestones, createMilestone()],
                }))
              }
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>

            <div className="mt-4 grid gap-4">
              <TextField
                label="Tags"
                value={form.tags.join(", ")}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    tags: value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Launch, Premium, Phase 1"
              />
              <TextAreaField
                label="Risks"
                rows={4}
                value={form.risks.join("\n")}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    risks: value
                      .split("\n")
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="One risk or watchout per line"
              />
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Project
            </button>
            <button
              type="button"
              onClick={() => navigate("/project-management/projects")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{form.name || "Untitled Project"}</p>
                <p className="text-xs text-slate-500">{form.client || "Client not set yet"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ProjectStatusBadge status={form.status} />
              <ProjectHealthBadge health={form.health} />
              <ProjectStageBadge stage={form.stage} />
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Wallet className="h-3.5 w-3.5" />
                  Budget
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {formatProjectCurrency(form.budget.approved, form.budget.currency || "INR")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Approved budget</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    <Users2 className="h-3.5 w-3.5" />
                    Roles
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>{form.stakeholders.length} stakeholder slots</p>
                    <p>{form.coordinators.length} coordinator slots</p>
                    <p>{form.teamMembers.length} team member slots</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Delivery
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>{form.milestones.length} milestones mapped</p>
                    <p>{form.risks.length} watchouts listed</p>
                    <p>{form.progress}% planned starting progress</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </form>
    </ProjectManagementLayout>
  );
}

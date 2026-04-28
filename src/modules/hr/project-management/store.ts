import { useEffect, useState } from "react";
import type {
  ProjectCoordinator,
  ProjectFormData,
  ProjectMilestone,
  ProjectRecord,
  ProjectStakeholder,
  ProjectTeamMember,
} from "./types";

const PROJECT_STORAGE_KEY = "fawnix.projectManagement.projects";
const PROJECTS_CHANGED_EVENT = "fawnix:project-management:changed";

const PROJECT_SEED: ProjectRecord[] = [
  {
    id: "project-atlas-heights",
    code: "PRJ-201",
    name: "Atlas Heights Experience Center",
    client: "Atlas Heights",
    sector: "Real Estate",
    owner: "Ritika Menon",
    status: "Active",
    health: "On Track",
    stage: "Execution",
    location: "Bengaluru",
    startDate: "2026-02-10",
    targetDate: "2026-08-24",
    nextReview: "2026-04-22",
    progress: 62,
    description:
      "Build a high-conversion experience center covering brand storytelling, guided walkthroughs, and sales enablement for premium villa inventory.",
    objective:
      "Unify launch marketing, site operations, and CRM handoff into one predictable program with weekly leadership visibility.",
    deliveryNotes:
      "Launch sequence is tied to digital ad campaigns and site staffing. The sales lounge, projection room, and sign-off kits must land together.",
    budget: {
      currency: "INR",
      approved: 14500000,
      committed: 9800000,
      spent: 7300000,
      forecast: 13800000,
    },
    stakeholders: [
      {
        id: "st-atlas-1",
        name: "Anika Shah",
        title: "Client Sponsor",
        influence: "Executive",
        focusArea: "Commercial launch timing",
      },
      {
        id: "st-atlas-2",
        name: "Vikram Rao",
        title: "Sales Director",
        influence: "High",
        focusArea: "Conversion journey and staffing",
      },
    ],
    coordinators: [
      {
        id: "co-atlas-1",
        name: "Nisha Arora",
        function: "Program Coordinator",
        timezone: "IST",
        cadence: "Daily standup",
      },
      {
        id: "co-atlas-2",
        name: "Kabir Sen",
        function: "Design Ops",
        timezone: "IST",
        cadence: "Twice weekly sync",
      },
    ],
    teamMembers: [
      {
        id: "tm-atlas-1",
        name: "Mehul Saini",
        role: "Site Lead",
        responsibility: "Owns venue build readiness, vendors, and day-of-launch logistics.",
        allocation: 90,
      },
      {
        id: "tm-atlas-2",
        name: "Tanya Bose",
        role: "CRM Analyst",
        responsibility: "Connects lead capture, routing rules, and reporting dashboards.",
        allocation: 65,
      },
      {
        id: "tm-atlas-3",
        name: "Irfan Ali",
        role: "Creative Producer",
        responsibility: "Leads content sequencing, physical signage, and walkthrough scripting.",
        allocation: 75,
      },
    ],
    milestones: [
      {
        id: "ms-atlas-1",
        label: "Spatial design sign-off",
        dueDate: "2026-04-18",
        owner: "Kabir Sen",
        status: "Delivered",
      },
      {
        id: "ms-atlas-2",
        label: "Sales scripts and demo flow",
        dueDate: "2026-04-28",
        owner: "Vikram Rao",
        status: "In Progress",
      },
      {
        id: "ms-atlas-3",
        label: "Soft launch rehearsal",
        dueDate: "2026-05-09",
        owner: "Mehul Saini",
        status: "Upcoming",
      },
    ],
    tags: ["Launch", "Experience Center", "High Value"],
    risks: [
      "Projection hardware lead time is tighter than planned.",
      "Weekend staffing coverage still depends on final sales roster approval.",
    ],
    lastUpdated: "2026-04-15T16:30:00.000Z",
  },
  {
    id: "project-ember-park",
    code: "PRJ-202",
    name: "Ember Industrial Park Launch",
    client: "Ember Assets",
    sector: "Industrial",
    owner: "Harsh Vardhan",
    status: "Planning",
    health: "Needs Attention",
    stage: "Design",
    location: "Hyderabad",
    startDate: "2026-03-04",
    targetDate: "2026-09-12",
    nextReview: "2026-04-19",
    progress: 34,
    description:
      "Set up the pre-launch operating model for industrial inventory sales, including stakeholder governance, collateral, and broker onboarding.",
    objective:
      "Reduce launch uncertainty by locking the asset narrative, approval flow, and budget guardrails before paid promotion begins.",
    deliveryNotes:
      "Broker onboarding and legal review are the critical path. Budget can stay within threshold if approvals are finalized this month.",
    budget: {
      currency: "INR",
      approved: 11200000,
      committed: 5100000,
      spent: 2900000,
      forecast: 11950000,
    },
    stakeholders: [
      {
        id: "st-ember-1",
        name: "Sonal Kapur",
        title: "Portfolio Head",
        influence: "Executive",
        focusArea: "Approval pace and budget control",
      },
      {
        id: "st-ember-2",
        name: "Rahul Narang",
        title: "Legal Counsel",
        influence: "High",
        focusArea: "Contract timelines and broker terms",
      },
    ],
    coordinators: [
      {
        id: "co-ember-1",
        name: "Mira Dutta",
        function: "Program Management Office",
        timezone: "IST",
        cadence: "Monday steering",
      },
      {
        id: "co-ember-2",
        name: "Ketan Vyas",
        function: "Sales Operations",
        timezone: "IST",
        cadence: "Thursday checkpoint",
      },
    ],
    teamMembers: [
      {
        id: "tm-ember-1",
        name: "Devika Iyer",
        role: "Launch Planner",
        responsibility: "Drives roadmap, dependencies, and risk escalation for launch readiness.",
        allocation: 80,
      },
      {
        id: "tm-ember-2",
        name: "Shyam Pillai",
        role: "Commercial Analyst",
        responsibility: "Maintains pricing scenarios and demand projections.",
        allocation: 55,
      },
      {
        id: "tm-ember-3",
        name: "Roshni Jain",
        role: "Broker Enablement",
        responsibility: "Prepares partner playbooks and onboarding materials.",
        allocation: 60,
      },
    ],
    milestones: [
      {
        id: "ms-ember-1",
        label: "Broker policy sign-off",
        dueDate: "2026-04-20",
        owner: "Rahul Narang",
        status: "In Progress",
      },
      {
        id: "ms-ember-2",
        label: "Launch budget freeze",
        dueDate: "2026-04-26",
        owner: "Sonal Kapur",
        status: "Upcoming",
      },
      {
        id: "ms-ember-3",
        label: "Broker onboarding sprint",
        dueDate: "2026-05-08",
        owner: "Roshni Jain",
        status: "Upcoming",
      },
    ],
    tags: ["Planning", "Industrial", "Broker Program"],
    risks: [
      "Forecast is trending above approved budget because collateral scope expanded.",
      "Legal review can delay broker activation if the contract template is not frozen this week.",
    ],
    lastUpdated: "2026-04-14T11:20:00.000Z",
  },
  {
    id: "project-cedar-cove",
    code: "PRJ-203",
    name: "Cedar Cove Digital Sales Suite",
    client: "Cedar Cove Hospitality",
    sector: "Hospitality",
    owner: "Aparna Nair",
    status: "Active",
    health: "On Track",
    stage: "Execution",
    location: "Goa",
    startDate: "2026-01-18",
    targetDate: "2026-06-30",
    nextReview: "2026-04-23",
    progress: 78,
    description:
      "Create a digital-first sales suite for the resort inventory launch, including live inventory views, on-site presentations, and follow-up automation.",
    objective:
      "Compress response times between walk-ins, consultant follow-up, and quote creation while keeping the launch story premium.",
    deliveryNotes:
      "Content production is nearly complete. The remaining work centers on training, analytics, and handoff to sales leadership.",
    budget: {
      currency: "INR",
      approved: 8600000,
      committed: 6900000,
      spent: 6400000,
      forecast: 8350000,
    },
    stakeholders: [
      {
        id: "st-cedar-1",
        name: "Rohan Bedi",
        title: "Marketing Head",
        influence: "High",
        focusArea: "Brand consistency across touchpoints",
      },
      {
        id: "st-cedar-2",
        name: "Leena George",
        title: "Sales Excellence Lead",
        influence: "High",
        focusArea: "Process adoption and training quality",
      },
    ],
    coordinators: [
      {
        id: "co-cedar-1",
        name: "Pooja Narvekar",
        function: "Delivery Coordinator",
        timezone: "IST",
        cadence: "Daily huddle",
      },
    ],
    teamMembers: [
      {
        id: "tm-cedar-1",
        name: "Karan Sethi",
        role: "Frontend Lead",
        responsibility: "Owns the digital suite interface, responsiveness, and handoff experience.",
        allocation: 70,
      },
      {
        id: "tm-cedar-2",
        name: "Madhuri Kale",
        role: "Enablement Manager",
        responsibility: "Runs consultant training, scripts, and adoption scorecards.",
        allocation: 85,
      },
      {
        id: "tm-cedar-3",
        name: "Anmol Verma",
        role: "Analytics Engineer",
        responsibility: "Builds dashboards for walk-ins, conversions, and campaign attribution.",
        allocation: 50,
      },
    ],
    milestones: [
      {
        id: "ms-cedar-1",
        label: "Sales suite beta",
        dueDate: "2026-04-12",
        owner: "Karan Sethi",
        status: "Delivered",
      },
      {
        id: "ms-cedar-2",
        label: "Field team training",
        dueDate: "2026-04-25",
        owner: "Madhuri Kale",
        status: "In Progress",
      },
      {
        id: "ms-cedar-3",
        label: "Executive dashboard rollout",
        dueDate: "2026-05-02",
        owner: "Anmol Verma",
        status: "Upcoming",
      },
    ],
    tags: ["Digital Sales", "Hospitality", "Enablement"],
    risks: [
      "Adoption dips if field teams do not complete the second training wave.",
    ],
    lastUpdated: "2026-04-16T07:05:00.000Z",
  },
  {
    id: "project-solstice-villas",
    code: "PRJ-204",
    name: "Solstice Urban Villas Handover",
    client: "Solstice Living",
    sector: "Residential",
    owner: "Neeraj Suri",
    status: "Completed",
    health: "Completed",
    stage: "Handover",
    location: "Chennai",
    startDate: "2025-10-08",
    targetDate: "2026-03-30",
    nextReview: "2026-04-18",
    progress: 100,
    description:
      "Close out the villa launch with final handover kits, stakeholder reporting, and archived delivery artifacts for future launches.",
    objective:
      "End the program with clean documentation, budget variance visibility, and reusable delivery templates.",
    deliveryNotes:
      "Project closed with positive variance and strong stakeholder satisfaction. Templates are now ready for reuse.",
    budget: {
      currency: "INR",
      approved: 9300000,
      committed: 9050000,
      spent: 8940000,
      forecast: 8940000,
    },
    stakeholders: [
      {
        id: "st-solstice-1",
        name: "Ila Srinivasan",
        title: "Business Sponsor",
        influence: "Executive",
        focusArea: "Outcome reporting",
      },
    ],
    coordinators: [
      {
        id: "co-solstice-1",
        name: "Vaibhav Kulkarni",
        function: "Closeout Coordinator",
        timezone: "IST",
        cadence: "Weekly summary",
      },
    ],
    teamMembers: [
      {
        id: "tm-solstice-1",
        name: "Jhanvi Patel",
        role: "Documentation Lead",
        responsibility: "Closed all templates, approvals, and repository handoff material.",
        allocation: 40,
      },
      {
        id: "tm-solstice-2",
        name: "Yash Khanna",
        role: "Finance Partner",
        responsibility: "Finalized spend reconciliation and variance notes.",
        allocation: 30,
      },
    ],
    milestones: [
      {
        id: "ms-solstice-1",
        label: "Project closeout pack",
        dueDate: "2026-03-22",
        owner: "Jhanvi Patel",
        status: "Delivered",
      },
      {
        id: "ms-solstice-2",
        label: "Budget variance sign-off",
        dueDate: "2026-03-28",
        owner: "Yash Khanna",
        status: "Delivered",
      },
    ],
    tags: ["Handover", "Completed", "Templates"],
    risks: [],
    lastUpdated: "2026-04-10T09:40:00.000Z",
  },
];

function cloneProjects(projects: ProjectRecord[]) {
  return projects.map((project) => ({
    ...project,
    budget: { ...project.budget },
    stakeholders: project.stakeholders.map((item) => ({ ...item })),
    coordinators: project.coordinators.map((item) => ({ ...item })),
    teamMembers: project.teamMembers.map((item) => ({ ...item })),
    milestones: project.milestones.map((item) => ({ ...item })),
    tags: [...project.tags],
    risks: [...project.risks],
  }));
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function dispatchProjectsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
}

function readStoredProjects(): ProjectRecord[] {
  const storage = getStorage();
  if (!storage) {
    return cloneProjects(PROJECT_SEED);
  }

  const raw = storage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) {
    const seed = cloneProjects(PROJECT_SEED);
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Stored projects are invalid.");
    }
    return parsed as ProjectRecord[];
  } catch {
    const seed = cloneProjects(PROJECT_SEED);
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function writeStoredProjects(projects: ProjectRecord[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  dispatchProjectsChanged();
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function trimList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function sanitizeStakeholders(stakeholders: ProjectStakeholder[]) {
  return stakeholders
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      title: item.title.trim(),
      influence: item.influence.trim(),
      focusArea: item.focusArea.trim(),
    }))
    .filter((item) => item.name || item.title || item.focusArea);
}

function sanitizeCoordinators(coordinators: ProjectCoordinator[]) {
  return coordinators
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      function: item.function.trim(),
      timezone: item.timezone.trim(),
      cadence: item.cadence.trim(),
    }))
    .filter((item) => item.name || item.function || item.cadence);
}

function sanitizeTeamMembers(teamMembers: ProjectTeamMember[]) {
  return teamMembers
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      role: item.role.trim(),
      responsibility: item.responsibility.trim(),
      allocation: clampProgress(item.allocation),
    }))
    .filter((item) => item.name || item.role || item.responsibility);
}

function sanitizeMilestones(milestones: ProjectMilestone[]) {
  return milestones
    .map((item) => ({
      ...item,
      label: item.label.trim(),
      dueDate: item.dueDate,
      owner: item.owner.trim(),
    }))
    .filter((item) => item.label);
}

function buildProjectCode(projectsCount: number) {
  return `PRJ-${String(projectsCount + 201).padStart(3, "0")}`;
}

function makeId(prefix: string) {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${token}`;
}

export function getProjectsSnapshot() {
  return readStoredProjects();
}

export function getProjectById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return readStoredProjects().find((project) => project.id === id) ?? null;
}

export function createProjectRecord(input: ProjectFormData) {
  const projects = readStoredProjects();
  const now = new Date().toISOString();
  const nextProject: ProjectRecord = {
    ...input,
    id: makeId("project"),
    code: buildProjectCode(projects.length),
    name: input.name.trim(),
    client: input.client.trim(),
    sector: input.sector.trim(),
    owner: input.owner.trim(),
    location: input.location.trim(),
    description: input.description.trim(),
    objective: input.objective.trim(),
    deliveryNotes: input.deliveryNotes.trim(),
    progress: clampProgress(input.progress),
    budget: {
      currency: input.budget.currency.trim().toUpperCase() || "INR",
      approved: Math.max(0, input.budget.approved),
      committed: Math.max(0, input.budget.committed),
      spent: Math.max(0, input.budget.spent),
      forecast: Math.max(0, input.budget.forecast),
    },
    stakeholders: sanitizeStakeholders(input.stakeholders),
    coordinators: sanitizeCoordinators(input.coordinators),
    teamMembers: sanitizeTeamMembers(input.teamMembers),
    milestones: sanitizeMilestones(input.milestones),
    tags: trimList(input.tags),
    risks: trimList(input.risks),
    lastUpdated: now,
  };

  writeStoredProjects([nextProject, ...projects]);
  return nextProject;
}

export function useProjectCatalog() {
  const [projects, setProjects] = useState<ProjectRecord[]>(() => getProjectsSnapshot());

  useEffect(() => {
    const syncProjects = () => {
      setProjects(getProjectsSnapshot());
    };

    syncProjects();

    window.addEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
    window.addEventListener("storage", syncProjects);

    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, syncProjects);
      window.removeEventListener("storage", syncProjects);
    };
  }, []);

  return projects;
}

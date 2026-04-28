import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  FolderKanban,
  Plus,
  Search,
  Users2,
  Wallet,
} from "lucide-react";
import ProjectManagementLayout from "./layout";
import { ProjectDetailPanel } from "./components/ProjectDetailPanel";
import { useProjectCatalog } from "./store";
import { ProjectHealthBadge, ProjectStageBadge, ProjectStatusBadge } from "./project-ui";
import {
  formatProjectCompactCurrency,
  formatProjectDate,
  getInitials,
} from "./project-formatters";
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectHealth,
  type ProjectStage,
  type ProjectStatus,
} from "./types";

type ListFilter<T extends string> = T | "ALL";

function StatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { id: routeProjectId } = useParams<{ id?: string }>();
  const projects = useProjectCatalog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListFilter<ProjectStatus>>("ALL");
  const [healthFilter, setHealthFilter] = useState<ListFilter<ProjectHealth>>("ALL");
  const [stageFilter, setStageFilter] = useState<ListFilter<ProjectStage>>("ALL");
  const deferredSearch = useDeferredValue(search);

  const filteredProjects = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return [...projects]
      .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated))
      .filter((project) => {
        if (statusFilter !== "ALL" && project.status !== statusFilter) {
          return false;
        }
        if (healthFilter !== "ALL" && project.health !== healthFilter) {
          return false;
        }
        if (stageFilter !== "ALL" && project.stage !== stageFilter) {
          return false;
        }
        if (!query) {
          return true;
        }

        const haystack = [
          project.name,
          project.client,
          project.owner,
          project.sector,
          project.location,
          project.code,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
  }, [deferredSearch, healthFilter, projects, stageFilter, statusFilter]);

  const selectedProject = useMemo(
    () => filteredProjects.find((project) => project.id === routeProjectId) ?? projects.find((project) => project.id === routeProjectId) ?? null,
    [filteredProjects, projects, routeProjectId]
  );

  const totalBudget = useMemo(
    () => projects.reduce((sum, project) => sum + project.budget.approved, 0),
    [projects]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "Active").length,
    [projects]
  );
  const atRiskProjects = useMemo(
    () => projects.filter((project) => project.health === "At Risk" || project.health === "Needs Attention").length,
    [projects]
  );
  const avgProgress = useMemo(() => {
    if (projects.length === 0) {
      return 0;
    }
    return Math.round(
      projects.reduce((sum, project) => sum + project.progress, 0) / projects.length
    );
  }, [projects]);

  const statusCounts = useMemo(() => {
    return PROJECT_STATUS_OPTIONS.reduce<Record<ProjectStatus, number>>((accumulator, status) => {
      accumulator[status] = projects.filter((project) => project.status === status).length;
      return accumulator;
    }, {} as Record<ProjectStatus, number>);
  }, [projects]);

  return (
    <>
      <ProjectManagementLayout
        actionButton={
          <Link
            to="/project-management/projects/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <StatCard
            label="Projects"
            value={projects.length}
            helper={`${activeProjects} actively moving`}
            icon={<FolderKanban className="h-5 w-5 text-sky-600" />}
            accent="bg-sky-50 text-sky-600"
          />
          <StatCard
            label="Approved Budget"
            value={formatProjectCompactCurrency(totalBudget, "INR")}
            helper="Portfolio-wide approved spend"
            icon={<Wallet className="h-5 w-5 text-emerald-600" />}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Attention Needed"
            value={atRiskProjects}
            helper="Needs attention or at risk"
            icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Average Progress"
            value={`${avgProgress}%`}
            helper="Across the current portfolio"
            icon={<Users2 className="h-5 w-5 text-violet-600" />}
            accent="bg-violet-50 text-violet-600"
          />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {PROJECT_STATUS_OPTIONS.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(active ? "ALL" : status)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status} · {statusCounts[status]}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search project, client, owner, code..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <select
              value={healthFilter}
              onChange={(event) => setHealthFilter(event.target.value as ListFilter<ProjectHealth>)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            >
              <option value="ALL">All Health</option>
              {PROJECT_HEALTH_OPTIONS.map((health) => (
                <option key={health} value={health}>
                  {health}
                </option>
              ))}
            </select>

            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as ListFilter<ProjectStage>)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            >
              <option value="ALL">All Stages</option>
              {PROJECT_STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(220px,1.8fr)_minmax(160px,1fr)_140px_140px_140px_120px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 lg:grid">
            <span>Project</span>
            <span>Client</span>
            <span>Stage</span>
            <span>Health</span>
            <span>Owner</span>
            <span>Budget</span>
            <span>Delivery</span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredProjects.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">No projects match the current filters.</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/project-management/projects/${project.id}`)}
                  className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(220px,1.8fr)_minmax(160px,1fr)_140px_140px_140px_120px_120px] lg:items-center lg:gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sm font-semibold text-sky-700">
                        {getInitials(project.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{project.code}</span>
                          <span>·</span>
                          <span>{project.sector}</span>
                          <span>·</span>
                          <span>{project.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-700">{project.client}</div>
                    <div className="lg:justify-self-start">
                      <ProjectStageBadge stage={project.stage} />
                    </div>
                    <div className="lg:justify-self-start">
                      <ProjectHealthBadge health={project.health} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {getInitials(project.owner)}
                      </div>
                      <span>{project.owner}</span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatProjectCompactCurrency(project.budget.approved, project.budget.currency)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{project.progress}%</p>
                      <p className="text-xs text-slate-500">Updated {formatProjectDate(project.lastUpdated)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:hidden">
                      <ProjectStatusBadge status={project.status} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </ProjectManagementLayout>

      {routeProjectId ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => navigate("/project-management/projects")}
          />
          <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[62vw] lg:max-w-[980px]">
            <ProjectDetailPanel
              project={selectedProject}
              onClose={() => navigate("/project-management/projects")}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

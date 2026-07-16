# project-management — Module Audit

## Summary

The project-management module is a substantial, feature-complete frontend module (~4 000 lines) covering project CRUD, kanban boards, milestones, tasks, meetings, documents, team directory, and a configuration page. The backend integration uses raw `useEffect`+`useState` instead of TanStack Query, leading to manual re-fetch logic, inconsistent loading/error UX, and no query-key deduplication. The headline risks are: `teams-page.tsx` makes a redundant API call for projects it could get from context; `MeetingsPage.tsx` is a 1 878-line god-component; UI CSS class strings leak into the API payload for meeting attachments; the project-slicing limit of 5 in the meetings dropdown silently hides any project beyond the fifth; and there is a three-way duplication of both `Avatar` and `initials()` inside the same module.

---

## Surface map

### Pages / routes

| File | Route area | Lines |
|---|---|---|
| `page.tsx` | `/projects` (list + detail drawer) | 701 |
| `pages/DashboardPage.tsx` | `/projects/dashboard` | 153 |
| `pages/KanbanPage.tsx` | `/projects/kanban` | 124 |
| `pages/TasksPage.tsx` | `/projects/tasks` | 147 |
| `pages/MilestonesPage.tsx` | `/projects/milestones` | 148 |
| `pages/MeetingsPage.tsx` | `/projects/meetings` | 1 877 |
| `pages/DocumentsPage.tsx` | `/projects/documents` | 101 |
| `teams-page.tsx` | `/projects/teams` | 523 |
| `config-page.tsx` | `/projects/config` | 219 |

### API surface (`api.ts`)

| Function | Method | Endpoint |
|---|---|---|
| `fetchProjects` | GET | `/v1/projects` |
| `fetchProjectSummary` | GET | `/v1/projects/summary` |
| `createProject` | POST | `/v1/projects` |
| `updateProject` | PUT | `/v1/projects/:id` |
| `syncProject` | PUT | `/v1/projects/:id` |
| `fetchProjectMeetings` | GET | `/v1/project-meetings` |
| `createProjectMeeting` | POST | `/v1/project-meetings` |
| `updateProjectMeeting` | PUT | `/v1/project-meetings/:id` |
| `updateProjectMeetingStatus` | PATCH | `/v1/project-meetings/:id/status` |
| `deleteProjectMeeting` | DELETE | `/v1/project-meetings/:id` |

### Architecture notes

- **No TanStack Query** — zero `useQuery`/`useMutation` usage. All data fetching is manual `useEffect`+`useState`.
- **No hooks.ts** — shared query logic lives inline in component-level effects.
- **Context pattern** — `ProjectsContext` in `context.tsx` provided by `layout.tsx`. Only 8 of 9 pages consume it; `teams-page.tsx` bypasses it entirely.
- **localStorage cache** — `utils.ts` (`loadProjectCache`/`saveProjectCache`) supplements backend data; used as an offline fallback and to preserve fields the backend doesn't round-trip cleanly.

---

## Findings

### P0 — Critical

---

**PRO-01 · UI CSS class string sent as API field (`tone`)**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 827–843, `src/modules/project-management/api.ts` lines 69–73
- Severity: **P0** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
// MeetingsPage.tsx:140
const attachmentTone = 'border border-slate-200 bg-white text-slate-500'

// MeetingsPage.tsx:831–834
const nextFiles = Array.from(files).map((file) => ({
  name: file.name,
  size: fileSizeLabel(file.size),
  tone: attachmentTone,   // <— Tailwind class string
}))
```

```ts
// api.ts:69–73
export type ProjectMeetingAttachmentPayload = {
  name: string
  size: string
  tone: string   // <— persisted to backend
}
```

`tone` is a Tailwind CSS class string (`"border border-slate-200 bg-white text-slate-500"`) that is serialised into the `ProjectMeetingAttachmentPayload` and sent verbatim to the backend. The backend persists it and returns it. This is a UI implementation detail that has no meaning to the server, pollutes the data model, and will cause display bugs if the Tailwind classes ever change or if the data is consumed by any other client.

**Fix:** Remove `tone` from the API payload and type. Derive the display class locally from the attachment's `type` or `name` extension when rendering.

```ts
// api.ts — remove tone from payload
export type ProjectMeetingAttachmentPayload = {
  name: string
  size: string
  // tone removed
}

// MeetingsPage.tsx — derive at render time
const attachmentIconCls = (name: string) =>
  name.endsWith('.pdf') ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'
```

---

**PRO-02 · Incorrect type alias: `ProjectStatus` used for `priority` field**
- File: `src/modules/project-management/api.ts` line 27
- Severity: **P0** | Confidence: **High**
- Owner: Chaitanya2872

```ts
type BackendProject = {
  // ...
  priority: ProjectStatus | 'Low' | 'Medium' | 'High' | 'Critical' | null
  // ^— ProjectStatus = 'Draft' | 'Planning' | 'In Progress' | ...
  //    These are workflow statuses, not priority values
}
```

`ProjectStatus` contains strings like `'Draft'`, `'Planning'`, `'In Progress'`, `'Closure Pending'`, etc. None of these are valid priority values. The union means TypeScript will accept `'In Progress'` as a valid priority, and the downstream cast on line 344 (`project.priority as Project['priority'] | null`) silently coerces any backend status-shaped priority into the priority field.

**Fix:** Use `Priority` (which is already defined in `types.ts`) instead:

```ts
priority: Priority | null
// where Priority = 'Low' | 'Medium' | 'High' | 'Critical'
```

---

### P1 — High

---

**PRO-03 · `teams-page.tsx` makes a redundant `GET /v1/projects` call, bypassing the shared context**
- File: `src/modules/project-management/teams-page.tsx` lines 12, 388–406
- Severity: **P1** | Confidence: **High**
- Owner: Chaitanya2872 (layout.tsx owner, by extension of context)

```ts
// teams-page.tsx:12
import { fetchProjects as fetchBackendProjects } from './api'

// teams-page.tsx:388–406
useEffect(() => {
  let cancelled = false
  fetchBackendProjects()
    .then((nextProjects) => { if (!cancelled) setProjects(nextProjects) })
    .catch(() => { if (!cancelled) setProjects([]) })
  return () => { cancelled = true }
}, [])
```

`layout.tsx` already fetches projects on mount and provides them via `ProjectsContext`. `teams-page.tsx` ignores the context and issues a second independent API call, doubling the network load and creating a second independent copy of project state (which can diverge from any edits made on the list page without a page reload).

**Fix:** Consume the context instead:

```tsx
// teams-page.tsx
import { useProjectsContext } from './context'
const { projects } = useProjectsContext()
// remove local useState<Project[]> and the useEffect fetch
```

---

**PRO-04 · `MeetingsPage` useEffect re-fetches meetings on every project state mutation**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 560, 582–598
- Severity: **P1** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
const projectOptions = useMemo(() => toProjectOptions(projects), [projects])

useEffect(() => {
  let cancelled = false
  fetchProjectMeetings()
    .then(...)
  return () => { cancelled = true }
}, [projectOptions])   // <— re-runs whenever projects state changes
```

`projectOptions` is a `useMemo` derived from `projects`. Every time `layout.tsx` mutates `projects` (adding a task, updating a milestone, syncing a project), a new `projectOptions` array is created (new object identity). This triggers the `useEffect`, causing `GET /v1/project-meetings` to fire again. In a busy session this can be dozens of unnecessary refetches.

**Fix:** Stabilise the dependency. Either (a) fetch meetings only once on mount (`[]` dependency) and provide a manual refresh button, or (b) extract a stable `projectIds` string as a dependency:

```ts
const projectIds = useMemo(
  () => projects.map((p) => p.id).join(','),
  [projects],
)
useEffect(() => {
  fetchProjectMeetings()
  // ...
}, [projectIds])   // stable string, changes only when project list changes
```

---

**PRO-05 · `toProjectOptions` silently caps projects at 5 — meetings can't be linked to project #6+**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` line 156
- Severity: **P1** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
function toProjectOptions(projects: Project[]): ProjectOption[] {
  return projects.slice(0, 5).map((project) => { ... })
}
```

This hard limit means users with 6+ projects cannot schedule a meeting for any project beyond the first 5 in the array. The `projectFilter` dropdown in the meeting list also only shows those 5 projects. There is no indication to the user that projects are missing.

**Fix:** Remove the slice or, if performance is a concern, implement proper pagination/search in the project selector.

---

**PRO-06 · God-component: `MeetingsPage.tsx` is 1 877 lines with 18 `useState` calls**
- File: `src/modules/project-management/pages/MeetingsPage.tsx`
- Severity: **P1** | Confidence: **High**
- Owner: Vaishnavi Nerella

The file contains the full list view, detail panel, scheduler form, RSVP management, note-taking, action-item editing, attachment upload, and inline agenda editing — all in a single component function (`ProjectsMeetingsPage`) with 18 `useState` variables. The 20+ helper functions defined at module level add another ~430 lines of context that is implicitly coupled to the component.

**Fix:** Extract at minimum:
- `<MeetingSchedulerForm>` (the scheduler section, ~180 lines)
- `<MeetingDetailPanel>` (the right panel, ~500 lines)
- `<MeetingListItem>` (each list card)
- A custom `useMeetings()` hook for the fetch + local mutation logic

---

**PRO-07 · Components defined inside `renderActionPanel` inside `ProjectsListPage` (re-created on every render)**
- File: `src/modules/project-management/page.tsx` lines 92–125
- Severity: **P1** | Confidence: **High**
- Owner: Chaitanya2872

```tsx
function renderActionPanel(project: Project) {
  // ...
  const Panel = ({ ... }) => (...)     // ← new component on every render
  const BtnPrimary = ({ ... }) => (...) // ← new component on every render
  const BtnSuccess = ({ ... }) => (...)
  const BtnGhost   = ({ ... }) => (...)
  const BtnDanger  = ({ ... }) => (...)
```

Five React components (`Panel`, `BtnPrimary`, `BtnSuccess`, `BtnGhost`, `BtnDanger`) are defined as `const` arrow functions inside `renderActionPanel`, which is itself called inside `renderDetailContent`, which is called inside `ProjectsListPage`'s render. React treats these as new component types on every render, causing their subtree to be fully unmounted and remounted instead of reconciled. This breaks focus, transitions, and any internal state those components might hold, and forces unnecessary DOM mutations on every project state change.

**Fix:** Hoist all five components to module level (outside `ProjectsListPage`).

---

**PRO-08 · Silent save failure — modal shows no error when `createProject`/`updateProject` throws**
- File: `src/modules/project-management/layout.tsx` lines 119–133
- Severity: **P1** | Confidence: **High**
- Owner: Chaitanya2872

```ts
try {
  const saved = await createBackendProject(next)
  setProjects((cur) => [saved, ...cur]); setCurrentId(saved.id)
  setBackendStatus('connected'); closeModal()
} catch { setBackendStatus('offline') }
finally { setIsSaving(false) }
```

When `createProject` or `updateProject` throws, the modal stays open, `isSaving` is reset to `false`, and `backendStatus` is set to `'offline'`. The `offline` banner is rendered only in `page.tsx` (the projects list), not inside the modal. The user saving a new project sees the spinner disappear with no message explaining why the project was not created.

**Fix:** Add a local `saveError` state, display it inside the modal:

```ts
const [saveError, setSaveError] = useState<string | null>(null)
// ...
} catch (err) {
  setSaveError('Unable to save project. Please try again.')
  setBackendStatus('offline')
}
```

---

### P2 — Medium

---

**PRO-09 · `updateProjectFn` mutates a closed-over external variable to capture functional `setState` result**
- File: `src/modules/project-management/layout.tsx` lines 136–152
- Severity: **P2** | Confidence: **High**
- Owner: Chaitanya2872

```ts
const updateProjectFn = (updater: (p: Project) => Project) => {
  if (!currentProject) return
  let updatedProject: Project | null = null          // mutable external var
  setProjects((cur) => cur.map((p) => {
    if (p.id !== currentProject.id) return p
    updatedProject = updater(p)                       // side-effect inside setState
    return updatedProject
  }))
  const projectToSync = updatedProject as Project | null  // read after setState
  if (!projectToSync) return
  void syncBackendProject(projectToSync.id, projectToSync)
```

Assigning to an external `let` variable inside a `setState` updater is a side-effect pattern that React explicitly discourages (the updater may be called multiple times in StrictMode). In React 18 Strict Mode this callback runs twice — `updatedProject` ends up being the value from the second invocation.

**Fix:** Use `useRef` or restructure to avoid the anti-pattern:

```ts
const updateProjectFn = (updater: (p: Project) => Project) => {
  if (!currentProject) return
  const updated = updater(currentProject)
  setProjects((cur) => cur.map((p) => p.id === updated.id ? updated : p))
  void syncBackendProject(updated.id, updated)
    .then((saved) => setProjects((cur) => cur.map((p) => p.id === saved.id ? saved : p)))
    .catch(() => setBackendStatus('offline'))
}
```

---

**PRO-10 · `config-page.tsx` is a purely cosmetic stub — workflow toggles have no backend effect**
- File: `src/modules/project-management/config-page.tsx` lines 59–63
- Severity: **P2** | Confidence: **High**
- Owner: (no backend calls, no git history for this file beyond initial commit)

```tsx
export default function ProjectConfigPage() {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>(DEFAULT_WORKFLOWS)
  const toggleWorkflow = (id: string) =>
    setWorkflows((cur) => cur.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)))
  // no API calls, no persistence
```

The config page presents approval workflow toggles, category management, priority levels, and template listings — all hardcoded with no backend integration. State resets on page navigation. Toggling a workflow has zero effect on the application's actual approval flow. This misleads users and reviewers into thinking the system is configurable when it is not.

**Fix:** Either connect the page to a real configuration API, or add a clear "read-only preview" notice and remove interactive controls until the API exists.

---

**PRO-11 · Hardcoded IST-only timezone in `toInstant` — any other timezone produces `Z` (UTC)**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 324–327
- Severity: **P2** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
function toInstant(date: string, time: string, timezone: string) {
  const offset = timezone === 'IST' ? '+05:30' : 'Z'
  return `${date}T${time}:00${offset}`
}
```

The timezone selector offers `IST`, `UTC`, and `Pacific Time`. Selecting Pacific Time (`PST` = `-08:00`) produces `'Z'` (UTC), so a meeting scheduled for 3 PM Pacific is stored as 3 PM UTC — a 8-hour error.

**Fix:** Use a timezone offset lookup or `Intl.DateTimeFormat` to derive the correct offset for each zone:

```ts
const OFFSET: Record<string, string> = {
  IST: '+05:30',
  UTC: '+00:00',
  PST: '-08:00',
}
function toInstant(date: string, time: string, timezone: string) {
  const offset = OFFSET[timezone] ?? '+00:00'
  return `${date}T${time}:00${offset}`
}
```

---

**PRO-12 · `saveProjectCache` called on every project state mutation via `useEffect([projects])`**
- File: `src/modules/project-management/layout.tsx` lines 46–48
- Severity: **P2** | Confidence: **High**
- Owner: Chaitanya2872

```ts
useEffect(() => {
  saveProjectCache(projects)
}, [projects])
```

`projects` changes on every task status update, milestone update, or sync response. Each change triggers `saveProjectCache`, which calls `JSON.stringify` on the full projects array and writes it to `localStorage`. For 20+ large projects this serialises several hundred KB on every minor interaction.

**Fix:** Debounce the cache write, or write to cache only in `createProject`/`updateProject`/`syncProject` success handlers (which already call `saveProjectCache` individually).

---

**PRO-13 · `today` is a module-level constant — stale across midnight or multi-day sessions**
- File: `src/modules/project-management/data.ts` line 129
- Severity: **P2** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
export const today = new Date()
```

`today` is evaluated once at module load time. If a user keeps the app open past midnight, `today` is still the previous day. This affects `isProjectOverdue` (wrong overdue classification), `deadlineLabel` (wrong day count), default form dates, and activity history timestamps.

**Fix:** Replace with a function or a hook:

```ts
export const getToday = () => new Date()
// Callers: format(getToday(), 'yyyy-MM-dd') instead of format(today, 'yyyy-MM-dd')
```

---

**PRO-14 · `roleFor(name, fallback)` always returns `fallback` when name is truthy — the name parameter has no effect**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 151–153
- Severity: **P2** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
function roleFor(name: string, fallback = 'Team Member') {
  return name.trim() ? fallback : 'Team Member'
}
```

The function is named `roleFor(name, ...)` implying the name is used to look up a role, but it only checks whether `name` is non-empty and returns `fallback` if so. Every non-empty name returns `fallback`; `name` is never used to determine the actual role. Calls like `roleFor(organizerName, 'Organizer')` and `roleFor(name, 'Team Member')` always produce the fallback string regardless of who the person is.

**Fix:** If no lookup is needed, replace with a direct ternary at call sites and remove the function:

```ts
role: organizerName ? 'Organizer' : 'Team Member'
```

---

**PRO-15 · Dead hidden DOM: several UI sections use `className="hidden"` as a feature flag**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 905, 1115–1119, 1163, 1262–1282, 1357–1361, 1365–1386, 1524, 1529–1545, 1557
- Severity: **P2** | Confidence: **High**
- Owner: Vaishnavi Nerella

Nine separate sections — including the stat cards row, the type filter dropdown, the context menu, the detail-panel tab bar, the full "Action Items" section, and the "View all" buttons — are permanently hidden via `className="hidden"`. Their state (filters, event handlers) is still initialised and maintained. The `typeFilter` state variable and its `setTypeFilter` call are wired to a hidden `<SelectInput>`, meaning the `filteredMeetings` memo includes a filter that can never be changed by the user.

**Fix:** Remove dead sections entirely from the JSX and clean up the corresponding state variables (`typeFilter`, `dateFilter`, `statStyles`, etc.).

---

### P3 — Low

---

**PRO-16 · Compound index-based list keys may collide for duplicate agenda/note strings**
- File: `src/modules/project-management/pages/MeetingsPage.tsx` lines 1061, 1587, 1753
- Severity: **P3** | Confidence: **High**
- Owner: Vaishnavi Nerella

```tsx
{scheduleForm.agenda.map((item, index) => (
  <div key={`${item}-${index}`} ...>   // line 1061
```

Using `${item}-${index}` avoids pure-index keys but still produces identical keys if two agenda items have the same text (e.g., two `"Review"`). React will warn and reconciliation will be incorrect in that case.

**Fix:** Use a stable generated UUID for each agenda item (store it in the form state alongside the text), or accept that index-only is acceptable for a pure display list that is never reordered.

---

**PRO-17 · `BackendProject.team[].role` and `permissions` are cast with `as` without validation**
- File: `src/modules/project-management/api.ts` lines 362–364
- Severity: **P3** | Confidence: **High**
- Owner: Chaitanya2872

```ts
role: member.role as Project['team'][number]['role'],
permissions: member.permissions as Project['team'][number]['permissions'],
```

If the backend returns a role string not in `MemberRole` (e.g., after a schema migration), the type cast silences the mismatch. Downstream code that does `Record<MemberRole, ...>` lookups (like `defaultPermissionsForRole`) will return `undefined` at runtime for unrecognised roles, but TypeScript will not warn.

**Fix:** Validate and normalise at the boundary:

```ts
const VALID_ROLES = new Set(memberRoles)
role: VALID_ROLES.has(member.role as MemberRole) ? member.role as MemberRole : 'Developer',
```

---

**PRO-18 · `owners` and `departmentTeamMembers` in `data.ts` are exported but never imported — dead code**
- File: `src/modules/project-management/data.ts` lines 101–127
- Severity: **P3** | Confidence: **High**
- Owner: Vaishnavi Nerella

```ts
export const owners = ['Ananya Rao', 'David Kim', 'Meera Iyer', 'Omar Khan', 'Priya Shah']
export const departmentTeamMembers: Record<string, string[]> = { ... }
```

No file in the repo imports `owners` or `departmentTeamMembers`. These appear to be placeholder hardcoded people from an earlier iteration when the user directory API was not yet connected. They are now dead exports.

**Fix:** Remove both constants. The form now uses `useUserDirectory()` hook results.

---

**PRO-19 · `member.name` used as React key — collides if a team member appears twice**
- File: `src/modules/project-management/page.tsx` lines 250, 354; `components/ProjectForm.tsx` line 701; `teams-page.tsx` line 150
- Severity: **P3** | Confidence: **Med**
- Owner: Chaitanya2872

```tsx
{formState.team.map((member) => (
  <div key={member.name} ...>   // ProjectForm.tsx:701
```

`addTeamMember` checks `formState.team.some((member) => member.name === name)` to prevent duplicates, so this is currently safe. However, the guard is only in `ProjectForm` — the `updateProjectFn` path has no such guard. If a backend response ever includes duplicate names, the duplicate `key` will cause silent reconciliation bugs.

**Fix:** Add a stable `id` field to `TeamMember` and use it as the key.

---

## Redundancy

### Within the module

| Clone A | Clone B | What is duplicated |
|---|---|---|
| `components/common.tsx:12–16` (`initials`) | `teams-page.tsx:54–56` (`initials`) | Identical character-to-initial extraction logic — different implementations (common.tsx handles single-word names differently) |
| `components/common.tsx:24–34` (`Avatar`) | `teams-page.tsx:86–101` (`Avatar`) | Avatar component; teams-page adds `colorIdx` but the rendering pattern is duplicated |
| `components/common.tsx:24–34` (`Avatar`) | `pages/MeetingsPage.tsx:455–463` (`Avatar`) | Third Avatar implementation — this one uses a `size` string (Tailwind class) instead of an enum |
| `utils.ts:153–155` (`formatDate`) | `pages/MeetingsPage.tsx:200–207` (`formatMeetingDate`) | Date formatting; different input format but the `toLocaleDateString('en-GB')` output is the same |
| `utils.ts:15–30` (`statusColorMap`) | `teams-page.tsx:22–37` (`STATUS_CLS`) | Full `Record<ProjectStatus, string>` color-to-status mapping duplicated; teams-page's version omits the `dot` field that `shared.tsx:STATUS_CFG` already provides |
| `pages/MilestonesPage.tsx:111–137` (milestone action buttons) | `page.tsx:475–481` (milestone action buttons) | The exact same 7-status milestone action button pattern rendered identically in both the milestone page and the project detail drawer |

### Cross-module

| Module A | Module B | What is duplicated |
|---|---|---|
| `src/modules/project-management/components/common.tsx:12–34` (`initials`, `Avatar`) | `src/modules/task-management/page.tsx:422–426` (`initials`), `4115–4126` (`Avatar`) | Avatar and initials helpers — each module re-implements the pattern independently |
| `src/modules/project-management/utils.ts:153–155` (`formatDate`) | `src/lib/utils.ts` (`formatDate`) | `formatDate` exists in the shared lib but the project-management module defines its own version instead of importing from `@/lib/utils` |

---

## Tests & gaps

- **Zero test files** exist in this module (`find` returns nothing for `*.test.*` or `*.spec.*`).
- No unit tests for `mapProject` (the most complex mapping function, ~80 lines with multiple fallback chains).
- No tests for `calcProgress`, `isProjectOverdue`, `deadlineLabel`.
- No integration tests for the `saveProject` flow (create/update + cache update).
- The `toInstant` timezone bug (PRO-11) would be immediately caught by a single parameterised test.
- The `projectOptions.slice(0,5)` issue (PRO-05) has no test preventing the cap from being added again.

---

## Coverage note

**Fully read (line-by-line):**
- `api.ts` (481 lines)
- `types.ts` (324 lines)
- `utils.ts` (196 lines)
- `data.ts` (129 lines)
- `context.tsx` (70 lines)
- `shared.tsx` (90 lines)
- `layout.tsx` (258 lines)
- `page.tsx` (701 lines)
- `pages/MeetingsPage.tsx` (1 877 lines — both pages)
- `pages/DashboardPage.tsx`, `TasksPage.tsx`, `MilestonesPage.tsx`, `KanbanPage.tsx`, `DocumentsPage.tsx`
- `components/ProjectForm.tsx` (1 180 lines)
- `components/ComboSelect.tsx` (269 lines)
- `components/common.tsx` (69 lines)
- `teams-page.tsx` (523 lines)
- `config-page.tsx` (219 lines)

**Skimmed / spot-checked:**
- `template-config.ts` (879 lines) — structure verified, per-template field definitions not audited in detail.
- `project-management.css` — confirmed empty (one comment line).

**Confidence overall: High** for all P0–P2 findings. `template-config.ts` internals and any server-side validation behaviour are not covered by this audit.

**selfGaps:** The `template-config.ts` file (879 lines, 10 template definitions) was only structurally reviewed; field-level binding correctness for each template was not exhaustively checked. Any correctness bugs in template field bindings to `techStack.*` or `repository.*` sub-fields could be missed.

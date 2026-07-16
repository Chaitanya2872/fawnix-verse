# task-management — Module Audit

> Audited: 2026-07-14 | Auditor: Claude Sonnet 4.6 | Codebase: fawnix-verse

---

## Summary

The `task-management` module is the largest and most complex module in the repository, providing a full task execution platform: tree-hierarchy views (list, board, calendar, timeline), space management, SSE streaming, AI-based note import, and PDF report generation. The module is broadly functional but carries serious architectural debts: `page.tsx` is a 4 128-line god-component holding 28 `useState` calls, three custom select components, three full form implementations, six panels, and a jsPDF export pipeline — all inlined. Three `useEffect` blocks use `Promise.resolve().then()` to defer `setState`, which is a suppressed linting violation masking real structural problems. The workspace overview page (`workspace-page.tsx`) independently opens a second SSE connection to the same event stream, doubling backend connections for users who land on that route first. Utility functions (`toLabel`, `formatLongDate`, `formatRelativeDate`, `Avatar`, `initials`) are copy-pasted across files within the module and duplicated in at least two other modules.

---

## Surface Map

### Pages / Routes

| Route | File | Lines | Description |
|---|---|---|---|
| `/tasks` | `page.tsx` | 4 128 | God-component: task list/board/calendar/timeline, panels, drawers, drag-drop, PDF export |
| `/tasks/workspace` | `workspace-page.tsx` | 414 | Workspace overview: inbox, my-tasks, schedule, team-spaces sidebar |

### API Layer

| File | Lines | Coverage |
|---|---|---|
| `api.ts` | 514 | Full CRUD for tasks, spaces, invitations, members; timer start/stop; SSE stream; AI import |
| `hooks.ts` | 406 | TanStack Query wrappers; mutation invalidation helpers; re-exports `connectTaskStream` |
| `types.ts` | 413 | Const-array enums, domain types — well-typed overall |

### Components

| File | Lines | Description |
|---|---|---|
| `components/TaskWorkspace.tsx` | 324 | `TaskWorkspaceSidebar` and `TaskInboxPanel` — standalone presentational |
| `components/index.ts` | 6 | Re-export barrel |

### Inlined sub-components (in `page.tsx`)

`Drawer`, `FloatingSelect`, `AssigneeSelect`, `AssigneeMultiSelect`, `ViewDropdown`, `MetricStrip`, `TaskRow`, `DetailPanel`, `DetailSection`, `TaskEditor`, `SpaceEditor`, `TaskImportPanel`, `TaskReportPanel`, `ReportMetricTile`, `SpaceMembersPanel`, `Field`, `SelectField`, `PanelState`, `InfoCard`, `InlineMeta`, `CompactEditField`, `StatusDot`, `Avatar`

### Query keys

| Factory | Key array | Notes |
|---|---|---|
| `taskKeys.all` | `["tasks"]` | Root |
| `taskKeys.dashboard()` | `["tasks","dashboard"]` | |
| `taskKeys.list(filter)` | `["tasks","list",filter]` | |
| `taskKeys.tree(filter)` | `["tasks","tree",filter]` | |
| `taskKeys.detail(id)` | `["tasks","detail",id]` | |
| `taskKeys.users()` | `["tasks","users"]` | |
| Report (inline) | `["tasks","report",filters]` | NOT in `taskKeys` factory — inline at `hooks.ts:78` |
| `spaceKeys.all` | `["task-spaces"]` | |
| `spaceKeys.lists()` / `spaceKeys.list()` | `["task-spaces","list"]` | `list` wraps `lists` unnecessarily — see TAS-08 |
| `spaceKeys.detail(id)` | `["task-spaces","detail",id]` | |
| `spaceKeys.invitations()` | `["task-spaces","invitations"]` | |

---

## Findings

### P0 — Critical

---

#### TAS-01 · Dual SSE connections — double backend load per user

**File:line:** `page.tsx:850` and `workspace-page.tsx:166`
**Severity/Confidence:** P0 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:849–859
useEffect(() => {
  const cleanup = connectTaskStream((event) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    ...
  });
  return cleanup;
}, [queryClient]);

// workspace-page.tsx:165–174  (identical pattern)
useEffect(() => {
  const cleanup = connectTaskStream((event) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    ...
  });
  return cleanup;
}, [queryClient]);
```

**Why it is wrong:** `connectTaskStream` opens a raw `fetch` SSE connection to `/tasks/stream`. Both pages call it independently. The router mounts each on a separate route (`/tasks` and `/tasks/workspace`), so a user navigating between the two will have both alive at once — two persistent HTTP/2 or HTTP/1.1 connections per browser tab to the same streaming endpoint. The server must handle the duplicate fan-out; combined with the 3-second reconnect loop, the tail risk under poor networks is four concurrent connections.

**Fix:** Move `connectTaskStream` to a React context or Zustand store that is a singleton per tab. Connect once at layout level and expose the subscription. Alternatively, lift the `useEffect` to the shared layout component that wraps both routes.

```tsx
// providers/TaskStreamProvider.tsx
export function TaskStreamProvider({ children }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    return connectTaskStream((event) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
      if (event.spaceId)
        queryClient.invalidateQueries({ queryKey: spaceKeys.detail(event.spaceId) });
    });
  }, [queryClient]);
  return children;
}
```

---

#### TAS-02 · God-component: 4 128-line `TaskManagementPage` with 28 `useState`

**File:line:** `page.tsx:730–759`
**Severity/Confidence:** P0 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:730–759 (28 useState declarations at top level of one component)
const [view, setView] = useState<TaskView>("list");
const [scope, setScope] = useState<TaskScope>("all");
const [grouping, setGrouping] = useState<TaskGrouping>("status");
const [filter, setFilter] = useState<TaskFilter>(defaultFilter);
const [activePanel, setActivePanel] = useState<TaskPanelState>(null);
// ... 23 more
```

**Why it is wrong:** 28 state slices, 16 mutation hooks, 7 query hooks, 23 inlined sub-components, and a 700-line jsPDF export function all cohabit one component. Every state change re-renders the entire tree. Adding a comment triggers a re-evaluation of the board column memos and timeline slice. Junior contributors cannot locate, isolate, or test any feature in isolation. The `/* eslint-disable react-hooks/set-state-in-effect */` at line 4 is suppressing real warnings caused by the god-component's side-effect dependencies.

**Fix:** Split by concern:
- Extract `useTaskFilters()` (filter, scope, grouping, expandedIds, collapsedGroups).
- Extract `useTaskEditorState()` (form, editingTask, activePanel for task-editor).
- Extract `useSpaceEditorState()` (spaceForm, editingSpace, spaceMembersDraft, invite fields).
- Extract `useReportState()` (reportDraft, appliedReportFilters, hasAppliedReport).
- Extract `useDragState()` (dragTaskId, boardDragTaskId, boardDropStatus).
- Move inlined sub-components (`TaskEditor`, `SpaceEditor`, `DetailPanel`, `TaskReportPanel`, etc.) to `components/`.
- Move `exportTaskReportPdf` to `utils.ts`.

---

### P1 — High

---

#### TAS-03 · `Promise.resolve().then(setState)` in `useEffect` — suppressed lint, real re-render hazard

**File:line:** `page.tsx:833–847` (two instances)
**Severity/Confidence:** P1 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:832–839
useEffect(() => {
  if (editingTask) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.resolve().then(() => setForm(taskToForm(editingTask)));
  }
}, [editingTask]);

// page.tsx:841–847
useEffect(() => {
  Promise.resolve().then(() => {
    setFilter((prev) => ({ ...prev, scope, spaceId: selectedSpaceId }));
  });
}, [scope, selectedSpaceId]);
```

**Why it is wrong:** `Promise.resolve().then()` defers the state update to the microtask queue. This means the component commits with stale `form`/`filter` state on the first paint, then immediately re-renders a second time. The comment admits "synchronous setState in an effect triggers cascading renders" — but the real root cause is that `editingTask` and `scope/selectedSpaceId` are derived state that should either drive the form synchronously (via `useReducer` or event handler) or be computed as derived values. The ESLint disable at line 4 hides these warnings file-wide, so future contributors won't see the warning.

**Fix for `editingTask → form`:** Don't use an effect. Pass `taskToForm(editingTask)` directly when `openEditor` is called — which already calls `setForm` on line 947. The effect is duplicating that call. Remove the effect entirely.

**Fix for `scope → filter`:** Same pattern — `handleScopeChange` already sets scope; set the filter there directly instead of using an effect:

```tsx
function handleScopeChange(nextScope: TaskScope) {
  setScope(nextScope);
  setFilter((prev) => ({ ...prev, scope: nextScope }));
}
// and in handleSpaceSelect / setSelectedSpaceId call-sites, update filter inline
```

---

#### TAS-04 · Expand-all effect depends on `expandedIds.size` — triggers on every toggle

**File:line:** `page.tsx:825–830`
**Severity/Confidence:** P1 / High
**Owner:** Chaitanya2872

```tsx
useEffect(() => {
  if (taskTree.length && expandedIds.size === 0) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds(new Set(taskTree.map((task) => task.id)));
  }
}, [taskTree, expandedIds.size]);
```

**Why it is wrong:** `expandedIds.size` is in the dependency array. Every time a user collapses a row (`setExpandedIds` removes an id → size decreases), this effect runs again. If the user collapses all rows to zero manually (by toggling all), the effect will immediately re-expand them all, fighting the user. The condition `expandedIds.size === 0` is a proxy for "initial load" but it also fires on user action.

**Fix:** Use a ref to gate "did we already run initial expansion":

```tsx
const initialExpansionDone = useRef(false);
useEffect(() => {
  if (!initialExpansionDone.current && taskTree.length) {
    initialExpansionDone.current = true;
    setExpandedIds(new Set(taskTree.map((task) => task.id)));
  }
}, [taskTree]);
```

---

#### TAS-05 · `onOpenTask` in workspace page ignores `taskId` — "Open task" links are broken

**File:line:** `workspace-page.tsx:234`
**Severity/Confidence:** P1 / High
**Owner:** Chaitanya2872

```tsx
// workspace-page.tsx:229–235
<TaskInboxPanel
  items={inboxItems}
  readItemIds={readInboxItemIds}
  onReadItem={handleReadItem}
  onMarkAllRead={handleMarkAllRead}
  onOpenTask={() => navigate("/tasks")}   // <-- taskId is received but ignored
/>
```

`TaskInboxPanel` passes `item.taskId` to `onOpenTask(taskId)` (see `components/TaskWorkspace.tsx:279`). The workspace page handler receives that id but discards it, navigating to the root `/tasks` list instead of the specific task. A user who clicks "Open task" on a deadline notification is dropped at the list with no pre-selection.

**Fix:**

```tsx
onOpenTask={(taskId) => navigate(`/tasks?taskId=${taskId}`)}
// or pass the id as router state and auto-open the detail panel in TaskManagementPage
```

---

#### TAS-06 · `<span onClick>` in `TeamSpacesPanel` — inaccessible click target

**File:line:** `workspace-page.tsx:371`
**Severity/Confidence:** P1 / High
**Owner:** Chaitanya2872

```tsx
// workspace-page.tsx:371
<span onClick={onOpenTasks} className="text-sm font-semibold text-slate-900">
  Open tasks
</span>
```

**Why it is wrong:** A `<span>` with an `onClick` is not keyboard-focusable, not announced by screen readers as interactive, and has no `role="button"`. The parent `<button>` already covers the whole card click (`onClick={() => onSelectSpace(space.id)}`), so this nested span fires both: selecting the space AND trying to navigate. The event propagation is unguarded.

**Fix:** Replace with a `<button>` or an `<a>`. If it should navigate:

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onOpenTasks(); }}
  className="text-sm font-semibold text-slate-900 underline-offset-2 hover:underline"
>
  Open tasks
</button>
```

---

#### TAS-07 · Missing return type on `updateTaskSpaceMember` in `api.ts`

**File:line:** `api.ts:403–415`
**Severity/Confidence:** P1 / High
**Owner:** Chaitanya2872

```ts
// api.ts:403–415
export async function updateTaskSpaceMember(
  spaceId: string,
  memberId: string,
  role: TaskSpaceMemberRole
) {        // <-- no return type annotation
  try {
    await ensureApiSession();
    const response = await api.put(`${"/tasks/spaces"}/${spaceId}/members/${memberId}`, { role });
    return response.data;  // inferred as `any`
  } catch (error) {
    rethrow(error, "Failed to update space member.");
  }
}
```

Every other API function has an explicit `Promise<ReturnType>`. This one does not, so `response.data` is inferred as `any`. The corresponding mutation in `hooks.ts` (`useUpdateTaskSpaceMember`) therefore accepts the result without type checking. Combined with the odd `\`${"/tasks/spaces"}\`` string interpolation (a literal string inside a template literal — doing nothing), this function reads like a copy-paste that was never cleaned up.

**Fix:**

```ts
export async function updateTaskSpaceMember(
  spaceId: string,
  memberId: string,
  role: TaskSpaceMemberRole
): Promise<TaskSpaceDetail> {
  try {
    await ensureApiSession();
    const response = await api.put<TaskSpaceDetail>(`/tasks/spaces/${spaceId}/members/${memberId}`, { role });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update space member.");
  }
}
```

---

#### TAS-08 · `unread` count initialisation uses positional index as proxy for "recent"

**File:line:** `workspace-page.tsx:87–109`
**Severity/Confidence:** P1 / Med
**Owner:** Chaitanya2872

```tsx
// workspace-page.tsx:87–96
const activityItems: TaskInboxItem[] = (dashboard?.recentActivity ?? []).slice(0, 8).map((activity, index) => ({
  ...
  unread: index < 2,    // <-- first 2 items are "unread" regardless of actual read state
}));

// workspace-page.tsx:98–109
const dashboardDeadlineItems: TaskInboxItem[] = (...).map((deadline, index) => ({
  ...
  unread: index < 3 || deadline.priority === "HIGH" || deadline.priority === "CRITICAL",
}));
```

**Why it is wrong:** `unread` is determined by render-time array index, not by any persisted read state. Every page refresh marks the first 2 activity items and first 3 deadline items as unread again, making the unread badge permanently show a non-zero count. This is misleading and will erode user trust in the notification system. There is no backend field for read status on activity items — but using a client-side `localStorage` keyed set (like `readInboxItemIds`) would at least persist across renders.

**Fix:** Generate stable item ids (e.g., `activity-${activity.id}`) and persist the user's read state to `localStorage` or a backend endpoint. Do NOT determine `unread` from array position.

---

### P2 — Medium

---

#### TAS-09 · Missing `values` in `useMemo` dependency array — stale selections

**File:line:** `page.tsx:2500–2503`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:2500–2503 (inside AssigneeMultiSelect)
const filteredOptions = useMemo(() => {
  return filterAssigneeOptions(options, query, values);
}, [options, query]);   // <-- `values` is missing
```

`filterAssigneeOptions` uses `values` (the selected assignee ids) to pin selected options to the top of the list. If `values` changes (user selects or deselects an assignee) the filtered list is NOT recomputed because `values` is not in the dependency array. The pinned-selection behavior in the dropdown will lag one interaction behind.

**Fix:** Add `values` to the dependency array:

```tsx
}, [options, query, values]);
```

---

#### TAS-10 · Triple `getActiveAssignees` call per card in board view — O(n*m) work in render

**File:line:** `page.tsx:1844–1845`
**Severity/Confidence:** P2 / Med
**Owner:** Chaitanya2872

```tsx
// page.tsx:1844–1845
<Avatar name={getActiveAssignees(task, users)[0]?.assignedToName} />
<span>{getActiveAssignees(task, users).length ? getActiveAssignees(task, users).map(...) : "Unassigned"}</span>
```

`getActiveAssignees` iterates `task.activeAssignees` and calls `resolveAssigneeIdentity` (which does a `users.find()`) per assignee. This is called 3 times per board card. With 50 tasks and 30 users, that is 50 × 3 × (1 + k×30) operations where k is the assignee count — all in the render path. The same pattern appears in `page.tsx:1882–1883` (calendar view) and `page.tsx:2930–2932` (detail panel, called twice).

**Fix:** Compute once and store in a variable:

```tsx
const activeAssignees = getActiveAssignees(task, users);
// then use activeAssignees[0]?.assignedToName, activeAssignees.length, etc.
```

---

#### TAS-11 · `"use client"` directive is a no-op in a Vite + React Router app

**File:line:** `page.tsx:5`, `workspace-page.tsx:1`, `components/TaskWorkspace.tsx:1`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:5
"use client";
```

`"use client"` is a React Server Components directive meaningful only in Next.js App Router and similar RSC frameworks. This project uses Vite + `react-router-dom` — there is no server-component runtime. The directive is silently ignored by Vite but misleads contributors into thinking there are server components here, and makes the files look like they were copied from a Next.js codebase.

**Fix:** Remove the `"use client"` directive from all three files.

---

#### TAS-12 · `spaceKeys.list` redundantly wraps `spaceKeys.lists`

**File:line:** `hooks.ts:62–63`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```ts
// hooks.ts:62–63
lists: () => [...spaceKeys.all, "list"] as const,
list: () => [...spaceKeys.lists()] as const,   // <-- spreads lists() into a new array — identical result
```

`spaceKeys.list()` and `spaceKeys.lists()` produce identical arrays: `["task-spaces", "list"]`. This is a copy-paste error from `taskKeys` where `lists()` is the prefix and `list(filter)` takes a parameter. Here `list()` takes no parameter and is bit-for-bit the same as `lists()`. Every call to one could use the other, and having both causes confusion about which to use for invalidation.

**Fix:** Remove `lists` or `list` (keep one, use it everywhere):

```ts
export const spaceKeys = {
  all: ["task-spaces"] as const,
  list: () => [...spaceKeys.all, "list"] as const,
  detail: (spaceId: string) => [...spaceKeys.all, "detail", spaceId] as const,
  invitations: () => [...spaceKeys.all, "invitations"] as const,
};
```

---

#### TAS-13 · `TaskDashboard.kpis` typed as `Record<string, number>` — no key safety

**File:line:** `types.ts:173`
**Severity/Confidence:** P2 / Med
**Owner:** Chaitanya2872

```ts
// types.ts:172–174
export type TaskDashboard = {
  kpis: Record<string, number>;
  ...
};
```

Callers use `dashboard?.kpis.totalTasks`, `dashboard?.kpis.inProgress`, `dashboard?.kpis.completed`, `dashboard?.kpis.overdue` (page.tsx:1602–1626). None of these keys are type-checked. A backend rename from `inProgress` to `in_progress` would silently produce `undefined` and render `NaN` or `0` in the UI.

**Fix:** Define a typed KPI interface:

```ts
export type TaskKPIs = {
  totalTasks: number;
  inProgress: number;
  completed: number;
  overdue: number;
  // add others as the API stabilises
};
export type TaskDashboard = {
  kpis: TaskKPIs;
  ...
};
```

---

#### TAS-14 · Unstable composite list keys in report table rows

**File:line:** `page.tsx:3804` and `page.tsx:3851`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:3804
<tr key={`${row.project}-${row.date}-${index}`} className="align-top">

// page.tsx:3851
<tr key={`${task.taskTitle}-${task.project}-${index}`} className="align-top">
```

Both keys fall back to `index` as a tiebreaker. If the same project appears on the same date (which is likely in a multi-row report), two rows will share the prefix and differ only by index — which will scramble React's reconciliation when rows are added or reordered. The `TaskReportRow` type has no `id` field, so request the API to add one or construct a stable compound key without index.

**Fix:** Request an `id` field from the API. In the interim, use a crypto-based key at data-load time or accept the visual limitation but remove `index` as a suffix (pure `${row.project}-${row.date}` at least exposes the collision risk rather than hiding it).

---

#### TAS-15 · Report query key not in `taskKeys` factory — inline string risks collision

**File:line:** `hooks.ts:78`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```ts
// hooks.ts:78
queryKey: [...taskKeys.all, "report", filters] as const,
```

The `"report"` segment is an inline string not tracked in `taskKeys`. If any future developer invalidates `taskKeys.all` (which `invalidateTasks` does at `hooks.ts:123`), the report query IS caught because it descends from `["tasks"]`. But there is no `taskKeys.report()` factory entry, meaning no one can invalidate the report query selectively without repeating this inline key. Add a `report: (filters) => [...]` entry to `taskKeys`.

---

#### TAS-16 · `handleDelete` and `handleDeleteSpace` fire without confirmation

**File:line:** `page.tsx:1265–1272`, `page.tsx:1401–1409`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:1265–1272
function handleDelete(taskId: string) {
  deleteTaskMutation.mutate(taskId, {
    onSuccess: () => {
      toast.success("Task deleted.");
      if (detailTaskId === taskId) closeActivePanel();
    },
    onError: (error) => toast.error(error.message),
  });
}
```

There is no confirmation dialog before destructive deletion of a task or a space. The space delete is irreversible (all tasks in that space become orphaned or deleted). The task delete is invoked from the row context menu (via `onDelete` prop on `TaskRow`). A misclick permanently deletes work.

**Fix:** Add a confirmation step using the existing `dialog` component in `src/components/ui/dialog.tsx`, or at minimum `window.confirm("Delete this task? This cannot be undone.")` as a short-term guard.

---

#### TAS-17 · No `staleTime` on `useTask` (detail query) — refetch on every panel open

**File:line:** `hooks.ts:104–110`
**Severity/Confidence:** P2 / Med
**Owner:** Chaitanya2872

```ts
// hooks.ts:104–110
export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? "unknown"),
    queryFn: () => fetchTask(id as string),
    enabled: Boolean(id),
    // no staleTime
  });
}
```

Default TanStack Query `staleTime` is 0, meaning the detail query goes stale immediately and re-fetches every time the user re-focuses the window or re-mounts the panel. The list and tree queries correctly set `staleTime: 15_000`. Opening and closing the detail panel repeatedly (a common user flow) will send a GET request for each open if the window was focused in between.

**Fix:** Add `staleTime: 15_000` consistent with the other queries.

---

#### TAS-18 · `pageSize: 200` hardcoded — loads entire task tree on every keystroke

**File:line:** `page.tsx:181–183`, `workspace-page.tsx:38–39`
**Severity/Confidence:** P2 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:170–184
const defaultFilter: TaskFilter = {
  ...
  page: 1,
  pageSize: 200,   // <-- hardcoded
};
```

The filter is passed to `useTaskTree` / `useTasks` which sends `pageSize=200` to the API. The `filter.search` string is part of the query key, so each character typed in the search box fires a new API request for up to 200 tasks. There is no debounce on the search input. Combined with `staleTime: 15_000`, the number of in-flight requests during a search session can build up quickly for a high-latency connection.

**Fix:** Debounce the search input (300–500 ms) before updating `filter.search`. Example pattern used elsewhere in the codebase is direct `setFilter` on `onChange` — add a `useDeferredValue` or `useDebounce` hook.

---

### P3 — Low

---

#### TAS-19 · `/* eslint-disable */` file-level directives mask real warnings

**File:line:** `page.tsx:1–4`, `hooks.ts:1`
**Severity/Confidence:** P3 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:1–4
/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
```

```ts
// hooks.ts:1
/* eslint-disable @typescript-eslint/no-unused-vars */
```

File-level disables mean that any future `no-unused-vars` violation in `hooks.ts` (which already exports `useRejectTask`, `useApproveTask`, `useStartTaskTimer`, `useStopTaskTimer` — none of which appear to be consumed in the current UI) will silently accumulate. The `set-state-in-effect` disable in `page.tsx` prevents the editor from flagging future setState-in-effects.

**Fix:** Remove file-level disables. Add per-line disables only where genuinely necessary, with an explanatory comment. Address the root causes (see TAS-02, TAS-03).

---

#### TAS-20 · Unused timer hooks exported but not consumed in UI

**File:line:** `hooks.ts:389–403`
**Severity/Confidence:** P3 / Med
**Owner:** Chaitanya2872

```ts
// hooks.ts:389–403
export function useStartTaskTimer() { ... }
export function useStopTaskTimer() { ... }
```

A grep across the entire `src/` directory finds no caller of `useStartTaskTimer` or `useStopTaskTimer` outside of `hooks.ts` itself. `useRejectTask` and `useApproveTask` are also exported but not consumed in `page.tsx` (which uses `useUpdateTaskStatus` directly for approval flows via `approveTask` in `api.ts`). These are exported dead code. The timer API functions (`startTaskTimer`, `stopTaskTimer`) exist in `api.ts` and the UI shows time-log counts in the detail panel — but the controls to start/stop from the UI are absent.

**Fix:** Either implement the timer start/stop controls in `DetailPanel` (the `detail.timeLogs` count is already displayed), or remove the exported hooks until the feature is ready.

---

#### TAS-21 · `buildInboxItems` uses `index < 3` as unread signal — two sources of truth

**File:line:** `workspace-page.tsx:98–109` (see also TAS-08)
**Severity/Confidence:** P3 / Low
**Owner:** Chaitanya2872

This is the second manifestation of the pattern in TAS-08. The `dashboardDeadlineItems` array marks items at index 0–2 as unread in addition to HIGH/CRITICAL priority items. The `taskDeadlineItems` array (the fallback) marks items at index 0–2 and all overdue tasks as unread. These are two separate code paths that independently guess "unread" from position, causing inconsistent badge counts. Tracked here separately because the fix differs: the fallback path should not exist if `dashboardDeadlineItems` is non-empty (the existing guard handles this), but both paths need a consistent read-tracking mechanism.

---

#### TAS-22 · `Drawer` component defined inside `page.tsx` — re-invented from `sheet.tsx`

**File:line:** `page.tsx:2031–2061`
**Severity/Confidence:** P3 / High
**Owner:** Chaitanya2872

```tsx
// page.tsx:2031–2061
function Drawer({ open, title, onClose, children, maxWidth = "max-w-2xl", desktopHidden = false }) {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-50 flex justify-end ...`}>
      ...
    </div>
  );
}
```

`src/components/ui/sheet.tsx` exists and implements the same slide-over drawer pattern. Defining a bespoke `Drawer` inside the 4 128-line god-component prevents reuse, bypasses any accessibility improvements made to `sheet.tsx`, and adds to the maintenance burden of `page.tsx`.

**Fix:** Replace with `Sheet` / `SheetContent` from `src/components/ui/sheet.tsx`.

---

#### TAS-23 · `SelectField` wrapping `FloatingSelect` in a `Field` — two wrappers around one input

**File:line:** `page.tsx:4028–4048`
**Severity/Confidence:** P3 / Low
**Owner:** Chaitanya2872

```tsx
function SelectField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <FloatingSelect ... />
    </Field>
  );
}
```

`Field` is a `<label>` wrapper. `FloatingSelect` renders a `<button>` that does not forward `htmlFor`. The `<label>` therefore wraps a `<button>` with no `htmlFor`/`id` link, which means clicking the label text does NOT activate the dropdown. The label is decorative only.

**Fix:** Either use a native `<select>` inside `Field` for true label association, or add `id`/`aria-labelledby` to `FloatingSelect`'s button.

---

## Redundancy

### Within module

| Clone A | Clone B | Description |
|---|---|---|
| `page.tsx:242` — `function toLabel(value: string)` | `workspace-page.tsx:52` — `function toLabel(value: string)` | Identical: `value.toLowerCase().replace(/_/g, " ")` |
| `page.tsx:251` — `function formatLongDate(value?)` | `workspace-page.tsx:42` — `function formatLongDate(value?)` | Identical: `format(parseISO(value), "dd MMM yyyy")` |
| `page.tsx:261` — `function formatRelativeDate(value?)` | `workspace-page.tsx:47` — `function formatRelativeDate(value?)` | Identical: `formatDistanceToNowStrict(parseISO(value), { addSuffix: true })` |
| `page.tsx:688–696` — `canViewTaskOnClient()` | `workspace-page.tsx:70–78` — `canViewTaskOnClient()` | Identical permission-check function |
| `page.tsx:422–430` — `function initials(name?)` | `page.tsx:4115–4128` — `Avatar` uses `initials()` (same file, so not a clone but related) | — |

### Cross-module

| This module | Other module | Description |
|---|---|---|
| `page.tsx:422` — `function initials(name?)` | `src/modules/users/page.tsx:151` — `function initials(name: string)` | Identical 5-line initials extractor |
| `page.tsx:4115` — `function Avatar({ name })` | `src/modules/users/page.tsx:157` — `function Avatar({ name })` | Initials-based avatar; same logic |
| `page.tsx:4115` — `function Avatar({ name })` | `src/modules/project-management/components/common.tsx:24` — `export function Avatar({ name, size })` | Same concept; project-management version is slightly more capable (size prop) |
| `page.tsx:242` — `toLabel` | `src/modules/project-management/utils.ts:153` — `formatDate` (different impl, same category of duplicated date/string utils) | Category duplication |

**Recommended action:** Extract `toLabel`, `formatLongDate`, `formatRelativeDate`, `initials`, `Avatar`, `canViewTaskOnClient` to a shared `src/modules/task-management/utils.ts` file. Then audit whether the cross-module `Avatar` / `initials` should live in `src/components/ui/avatar.tsx` shared by all modules.

---

## Tests & Gaps

**No tests exist** for this module. Zero `.test.tsx`, `.spec.tsx`, or `__tests__` files were found under `src/modules/task-management/` or anywhere referencing these components/hooks.

Missing test coverage priorities (highest risk first):

1. `canViewTaskOnClient` / `canManageExecution` — logic gates control edit/delete access. A regression here silently exposes private tasks.
2. `buildPayload` — transforms form state to API payload. Incorrect field mapping (e.g. wrong primary assignee selection) silently corrupts task data.
3. `groupTasks` — ordering logic for status/priority groups. A wrong sort order disrupts the entire list view.
4. `collectVisibleTasks` — tree traversal. Incorrect subtask expansion/collapse breaks the entire list.
5. `exportTaskReportPdf` — no snapshot or output test; PDF generation regressions are invisible.
6. `connectTaskStream` in `api.ts` — reconnect / abort logic. No test coverage for the retry loop or abort path.
7. Mutation hooks (`useCreateTask`, `useUpdateTask`) — invalidation paths are critical; a missing `invalidateQueries` call leaves the UI stale after write.

---

## Coverage Note

**Fully inspected:** `api.ts` (all 514 lines), `hooks.ts` (all 406 lines), `types.ts` (all 413 lines), `workspace-page.tsx` (all 414 lines), `components/TaskWorkspace.tsx` (all 324 lines), `components/index.ts`.

**Fully inspected — main page:** `page.tsx` was read in full across seven passes (lines 1–4128). All 28 `useState` declarations, all `useEffect` bodies, all inlined sub-components, the PDF export function, and the drag-drop handlers were reviewed.

**Cross-module comparisons:** Spot-checked `src/modules/users/page.tsx`, `src/modules/project-management/components/common.tsx`, `src/modules/project-management/utils.ts`, `src/components/ui/sheet.tsx`, `src/components/ui/dialog.tsx`, and `src/lib/`.

**Self-gaps:**
- The router file (`src/app/router.tsx`) was only partially read (import lines only). The full layout tree that wraps both task routes was not inspected — there may be additional layout-level SSE connections or providers not visible here.
- The `src/services/api-client.ts` file (`getAccessToken`, `ensureApiSession`, `getApiErrorMessage`) was not read; assumptions about token handling correctness in `connectTaskStream` are based on usage patterns only.
- No runtime testing was performed. The `connectTaskStream` retry loop behavior under network errors was analysed statically only.
- `jsPDF` pagination correctness in `exportTaskReportPdf` (the `ensurePageSpace` branching) was reviewed but not formally verified against edge cases (very long task titles, single-row tables on the first page, etc.).
- No profiling data; the performance claims in TAS-10 and TAS-18 are based on static analysis of the call graph, not measured benchmarks.

**Overall confidence:** High for structural/correctness findings (TAS-01 through TAS-14). Medium for performance findings (TAS-10, TAS-18). Low is called out per finding where applicable.

# approvals — Module Audit

**Audit date:** 2026-07-14
**Auditor:** Claude Code (automated senior review)
**Root:** `src/modules/approvals/`
**Commit inspected:** current HEAD (`master`)

---

## Summary

The approvals module is a multi-scope workflow management surface (inbox / outbox / history / detail / admin) backed by real TanStack Query + Axios calls. The overall structure is reasonable and avoids the worst junior anti-patterns, but it carries **one P0 correctness bug** (a raw non-UTF-8 byte in compiled JSX), **two P1 issues** (missing mutation error feedback, duplicate-fire on filter change), and a cluster of P2 and P3 type-safety and UX gaps. The module ships with **zero types.ts / hooks.ts / api.ts** per-module files, leaving all data-layer types as `any`. No tests exist at all.

---

## Surface map

### Pages / routes

| File | Route | Scope |
|---|---|---|
| `ApprovalsInboxPage.tsx` | `/approvals` | Thin wrapper → `ApprovalsListPage scope="inbox"` |
| `ApprovalsOutboxPage.tsx` | `/approvals/outbox` | Thin wrapper → `ApprovalsListPage scope="outbox"` |
| `ApprovalsHistoryPage.tsx` | `/approvals/history` | Thin wrapper → `ApprovalsListPage scope="history"` |
| `ApprovalsListPage.tsx` | — | Real list component (318 lines, 6 `useState`) |
| `ApprovalDetailPage.tsx` | `/approvals/requests/:id` | Detail + action buttons (249 lines) |
| `ApprovalsWorkflowsPage.tsx` | `/approvals/workflows` | Flow CRUD admin (330 lines, 6 `useState`) |

### API surface (in `src/lib/api.ts`)

| Export | Endpoints used |
|---|---|
| `approvalsApi.inbox/outbox/history` | `GET /approvals/{inbox,outbox,history}` |
| `approvalsApi.getRequest` | `GET /approvals/requests/:id` |
| `approvalsApi.act` | `POST /approvals/requests/:id/actions` |
| `approvalsApi.kpis` | `GET /approvals/kpis?scope=…` |
| `approvalFlowsApi.list/get/create/update/deactivate` | `GET/POST/PATCH/POST /approval-flows/*` |

### Query keys used

| Key | File |
|---|---|
| `['approvals', scope, listParams]` | `ApprovalsListPage.tsx:77` |
| `['approvals-kpis', scope, kpiParams]` | `ApprovalsListPage.tsx:86` |
| `['approval-request', id]` | `ApprovalDetailPage.tsx:16` |
| `['approval-flows']` | `ApprovalsWorkflowsPage.tsx:43` |
| `['users']` | `ApprovalsWorkflowsPage.tsx:48` |

### Missing module infrastructure

No `types.ts`, `hooks.ts`, or module-scoped `api.ts`. All API calls and types live in the global `src/lib/api.ts`.

---

## Findings

### P0 — Critical (data integrity / build risk)

---

#### APP-01 — Invalid UTF-8 byte in compiled JSX
- **File:** `src/modules/approvals/ApprovalDetailPage.tsx:145`
- **Severity:** P0 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// line 145 — raw hex 0xB7 (Latin-1 MIDDLE DOT) embedded in JSX string
{assign.assignee_type}: {assign.assignee_value} · {assign.status}
//                                             ^^^
// actual byte is 0xB7 — file is NOT valid UTF-8
```

**Why it is wrong:** The file fails UTF-8 validation (`'utf-8' codec can't decode byte 0xb7 in position 6476`). Modern bundlers (Vite, esbuild) assume UTF-8 for `.tsx`. Depending on platform, this may silently transcode to a wrong glyph, produce a `?` replacement character, or cause a parse error at build time on strict platforms. It also breaks any lint/format tooling that reads the file.

**Fix:** Replace the raw byte with the HTML entity or Unicode escape:
```tsx
{assign.assignee_type}: {assign.assignee_value}{' · '}{assign.status}
// or simply use a plain hyphen separator:
{assign.assignee_type}: {assign.assignee_value} — {assign.status}
```
Re-save the file in UTF-8 encoding.

---

### P1 — High impact (UX broken path / silent data loss)

---

#### APP-02 — No error feedback for approval actions or workflow mutations
- **File:** `src/modules/approvals/ApprovalDetailPage.tsx:28–36` and `ApprovalsWorkflowsPage.tsx:52–70`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code (ApprovalDetailPage.tsx:28–36):**
```tsx
const actionMutation = useMutation({
  mutationFn: (payload: { action: string; comment?: string }) =>
    approvalsApi.act(id!, payload),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['approval-request', id] })
    // ...
    setComment('')
  },
  // NO onError handler
})
```

**Why it is wrong:** If the `act` request returns a 4xx/5xx (e.g., approver no longer has permission, session expired, optimistic-lock conflict), the UI silently does nothing. The user has no idea whether "Approve" worked. Same issue in `createMutation` and `updateMutation` in `ApprovalsWorkflowsPage.tsx`. Both mutations check `isBusy` for styling but never surface errors.

**Fix:** Add `onError` to each mutation. Use an existing toast/notification pattern from the codebase (or `alert` as a minimum):
```tsx
const actionMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => { ... },
  onError: (err: any) => {
    const msg = err?.response?.data?.message ?? 'Action failed. Please try again.'
    toast.error(msg) // use whatever toast utility the project has
  },
})
```

---

#### APP-03 — Double API fetch on every filter change (useEffect page-reset race)
- **File:** `src/modules/approvals/ApprovalsListPage.tsx:54–83`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
useEffect(() => {
  setPage(0)           // runs AFTER re-render
}, [status, priority, moduleFilter, overdueOnly, query])

const listParams = useMemo(() => {
  const params: Record<string, any> = { skip: page * limit, limit }
  // page is stale on first render after filter change
  ...
}, [status, priority, moduleFilter, overdueOnly, query, page])
```

**Why it is wrong:** When any filter changes, React renders with the new filter but the old `page`. `listParams` recalculates with `skip = oldPage * 20` → the `useQuery` fires request #1 (wrong offset). Then the `useEffect` runs `setPage(0)` → another render → `listParams` recalculates with `page=0` → request #2 fires. On page > 0 this produces two sequential network requests per filter change, the first returning data for the wrong page before being discarded.

**Fix:** Drive page reset from the same state-setter batch. Use a reducer or reset page in the handler directly instead of an effect:
```tsx
// Remove the useEffect. Instead, in every filter setter:
const handleStatusChange = (val: string) => {
  setStatus(val)
  setPage(0)        // reset page atomically with the filter change
}
// Apply same pattern to priority, moduleFilter, overdueOnly, query.
```
This eliminates the wasted first request entirely.

---

#### APP-04 — KPI cache never invalidated after approval action
- **File:** `src/modules/approvals/ApprovalDetailPage.tsx:31–35`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
qc.invalidateQueries({ queryKey: ['approvals-kpis'] })
```

**Why it is wrong:** The actual KPI query key is `['approvals-kpis', scope, kpiParams]` (three segments, see `ApprovalsListPage.tsx:86`). TanStack Query's `invalidateQueries` uses the provided array as a prefix match, so `['approvals-kpis']` **will** match `['approvals-kpis', ...]` — this actually works as intended. However, the `['approvals']` partial invalidation on line 33 (`qc.invalidateQueries({ queryKey: ['approvals'] })`) similarly matches all list queries across all scopes and params, which is overly broad. More critically: after a user approves/rejects on the detail page, they navigate back to the inbox — but the KPI query has `staleTime` of 0 (default), so it *will* refetch on next mount. The concern here is confirmed correctness only if TanStack Query v5 is in use.

**Verify:** Check that `@tanstack/react-query` is v5 (prefix invalidation changed semantics). If v4, `queryKey: ['approvals-kpis']` will NOT match `['approvals-kpis', scope, kpiParams]` — the KPIs will never refresh.

```bash
grep -n "@tanstack/react-query" package.json
```

**Fix (if v4):**
```tsx
// Use exact:false (v4 default) but pass the full prefix:
qc.invalidateQueries(['approvals-kpis'])  // v4 array form — prefix match works
// OR ensure v5 object form is used consistently.
```

---

### P2 — Medium impact (correctness issues that degrade UX)

---

#### APP-05 — NavLink `/approvals` inbox tab always appears active on outbox/history pages
- **File:** `src/modules/approvals/ApprovalsListPage.tsx:164–178`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
{ to: '/approvals', label: 'Inbox' },
// ...
<NavLink
  key={tab.to}
  to={tab.to}
  className={({ isActive }) =>
    cn('px-3 py-1.5 rounded-lg border border-gray-200',
      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500')
  }
>
```

**Why it is wrong:** React Router v6 `NavLink` uses prefix matching by default. `/approvals` matches `/approvals`, `/approvals/outbox`, and `/approvals/history`. The Inbox tab will appear highlighted (active) on every scope — defeating the visual feedback purpose entirely.

**Fix:** Add the `end` prop to the inbox NavLink:
```tsx
<NavLink to="/approvals" end ...>Inbox</NavLink>
```
The `end` prop tells React Router to match only if the current URL exactly ends at `/approvals`.

---

#### APP-06 — `flow.stages` accessed without null guard in existing-flows list
- **File:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx:318`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
{flow.stages.map((s: any) => (   // line 318 — no null guard
  <span key={s.id} className="badge-blue">
    Stage {s.order}: {s.role || 'User'}
  </span>
))}
```

**Why it is wrong:** If any flow from the API has `stages: null` or `stages: undefined` (e.g., a newly deactivated flow, an edge-case response shape), `.map()` throws a runtime TypeError, crashing the entire "Existing Flows" section. The `handleEdit` function on line 107 already defensively uses `(flow.stages || [])`, so the pattern exists in the file — it was just forgotten here.

**Fix:**
```tsx
{(flow.stages ?? []).map((s: any) => (
```

---

#### APP-07 — Save button not disabled during mutation (`isBusy` only sets opacity)
- **File:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx:276`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button
  className={cn('btn-primary', isBusy && 'opacity-70')}
  onClick={handleSave}
  disabled={!canManage}    // only disabled when user lacks permission
>
```

**Why it is wrong:** `isBusy` (which is `true` when `createMutation.isPending || updateMutation.isPending`) changes the button's visual style but does NOT set `disabled`. A user with `canManage = true` can click "Create Flow" multiple times before the first request completes, sending duplicate create requests to the server.

**Fix:**
```tsx
<button
  className={cn('btn-primary', isBusy && 'opacity-70')}
  onClick={handleSave}
  disabled={!canManage || isBusy}
>
```

---

#### APP-08 — Search input has no debounce — every keystroke fires a network request
- **File:** `src/modules/approvals/ApprovalsListPage.tsx:50, 64–66, 77`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const [query, setQuery] = useState('')
// ...
if (query.trim()) params.q = query.trim()   // inside listParams memo
// ...
queryKey: ['approvals', scope, listParams], // query is in the key → fires on every char
```

**Why it is wrong:** Typing "hiring" fires six sequential API requests (`h`, `hi`, `hir`, `hiri`, `hirin`, `hiring`), each one obsoleting the previous. Besides server load, TanStack Query will briefly flash stale data between requests. No debounce hook exists anywhere in the codebase.

**Fix:** Maintain a separate `debouncedQuery` state:
```tsx
const [query, setQuery] = useState('')
const [debouncedQuery, setDebouncedQuery] = useState('')

useEffect(() => {
  const t = setTimeout(() => setDebouncedQuery(query), 300)
  return () => clearTimeout(t)
}, [query])

// Use debouncedQuery in listParams and kpiParams instead of query.
```

---

#### APP-09 — `action_required` status absent from `STATUS_COLORS` — always falls back to `badge-gray`
- **File:** `src/modules/approvals/ApprovalsListPage.tsx:274` referencing `src/lib/utils.ts:17–52`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// ApprovalsListPage.tsx:274
<span className={cn('badge', STATUS_COLORS[item.status] || 'badge-gray')}>
  {item.status}
</span>
// STATUS_OPTIONS includes 'action_required' (line 18)
// STATUS_COLORS (utils.ts:17–52) does NOT include 'action_required'
```

**Why it is wrong:** Any approval row whose backend `status` is `action_required` will display a gray badge instead of the intended indigo highlight shown on the KPI card. This is inconsistent visual feedback and could mislead users into thinking no action is needed.

**Fix:** Add the entry to `src/lib/utils.ts`:
```ts
export const STATUS_COLORS: Record<string, string> = {
  // ...
  action_required: 'badge-purple',  // or badge-indigo to match the card cls
  // ...
}
```

---

### P3 — Low impact (code quality / type safety / maintainability)

---

#### APP-10 — Pervasive `any` types — no typed API response shape for approvals
- **File:** Multiple files (summary below)
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

| File | `any` occurrences |
|---|---|
| `ApprovalsListPage.tsx:59,69,256` | `Record<string, any>` ×2, `item: any` ×1 |
| `ApprovalsWorkflowsPage.tsx:53,61,100,107,228,291,318` | 7 annotations |
| `ApprovalDetailPage.tsx:123,143,224` | `stage: any`, `assign: any`, `action: any` (implicit via untyped data) |

**Why it is wrong:** Without typed shapes for `ApprovalRequest`, `ApprovalStage`, `ApprovalAssignment`, `ApprovalFlow`, `ApprovalAction`, refactoring any API field name is a silent breaking change. TypeScript's entire value is lost.

**Fix:** Create `src/modules/approvals/types.ts`:
```ts
export interface ApprovalStage {
  id: string
  stage_order: number
  status: string
  action_label?: string
  role?: string
  requires_all: boolean
  due_at?: string
  assignments: ApprovalAssignment[]
}

export interface ApprovalAssignment {
  id: string
  assignee_type: string
  assignee_value: string
  status: string
}

export interface ApprovalRequest {
  id: string
  title: string
  summary?: string
  status: string
  priority?: string
  module: string
  entity_type: string
  entity_id: string
  requester_id: string
  requester_name?: string
  requested_at?: string
  due_at?: string
  can_act: boolean
  overdue?: boolean
  payload_snapshot?: string
  stages: ApprovalStage[]
  actions: ApprovalAction[]
  current_stage?: string
}
```
Then replace `any` with these types.

---

#### APP-11 — Stage list uses index key (`key={idx}`) on a reorderable/removable list
- **File:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx:185`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
{stages.map((stage, idx) => (
  <div key={idx} className="p-3 border border-gray-100 rounded-lg">
```

**Why it is wrong:** Stages can be removed via `removeStage`. When stage at index 0 is deleted, React sees `key=0` on a different stage and reuses the DOM node — controlled inputs (`<select>`, `<input>`) may retain old values. Any transition/animation will also glitch.

**Fix:** Use a stable synthetic ID. Either add a `uuid` field to the `Stage` type that is generated at `addStage` time, or use `stage.order` (which is re-assigned on removal but is unique within the array):
```tsx
const addStage = () => {
  setStages(prev => [...prev, { ...EMPTY_STAGE, order: prev.length + 1, _key: crypto.randomUUID() }])
}
// then: key={stage._key}
```

---

#### APP-12 — `helperText` computed via `useMemo` with a single boolean dep — unnecessary
- **File:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx:144–148`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const helperText = useMemo(() => {
  if (editingId) return 'Update the flow details and stages.'
  return 'Create a reusable approval flow with ordered stages.'
}, [editingId])
```

**Why it is wrong:** `useMemo` adds overhead (closure + dependency array comparison) for a computation cheaper than that overhead — a simple ternary is correct and idiomatic.

**Fix:**
```tsx
const helperText = editingId
  ? 'Update the flow details and stages.'
  : 'Create a reusable approval flow with ordered stages.'
```

---

#### APP-13 — No loading state shown while KPI data is fetching
- **File:** `src/modules/approvals/ApprovalsListPage.tsx:85–92`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const { data: kpiData } = useQuery({
  queryKey: ['approvals-kpis', scope, kpiParams],
  queryFn: () => approvalsApi.kpis(scope, kpiParams).then(r => r.data?.data ?? r.data),
  // isLoading not destructured
})
const kpis = kpiData ?? {}
```

**Why it is wrong:** On first load (and after filter changes), KPI cards show `0` for all counters until the KPI query resolves. A user may misread the empty KPI cards as "no items" before data arrives.

**Fix:** Destructure `isLoading: isKpiLoading` and show a skeleton or dimmed state on the stat cards:
```tsx
const { data: kpiData, isLoading: isKpiLoading } = useQuery({ ... })
// In cards:
<p className="text-2xl font-display font-bold text-gray-900">
  {isKpiLoading ? '—' : card.value}
</p>
```

---

#### APP-14 — Dual-shape data unwrapping is fragile and untested
- **File:** `src/modules/approvals/ApprovalDetailPage.tsx:21`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const approval = data?.data ?? data
```

**Why it is wrong:** The query function already calls `.then(r => r.data)`, so `data` here is the Axios response body (whatever the backend returns). If the backend wraps in `{ data: {...} }`, then `approval = data.data`. If not, `approval = data`. This dual-shape tolerance is a sign the API response contract is unknown and un-typed. If the backend ever changes its envelope, this silently changes which branch is taken.

**Fix:** Pin the actual API response shape in `types.ts` and fix the queryFn to always unwrap consistently:
```tsx
queryFn: () => approvalsApi.getRequest(id!).then(r => (r.data?.data ?? r.data) as ApprovalRequest),
// then approval = data  (no ?? needed)
```

---

#### APP-15 — Deactivate workflow fires without confirmation
- **File:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx:309`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button
  className="btn-secondary text-xs"
  onClick={() => deactivateMutation.mutate(flow.id)}
>
  Deactivate
</button>
```

**Why it is wrong:** Deactivating an approval flow may block future approvals across modules (Offers, Hiring Requests) that reference it. There is no confirmation dialog. A junior admin can accidentally deactivate production flows with a single click. The `deactivateMutation` also has no `onError` handler (see APP-02).

**Fix:** Add a `window.confirm` at minimum, or replace with a proper modal:
```tsx
onClick={() => {
  if (window.confirm(`Deactivate "${flow.name}"? This may affect active workflows.`)) {
    deactivateMutation.mutate(flow.id)
  }
}}
```

---

## Redundancy

### R-01 — `integrations/ApprovalWorkflowsPage.tsx` is a one-liner re-export of the same component

- `src/modules/integrations/ApprovalWorkflowsPage.tsx` (all 4 lines) re-exports `ApprovalsWorkflowsPage` from the approvals module.
- `src/modules/approvals/ApprovalsWorkflowsPage.tsx` is the real implementation.
- The router (`src/app/router.tsx:579`) points directly to the approvals module's component; the integrations wrapper is dead code never referenced by the router.

**Action:** Delete `src/modules/integrations/ApprovalWorkflowsPage.tsx`.

---

### R-02 — `['approval-flows']` query key defined inline in four separate files

| File | Line |
|---|---|
| `src/modules/approvals/ApprovalsWorkflowsPage.tsx` | 43 |
| `src/modules/recruitment/OffersPage.tsx` | 54 |
| `src/modules/recruitment/OpenPositionsPage.tsx` | 77 |
| `src/modules/recruitment/NewHiringRequestPage.tsx` | 35 |

All four fetch the same `approvalFlowsApi.list()` data under the same string key. While TanStack Query deduplicates the network calls correctly, the key is a raw string literal in four places. A typo in any one file creates a cache partition that is silently unfound by the others' invalidation calls.

**Fix:** Export a query key factory from a shared location:
```ts
// src/modules/approvals/queryKeys.ts
export const approvalKeys = {
  flows: () => ['approval-flows'] as const,
  // ...
}
```

---

### R-03 — `['users']` query key and `usersApi.list()` duplicated between approvals and recruitment

| File | Line |
|---|---|
| `src/modules/approvals/ApprovalsWorkflowsPage.tsx` | 48–49 |
| `src/modules/recruitment/OpenPositionsPage.tsx` | 89–90 |

Both use the identical `['users']` key with the identical `queryFn`. This coincidentally means they share cache (correct), but it is accidental coupling. If either file changes the key or queryFn, the other silently diverges. Should be extracted to a shared `useUsers()` hook in `src/modules/users/hooks.ts` (that file already exists).

---

## Tests & gaps

| Gap | Impact |
|---|---|
| Zero unit or integration tests for any component in this module | P1 — no regression coverage |
| No test for the filter → page-reset double-fetch (APP-03) | P1 |
| No test for action mutations (approve/reject) success + error paths (APP-02) | P1 |
| No test for `NavLink` active state (APP-05) | P2 |
| No contract test for API response envelope shape (APP-14) | P2 |

Recommended test entry points: `ApprovalsListPage` with a mocked TanStack Query provider (test filter changes, pagination), `ApprovalDetailPage` for action mutation outcomes.

---

## Coverage note

**Fully inspected (source read + grep-verified):**
- All 6 `.tsx` files in `src/modules/approvals/` — line-level
- `src/lib/api.ts` — the `approvalsApi` and `approvalFlowsApi` definitions
- `src/lib/utils.ts` — `STATUS_COLORS`, `formatDate`
- `src/app/router.tsx` — route definitions for approvals
- `src/modules/integrations/ApprovalWorkflowsPage.tsx` — confirmed wrapper

**Skimmed for cross-reference only:**
- `src/modules/recruitment/OffersPage.tsx`, `OpenPositionsPage.tsx`, `NewHiringRequestPage.tsx` — query key overlap only
- `src/modules/auth/permissions.ts` and `hooks.ts` — permission gate only

**Not inspected:**
- Backend API contracts (action string values `'approved'` vs `'approve'` — semantics depend on backend, confidence Low)
- `@tanstack/react-query` version — affects APP-04 analysis (v4 vs v5 prefix match behavior)
- Accessibility (ARIA, keyboard navigation, focus management) — out of scope for this pass

**Overall confidence: High** for all P0–P2 findings. APP-04 KPI invalidation is rated Medium until the TQ version is confirmed.

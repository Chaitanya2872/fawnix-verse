# org — Module Audit

**Audited:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated senior review)  
**Scope:** `src/modules/org/` (14 page files) + `src/lib/orgApi.ts` + `src/lib/setupApi.ts`

---

## Summary

The `org` module covers two sub-domains: **Organization** (chart, hierarchy, role mappings, structure, vacancies) and **Setup** (wizard-driven company onboarding across 9 steps). The module is functional scaffolding — real API calls are wired, but no query handles error or loading state, mutationFn closures carry stale risk in TanStack Query, inline `any`-typed mappers blanket both API files, and two critical cross-module cache key collisions will cause stale data bugs in production. The most dangerous issue is that hierarchy mutations never invalidate the chart cache, leaving the org chart perpetually stale after manager reassignments.

---

## Surface Map

### Pages / Routes

| Route | Component | Lines | Queries | Mutations |
|---|---|---|---|---|
| `/organization/structure` | `OrganizationStructurePage` | 199 | 5 | 5 |
| `/organization/chart` | `OrganizationChartPage` | 78 | 1 | 0 |
| `/organization/hierarchy` | `OrganizationHierarchyPage` | 65 | 1 | 1 |
| `/organization/roles` | `OrganizationRolesPage` | 63 | 1 | 1 |
| `/organization/vacancies` | `OrganizationVacanciesPage` | 107 | 1 | 1 |
| `/setup` | `SetupOverviewPage` | 68 | 1 | 0 |
| `/setup/wizard` | `SetupWizardPage` | 71 | 1 | 0 |
| `/setup/company` | `SetupCompanyPage` | 67 | 1 | 1 |
| `/setup/users` | `SetupUsersPage` | 125 | 1 | 2 |
| `/setup/employees` | `SetupEmployeesPage` | 90 | 1 | 2 |
| `/setup/policies` | `SetupPoliciesPage` | 42 | 1 | 0 |
| `/setup/workflows` | `SetupWorkflowsPage` | 54 | 1 | 1 |
| `/setup/activate` | `SetupActivatePage` | 66 | 1 | 1 |
| `/setup/roles-permissions` | `SetupRolesPermissionsPage` | 20 | 0 | 0 (stub) |

### API layer

| File | Entities | `any` count | staleTime | Error handling |
|---|---|---|---|---|
| `src/lib/orgApi.ts` | OrgNode, Department, BusinessUnit, Team, RoleMapping, Vacancy, Location, Designation | 8 | none | none |
| `src/lib/setupApi.ts` | CompanyProfile, SetupUser, RolePermission, SetupPolicy, WorkflowConfig, SetupProgress, SetupEmployee | 9 (incl. inner `stage: any`) | none | none |

No dedicated `hooks.ts`, `types.ts`, or query-key factory exists for this module. All query keys are inline string literals.

---

## Findings

### P0 — Critical / Data Correctness

---

#### ORG-01 — Hierarchy mutation does not invalidate the org-chart cache (stale chart)

**File:** `src/modules/org/organization/OrganizationHierarchyPage.tsx:11–14`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const updateMutation = useMutation({
  mutationFn: ({ nodeId, managerId }: { nodeId: string; managerId?: string }) =>
    orgApi.updateManager(nodeId, managerId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['org-hierarchy'] }),
})
```

**Why it is wrong:** `OrganizationChartPage` caches the same data under `['org-chart']`. When a manager is updated here, only `['org-hierarchy']` is invalidated. A user who then navigates to `/organization/chart` sees the old reporting lines — stale data that persists until the cache expires or the page is manually refreshed. These two pages call the same `orgApi.listOrgNodes()` but maintain separate cache entries due to different keys.

**Fix:** Add both keys to `onSuccess`:

```tsx
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['org-hierarchy'] })
  qc.invalidateQueries({ queryKey: ['org-chart'] })
},
```

Long-term, unify to a single query key (e.g., `['org', 'nodes']`) shared by both pages.

---

#### ORG-02 — `['departments']` and `['org-departments']` are two cache entries for the same `/departments` endpoint

**File:** `src/modules/org/organization/OrganizationStructurePage.tsx:17` vs `src/modules/recruitment/OpenPositionsPage.tsx:72` and `src/modules/recruitment/NewHiringRequestPage.tsx:30`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
// OrganizationStructurePage.tsx:17
queryKey: ['org-departments'],
queryFn: () => orgApi.listDepartments().then(r => r.data),

// OpenPositionsPage.tsx:72
queryKey: ['departments'],
queryFn: () => departmentsApi.list().then(r => r.data),
```

**Why it is wrong:** Both hit `GET /departments` but use different cache keys. When the org module adds a department via `orgApi.addDepartment`, it invalidates `['org-departments']` — but `['departments']` (used in recruitment) is never touched. The recruitment module will display a stale department list until its cache naturally expires. This is a silent staleness bug that will confuse operators.

**Fix:** Adopt a single shared query key `['departments']` for all callers of `GET /departments`. Consider a shared `queryKeys.departments()` factory in `src/lib/queryKeys.ts`.

---

#### ORG-03 — `updateManager` sends empty string to remove a manager instead of `null`/`undefined`

**File:** `src/lib/orgApi.ts:178`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```ts
updateManager: async (nodeId: string, managerId?: string) => {
  const res = await api.patch(`/org/nodes/${nodeId}/manager`, {
    manager_id: managerId ?? "",   // <-- sends "" when clearing
  });
```

**Why it is wrong:** Most REST APIs interpret an empty string as a literal string value, not as "clear the field." A `null` or omitting the key is the correct idiom. If the backend validates the field as a UUID or foreign key, this will either fail silently (the manager is not removed) or produce a 400/422. The UI select uses `value={node.manager_id || ''}` and passes `e.target.value || undefined`, which is correct — but the API layer immediately re-wraps `undefined` back to `""`.

**Fix:**

```ts
manager_id: managerId ?? null,
```

Or conditionally omit the key:

```ts
const body: Record<string, unknown> = {}
if (managerId !== undefined) body.manager_id = managerId
else body.manager_id = null
```

---

### P1 — High / Will Cause Bugs Under Normal Use

---

#### ORG-04 — `SetupCompanyPage` useEffect overwrites in-flight user edits on re-fetch

**File:** `src/modules/org/setup/SetupCompanyPage.tsx:14–16`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
useEffect(() => {
  if (data) setForm(data)
}, [data])
```

**Why it is wrong:** TanStack Query refetches on window focus by default. If a user starts editing the Company Name field and then alt-tabs back to the browser, the query refires, `data` changes reference, `useEffect` triggers, and `setForm(data)` replaces all unsaved edits with the server snapshot. The user loses their changes silently.

**Fix:** Initialize the form via `useState` defaultValue or initialize once with a ref guard:

```tsx
const initialized = useRef(false)
useEffect(() => {
  if (data && !initialized.current) {
    setForm(data)
    initialized.current = true
  }
}, [data])
```

Better: use `react-hook-form` with `defaultValues` driven by the query result, which handles re-population properly.

---

#### ORG-05 — `importEmployees` fires with no file payload — button is broken by design

**File:** `src/modules/org/setup/SetupEmployeesPage.tsx:24–26`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const importMutation = useMutation({
  mutationFn: () => setupApi.importEmployees(),  // no file argument
})
// setupApi.importEmployees:
importEmployees: async () => {
  const res = await api.post("/setup/employees/import")   // no body
```

And there is no `<input type="file">` in the component. The "Import CSV" button fires an empty POST with no file, which will always fail on any real backend expecting multipart form data. This is dead functionality shipped to production.

**Fix:** Add a hidden file input, read the `File` object, pass it as `FormData`:

```tsx
const fileRef = useRef<HTMLInputElement>(null)
const importMutation = useMutation({
  mutationFn: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return setupApi.importEmployees(fd)
  },
})
// In render:
<input ref={fileRef} type="file" accept=".csv" className="hidden"
  onChange={e => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f) }} />
<button onClick={() => fileRef.current?.click()}>Import CSV</button>
```

---

#### ORG-06 — `form as CompanyProfile` type assertion bypasses null check

**File:** `src/modules/org/setup/SetupCompanyPage.tsx:19`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const [form, setForm] = useState<CompanyProfile | null>(null)
//...
mutationFn: () => setupApi.updateCompany(form as CompanyProfile),
```

**Why it is wrong:** `form` is typed `CompanyProfile | null`. The early-return guard at line 23 prevents rendering the save button before `form` is set. However, the `useMutation` is defined _before_ the guard, closing over `form` which could theoretically be `null` at construction. If the save button could ever be reached while `form` is null (e.g., if the guard were removed, or during a rapid double-render), the cast silently allows `null` to reach `setupApi.updateCompany`, sending `{ name: null, ... }` to the server. The `as` cast tells TypeScript to trust you — but you haven't earned that trust.

**Fix:** Either narrow properly in the mutationFn or add a runtime guard:

```tsx
mutationFn: () => {
  if (!form) throw new Error('Form not initialized')
  return setupApi.updateCompany(form)
},
```

---

#### ORG-07 — `SetupWorkflowsPage` "Mark Reviewed" mutates data via string concatenation

**File:** `src/modules/org/setup/SetupWorkflowsPage.tsx:44`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
onClick={() => updateMutation.mutate({
  id: flow.id,
  description: `${flow.description} (updated)`
})}
```

**Why it is wrong:** This is not a "mark reviewed" action — it appends the literal string `" (updated)"` to the workflow description and PATCHes it to the server. Clicking "Mark Reviewed" twice produces `"description (updated) (updated)"`. This will corrupt workflow descriptions in the database after any use. There is no `reviewed: boolean` field, no idempotent toggle, and no visual feedback showing the action succeeded.

**Fix:** The backend should have a dedicated endpoint or field for marking a workflow as reviewed (e.g., `PATCH /approval-flows/:id/review`). If only the progress needs updating, call `setupApi.activate()` or a separate review endpoint. Do not mutate business data as a side effect of a UI state action.

---

#### ORG-08 — Role list is duplicated inside the same file at two locations

**File:** `src/modules/org/setup/SetupUsersPage.tsx:78` and `:108`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
// Line 78 – inside the table row (role editor)
{['admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer', 'employee'].map(...)}

// Line 108 – inside the modal (invite form)
{['admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer', 'employee'].map(...)}
```

**Why it is wrong:** The same inline array literal is copy-pasted twice. Adding or removing a role requires two coordinated edits in the same file. One will inevitably be missed, creating an asymmetry where the invite modal shows roles the edit dropdown does not (or vice versa).

**Fix:** Extract to a module-level constant:

```tsx
const ASSIGNABLE_ROLES = ['admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer', 'employee'] as const
```

Then reference `ASSIGNABLE_ROLES.map(...)` in both places.

---

### P2 — Medium / Standards Violations, UX Bugs

---

#### ORG-09 — Zero error handling or loading states across all 14 pages

**Files:** Every `.tsx` file in `src/modules/org/`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
// Typical pattern — no isLoading, isError, isPending, error check anywhere
const { data } = useQuery({ queryKey: [...], queryFn: ... })
const updateMutation = useMutation({ mutationFn: ..., onSuccess: ... })
```

**Why it is wrong:** When the API is unreachable, returns 500, or the network times out: the page silently renders empty tables with "No data" messages — indistinguishable from "the org is empty." Failed mutations (updateManager, addDepartment, updateVacancyStatus) silently discard errors. Users have no feedback that their action was lost.

**Fix:** At minimum, destructure `isError`/`error` from `useQuery` and show an error notice. For mutations, use `isPending` to disable the submit button and `isError` to surface a toast or inline message:

```tsx
const { data, isError, isLoading } = useQuery(...)
if (isLoading) return <Spinner />
if (isError) return <ErrorBanner message="Failed to load org data." />
```

---

#### ORG-10 — `OrganizationChartPage` performs O(n²) linear search inside JSX render

**File:** `src/modules/org/organization/OrganizationChartPage.tsx:57`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
{node.manager_id && (
  <div className="text-xs text-gray-400" style={{ paddingLeft: `${node.level * 18}px` }}>
    Reports to {nodes.find(n => n.id === node.manager_id)?.name || 'Manager'}
  </div>
)}
```

**Why it is wrong:** `nodes.find(...)` is called for every node that has a `manager_id`, making the render O(n²) — each row scans the entire list to resolve the manager name. For a 500-person org, this is 250,000 iterations on every render.

**Fix:** Build a lookup map once with `useMemo`:

```tsx
const nodeById = useMemo(
  () => new Map(nodes.map(n => [n.id, n])),
  [nodes]
)
// In JSX:
Reports to {nodeById.get(node.manager_id)?.name ?? 'Manager'}
```

---

#### ORG-11 — `SetupOverviewPage` progress counter may diverge from wizard step count

**File:** `src/modules/org/setup/SetupOverviewPage.tsx:25–26`  
**Severity:** P2 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```tsx
const completed = progress ? Object.values(progress).filter(Boolean).length : 0
const total = steps.length
```

**Why it is wrong:** `Object.values(progress)` iterates all fields of `SetupProgress` as returned by the server (after merging with `defaultProgress`). If the backend ever adds a new field to the progress object (e.g., `integrations: false`), `completed` will still count it but `total` (based on the hardcoded `steps` array) will be 9 — so the counter will show `10/9` or similar nonsense. The two sources of truth are not linked.

**Fix:** Drive `completed` from the step keys explicitly:

```tsx
const completed = steps.filter(s => Boolean(progress?.[s.key as keyof SetupProgress])).length
```

---

#### ORG-12 — `SetupWizardPage` and `SetupOverviewPage` duplicate the `steps` array with inconsistent labels

**Files:** `src/modules/org/setup/SetupOverviewPage.tsx:6–16` vs `src/modules/org/setup/SetupWizardPage.tsx:7–17`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

Both files declare an identical `const steps = [...]` array with the same 9 items, same keys and `href` values — but with different human labels:

```
SetupOverviewPage: { key: 'company', label: 'Company Setup' }
SetupWizardPage:   { key: 'company', label: 'Company Info' }

SetupOverviewPage: { key: 'users', label: 'User Management' }
SetupWizardPage:   { key: 'users', label: 'Create Users' }
```

**Why it is wrong:** Copy-paste divergence. Changing the step list (adding a step, changing an href) requires updating two files. The labels have already drifted, which will confuse users navigating between the overview and wizard views.

**Fix:** Extract to `src/modules/org/setup/setupSteps.ts`:

```ts
export const SETUP_STEPS = [
  { key: 'company', label: 'Company Setup', href: '/setup/company' },
  // ...
] as const
```

Import in both pages.

---

#### ORG-13 — Inline `any` types blanket all mapper functions in both API files

**Files:** `src/lib/orgApi.ts:34, 43, 49, 55, 61, 67, 80, 85` and `src/lib/setupApi.ts:83, 90, 102, 114, 125, 128, 140`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```ts
// orgApi.ts:34
const mapNode = (node: any): OrgNode => ({

// setupApi.ts:128
(stage: any) =>
```

15 explicit `any` annotations across the two API files. All mappers accept `any` as input, meaning no TypeScript error is raised if the wrong object shape is passed.

**Why it is wrong:** These mappers are the only place where raw API responses are normalized to typed domain objects. Using `any` here defeats TypeScript's ability to detect API contract changes. If the backend renames `managerId` to `reportingTo`, the mapper silently returns `undefined` and no compiler warning is issued.

**Fix:** Define raw API response shapes as `unknown` or explicit interfaces, then validate/narrow:

```ts
type ApiOrgNode = {
  id?: string
  name?: string
  role?: string
  department?: string
  managerId?: string
  manager_id?: string
  level?: number
}
const mapNode = (node: ApiOrgNode): OrgNode => ({ ... })
```

At minimum, change `any` to `unknown` to force explicit narrowing.

---

#### ORG-14 — `OrganizationRolesPage` department select is populated from existing mappings only — cannot assign a new department

**File:** `src/modules/org/organization/OrganizationRolesPage.tsx:17, 40–48`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const departments = Array.from(new Set(mappings.map(m => m.department)))
// ...
{departments.map(dep => (
  <option key={dep} value={dep}>{dep}</option>
))}
```

**Why it is wrong:** The dropdown for reassigning a role's department is populated entirely from departments already present in the mappings — not from the actual `org-departments` list. A user cannot move a role to a new department unless another role already exists in that department. This is a usability bug that silently limits the feature. If all roles are in "Engineering", you cannot reassign any role to "HR" without hacking the data.

**Fix:** Fetch departments from `orgApi.listDepartments()` and drive the dropdown from that list:

```tsx
const { data: depData } = useQuery({
  queryKey: ['org-departments'],
  queryFn: () => orgApi.listDepartments().then(r => r.data),
})
const departments = depData ?? []
```

---

#### ORG-15 — All forms use manual controlled inputs instead of react-hook-form

**Files:** `SetupCompanyPage.tsx`, `SetupEmployeesPage.tsx`, `SetupUsersPage.tsx`, `OrganizationStructurePage.tsx`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
// SetupEmployeesPage.tsx:13
const [draft, setDraft] = useState({ name: '', email: '', ... })
// ...
<input ... value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
```

**Why it is wrong:** Manual controlled-input patterns with individual `onChange` handlers produce boilerplate noise and provide no validation, no error messaging, no dirty-state tracking, and no submission locking. Email fields accept any string (no format check), department name inputs accept whitespace, and none of the forms prevent double-submission. The project presumably has `react-hook-form` available (it is standard in this type of stack) but it is unused here.

**Fix:** Use `react-hook-form` with validation rules. For email:

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<DraftType>()
<input {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} />
{errors.email && <span>Valid email required</span>}
```

---

#### ORG-16 — No `staleTime` set on any query — all data refetches on every window focus

**Files:** All 14 pages  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
useQuery({
  queryKey: ['org-departments'],
  queryFn: () => orgApi.listDepartments().then(r => r.data),
  // no staleTime
})
```

**Why it is wrong:** TanStack Query default `staleTime` is 0, meaning every `useQuery` result is considered stale immediately. On window focus, every active query refetches simultaneously. With 5 concurrent queries in `OrganizationStructurePage`, navigating between browser tabs triggers 5 parallel API requests every time. For largely static HR data (departments, designations, locations), this is wasteful.

**Fix:** Set an appropriate `staleTime` for static-ish data:

```tsx
useQuery({
  queryKey: ['org-departments'],
  queryFn: ...,
  staleTime: 5 * 60 * 1000, // 5 minutes for department data
})
```

Or configure globally in the `QueryClient` defaults.

---

### P3 — Low / Maintenance / Polish

---

#### ORG-17 — `OrganizationHierarchyPage` has a "Drag to reorder (placeholder)" dead UI string

**File:** `src/modules/org/organization/OrganizationHierarchyPage.tsx:52`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<td className="table-cell text-gray-500 text-xs">Drag to reorder (placeholder)</td>
```

**Why it is wrong:** This text ships to production in every table row. It looks like an internal development note and will confuse end-users. There is no drag-and-drop implementation in the component.

**Fix:** Remove the column entirely until drag-and-drop is implemented. If the feature is upcoming, hide via a feature flag, not a placeholder string.

---

#### ORG-18 — `OrganizationRolesPage` has an "Updated instantly" label that is misleading

**File:** `src/modules/org/organization/OrganizationRolesPage.tsx:50`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<td className="table-cell text-gray-500 text-xs">Updated instantly</td>
```

**Why it is wrong:** The mutation fires an async PATCH request. If the network is slow or the server returns an error (which is not caught — see ORG-09), the update does not happen "instantly" or at all. The label makes a promise the code does not keep.

**Fix:** Remove the column or replace with a mutation status indicator (`isPending ? 'Saving...' : isError ? 'Failed' : ''`).

---

#### ORG-19 — `SetupUsersPage` modal close button uses lowercase `x` text

**File:** `src/modules/org/setup/SetupUsersPage.tsx:100`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
```

**Why it is wrong:** A single lowercase `x` character is not a discoverable close button. It has no `aria-label`, will not be read correctly by screen readers ("x" vs "Close dialog"), and is visually tiny. This is both an accessibility and a UX issue.

**Fix:**

```tsx
<button onClick={() => setModalOpen(false)} aria-label="Close" className="...">
  <X className="w-4 h-4" />  {/* lucide-react X icon */}
</button>
```

---

#### ORG-20 — `OrganizationChartPage` "View profile" button is completely non-functional

**File:** `src/modules/org/organization/OrganizationChartPage.tsx:64`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<button className="text-xs text-brand-600 hover:underline">View profile</button>
```

**Why it is wrong:** No `onClick`, no `href`, no navigation. Clicking does nothing. This looks interactive to users.

**Fix:** Either wire it to navigate to the employee's profile page, or remove it until the profile feature is built.

---

#### ORG-21 — All form inputs in the module have no `aria-label` or associated `<label>` element

**Files:** `SetupCompanyPage.tsx`, `SetupEmployeesPage.tsx`, `SetupUsersPage.tsx`, `OrganizationStructurePage.tsx`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<input className="input" placeholder="Company name" value={form.name} ... />
```

**Why it is wrong:** Every input relies solely on `placeholder` text for its label. Placeholders disappear when the user starts typing, and screen readers do not reliably treat `placeholder` as a label. This fails WCAG 2.1 Level AA criterion 1.3.1 (Info and Relationships).

**Fix:** Add explicit `<label>` elements or `aria-label` attributes to every input.

---

#### ORG-22 — `SetupActivatePage` module activation list is hardcoded (9 static entries)

**File:** `src/modules/org/setup/SetupActivatePage.tsx:6–16`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```tsx
const modules = [
  { name: 'Recruitment', href: '/recruitment/pipeline' },
  { name: 'Pre-Onboarding', href: '/preboarding' },
  // ... 9 entries total
]
```

**Why it is wrong:** The list of available modules and their routes is duplicated here and presumably in the sidebar navigation. Adding a new module requires updating multiple locations. All 9 modules show the same activation badge driven by a single `progress?.activate` boolean — there is no per-module activation tracking, even though the UI implies each card is independently activatable.

**Fix:** If per-module activation is intended, the backend should return a `modules: Record<string, boolean>` map. The hardcoded list should at minimum be derived from a shared navigation config to avoid drift.

---

#### ORG-23 — `OrganizationStructurePage` `addDep`/`addBu`/`addTeam` mutations close over stale local state

**File:** `src/modules/org/organization/OrganizationStructurePage.tsx:37–78`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```tsx
const addDep = useMutation({
  mutationFn: () => orgApi.addDepartment({ name: depName, head: depHead }),
  // depName and depHead are closed over from component scope
```

**Why it is wrong:** TanStack Query v5 calls `mutationFn` fresh each time `mutate()` is called, so the closure captures the current `depName`/`depHead` at call-time — this is **technically fine**. However, this pattern is fragile: if `useMutation` is ever moved to a custom hook or refactored, the closure stales. More practically, the pattern is inconsistent: `addMutation` in `SetupEmployeesPage` also closes over `draft`, but `SetupUsersPage.addMutation` passes no variables. The correct pattern is to pass variables through `mutate(vars)`:

```tsx
const addDep = useMutation({
  mutationFn: (vars: { name: string; head: string }) =>
    orgApi.addDepartment(vars),
})
// call site:
addDep.mutate({ name: depName, head: depHead })
```

This makes the data flow explicit and removes ambiguity.

---

## Redundancy

### R-01 — Same `/departments` endpoint fetched under two different cache keys

- `src/modules/org/organization/OrganizationStructurePage.tsx:17` uses `['org-departments']` calling `orgApi.listDepartments()` → `GET /departments`
- `src/modules/recruitment/OpenPositionsPage.tsx:72` uses `['departments']` calling `departmentsApi.list()` → `GET /departments`
- `src/modules/recruitment/NewHiringRequestPage.tsx:30` uses `['departments']` calling `departmentsApi.list()` → `GET /departments`

All three hit the identical endpoint but maintain separate cache entries. Mutation invalidation from the org module never propagates to the recruitment module's cache.

### R-02 — `steps` array defined identically (structure, keys, hrefs) in two setup pages

- `src/modules/org/setup/SetupOverviewPage.tsx:6–16` — 9-element steps array
- `src/modules/org/setup/SetupWizardPage.tsx:7–17` — identical 9-element steps array

Labels have already drifted (see ORG-12). Both should import from a shared constant.

### R-03 — Role string array duplicated within the same file

- `src/modules/org/setup/SetupUsersPage.tsx:78` — role select in table row
- `src/modules/org/setup/SetupUsersPage.tsx:108` — role select in modal

Identical 6-element `['admin', 'hr_manager', ...]` literal.

### R-04 — User-fetch logic duplicated in two API files with different field names

- `src/lib/api.ts:125–141` — `usersApi.list()` hits `GET /users`, maps to `{ full_name, is_active, phone_number }`
- `src/lib/setupApi.ts:159–185` — `setupApi.listUsers()` hits `GET /users`, maps to `{ name, status, phoneNumber }`

Both hit the same endpoint with different normalization. The recruitment module consumes `full_name`; the setup module consumes `name`. These will diverge further as the API evolves.

### R-05 — Duplicate search-state + URL-sync pattern

- `src/modules/org/organization/OrganizationVacanciesPage.tsx:15–42` — `useState` + `useSearchParams` dual sync
- `src/modules/recruitment/JobPostingsPage.tsx:31` — identical pattern
- `src/modules/recruitment/OpenPositionsPage.tsx:47` — identical pattern

Three copy-pastes of the same 20-line search handler. A shared `useSearchParamState(key)` hook would centralize this.

---

## Tests & Gaps

**Test coverage: Zero.** No `.test.tsx`, `.spec.tsx`, or any test file exists for any component or API file in this module — or anywhere in the project (`find` returned empty). There are no unit tests for:

- The mapper functions (`mapNode`, `mapUser`, etc.) which contain branching normalization logic that would benefit enormously from unit tests
- The `OrganizationVacanciesPage` filter logic
- The `SetupOverviewPage` progress counter
- Any mutation `onSuccess` callback

Priority test targets given the bugs found:
1. `orgApi.updateManager` — test that passing `undefined` sends `null` not `""`
2. `mapNode` — test `managerId` vs `manager_id` fallback
3. `SetupOverviewPage` — test that `completed` is derived from step keys, not from raw `Object.values(progress)`
4. `SetupWorkflowsPage` Mark Reviewed — test that repeated clicks do not compound the `(updated)` suffix

---

## Coverage Note

**Fully inspected:** All 14 `.tsx` files in `src/modules/org/`, `src/lib/orgApi.ts`, `src/lib/setupApi.ts`, `src/app/router.tsx` (org-related sections), `src/lib/api.ts` (for cross-module duplication).

**Skimmed / not opened:** `src/lib/utils.ts`, `src/services/api-client.ts` (referenced by `src/lib/api.ts`), all other modules (checked only for query key and endpoint collisions via grep).

**Confidence overall:** High for correctness bugs and cache key findings (grep-confirmed and line-referenced); Medium for the `SetupActivatePage` module list concern (architectural judgment, not a definite crash bug); Medium for ORG-23 stale closure (technically works in TanStack v5, flagged as fragile pattern).

# recruitment — Module Audit

## Summary

The recruitment module covers the full hiring funnel: hiring requests, open positions, job postings, candidate intake, pipeline, applications, interviews, offers, analytics, and form builder. The module is feature-complete in scope but shows consistent signs of junior copy-paste development: 57 raw `any` annotations spread across 13 files, a fully hardcoded (mock-data) Talent Pool page rendered to users, a permanently-disabled "Schedule Interview" button, duplicated feedback-form JSX across two pages, and a garbled currency symbol (`?`) reaching production UI. The most severe risk is the hardcoded `mockPool` array in `TalentPoolPage.tsx` — real candidate data is never loaded. Secondary risks are the `['positions']` query-key collision shared by five files with divergent `queryFn` arguments, and empty `interviewer_id: ''` submitted to the feedback API.

---

## Surface Map

### Pages / Routes

| Page File | Route | Notes |
|---|---|---|
| `HiringRequestsPage.tsx` | `/recruitment/hiring-requests` | List + status filter + client-side search |
| `HiringRequestDetailPage.tsx` | `/recruitment/hiring-requests/:id` | Read-only detail |
| `NewHiringRequestPage.tsx` | `/recruitment/hiring-requests/new` | Create form, raw async/await |
| `OpenPositionsPage.tsx` (559 l) | `/recruitment/positions` | God-component; create/edit/archive positions |
| `JobPostingsPage.tsx` (380 l) | `/recruitment/postings` | Create/edit/publish postings |
| `CandidatePipelinePage.tsx` | `/recruitment/pipeline` | Kanban with native drag-and-drop |
| `IntakePage.tsx` | `/recruitment/intake` | Review + shortlist applicants |
| `CandidatesPage.tsx` (418 l) | `/recruitment/candidates` | Application list + filters |
| `CandidateProfilePage.tsx` (508 l) | `/recruitment/candidates/:id` | Schedule, feedback, decision modals |
| `InterviewsPage.tsx` | `/recruitment/interviews` | Interview list + feedback modal |
| `OffersPage.tsx` (294 l) | `/recruitment/offers` | Offer management |
| `TalentPoolPage.tsx` | `/recruitment/talent-pool` | HARDCODED MOCK DATA — no real API |
| `AnalyticsPage.tsx` | `/recruitment/analytics` | Funnel metrics |
| `ApplicationFormsPage.tsx` | `/forms` (shared) | Form library list |
| `ApplicationFormBuilderPage.tsx` (766 l) | `/forms/:id` (shared) | God-component form builder |

### Data Layer

| Entity | API object | Key Query Keys |
|---|---|---|
| Hiring Requests | `recruitmentApi` | `['hiring-requests', statusFilter]`, `['hiring-request', id]` |
| Positions | `recruitmentApi` | `['positions']` (5 callers, see REC-02) |
| Postings | `recruitmentApi` | `['postings']` |
| Intake | `recruitmentApi` | `['intake', params]` |
| Pipeline | `recruitmentApi` | `['pipeline', selectedVacancy]` |
| Candidates / Applications | `candidatesApi` | `['candidate', id]`, `['applications', params]` |
| Interviews | `interviewsApi` | `['interviews']` (collision — see REC-03) |
| Offers | `offersApi` | `['offers']` |
| Analytics | `recruitmentApi` | `['recruitment-analytics']` |
| Forms | `formsApi` | `['forms', id]`, `['forms', filters]` (cross-module collision — see REC-04) |

**Missing:** No dedicated `api.ts`, `hooks.ts`, or `types.ts` within `src/modules/recruitment/`. All API calls, types, and query keys live inline in page components.

---

## Findings

### P0 — Critical

---

#### REC-01 | TalentPoolPage renders hardcoded mock data, no real API called
- **File:** `src/modules/recruitment/TalentPoolPage.tsx:13–69`
- **Severity:** P0 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const mockPool = [
  {
    id: '1', name: 'Emily Rodriguez', title: 'Senior Frontend Developer',
    email: 'emily@email.com', ...
  },
  // 4 more hardcoded candidates
]

export default function TalentPoolPage() {
  ...
  const filtered = mockPool      // line 169 — mockPool never replaced by real data
    .filter(...)
```

**Why it is wrong:** Users are shown five invented candidates. Any "Add to Pool", "Remove from Pool", "Send Email", or "Quick Apply" button is also a no-op — there is no mutation. This is a placeholder page that shipped to production.

**Fix:**
```tsx
const { data } = useQuery({
  queryKey: ['talent-pool'],
  queryFn: () => recruitmentApi.getTalentPool().then(r => r.data),
})
const pool = data?.data ?? []
```
Add `recruitmentApi.getTalentPool()` and `recruitmentApi.addToPool()` / `removeFromPool()` mutations. Remove the `mockPool` constant entirely.

---

#### REC-02 | `['positions']` query-key collision — five callers, divergent `queryFn` arguments
- **File (all):** `CandidatesPage.tsx:68`, `CandidatePipelinePage.tsx:87`, `ApplicationFormBuilderPage.tsx:118`, `IntakePage.tsx:36`
- **vs.** `OpenPositionsPage.tsx:66` → key is `['positions', statusFilter]`; `JobPostingsPage.tsx:51` → key is `['positions', 'for-posting']`
- **Severity:** P0 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// CandidatesPage.tsx:68-69
queryKey: ['positions'],
queryFn: () => recruitmentApi.getPositions({}).then(r => r.data),

// ApplicationFormBuilderPage.tsx:118-119
queryKey: ['positions'],
queryFn: () => recruitmentApi.getPositions().then(r => r.data),  // NO arg vs {}

// OpenPositionsPage.tsx:98 — invalidates ['positions'] (wipes all sub-keys)
qc.invalidateQueries({ queryKey: ['positions'] })
```

**Why it is wrong:**
1. `ApplicationFormBuilderPage` calls `getPositions()` (no argument) while all others call `getPositions({})`. TanStack Query caches both under the same key `['positions']`, so the first resolver to populate the cache wins. The other callers will receive stale filtered/unfiltered data silently.
2. `OpenPositionsPage.invalidateQueries(['positions'])` is correct for its own `['positions', statusFilter]` key (hierarchical match), but it will also blow away the `['positions', 'for-posting']` cache in `JobPostingsPage`, causing an extra refetch on every save/archive.

**Fix:** Adopt a query-key factory:
```ts
// src/modules/recruitment/queryKeys.ts
export const recruitmentKeys = {
  positions: (params?: object) => ['positions', params ?? {}] as const,
  positionsForPosting: () => ['positions', 'for-posting'] as const,
}
```
Each caller passes its params as part of the key so caches are properly separated.

---

### P1 — High

---

#### REC-03 | `['interviews']` query-key mismatch — `CandidateProfilePage` fetches ALL interviews then filters client-side
- **File:** `CandidateProfilePage.tsx:75–98`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// line 75–77: key includes application_id but queryFn ignores it
queryKey: ['interviews', application?.application_id],
queryFn: () => interviewsApi.list().then(r => r.data),   // fetches ALL

// line 94–98: manually filters after
const interviews = useMemo(() => {
  const list = interviewsData?.data ?? []
  if (!application?.application_id) return list
  return list.filter((i: any) => i.application_id === application.application_id)
}, [interviewsData, application])
```

**Why it is wrong:** The query key `['interviews', application?.application_id]` suggests a scoped fetch, but the actual request retrieves every interview in the system. At scale this is a large over-fetch. Additionally, when `InterviewsPage` also uses `queryKey: ['interviews']` (bare), TanStack considers `['interviews', '123']` a *child* of `['interviews']` — invalidating `['interviews']` in `InterviewsPage.tsx:71` will refetch the profile query unnecessarily.

**Fix:** Pass the filter to the API call and match the key to what you actually query:
```tsx
queryKey: ['interviews', { application_id: application?.application_id }],
queryFn: () => interviewsApi.list({ application_id: application!.application_id }).then(r => r.data),
enabled: Boolean(application?.application_id),
```
Remove the `useMemo` filter — the server returns only the right records.

---

#### REC-04 | `['forms']` query key shared between recruitment and the forms module
- **File:** `ApplicationFormBuilderPage.tsx:164`, `ApplicationFormsPage.tsx:39,44` vs. `src/modules/forms/FormCollectionsPage.tsx:24`, `FormLinksPage.tsx:17`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// ApplicationFormBuilderPage.tsx:164
qc.invalidateQueries({ queryKey: ['forms'] })  // recruitment module
// FormCollectionsPage.tsx:24 (forms module)
queryKey: ['forms'],
queryFn: () => formsApi.listForms({})...
```

**Why it is wrong:** `ApplicationFormBuilderPage` invalidates `['forms']` after every save/publish. That invalidation propagates to the `forms` module's `FormCollectionsPage` and `FormLinksPage`, causing silent refetches from completely unrelated user flows. In the opposite direction, saves from the forms module also invalidate data the recruitment page holds. Cross-module cache pollution is a source of hard-to-trace flicker bugs.

**Fix:** Namespace by module:
```tsx
// ApplicationFormsPage / ApplicationFormBuilderPage
queryKey: ['recruitment', 'forms', ...rest]
// forms module
queryKey: ['forms', 'library', ...rest]
```

---

#### REC-05 | `SortableFieldCard` defined inside `ApplicationFormBuilderPage` — recreated every render
- **File:** `ApplicationFormBuilderPage.tsx:335–379`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
export default function ApplicationFormBuilderPage() {
  // ... all state ...

  function SortableFieldCard({ field }: { field: Field }) {   // line 335
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable(...)
    // ...
  }

  return (
    // SortableFieldCard used here
  )
}
```

**Why it is wrong:** A React component defined *inside* another component gets a new function reference every render. React treats it as a different component type each time, causing it to unmount and remount instead of updating — this destroys DnD state (focus, drag handles) and creates subtle UI glitches. This is a well-documented React anti-pattern.

**Fix:** Hoist `SortableFieldCard` out of the parent:
```tsx
// Define at module level, outside ApplicationFormBuilderPage
function SortableFieldCard({ field, selectedFieldId, onSelect, onMove, onRemove }: SortableFieldCardProps) {
  ...
}

export default function ApplicationFormBuilderPage() { ... }
```
Pass the needed callbacks and selected state as props.

---

#### REC-06 | `interviewer_id` submitted as empty string to the feedback API
- **File:** `InterviewsPage.tsx:78`, `CandidateProfilePage.tsx:180`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// InterviewsPage.tsx:78
feedbackMutation.mutate({
  interviewId: feedbackTarget.id,
  payload: { interviewer_id: '', ...feedbackForm }  // blank string
})

// CandidateProfilePage.tsx:180 (identical)
feedbackMutation.mutate({
  interviewId: feedbackTarget.id,
  payload: { interviewer_id: '', ...feedbackForm }
})
```

**Why it is wrong:** The backend receives `interviewer_id: ""` which either fails validation silently or persists an invalid foreign key. There is no authenticated user's ID populated. In `CandidateProfilePage.tsx:169`, a variable named `id` (shadowing `useParams`) is used in a different context — showing the copy-paste origin.

**Fix:** Inject the current user's ID from auth context:
```tsx
const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() })
// then:
payload: { interviewer_id: currentUser?.id ?? '', ...feedbackForm }
```
Validate server-side that `interviewer_id` is non-empty and a valid UUID before persisting.

---

#### REC-07 | `CandidateProfilePage` — `interviews` query has no `enabled` guard
- **File:** `CandidateProfilePage.tsx:75–77`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const { data: interviewsData } = useQuery({
  queryKey: ['interviews', application?.application_id],
  // no enabled: Boolean(application?.application_id)
  queryFn: () => interviewsApi.list().then(r => r.data),
})
```

**Why it is wrong:** `application` is derived from a separate query that loads asynchronously. During that load window, the interviews query fires immediately with `application_id = undefined`, fetching all interviews unnecessarily. Every other dependent query in the same file correctly uses `enabled: Boolean(...)`.

**Fix:**
```tsx
const { data: interviewsData } = useQuery({
  queryKey: ['interviews', { application_id: application?.application_id }],
  enabled: Boolean(application?.application_id),
  queryFn: () => interviewsApi.list({ application_id: application!.application_id }).then(r => r.data),
})
```

---

#### REC-08 | "Download Resume" button is a non-functional stub
- **File:** `CandidateProfilePage.tsx:218–220`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button className="btn-secondary w-full justify-center text-sm">
  <Download className="w-4 h-4" />Download Resume
</button>
```

**Why it is wrong:** No `onClick`, no `href`, no link to `candidate.resume_url` (which exists in the data model from `CandidatesPage.tsx:43`). The button is visually present but completely inert — a recruiter clicking it gets no response.

**Fix:**
```tsx
<a
  href={application?.resume_url ?? '#'}
  target="_blank"
  rel="noreferrer"
  className={cn('btn-secondary w-full justify-center text-sm', !application?.resume_url && 'opacity-50 pointer-events-none')}
>
  <Download className="w-4 h-4" />Download Resume
</a>
```

---

#### REC-09 | "Schedule Interview" button in `InterviewsPage` is permanently disabled with no explanation
- **File:** `InterviewsPage.tsx:85–87`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button className="btn-primary" disabled>
  <Plus className="w-4 h-4" />Schedule Interview
</button>
```

**Why it is wrong:** A permanently `disabled` primary action button with no tooltip or comment is a shipped stub. Users on the interviews list page have no way to schedule new interviews from this view. The feature clearly exists in `CandidateProfilePage` but was never wired here.

**Fix:** Either implement the scheduling modal (same pattern as `CandidateProfilePage.tsx:296–382`) or remove the button and add a link to the candidate profile.

---

#### REC-10 | `NewHiringRequestPage` — no error feedback to the user on submission failure
- **File:** `NewHiringRequestPage.tsx:54–77`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const handleSubmit = async (status: 'draft' | 'pending') => {
  setSubmitting(true)
  try {
    await recruitmentApi.createHiringRequest({ ... })
    navigate('/recruitment/hiring-requests')
  } finally {
    setSubmitting(false)          // catch block is absent — error is swallowed
  }
}
```

**Why it is wrong:** If `createHiringRequest` throws (validation error, 500, network failure), `finally` runs but no error state is shown. The user sees the buttons re-enable and nothing else — no toast, no inline error, nothing.

**Fix:**
```tsx
const [submitError, setSubmitError] = useState('')
const handleSubmit = async (status: 'draft' | 'pending') => {
  setSubmitting(true)
  setSubmitError('')
  try {
    await recruitmentApi.createHiringRequest({ ... })
    navigate('/recruitment/hiring-requests')
  } catch (err: any) {
    setSubmitError(err?.response?.data?.message || 'Failed to submit request.')
  } finally {
    setSubmitting(false)
  }
}
// Render submitError inline near the submit buttons
```

---

### P2 — Medium

---

#### REC-11 | Hardcoded default skills `['React', 'TypeScript']` in `NewHiringRequestPage`
- **File:** `NewHiringRequestPage.tsx:9`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const [skills, setSkills] = useState<string[]>(['React', 'TypeScript'])
```

**Why it is wrong:** Every new hiring request starts with React and TypeScript pre-filled, regardless of department or role. A marketing manager creating a request for a copywriter will need to manually remove these. This is a copy-paste artifact from a demo.

**Fix:** Initialize with an empty array: `useState<string[]>([])`.

---

#### REC-12 | Garbled currency symbol in `OffersPage.formatSalary` and `NewHiringRequestPage` labels
- **File:** `OffersPage.tsx:23`, `NewHiringRequestPage.tsx:166,176`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// OffersPage.tsx:23
return `?${(num / 100000).toFixed(1)}L`     // ? renders as a literal question mark

// NewHiringRequestPage.tsx:166
<label ...>Min Salary (?)</label>            // ? instead of ₹
```

**Why it is wrong:** The Indian Rupee symbol `₹` (U+20B9) was lost — likely a file encoding issue or a copy-paste from a non-UTF-8 editor. Users see `?12.5L` and `Min Salary (?)` in the UI.

**Fix:** Replace `?` with the explicit Unicode escape:
```tsx
return `₹${(num / 100000).toFixed(1)}L`
// label: `Min Salary (₹)`
```
Ensure the file is saved in UTF-8. Consider a shared `formatINR(n)` utility in `src/lib/utils.ts`.

---

#### REC-13 | `OpenPositionsPage` — "Archive" fires immediately with no confirmation dialog
- **File:** `OpenPositionsPage.tsx:283–285`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button
  className="text-xs text-gray-500 hover:text-red-600"
  onClick={() => archiveMutation.mutate(p.id)}
  disabled={archiveMutation.isPending}
>
  Archive
</button>
```

**Why it is wrong:** Archiving a position is a destructive, non-reversible action from the UI perspective (no "unarchive" button visible). One misclick archives an active position without any warning.

**Fix:** Add a `window.confirm` guard at minimum, or a lightweight confirmation popover:
```tsx
onClick={() => {
  if (window.confirm(`Archive "${p.title}"?`)) archiveMutation.mutate(p.id)
}}
```

---

#### REC-14 | `OffersPage` — applications dropdown loaded with hardcoded `limit: 100`
- **File:** `OffersPage.tsx:49–51`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
queryKey: ['offer-apps'],
queryFn: () => candidatesApi.listApplications({ limit: 100 }).then(r => r.data),
```

**Why it is wrong:** If there are more than 100 active applications, newer candidates are silently excluded from the "Create Offer" dropdown. An HR user would see no error and wonder why the candidate is missing. The query key `['offer-apps']` also differs from `['applications', params]` used elsewhere — this entry is never invalidated when a new application comes in.

**Fix:** Either use a server-side search within the modal (autocomplete) or paginate the dropdown. Also align the query key:
```tsx
queryKey: ['applications', { limit: 100 }],
```

---

#### REC-15 | `ApplicationFormBuilderPage` — 766 lines, 8 `useState` calls, god-component
- **File:** `ApplicationFormBuilderPage.tsx` (entire file)
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Why it is wrong:** At 766 lines with 8 `useState` hooks, 5 `useQuery` calls, 4 `useMutation` calls, and a sub-component defined inside (`SortableFieldCard`), this file is unreadable and untestable. It handles: form metadata editing, field drag-and-drop, field settings panel, template management, submission table, QR display, and publish flow.

**Fix:** Extract into:
- `useFormBuilder(id)` — a custom hook owning all queries/mutations/state
- `FieldLibraryPanel.tsx` — left sidebar
- `FieldCanvas.tsx` — center sortable canvas  
- `FieldSettingsPanel.tsx` + `FormSettingsPanel.tsx` — right sidebar
- `TemplatePanel.tsx`
- `SubmissionsTable.tsx`

---

#### REC-16 | `CandidatesPage` — 14 `useState` hooks, "Export" and "Star" buttons are stubs
- **File:** `CandidatesPage.tsx` (418 lines), lines `272–275` and `319–320`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// Export — no onClick
<button className="btn-secondary text-sm gap-2">
  <Download className="w-4 h-4" />
  Export
</button>

// Star — no state, no mutation
<button className="text-gray-300 hover:text-amber-400">
  <Star className="w-3.5 h-3.5" />
</button>
```

**Why it is wrong:** Two prominent UI controls are purely decorative. At 14 `useState` hooks and 418 lines, the component is also a god-component.

**Fix:** Wire Export to a CSV download endpoint or `Blob`-based export. Wire Star to a `candidatesApi.toggleStar(app.candidate_id)` mutation with local state reflecting the current starred status.

---

#### REC-17 | `CandidateProfilePage` — 10 `useState` hooks, modals and data fetching co-mingled, 508 lines
- **File:** `CandidateProfilePage.tsx` (508 lines)
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Why it is wrong:** Schedule-interview modal, feedback modal, and decision-approval modal are all inlined into a single 508-line component, making the render tree complex and each code path hard to follow. The `feedbackTarget` and `scheduleForm` states could each belong to a dedicated sub-component.

**Fix:** Extract `ScheduleInterviewModal.tsx`, `FeedbackModal.tsx`, and `DecisionModal.tsx` from this file. The parent component becomes a data orchestrator only.

---

#### REC-18 | Pervasive `any` typing across the module — 57 occurrences
- **File:** All files except `HiringRequestDetailPage.tsx`, `ApplicationFormsPage.tsx`, `TalentPoolPage.tsx`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Sample offending code (worst files):**
```tsx
// OffersPage.tsx — 9 occurrences
const filtered = offers.filter((o: any) => { ... })
mutationFn: (payload: any) => offersApi.create(payload)

// InterviewsPage.tsx — 8 occurrences
const interviews = data?.data ?? []
interviews.filter((i: any) => i.status === 'scheduled')

// OpenPositionsPage.tsx — 8 occurrences
(usersData?.data ?? []).filter((u: any) => u.role === 'recruiter')
```

**Why it is wrong:** `any` defeats the entire purpose of TypeScript. A typo in a field name (e.g. `u.role` vs `u.roles`) compiles silently. Response types from the API are unknown — if the backend renames a field the frontend breaks at runtime.

**Fix:** Define shared types in a new `src/modules/recruitment/types.ts`:
```ts
export type Application = { application_id: string; candidate_name: string; status: string; ... }
export type Interview = { id: string; round_number: number; status: string; ... }
export type Offer = { id: string; base_salary?: number; status: string; ... }
export type HiringRequest = { id: string; job_title: string; status: string; ... }
```
Replace every `(x: any)` in `.map`, `.filter` with the concrete type.

---

#### REC-19 | `IntakePage` — inline initials computation instead of shared `getInitials`
- **File:** `IntakePage.tsx:149`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
{(intake.candidate_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
```

**Why it is wrong:** `src/lib/utils.ts:71` exports `getInitials()` which is used by `CandidatesPage.tsx`, `CandidateProfilePage.tsx`, and `CandidatePipelinePage.tsx`. `IntakePage` re-implements a slightly different version (missing the null guard for single-character names). Three different candidate-avatar implementations exist in this module.

**Fix:**
```tsx
import { getInitials } from '@/lib/utils'
// ...
{getInitials(intake.candidate_name || 'C')}
```

---

#### REC-20 | `OpenPositionsPage` — role comparison uses `u.role` (singular) but auth returns `roles` (array)
- **File:** `OpenPositionsPage.tsx:114,119`
- **Severity:** P2 | **Confidence:** Med
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const recruiters = canLoadUsers
  ? (usersData?.data ?? []).filter((u: any) => u.role === 'recruiter')
  : ...
const managers = canLoadUsers
  ? (usersData?.data ?? []).filter((u: any) => ['hiring_manager', 'hr_manager'].includes(u.role))
```

**Why it is wrong:** The `currentUser` object used 4 lines above is accessed via `currentUser?.roles?.[0]` (plural array). If the users API also returns `roles: string[]` rather than `role: string`, these filters silently return empty arrays — no recruiters or managers appear in the dropdown.

**Fix:** Audit the `/users` API response shape and update accordingly:
```tsx
.filter((u: any) => (u.roles ?? [u.role]).includes('recruiter'))
```

---

### P3 — Low / Informational

---

#### REC-21 | Panel Users entered as raw comma-separated UUID strings — very poor UX
- **File:** `OpenPositionsPage.tsx:519–527`, `CandidateProfilePage.tsx:364–371`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<input
  className="input"
  value={round.panel_users.join(', ')}
  placeholder="comma-separated user IDs"
  ...
/>
```

**Why it is wrong:** HR coordinators must know and manually type UUIDs like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. This is copy-paste convenience for developers, not real UX. Any typo silently sends an invalid ID to the API.

**Fix:** Replace with a multi-select component backed by the `usersApi.list()` data (already fetched in `OpenPositionsPage`).

---

#### REC-22 | `HiringRequestsPage` — client-side title search while status is server-filtered
- **File:** `HiringRequestsPage.tsx:25–26`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const filtered = requests.filter((r: any) =>
  r.job_title.toLowerCase().includes(search.toLowerCase())
)
```

**Why it is wrong:** The status filter is sent to the server, but the title search runs only over the currently-loaded page of results. If the server paginates (or limits by default), search returns incomplete results. There is no server-side search capability wired for hiring requests.

**Fix:** Pass `search` as a query param alongside `status`:
```tsx
queryKey: ['hiring-requests', { status: statusFilter, search }],
queryFn: () => recruitmentApi.getHiringRequests({ status: statusFilter || undefined, search: search || undefined }).then(r => r.data),
```

---

#### REC-23 | `ApplicationFormBuilderPage` — `createId()` uses `Math.random()` for field IDs used as DnD identifiers
- **File:** `ApplicationFormBuilderPage.tsx:63`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
const createId = () => Math.random().toString(36).slice(2, 10)
```

**Why it is wrong:** `Math.random()` is not crypto-secure and has a non-trivial collision probability for short (8-char) strings. With many fields, there is a real chance of duplicate IDs which would break DnD sorting (DnD kit uses these as stable identifiers). For fields loaded from the server, the `id` is re-generated client-side on each `useEffect` load, meaning the same field gets a different ID every time the form is fetched.

**Fix:** Use `crypto.randomUUID()` (available in all modern browsers) or import `nanoid`. For server-loaded fields, use the field's server-assigned `id` or `field_key` as the DnD stable ID — do not regenerate on every load.

---

#### REC-24 | `['forms-list']` vs `['forms']` — two different keys querying the same forms endpoint
- **File:** `OpenPositionsPage.tsx:82–84` vs `ApplicationFormsPage.tsx:28–30`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
// OpenPositionsPage.tsx:82
queryKey: ['forms-list'],
queryFn: () => formsApi.listForms({ module: 'recruitment' }).then(r => r.data),

// ApplicationFormsPage.tsx:28
queryKey: ['forms', filters],
queryFn: () => formsApi.listForms(filters).then(r => r.data),
```

**Why it is wrong:** The same API endpoint is queried under two different root keys. Invalidating `['forms']` (done by `ApplicationFormBuilderPage`) will not refresh the `['forms-list']` entry in `OpenPositionsPage`. After publishing a new recruitment form in the builder, the position-creation dropdown will remain stale.

**Fix:** Consolidate under `['forms', params]` — or adopt the query-key factory described in REC-02.

---

#### REC-25 | No `staleTime` set on any query — aggressive refetching on every window focus
- **File:** All 15 `.tsx` files in the module
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Why it is wrong:** TanStack Query defaults to `staleTime: 0`, meaning every component that uses a query will refetch when the window is refocused. With 15 pages each triggering 2–5 queries, navigating back and forth across the recruitment module causes a storm of API calls. Slow or flaky endpoints (analytics, pipeline) will re-hit the server constantly.

**Fix:** Set sensible defaults in the `QueryClient` configuration and/or on per-query bases for reference data:
```tsx
// src/app/queryClient.ts
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },   // 1 minute default
  },
})
// For reference data (positions, departments, approval-flows):
staleTime: 5 * 60 * 1000,
```

---

#### REC-26 | `IntakePage` — "Mark Reviewed" and "Reject" available for already-reviewed/rejected rows
- **File:** `IntakePage.tsx:176–200`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Ravi-Shankar-ACS

**Offending code:**
```tsx
<button
  onClick={() => updateMutation.mutate({ id: intake.id, status: 'reviewed' })}
  disabled={updateMutation.isPending}
>
  Mark Reviewed
</button>
// (same pattern for Reject)
```

**Why it is wrong:** There is no guard on `intake.status` — a row already showing "reviewed" still presents a clickable "Mark Reviewed" button. The backend may or may not reject idempotent calls, but the UI is confusing. Similarly, a rejected candidate can still be shortlisted.

**Fix:** Disable action buttons based on the current status:
```tsx
disabled={updateMutation.isPending || intake.status === 'reviewed'}
```

---

## Redundancy

| Clone | File A | File A Line | File B | File B Line |
|---|---|---|---|---|
| Feedback form JSX (8 inputs + modal) — identical | `InterviewsPage.tsx` | 32–42, 67–78, 171–222 | `CandidateProfilePage.tsx` | 36–45, 112–119, 384–435 |
| QR display modal (`react-qr-code` + slug input) | `ApplicationFormsPage.tsx` | 246–259 | `ApplicationFormBuilderPage.tsx` | 748–763 |
| Initials avatar logic | `IntakePage.tsx` | 149 | `CandidatesPage.tsx` (uses getInitials) | 307 | (also `CandidateProfilePage.tsx:199`, `CandidatePipelinePage.tsx:36`) |
| `handleSearchChange` + URL sync pattern | `OpenPositionsPage.tsx` | 134–140 | `JobPostingsPage.tsx` | 70–76 |
| Status-button filter row pattern (All / pending / approved…) | `HiringRequestsPage.tsx` | 54–67 | `OpenPositionsPage.tsx` | 212–223 | `InterviewsPage.tsx` | 113–121 |

**Most impactful:** The feedback modal is 50+ identical lines copied twice. Extract:
```tsx
// src/modules/recruitment/components/FeedbackModal.tsx
export function FeedbackModal({ open, target, onClose, onSubmit, isPending }: FeedbackModalProps) { ... }
```

The QR modal is 14 lines duplicated. Extract `QRShareModal.tsx`.

---

## Tests & Gaps

There are **zero test files** in this repository (`find src -name "*.test.*" -o -name "*.spec.*"` returns empty). The entire recruitment module — including the mutation logic, query-key design, field-key deduplication in the form builder, and pipeline drag-and-drop — is untested.

**Priority items to test first:**
1. `ApplicationFormBuilderPage.addField` — field-key collision avoidance logic (`while (fields.some(f => f.field_key === key))`) is critical and untested.
2. `CandidatePipelinePage.handleDrop` — optimistic UI is absent; errors only shown after the mutation settles.
3. `NewHiringRequestPage.handleSubmit` — no error path coverage.
4. `OffersPage.formatSalary` — currency encoding correctness.
5. `TalentPoolPage` — once real data is wired, the filter/sort logic needs a test.

---

## Coverage Note

**Fully read:** All 15 `.tsx` files in `src/modules/recruitment/`, the shared `src/lib/api.ts` (recruitment, candidates, interviews, offers sections), `src/app/router.tsx` (routing table), and `src/lib/utils.ts` (utility exports used by the module).

**Skimmed:** `src/lib/formsApi.ts` (types only, not full API surface), `src/modules/auth/hooks.ts` (only `useCurrentUser` signature), `src/modules/approvals/ApprovalsWorkflowsPage.tsx` (cross-module query-key collision check only).

**Not inspected:** Backend API contracts (cannot confirm field shapes for `interviewer_id`, `u.role` vs `u.roles`, or pagination behaviour — several findings are based on front-end evidence only and tagged Med confidence). No inspection of CI, env configuration, or Dockerfile.

**Overall confidence:** High for findings flagged High-confidence. Findings REC-20 (role field shape) and REC-23 (collision probability) are marked Med because they depend on the API response shape not fully confirmed from the frontend code alone.

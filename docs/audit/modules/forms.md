# forms — Module Audit

## Summary

The `forms` module exposes four page-level components (`FormAnalyticsPage`, `FormCollectionsPage`, `FormLinksPage`, `FormTemplatesPage`) backed by a single typed API client (`src/lib/formsApi.ts`). The module is small and functional but has two architectural problems that stand out: every page uses a bare inline string `['forms']` as a TanStack Query key that collides directly with sibling keys declared under different scopes (recruitment), creating ghost-invalidation bugs; and zero error handling exists for any query or mutation, leaving users with a blank screen on API failure. A scattering of `any` types in the API layer, one hardcoded magic number, a missing field in the create-link form guard, and a cross-project duplication of the `StatCard` component round out the headline risks.

---

## Surface map

### Pages / Routes

| Component | Route | File |
|---|---|---|
| FormTemplatesPage | `/forms/templates` | `src/modules/forms/FormTemplatesPage.tsx` |
| FormCollectionsPage | `/forms/collections` | `src/modules/forms/FormCollectionsPage.tsx` |
| FormAnalyticsPage | `/forms/analytics` | `src/modules/forms/FormAnalyticsPage.tsx` |
| FormLinksPage | `/forms/links` | `src/modules/forms/FormLinksPage.tsx` |

### API / Data layer

| File | Role |
|---|---|
| `src/lib/formsApi.ts` | All form API calls + response normalization |
| `src/lib/api.ts` (lines 49–62) | **Duplicate** form functions in `recruitmentApi` — partially superseded by `formsApi` |

### Types exported by `formsApi.ts`

`FormStatus`, `FormVisibility`, `FormModule`, `FieldType`, `FieldConfig`, `FormField`, `Form`, `FormTemplate`, `FormCollection`, `FormLinkStatus`, `FormLink`, `FormAnalytics`, `FormAnalyticsPoint`, `FormSubmission`, `FormFilters`

### Hooks / State

No dedicated hooks file. All server state lives in inline `useQuery`/`useMutation` calls. No shared query-key factory.

---

## Findings

### P0 — Critical

---

#### FOR-01 · Query-key namespace collision: `['forms']` used inconsistently across modules

**File:Line:** `src/modules/forms/FormCollectionsPage.tsx:24`, `src/modules/forms/FormLinksPage.tsx:17`,
`src/modules/recruitment/ApplicationFormsPage.tsx:28` (uses `['forms', filters]`),
`src/modules/recruitment/ApplicationFormBuilderPage.tsx:123` (uses `['forms', id]`)

**Severity:** P0 · **Confidence:** High

**Offending code:**
```tsx
// FormCollectionsPage.tsx:24 – fetches ALL forms, no filter context
queryKey: ['forms'],
queryFn: () => formsApi.listForms().then(r => r.data),

// ApplicationFormsPage.tsx:28 – same root key but with filters
queryKey: ['forms', filters],

// ApplicationFormBuilderPage.tsx:164/174 – invalidates parent
qc.invalidateQueries({ queryKey: ['forms'] })
```

**Why it is wrong:** TanStack Query treats `['forms']` as a prefix match when invalidating. `invalidateQueries({ queryKey: ['forms'] })` from `ApplicationFormBuilderPage` will refetch **all** queries whose key starts with `'forms'` — including `FormCollectionsPage`'s list, `FormLinksPage`'s list, and all `['forms', filters]` combinations in `ApplicationFormsPage`. This triggers unnecessary network requests and can cause visible data flickers in unrelated pages. A save on the form builder silently re-fetches the collections and links pages.

Additionally `CandidatesPage` solves this by using `['application-forms']` and `OpenPositionsPage` uses `['forms-list']` — three different strategies for what is ultimately the same endpoint. This inconsistency means a mutation in one place will never correctly invalidate the data fetched by the others.

**Proper fix:** Introduce a typed query-key factory in `src/lib/formsApi.ts`:
```ts
export const formKeys = {
  all:         () => ['forms'] as const,
  list:        (filters?: FormFilters) => ['forms', 'list', filters ?? {}] as const,
  detail:      (id: string) => ['forms', 'detail', id] as const,
  analytics:   () => ['forms', 'analytics'] as const,
  collections: () => ['forms', 'collections'] as const,
  links:       () => ['forms', 'links'] as const,
  templates:   () => ['forms', 'templates'] as const,
} as const
```
Use `formKeys.list()` everywhere and `invalidateQueries({ queryKey: formKeys.all() })` only when truly invalidating the full namespace.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-02 · No error handling on any query or mutation

**File:Line:** All four page files — `FormAnalyticsPage.tsx:24`, `FormCollectionsPage.tsx:18,23,28`, `FormLinksPage.tsx:16,27,32,37,42`, `FormTemplatesPage.tsx:19,24,37`

**Severity:** P0 · **Confidence:** High

**Offending code (representative):**
```tsx
// FormCollectionsPage.tsx:18
const { data: collectionsData } = useQuery({
  queryKey: ['form-collections'],
  queryFn: () => formsApi.listCollections().then(r => r.data),
})
// No isError check, no onError callback, no toast
```
```tsx
// FormCollectionsPage.tsx:28
const createMutation = useMutation({
  mutationFn: () => formsApi.createCollection({ ... }),
  onSuccess: () => { ... }
  // onError: missing entirely
})
```

**Why it is wrong:** When an API request fails, the user sees an empty list or a stuck "Create" button with no explanation. Errors are silently swallowed by TanStack Query's default `console.error`. Other modules in this codebase (e.g. `src/modules/access/page.tsx:258`) use `toast.error()` in `onError`. This module has zero such handlers.

**Proper fix:** Add `onError` to every mutation and check `isError` in every query:
```tsx
const createMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => { ... },
  onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create collection'),
})
// In JSX:
{isError && <p className="text-sm text-red-500">Failed to load collections.</p>}
```

**Owner:** Ravi-Shankar-ACS

---

### P1 — High

---

#### FOR-03 · Duplicate form API functions: `recruitmentApi` vs `formsApi`

**File:Line:** `src/lib/api.ts:49–62` vs `src/lib/formsApi.ts:188–288`

**Severity:** P1 · **Confidence:** High

**Offending code (`src/lib/api.ts:49–62`):**
```ts
getForms:                 () => api.get("/recruitment/forms"),
getForm:                  (id: string) => api.get(`/recruitment/forms/${id}`),
createForm:               (data: object) => api.post("/recruitment/forms", data),
updateForm:               (id, data) => api.patch(`/recruitment/forms/${id}`, data),
publishForm:              (id) => api.post(`/recruitment/forms/${id}/publish`),
archiveForm:              (id) => api.post(`/recruitment/forms/${id}/archive`),
listFormTemplates:        () => api.get("/recruitment/forms/templates"),
createFormTemplate:       (data) => api.post("/recruitment/forms/templates", data),
toggleFormTemplateFavorite: (id) => api.post(`/recruitment/forms/templates/${id}/favorite`),
getFormSubmissions:       (id, params?) => api.get(`/recruitment/forms/${id}/submissions`, { params }),
```

**Why it is wrong:** Two separate API objects call the same endpoints. `formsApi.ts` is more complete (normalizes responses, adds filters, exports typed response shapes). The old `recruitmentApi` functions return raw `AxiosResponse` without normalization. `CandidatesPage.tsx:64` still uses `recruitmentApi.getForms()` while `FormCollectionsPage.tsx:25` and `FormLinksPage.tsx:18` use `formsApi.listForms()` — both hitting `/recruitment/forms` with different response shapes. Any backend change to that endpoint must be updated in two places.

**Proper fix:** Migrate every caller of `recruitmentApi.{form functions}` to `formsApi`, then delete the duplicate lines from `src/lib/api.ts`. Check `CandidatesPage.tsx:64` as the only remaining cross-module caller.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-04 · Hardcoded magic string `'8'` as default max_submissions display

**File:Line:** `src/modules/forms/FormLinksPage.tsx:152`

**Severity:** P1 · **Confidence:** High

**Offending code:**
```tsx
{link.current_submissions ?? 0}/{link.max_submissions ?? '8'}
```

**Why it is wrong:** When a link has no `max_submissions` set (unlimited), the UI displays `/8` to the user, which is factually incorrect. It implies 8 is the cap when no cap was set. This is a product-facing data integrity bug — a user might believe a link with 3 submissions is "nearly full" when it is actually unlimited. The value `'8'` is a string, while `current_submissions` is a number, causing an implicit type mismatch in the expression.

**Proper fix:**
```tsx
{link.current_submissions ?? 0}/{link.max_submissions ?? '∞'}
```
Or, if the intent is "no max":
```tsx
{link.max_submissions
  ? `${link.current_submissions ?? 0}/${link.max_submissions}`
  : `${link.current_submissions ?? 0} (unlimited)`}
```
Also fix `FormLink.expires_at` in `formsApi.ts:90` — it is typed `string` (not `string | null`) but `normalizeLink:183` assigns the raw `value.expires_at` without a null guard, meaning a missing `expires_at` from the API becomes `undefined` at runtime despite the non-optional type.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-05 · `candidateName` not required in "Create Link" guard but is sent to API

**File:Line:** `src/modules/forms/FormLinksPage.tsx:118`

**Severity:** P1 · **Confidence:** High

**Offending code:**
```tsx
<button
  className="btn-primary"
  onClick={() => createMutation.mutate()}
  disabled={!formId || !candidateEmail || createMutation.isPending}
>
  Create Link
</button>
```

**Why it is wrong:** The button is disabled only when `formId` or `candidateEmail` is empty. `candidateName` is collected (line 22) and sent to the API (line 46), but the user can submit with an empty name. The `FormLink` type requires `candidate_name: string` (non-optional), so the backend will receive an empty string or throw a validation error. The form also has no email-format validation — any truthy string (e.g. `"abc"`) passes the guard.

**Proper fix:**
```tsx
disabled={
  !formId ||
  !candidateName.trim() ||
  !candidateEmail.trim() ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail) ||
  createMutation.isPending
}
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-06 · `module` field hardcoded to `'recruitment'` in FormLinksPage — ignores selected form's module

**File:Line:** `src/modules/forms/FormLinksPage.tsx:48`

**Severity:** P1 · **Confidence:** High

**Offending code:**
```tsx
formsApi.createLink({
  form_id: formId,
  candidate_name: candidateName,
  candidate_email: candidateEmail,
  module: 'recruitment',   // <-- always 'recruitment'
  ...
})
```

**Why it is wrong:** The user can select any form from the dropdown (which includes `preboarding`, `internal`, and `general` module forms). The link is always created with `module: 'recruitment'` regardless of the selected form's actual module. Links for preboarding or internal forms will be misclassified. This is particularly bad because `FormModule` is a discriminated union used for filtering — the link will never appear when the user filters by its true module.

**Proper fix:** Derive `module` from the selected form:
```tsx
const selectedForm = forms.find(f => f.id === formId)
// in mutationFn:
module: selectedForm?.module ?? 'recruitment',
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-07 · `formsApi.ts` — pervasive `any` in normalizer functions prevents type safety

**File:Line:** `src/lib/formsApi.ts:124,127,149,158,169,189,194,214,229,253`

**Severity:** P1 · **Confidence:** High

**Offending code (representative):**
```ts
const normalizeArray = <T>(value: any, fallback: T[] = []): T[] => ...
const normalizeForm = (value: any): Form => { ... }
const normalizeTemplate = (value: any): FormTemplate => { ... }
const normalizeCollection = (value: any): FormCollection => { ... }
const normalizeLink = (value: any): FormLink => { ... }
const params: Record<string, any> = {};
const data = normalizeArray<any>(res.data?.data).map(normalizeForm);
```

**Why it is wrong:** Every normalizer accepts `any`, meaning a backend response-shape change (e.g. renaming `candidate_name` to `name`) will compile without error and produce silent `undefined` fields in the UI. The intermediate `normalizeArray<any>` call also means the typed `.map(normalizeForm)` gets no benefit from generics — TypeScript cannot verify the transform.

**Proper fix:** Define a `RawFormResponse` interface (even a loose `Record<string, unknown>`) and narrow at the boundary:
```ts
type RawForm = Record<string, unknown>
const normalizeForm = (value: RawForm): Form => { ... }
const data = (res.data?.data as RawForm[] ?? []).map(normalizeForm)
```
This keeps the flexibility of not trusting the API while still catching property-access typos.

**Owner:** Ravi-Shankar-ACS

---

### P2 — Medium

---

#### FOR-08 · `React.FC<any>` used as icon prop type in `StatCard`

**File:Line:** `src/modules/forms/FormAnalyticsPage.tsx:7`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
function StatCard({ label, value, icon: Icon }: {
  label: string; value: string; icon: React.FC<any>
}) {
```

**Why it is wrong:** `React.FC<any>` wipes out Lucide's type parameter (`LucideIcon`). Passing a non-icon component would not be caught at compile time. The project already has the correct type import pattern: `MeetingsPage.tsx:2` uses `import type { LucideIcon } from 'lucide-react'`.

**Proper fix:**
```tsx
import type { LucideIcon } from 'lucide-react'

function StatCard({ label, value, icon: Icon }: {
  label: string; value: string; icon: LucideIcon
}) {
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-09 · `form: any` type annotation inside `FormLinksPage` map callback

**File:Line:** `src/modules/forms/FormLinksPage.tsx:85`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
{forms.map((form: any) => (
  <option key={form.id} value={form.id}>{form.name}</option>
))}
```

**Why it is wrong:** `forms` is already typed as `Form[]` from `const forms = formsData ?? []` (line 20). The explicit `: any` annotation overrides this correct type for no reason, silencing any future property rename errors.

**Proper fix:** Remove the annotation entirely — TypeScript will correctly infer `form: Form` from the array type:
```tsx
{forms.map((form) => (
  <option key={form.id} value={form.id}>{form.name}</option>
))}
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-10 · No `staleTime` on any query — causes unnecessary refetches on focus

**File:Line:** `FormAnalyticsPage.tsx:24`, `FormCollectionsPage.tsx:18,23`, `FormLinksPage.tsx:16,27`, `FormTemplatesPage.tsx:19`

**Severity:** P2 · **Confidence:** High

**Offending code (representative):**
```tsx
useQuery({
  queryKey: ['form-templates'],
  queryFn: () => formsApi.listTemplates().then(r => r.data),
  // no staleTime
})
```

**Why it is wrong:** Without `staleTime`, every window-focus event triggers a background refetch for all six queries (TanStack Query v5 default: `staleTime: 0`). The analytics page alone fires a non-trivial aggregation query on every tab switch. Form lists and template lists are low-churn data.

**Proper fix:** Set `staleTime` appropriate to data volatility. For analytics and templates, `staleTime: 5 * 60 * 1000` (5 min) is reasonable. For `form-links` (user-mutated), `staleTime: 30_000` is safer.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-11 · Modal overlays missing Escape-key close and focus trap

**File:Line:** `FormCollectionsPage.tsx:88`, `FormTemplatesPage.tsx:79`, `FormTemplatesPage.tsx:98`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
{createOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
      ...
      <button onClick={() => setCreateOpen(false)}>x</button>
```

**Why it is wrong:** Pressing Escape does not close the modal. There is no focus trap — tabbing out of the modal cycles through background page elements. The close button text is a literal lowercase `x` with no `aria-label`. These three issues violate WCAG 2.1 SC 2.1.2 (No Keyboard Trap) and SC 4.1.2 (Name, Role, Value). This pattern is repeated verbatim 20 times project-wide (confirmed by grep: `bg-black/30` count = 20).

**Proper fix:** Use the project's existing `Dialog` / `Modal` component if one exists, or add:
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreateOpen(false) }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [])
// Close button:
<button onClick={() => setCreateOpen(false)} aria-label="Close dialog">✕</button>
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-12 · `FormTemplatesPage` — new template always uses hardcoded `defaultFields`; no field customization in create flow

**File:Line:** `src/modules/forms/FormTemplatesPage.tsx:8–11,25–29`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
const defaultFields: FormField[] = [
  { field_key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { field_key: 'email', label: 'Email', type: 'email', required: true },
]

// in mutationFn:
formsApi.createTemplate({
  name: form.name,
  description: form.description,
  fields: defaultFields,  // always the same two fields
})
```

**Why it is wrong:** Every template created via this UI gets exactly the same two fields regardless of the template's intended purpose. The create modal offers no field editor. The feature appears half-built: the `FormField` type supports 12 field types and rich config, but none of that is exposed. Users who try to customize templates via the UI will unknowingly overwrite prior field sets with the two-field default.

**Proper fix:** Either (a) add a field editor step to the create modal (consistent with the full `FormField` type), or (b) disable the create path for non-builder use and document that templates are managed via the form builder. If (b), show a warning in the UI and redirect to the form builder.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-13 · `FormLinksPage` — `handleCopy` does not handle `navigator.clipboard` failure (HTTPS-only API)

**File:Line:** `src/modules/forms/FormLinksPage.tsx:66–68`

**Severity:** P2 · **Confidence:** Med

**Offending code:**
```tsx
const handleCopy = (url: string) => {
  navigator.clipboard.writeText(url)
}
```

**Why it is wrong:** `navigator.clipboard` is `undefined` in non-HTTPS contexts (local HTTP dev, embedded iframes, some browsers when `document` is not focused). The returned Promise is not awaited and not caught — clipboard write failures are silently swallowed, with no user feedback. The same bug exists in `src/modules/recruitment/ApplicationFormsPage.tsx:60` (bare `navigator.clipboard.writeText`), suggesting copy-paste from there. `MeetingsPage.tsx:708` correctly uses optional chaining (`navigator.clipboard?.writeText`).

**Proper fix:**
```tsx
const handleCopy = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  } catch {
    toast.error('Copy failed — please copy manually')
  }
}
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-14 · `FormCollectionsPage` — module values inlined as raw strings in `<select>` instead of using `FormModule` type

**File:Line:** `src/modules/forms/FormCollectionsPage.tsx:106`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
{['preboarding', 'recruitment', 'internal', 'general'].map(m => (
  <option key={m} value={m}>{m}</option>
))}
```

**Why it is wrong:** `FormModule` is defined in `formsApi.ts` as a discriminated union of the exact same four strings. Duplicating them inline means that if the API adds or removes a module (e.g. renames `'internal'` to `'hr-internal'`), the `<select>` will continue offering stale values while the type definition is updated — a silent mismatch. TypeScript cannot catch this because the raw strings are not typed against `FormModule`.

**Proper fix:**
```ts
// In formsApi.ts, export the values array alongside the type:
export const FORM_MODULES: FormModule[] = ['preboarding', 'recruitment', 'internal', 'general']
```
```tsx
// In FormCollectionsPage.tsx:
import { FORM_MODULES } from '@/lib/formsApi'
{FORM_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-15 · `FormAnalyticsPage` — chart renders empty `<LineChart data={[]}>` without error or empty state

**File:Line:** `src/modules/forms/FormAnalyticsPage.tsx:61–73`

**Severity:** P2 · **Confidence:** High

**Offending code:**
```tsx
{!isLoading && (
  <ResponsiveContainer width="100%" height={220}>
    <LineChart data={analytics?.trend || []}>
      ...
    </LineChart>
  </ResponsiveContainer>
)}
```

**Why it is wrong:** If the API returns no trend data (a new deployment, or an API error), Recharts renders an empty chart frame with axes and no lines or data label. The user cannot distinguish "no data" from "loading failed." The condition `!isLoading` renders the chart even when `analytics` is `undefined` (initial state before data resolves).

**Proper fix:**
```tsx
{!isLoading && (analytics?.trend?.length
  ? <ResponsiveContainer ...><LineChart data={analytics.trend}>...</LineChart></ResponsiveContainer>
  : <div className="py-6 text-sm text-gray-400 text-center">No trend data available.</div>
)}
```

**Owner:** Ravi-Shankar-ACS

---

### P3 — Low / Informational

---

#### FOR-16 · `FormLink.expires_at` typed as non-optional `string` but displayed with null guard

**File:Line:** `src/lib/formsApi.ts:90`, `src/modules/forms/FormLinksPage.tsx:158`

**Severity:** P3 · **Confidence:** Med

**Offending code:**
```ts
// formsApi.ts:90 – type says always a string
expires_at: string;

// FormLinksPage.tsx:158 – UI treats it as nullable
{link.expires_at ? new Date(link.expires_at).toLocaleDateString() : '—'}
```

**Why it is wrong:** The type and the UI disagree. Either the API can return null/undefined `expires_at` (in which case the type should be `string | null`) or links always have an expiry (in which case the null guard is unnecessary). This inconsistency will confuse future developers.

**Proper fix:** Align the type with reality. If links can be non-expiring, change type to `expires_at?: string | null`. Update `normalizeLink:183` accordingly.

**Owner:** Ravi-Shankar-ACS

---

#### FOR-17 · `FormLink.is_active` field defined in type and normalized but never consumed in UI

**File:Line:** `src/lib/formsApi.ts:85,178`, `src/modules/forms/FormLinksPage.tsx` (no usage found)

**Severity:** P3 · **Confidence:** High

**Offending code:**
```ts
// FormLink type:
is_active?: boolean;
// normalizeLink:
is_active: value.is_active ?? undefined,
```

**Why it is wrong:** `is_active` is fetched, normalized, and typed but never read in `FormLinksPage`. The `status` field (`'active' | 'expired' | 'disabled'`) handles display. Dead fields add cognitive noise and may indicate an incomplete migration from an older API shape.

**Proper fix:** Either remove `is_active` from the type and normalizer (if confirmed dead), or use it in the UI where appropriate (e.g. to gate the "Resend" button).

**Owner:** Ravi-Shankar-ACS

---

#### FOR-18 · `formatMetric` defined inside component body — recreated on every render

**File:Line:** `src/modules/forms/FormAnalyticsPage.tsx:31–34`

**Severity:** P3 · **Confidence:** High

**Offending code:**
```tsx
export default function FormAnalyticsPage() {
  ...
  const formatMetric = (value: number | null | undefined, suffix = '') => {
    if (value === null || value === undefined) return '—'
    return `${value}${suffix}`
  }
```

**Why it is wrong:** `formatMetric` has no dependency on any component state or props — it is a pure utility function defined inside the component body, causing a new function reference to be created on every render. This is a minor performance issue but also a style issue that confuses juniors reading the code.

**Proper fix:** Move it to module scope or to `src/lib/utils.ts`:
```ts
// Above the component:
const formatMetric = (value: number | null | undefined, suffix = '') =>
  value == null ? '—' : `${value}${suffix}`
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-19 · `FormCollectionsPage` and `FormTemplatesPage` — mutation `isLoading`/`isPending` not guarded on "Create" button

**File:Line:** `FormCollectionsPage.tsx:138`, `FormTemplatesPage.tsx:116`

**Severity:** P3 · **Confidence:** High

**Offending code:**
```tsx
// FormCollectionsPage.tsx:138
<button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!form.name.trim()}>
  Create
</button>

// FormTemplatesPage.tsx:116
<button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!form.name.trim()}>
  Create
</button>
```

**Why it is wrong:** Neither "Create" button disables during in-flight mutation (`isPending`). A user who double-clicks will fire two `POST` requests, creating duplicate collections or templates. `FormLinksPage.tsx:118` correctly includes `createMutation.isPending` — this was missed in the other two pages.

**Proper fix:**
```tsx
disabled={!form.name.trim() || createMutation.isPending}
```

**Owner:** Ravi-Shankar-ACS

---

#### FOR-20 · `FormTemplatesPage` preview modal: composite key `${field.field_key}-${idx}` mixes stable ID with positional index

**File:Line:** `src/modules/forms/FormTemplatesPage.tsx:87`

**Severity:** P3 · **Confidence:** Med

**Offending code:**
```tsx
{previewTemplate.fields.map((field, idx) => (
  <div key={`${field.field_key}-${idx}`} ...>
```

**Why it is wrong:** `field_key` is already a stable unique identifier per field (by schema design in `FormField`). Appending `-${idx}` is unnecessary and would mask duplicate `field_key` values rather than catching them. If two fields share the same `field_key`, both will have distinct React keys and mount as separate nodes — hiding a data integrity bug.

**Proper fix:**
```tsx
<div key={field.field_key} ...>
```
If `field_key` uniqueness cannot be guaranteed, the correct fix is to deduplicate at the API/normalizer level, not by leaking index into the key.

**Owner:** Ravi-Shankar-ACS

---

## Redundancy

### Clone 1 — `StatCard` component defined three times across modules

| Location A | Location B | Location C |
|---|---|---|
| `src/modules/forms/FormAnalyticsPage.tsx:7–20` | `src/modules/crm/leads/page.tsx:132` | `src/modules/project-management/pages/MeetingsPage.tsx:521` |

All three define a local `StatCard` component with slightly different signatures (the CRM and MeetingsPage versions have richer props like `sub`, `accent`, `icon: ReactNode`). The `forms` version is the simplest. This should be extracted to `src/components/ui/StatCard.tsx` with the richest common interface.

---

### Clone 2 — `navigator.clipboard.writeText` without error handling

| Location A | Location B |
|---|---|
| `src/modules/forms/FormLinksPage.tsx:66–68` | `src/modules/recruitment/ApplicationFormsPage.tsx:60` |

Both are the same one-liner fire-and-forget clipboard write. The correct pattern (with `try/catch` and `toast`) exists in `MeetingsPage.tsx:708`. The forms module copy appears to have been written from the `ApplicationFormsPage` pattern, propagating the same bug.

---

### Clone 3 — Inline modal overlay pattern (20 occurrences project-wide)

The specific forms-module instances:

| Location A | Location B | Location C |
|---|---|---|
| `FormCollectionsPage.tsx:88` | `FormTemplatesPage.tsx:79` | `FormTemplatesPage.tsx:98` |

All three duplicate `<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">` with no abstraction. Across the project this pattern appears 20 times. A single `<Modal>` component with slot-based content would eliminate all 20 copies.

---

### Clone 4 — `['forms']` flat query key fetching same endpoint with two different API clients

| Location A | Location B |
|---|---|
| `FormCollectionsPage.tsx:24` + `FormLinksPage.tsx:17` (using `formsApi.listForms`) | `CandidatesPage.tsx:63–64` (using `recruitmentApi.getForms`, key `'application-forms'`) |

Same endpoint (`/recruitment/forms`), different clients, different keys — no cross-invalidation. A change in forms data will not update `CandidatesPage`'s dropdown.

---

## Tests & gaps

**Tests found:** Zero. No `*.test.tsx`, `*.spec.ts`, or test-adjacent files exist anywhere in the project for the `forms` module or `formsApi.ts`.

**Critical untested paths:**
- `normalizeForm` / `normalizeLink` — any malformed API response will produce `undefined` fields silently
- `createLink` mutation flow — the `module` hardcoding (FOR-06) and missing validation (FOR-05) are only discoverable via manual QA
- Query-key invalidation side effects (FOR-01) — require integration-level tests to catch cross-module refetch storms
- `handleCopy` in insecure contexts (FOR-13)
- Double-submit protection gap on CollectionCreate / TemplateCreate (FOR-19)

**Recommendation:** Start with unit tests for `normalizeForm`, `normalizeLink`, and `normalizeCollection` with known malformed inputs. Add integration smoke tests for the create-link flow using `msw`.

---

## Coverage note

**Fully inspected:**
- All four page components (`FormAnalyticsPage`, `FormCollectionsPage`, `FormLinksPage`, `FormTemplatesPage`) — every line read
- `src/lib/formsApi.ts` — every line read
- `src/lib/api.ts` — form-relevant lines (49–62) read
- Query-key usage searched across the entire `src/` tree
- `any` usage catalogued across module + API file
- Cross-module `StatCard`, clipboard, and modal pattern duplication verified via grep

**Skimmed / not fully read:**
- `src/modules/recruitment/ApplicationFormBuilderPage.tsx` — only query-key and API-call lines examined; full component not audited (out of scope but cross-references noted)
- `src/modules/recruitment/ApplicationFormsPage.tsx` — same; only relevant cross-references checked
- Router file (`src/app/router.tsx`) — only forms route lines read
- `src/components/ui/form.tsx` — confirmed it wraps `react-hook-form` but is not imported by any file in `src/modules/forms/`

**Overall confidence:** High for the `forms` module files and `formsApi.ts`. Medium for cross-module impact of FOR-01 (would require runtime tracing to confirm full invalidation cascade scope). Low for backend contract accuracy (no OpenAPI spec or backend code was available to cross-check type assumptions in `formsApi.ts`).

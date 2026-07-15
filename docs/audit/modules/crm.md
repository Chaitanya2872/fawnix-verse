# crm — Module Audit

**Date:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated)  
**Root:** `src/modules/crm`

---

## Summary

The CRM module covers five sub-modules: **leads** (the core, most complex), **presales** (task dashboard), **opportunities** (kanban deal board), **accounts**, and **contacts**. The leads sub-module is the most feature-rich, handling paginated lists, a detail slide-over panel, a follow-up calendar, scheduling sheets, SSE notifications, and CSV import. Overall health is **moderate**: the data layer is sound (TanStack Query with proper key factories, no inline string keys), but several correctness bugs, redundant code clones, missing UX guards, and a timezone ambiguity in schedule creation need addressing before production scale. Headline risks are a broken "Open Lead" button in the reminders sheet, hardcoded salesperson color lookup by name, missing Nominatim `User-Agent` (ToS violation), and silent deletes without confirmation in accounts/contacts.

---

## Surface Map

### Sub-modules

| Sub-module | Route hint | api.ts | hooks.ts | types.ts | Pages / Components |
|---|---|---|---|---|---|
| leads | `/crm/leads` | yes | yes | yes | `page.tsx` (1488 lines), `layout.tsx`, `lead-ui.tsx`, `LeadDetailPanel.tsx` (901 lines), `LeadLocationPickerDialog.tsx` (559 lines), `LeadReminderSheets.tsx`, `RowActions.tsx`, `AssigneeSearchSelect.tsx` |
| presales | `/crm/presales` | yes | yes | yes | `page.tsx` (439 lines) |
| opportunities | `/crm/opportunities` | yes | yes | yes | `page.tsx` (416 lines) |
| accounts | `/crm/accounts` | yes | yes | yes | `page.tsx` (320 lines) |
| contacts | `/crm/contacts` | yes | yes | yes | `page.tsx` (366 lines) |

### API endpoints called

| Sub-module | Endpoints |
|---|---|
| leads | `GET /leads`, `GET /leads/:id`, `GET /leads/:id/questionnaire`, `GET /users/assignees`, `POST /leads`, `PATCH /leads/:id`, `PATCH /leads/:id/assign`, `PATCH /leads/:id/priority`, `POST /leads/:id/remarks`, `PATCH /leads/:id/remarks/:remarkId`, `POST /leads/:id/contact-recordings`, `DELETE /leads/:id`, `POST /leads/import`, `GET /leads/:id/schedules`, `POST /leads/:id/schedules`, `PATCH /leads/:id/schedules/:scheduleId`, `GET /leads/notifications`, `GET /leads/notifications/stream` (SSE) |
| presales | `GET /reports/presales` |
| opportunities | `GET /deals`, `GET /deals/:id`, `POST /deals`, `PATCH /deals/:id`, `PATCH /deals/:id/stage`, `DELETE /deals/:id` |
| accounts | `GET /accounts`, `GET /accounts/:id`, `POST /accounts`, `PATCH /accounts/:id`, `DELETE /accounts/:id` |
| contacts | `GET /contacts`, `GET /contacts/:id`, `POST /contacts`, `PATCH /contacts/:id`, `DELETE /contacts/:id` |

### Query Key Factories

All five sub-modules use key factory objects (`leadsKeys`, `accountKeys`, `contactKeys`, `dealKeys`, `presalesKeys`). No inline string keys found. No key collisions detected — all root at `["crm", "<entity>"]`.

### State Management Approach

Fully TanStack Query based for server state. Local UI state via `useState`. No Zustand/Redux usage. No `localStorage` as a database. Custom SSE client in `leads/api.ts` with `AbortController` and auto-reconnect.

---

## Findings

### P0 — Critical Bugs

---

**CRM-01** · Broken "Open Lead" button in Reminders sheet

- **File:** `src/modules/crm/leads/components/LeadReminderSheets.tsx:423–424`
- **Severity:** P0  
- **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
<Button variant="outline" size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
  Open Lead
</Button>
```

**Why it's wrong:** The "Open Lead" button closes the reminders sheet but never navigates to the lead. The user gets no feedback; clicking it silently dismisses the panel. The component receives no `navigate` prop/hook and there is no `onClick` routing logic — the button is effectively dead.

**Fix:** Accept an `onOpen` callback (like `ReminderList` already does) or call `navigate` directly:

```tsx
// In LeadRemindersSheet props add:
onOpen: (leadId: string) => void;

// In the button:
<Button ... onClick={() => { onOpenChange(false); onOpen(schedule.leadId); }}>
  Open Lead
</Button>
```

---

**CRM-02** · Schedule date/time constructed without timezone awareness

- **File:** `src/modules/crm/leads/components/LeadReminderSheets.tsx:128–132`
- **Severity:** P0  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
const scheduledAt = new Date(`${form.date}T${form.time || "09:00"}:00`);
// ...
scheduledAt: scheduledAt.toISOString(),
```

**Why it's wrong:** `new Date("2025-08-15T14:30:00")` parses as **local time** in modern engines, then `toISOString()` converts to UTC. For a user in IST (+5:30), a meeting set for 14:30 local will be stored as 09:00 UTC — correct. But `toLocalParts()` (line 85–91) correctly subtracts the timezone offset when reading schedules back. These two conversions are inconsistent: writing uses implicit local→UTC via the `Date` constructor, reading manually subtracts offset. In environments where parsing behaviour differs (older Safari, workers), the direction could flip. Standardize on an explicit ISO string:

```ts
const scheduledAt = `${form.date}T${form.time || "09:00"}:00`;
// Send as local; let the backend interpret or use an explicit offset:
const scheduledAtIso = new Date(
  `${form.date}T${form.time || "09:00"}:00${getLocalOffsetString()}`
).toISOString();
```

Or move to a proper date-time picker that emits UTC directly.

---

### P1 — High-Severity Correctness Issues

---

**CRM-03** · Hardcoded salesperson names in `REP_COLORS`

- **File:** `src/modules/crm/leads/lead-ui.tsx:94–101`
- **Severity:** P1  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
export const REP_COLORS: Record<string, string> = {
  "Sarah Kim":       "bg-pink-100 text-pink-700",
  "Mike Rodriguez":  "bg-blue-100 text-blue-700",
  "James Lee":       "bg-violet-100 text-violet-700",
  "Priya Singh":     "bg-amber-100 text-amber-700",
  "Alex Johnson":    "bg-teal-100 text-teal-700",
  "Emma Davis":      "bg-rose-100 text-rose-700",
};
```

**Why it's wrong:** These are fake placeholder names. Any real user not in this list gets `bg-slate-100 text-slate-700`. The feature is completely non-functional for production data and looks broken to anyone whose name is not one of these six.

**Fix:** Generate a deterministic color from the assignee name/ID:

```ts
const PALETTE = ["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", ...];
export function getRepColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
```

Remove `REP_COLORS` entirely and update every call site.

---

**CRM-04** · Silent delete — no confirmation dialog in Accounts and Contacts

- **File:** `src/modules/crm/accounts/page.tsx:306` and `src/modules/crm/contacts/page.tsx:351`
- **Severity:** P1  
- **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
// accounts/page.tsx:306
onDelete={() => selectedAccount && deleteAccount.mutate(selectedAccount.id)}

// contacts/page.tsx:351
onDelete={() => selectedContact && deleteContact.mutate(selectedContact.id)}
```

**Why it's wrong:** Clicking Delete immediately fires the DELETE API call with no confirmation. This is irreversible for production data. The leads sub-module correctly uses a `DeleteLeadDialog`; accounts and contacts copy-pasted the layout but skipped the guard.

**Fix:** Add a small `DeleteConfirmDialog` (can be shared) identical to the one in `leads/page.tsx:313–357`. Wire it in the same pattern: `[deleteTarget, setDeleteTarget]` state → dialog open → mutate on confirm.

---

**CRM-05** · Nominatim API used without `User-Agent` header (Terms of Service violation)

- **File:** `src/modules/crm/leads/components/LeadLocationPickerDialog.tsx:72–79` and `117–124`
- **Severity:** P1  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?...`,
  {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  }
);
```

**Why it's wrong:** Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires a valid `User-Agent` identifying the application. Requests without it are in violation, can be blocked, and risk the IP being banned. The same issue exists for the `reverseLookup` function.

**Fix:** Add `"User-Agent": "FawnixVerse/1.0 (g.akashvarma@gmail.com)"` to both fetch calls. Consider proxying the request through the project's own backend to avoid CORS issues and hide the contact email.

---

**CRM-06** · Stale closure: `useEffect` in `LeadLocationPickerDialog` calls `handleSearch()` which is defined after the effect

- **File:** `src/modules/crm/leads/components/LeadLocationPickerDialog.tsx:289–303`
- **Severity:** P1  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
useEffect(() => {
  // ...
  const timer = window.setTimeout(() => {
    void handleSearch();  // handleSearch is defined at line 309, after this effect
  }, 350);
  return () => window.clearTimeout(timer);
}, [addressText, open, searchQuery]);
// handleSearch is NOT in the deps array
```

**Why it's wrong:** `handleSearch` is defined as a plain `async function` inside the component body after this `useEffect`. Because it is not memoized and not listed in the effect's dependency array, the effect always captures the version from the first render. If `searchQuery` or `addressText` changed between renders, the timeout fires `handleSearch` with stale closure over the old values (`query = searchQuery.trim()` reads from the captured render's `searchQuery`).

In practice here the closure re-reads `searchQuery` from state via `useState` — the state getter always returns current value — so this is **lower actual impact** than a canonical stale closure, but the missing dependency is a lint violation and the hoisted function pattern is fragile.

**Fix:** Either wrap `handleSearch` in `useCallback` with proper deps and include it in the effect's dep array, or inline the debounce logic inside the effect itself.

---

**CRM-07** · `pushToast` timer not cleaned up on component unmount

- **File:** `src/modules/crm/leads/page.tsx:735–736`
- **Severity:** P1  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
const pushToast = useCallback((toast) => {
  setUiToast(toast);
  window.setTimeout(() => setUiToast(null), 5000);
}, []);
```

**Why it's wrong:** If `LeadsPage` unmounts while the 5-second timer is running (e.g. the user navigates away), the callback fires and calls `setUiToast(null)` on an unmounted component. In React 18 this is a no-op but produces a warning in development. If the component re-mounts in the same session, the lingering timer from the old mount may race with the new mount's state.

**Fix:**

```ts
const toastTimerRef = useRef<number | null>(null);
const pushToast = useCallback((toast) => {
  if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  setUiToast(toast);
  toastTimerRef.current = window.setTimeout(() => setUiToast(null), 5000);
}, []);
useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);
```

---

### P2 — Maintainability / Logic Defects

---

**CRM-08** · `LeadsPage` is a god component: 1488 lines, 22 `useState` calls

- **File:** `src/modules/crm/leads/page.tsx:686–1488`
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

The default export spans 803 lines with 22 top-level `useState` calls (counted via `grep -n "useState"`). It manages: filter state, quick view mode, form dialog, stage update dialog, delete dialog, calendar UI, import dialog, toast system, and inline event handlers for all mutations. Several dialog components (`CreateLeadDialog`, `DeleteLeadDialog`, `StageUpdateDialog`, `FollowUpCalendarDialog`, `ImportLeadsDialog`) are hoisted to module scope correctly, but the page component itself is still far too large.

**Fix:** Extract at minimum:
- `useLeadPageFilters()` hook — owns `filter`, `quickView`, `updateFilter`, `applyQuickView`, `resetFilters`
- `useLeadDialogs()` hook — owns form, stage update, delete, import dialog state
- `useLeadToast()` hook — owns `uiToast`, `pushToast`

---

**CRM-09** · Pagination page buttons only render first 5 pages regardless of total

- **File:** `src/modules/crm/leads/page.tsx:1365–1368`
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
{Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => i + 1).map((pg) => (
  <button key={pg} onClick={() => setFilter((p) => ({ ...p, page: pg }))} ...>
    {pg}
  </button>
))}
```

**Why it's wrong:** This always renders pages 1–5 (or 1–N if fewer). If a user is on page 7 of 20, the buttons show [1, 2, 3, 4, 5] and clicking any of them jumps back to those early pages. The current page highlight (`pg === filter.page`) also silently fails to highlight when `filter.page > 5`.

**Fix:** Use a sliding window centred on the current page:

```ts
const start = Math.max(1, Math.min(filter.page - 2, data.totalPages - 4));
const pages = Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => start + i);
```

---

**CRM-10** · `Deal.stage` typed as `string`, not `LeadStatus`

- **File:** `src/modules/crm/opportunities/types.ts:16` and `30`
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
export type Deal = {
  ...
  stage: string;   // should be LeadStatus
  ...
};
export type DealFormData = {
  stage?: string;  // same
```

**Why it's wrong:** The opportunities kanban iterates `LEAD_STATUS_ORDER` and drops deals into keyed buckets (line 263). If a `Deal.stage` value arrives from the API that does not match any `LeadStatus` key, the deal silently falls into the `LeadStatus.NEW` bucket (line 264). The `string` type suppresses the type-checker entirely and allows this silent data loss.

**Fix:**

```ts
import { LeadStatus } from "@/modules/crm/leads/types";
export type Deal = { stage: LeadStatus; ... };
export type DealFormData = { stage?: LeadStatus; ... };
```

---

**CRM-11** · Unbounded `pageSize` fetches for accounts, contacts, and calendar leads

- **Files:**
  - `src/modules/crm/opportunities/page.tsx:247–249` (`pageSize: 200` for deals, accounts, contacts)
  - `src/modules/crm/contacts/page.tsx:221` (`pageSize: 100` for all accounts)
  - `src/modules/crm/leads/page.tsx:751–754` (`pageSize: 500` for follow-up calendar)
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

**Why it's wrong:** These requests are designed as dropdown/select population fetches that are not user-visible. When the data grows (hundreds of accounts, thousands of leads), these requests will deliver huge payloads on every page mount — and with no `staleTime` alignment they may fire on every component re-render cycle. The calendar query (`pageSize: 500`) loads 500 leads just to show a follow-up calendar that is only opened on demand.

**Fix:** For selects, implement server-side search or use a smaller page limit with a search input. For the calendar, use the `enabled: calendarOpen` guard (already done) and reduce `pageSize` to a reasonable ceiling (e.g. 50 most recent), or add a dedicated endpoint that returns only leads with `followUpAt != null` in the current month.

---

**CRM-12** · `"use client"` directives are no-ops in a Vite/React SPA

- **Files:** `src/modules/crm/leads/page.tsx:2`, `src/modules/crm/leads/layout.tsx:1`, `src/modules/crm/presales/page.tsx:1`
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
"use client";
```

**Why it's wrong:** `"use client"` is a Next.js App Router directive. This project uses Vite with React Router (confirmed via `vite.config.ts`, no `next` in `package.json`). The directive is parsed as a string expression statement and silently ignored. It adds noise, misleads readers into thinking this is a Next.js project, and can be copy-pasted to other files without meaning.

**Fix:** Remove all three occurrences.

---

**CRM-13** · `SSE dataString` concatenation silently corrupts multi-data-line events

- **File:** `src/modules/crm/leads/api.ts:344–349`
- **Severity:** P2  
- **Confidence:** Med

```ts
let dataString = "";
rawEvent.split("\n").forEach((line) => {
  if (line.startsWith("event:")) { ... }
  else if (line.startsWith("data:")) {
    dataString += line.slice(5).trim(); // no separator added between lines
  }
});
```

**Why it's wrong:** The SSE spec defines that multiple `data:` lines in a single event are joined with `\n`. This implementation concatenates them without any separator. If the server sends:

```
data: {"type":"LEAD
data: _CREATED","eventAt":"..."}
```

the resulting string is `{"type":"LEAD_CREATED","eventAt":"..."}` (accidentally correct here) but JSON fields spanning lines would break. More realistically, if the server ever sends multiple data fields for structured events, they will merge without a separator and `JSON.parse` will throw.

**Fix:**

```ts
dataString += (dataString ? "\n" : "") + line.slice(5);
```

---

**CRM-14** · `LeadLocationPickerDialog` second `useEffect` is missing `handleSearch` in deps

- **File:** `src/modules/crm/leads/components/LeadLocationPickerDialog.tsx:289–303`
- **Severity:** P2  
- **Confidence:** Med

This is the eslint-react-hooks violation companion to CRM-06. The `exhaustive-deps` rule would flag this immediately. See CRM-06 for root cause and fix details.

---

**CRM-15** · `LeadScheduleMode` UI only exposes `IN_PERSON` and `ONLINE`; `ON_SITE` and `REMOTE` are unreachable

- **File:** `src/modules/crm/leads/components/LeadReminderSheets.tsx:249–250`, `src/modules/crm/leads/types.ts:180–186`
- **Severity:** P2  
- **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
<select value={form.mode} ...>
  <option value={LeadScheduleMode.IN_PERSON}>In Person</option>
  <option value={LeadScheduleMode.ONLINE}>Online</option>
</select>
```

`LeadScheduleMode.ON_SITE` and `LeadScheduleMode.REMOTE` are defined in the type but not in the select. If the backend ever returns a schedule with `mode: "ON_SITE"`, the `mode` field will not match any rendered option, and the select will visually fall back to its first option while the hidden form value retains the correct string — creating a confusing mismatch.

**Fix:** Either add all enum values to the select or remove the unused values from the enum type (and align with the backend contract).

---

### P3 — Code Quality / Low-Impact Issues

---

**CRM-16** · Sentinel `queryKey: detail("none")` anti-pattern used in three hooks

- **Files:** `src/modules/crm/accounts/hooks.ts:22`, `src/modules/crm/contacts/hooks.ts:22`, `src/modules/crm/opportunities/hooks.ts:22`
- **Severity:** P3  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
queryKey: id ? dealKeys.detail(id) : dealKeys.detail("none"),
queryFn: () => fetchDeal(id as string),  // `id as string` is a lie when id is null
enabled: Boolean(id),
```

**Why it's wrong:** The `"none"` sentinel pollutes the query cache with a permanent disabled-query entry. The `id as string` assertion is also unsound. The standard TanStack Query pattern is:

```ts
queryKey: id !== null ? dealKeys.detail(id) : [],
queryFn: () => fetchDeal(id!),
enabled: id !== null,
```

Or simply skip the `useXxx(null)` hook call at the call site.

---

**CRM-17** · `detail` queries in `accounts`, `contacts`, `opportunities` have no `staleTime`

- **Files:** `src/modules/crm/accounts/hooks.ts:20–25`, `src/modules/crm/contacts/hooks.ts:20–25`, `src/modules/crm/opportunities/hooks.ts:20–25`
- **Severity:** P3  
- **Confidence:** High
- **Owner:** Chaitanya2872

The list queries have `staleTime: 30_000` but `useAccount(id)`, `useContact(id)`, `useDeal(id)` lack `staleTime` entirely, defaulting to `0`. Every component mount or window focus refocus triggers a fresh network request for detail data. Add `staleTime: 30_000` to match the list queries.

---

**CRM-18** · `presales/page.tsx` re-declares `LeadQuickView` already exported from `presales/types.ts`

- **Files:** `src/modules/crm/presales/page.tsx:27–35` vs `src/modules/crm/presales/types.ts:3–11`
- **Severity:** P3  
- **Confidence:** High
- **Owner:** Chaitanya2872

```ts
// types.ts
export type LeadQuickView = { id: string; name: string; company: string; ... };

// page.tsx (local redeclaration — not imported from types.ts)
type LeadQuickView = { id: string; name: string; company: string; ... };
```

The two declarations are structurally identical today but are not linked. Any future change to one will silently diverge from the other.

**Fix:** Delete the local declaration in `page.tsx` and add `import type { LeadQuickView } from "./types";`.

---

**CRM-19** · `_test.txt` artifact committed to repository

- **File:** `src/modules/crm/leads/_test.txt`
- **Severity:** P3  
- **Confidence:** High
- **Owner:** Chaitanya2872

The file contains only the word `hello`. It is presumably a dev scratch file. Remove it and add `*.txt` to `.gitignore` for `src/` if relevant.

---

**CRM-20** · `AccountDialog` and `ContactDialog` form not reset when creating a new record after editing (reference stability)

- **Files:** `src/modules/crm/accounts/page.tsx:31–36`, `src/modules/crm/contacts/page.tsx:36–41`
- **Severity:** P3  
- **Confidence:** Med

```ts
const [form, setForm] = useState<AccountFormData>(initial);
useEffect(() => { setForm(initial); }, [initial, open]);
```

When `dialogMode` is `null → "create"`, `open` changes from `false → true`, so the effect runs and resets the form correctly. When `dialogMode` is `"edit" → null → "create"` in quick succession, `initial` changes from an edit-object to `emptyForm`. This also fires correctly. **However**, if a user opens create-mode, starts typing, closes (dialogMode → null), and immediately reopens (dialogMode → "create") **before the dialog's unmount effect has cleared** — the `open` prop changes to `false` then back to `true` with `initial = emptyForm` (same reference). Because `emptyForm` is a module-level constant, the effect correctly fires on the `open` change. This is currently safe. Mark as Low-confidence (potential issue if dialog mounting changes).

---

**CRM-21** · `"UNASSIGNED"` is used as a `LeadFilter.assignedTo` sentinel without being a typed value

- **File:** `src/modules/crm/leads/page.tsx:798`
- **Severity:** P3  
- **Confidence:** Med

```ts
updateFilter({ assignedTo: "UNASSIGNED", status: "ALL" }, { keepQuickView: true });
```

`LeadFilter.assignedTo` is typed as `string`. The string `"UNASSIGNED"` is a sentinel that must be handled by the backend; if the server changes its sentinel to `"__unassigned__"` or an empty string, this silently breaks the filter with no type error. Define it as a named constant (`const UNASSIGNED_SENTINEL = "UNASSIGNED"`) and document the backend contract.

---

## Redundancy

### Cloned format helpers

| Location A | Location B | What is cloned |
|---|---|---|
| `src/modules/crm/leads/lead-ui.tsx:23–24` (`export const fmt`) | `src/modules/crm/opportunities/page.tsx:10–17` (local `const fmt`) | Currency formatter — different signatures (`v: number` vs `value?: number`) and different null handling (`0` vs `"$0"`) |
| `src/modules/crm/leads/lead-ui.tsx:26–28` (`export const fmtDate`) | `src/modules/crm/presales/page.tsx:22–25` (local `const fmtDate`) | Date formatter — different null handling (throws on non-string vs accepts `null`) |

**Fix:** Both `opportunities/page.tsx` and `presales/page.tsx` should import `fmt` / `fmtDate` from `leads/lead-ui.tsx` (or move the helpers to a shared `src/lib/fmt.ts`). The null-handling difference in `fmt` needs resolution — pick one contract.

### Cloned type declaration

| Location A | Location B | What is cloned |
|---|---|---|
| `src/modules/crm/presales/types.ts:3–11` (`export type LeadQuickView`) | `src/modules/crm/presales/page.tsx:27–35` (local `type LeadQuickView`) | Exact structural duplicate — see CRM-18 |

### Cloned error-rethrow pattern

All five `api.ts` files define a nearly identical `rethrow`/`rethrowApiError` function:

| File | Function name |
|---|---|
| `leads/api.ts:89` | `rethrowApiError` |
| `accounts/api.ts:4` | `rethrow` |
| `contacts/api.ts:4` | `rethrow` |
| `opportunities/api.ts:4` | `rethrow` |
| `presales/api.ts:4` | `rethrowApiError` |

**Fix:** Extract to `src/services/api-utils.ts` and import across all five.

### Cloned dialog shell structure

`AccountDialog` (`accounts/page.tsx:16–112`) and `ContactDialog` (`contacts/page.tsx:19–139`) share identical outer modal structure (fixed overlay + card), close button, cancel/save footer, `useEffect` form reset, and disabled state on save button. The only difference is form fields. Consider extracting a `<CrmDialog>` wrapper to eliminate the structural duplication.

---

## Tests & Gaps

**Zero automated tests** exist anywhere in the project (no `*.test.*` or `*.spec.*` files found). The only "test" artifact is the scratch `_test.txt` file.

Critical paths with no test coverage:
- `normalizeLead` / `normalizeSummary` / `normalizePage` — pure functions, easy to unit test
- `buildSchedulePayload` — the timezone bug (CRM-02) would be caught by a test
- `connectLeadNotificationsStream` — SSE reconnect and event parsing logic
- `getLeadStatusTransitions` / `LEAD_STATUS_TRANSITIONS` — business rules for stage gating
- `isMetaCapturedRemark` — assignment guard logic in `LeadDetailPanel`

---

## Coverage Note

**Fully read:** All 28 source files in `src/modules/crm/` — every api.ts, hooks.ts, types.ts, page.tsx, layout.tsx, and the five component files under `leads/components/`. Line numbers are from direct `Read` calls, not grep estimates.

**Skimmed:** The shared `@/services/api-client` and `@/components/ui/*` dependencies — not audited as they are outside module scope.

**Cannot fully verify:** The Nominatim ToS enforcement in production (CRM-05) — confirmed by reading the fetch calls; enforcement behaviour depends on Nominatim's server-side policy. The SSE multi-data-line issue (CRM-13) depends on actual server message format — audited from code only.

**Confidence overall:** High for P0–P1 findings (all are directly observable in code). Medium for P2 items that depend on runtime or backend behaviour. Low confidence findings are tagged explicitly in-text.

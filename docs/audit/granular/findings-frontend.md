# Frontend Findings (structural / standards)

Granular, owner-tagged. Correctness **bugs** are in [real-bugs.md](./real-bugs.md); pure copy-paste is
in [redundancy.md](./redundancy.md). This file is the structural/standards debt with the proper fix.
**[migrated]** = HirePath code.

---

## God-components (Owner: Chaitanya2872 unless noted)

### F1. `task-management/page.tsx` — 4,129 lines, 28 `useState`, 4 suppressed lint rules · P1
- `page.tsx:730-4129`. One component does list/board/calendar/timeline, DnD, PDF export, spaces,
  invitations, import, reports. `:732-759` = 28 `useState`; `:1-4` disables `set-state-in-effect`,
  `preserve-manual-memoization`, `purity`, `no-unused-vars` **for the whole file** — so any new
  violation is also hidden.
- **Proper fix**: split by view (`BoardView`, `CalendarView`, `TimelineView`) and concern
  (`useTaskFilters`, `useBoardDnd`, `useSpaceManagement`); each panel owns its state. Remove file-level
  disables and fix per line (the `Promise.resolve().then(setState)` microtask hack at `:832-847`
  should be a lazy initializer / `useMemo`).

### F2. `PurchaseRequisitionDetailPanel` — 26 `useState` set from one effect · P1
- `p2p/pr/page.tsx:1188-1240`. 26 state vars set synchronously in a `useEffect` on `requisition`
  change → 26 renders per change and a one-cycle-stale form.
- **Proper fix**: `const [draft, setDraft] = useState(() => deriveForm(requisition))` keyed on
  `requisition.id`, or remount via `key={requisition.id}`. Better: `react-hook-form`.

### F3. `CreatePurchaseOrderPanel` — 18 props, 11 `on*Change` callbacks · P2
- `p2p/po/page.tsx:802-860` (Owner: Vaishnavi). Parent holds all form state and drills setters — the
  exact anti-pattern `react-hook-form` removes.
- **Proper fix**: the panel owns its form via `useForm` + `zodResolver`; parent passes defaults +
  `onSubmit`.

### F4. Other oversized components · P2
- `sales/page.tsx` (1,845), `crm/leads/page.tsx` (1,489), `sales/orders/components.tsx` (1,736 — a
  misnamed "components" bag), `inventory/page.tsx` (1,213), `users/page.tsx` (1,238, Vaishnavi),
  `project-management/pages/MeetingsPage.tsx` (1,878, Vaishnavi), `ProjectForm.tsx` (1,181).
- **Proper fix**: extract sections into `components/`, lift data to `hooks.ts`. Target < 400 lines.

---

## Data-layer standards

### F5. No `hooks.ts` / query-key factory in whole modules · P2 **[migrated]**
- `src/modules/recruitment/*` (Owner Ravi) and `approvals/`, `org/`, `forms/`, `integrations/` call
  `useQuery`/`useMutation` inline. 18 inline keys across 4 recruitment files
  (`ApplicationFormBuilderPage:108,113,118,123,129`; `CandidateProfilePage:55,61,69,75,80`;
  `OpenPositionsPage:66,72,77,82,89`; `OffersPage:44,49,54`).
- Real collision: `['positions']` (builder) is a **prefix** of `['positions', statusFilter]`
  (open-positions) → invalidating one disturbs the other; `['approval-flows']` is a raw string in two
  files — a typo silently forks the cache.
- **Proper fix**: per-module `queryKeys.ts` factory + `hooks.ts` wrapping every query/mutation. Set
  `QueryClient` defaults in `src/app/providers.tsx` (currently none → refetch-on-focus everywhere).

### F6. `any` saturation · P2 **[migrated]** for recruitment/setup
- ~87 repo-wide; densest in `src/lib/{orgApi,formsApi,setupApi}.ts` (Owner Ravi) and recruitment
  pages (`CandidateProfilePage` 9, `OffersPage` 9, `OpenPositionsPage` 8, `InterviewsPage` 8). Common
  shapes: `mutationFn: (payload: any)`, `.map((x: any) => …)`, `useState<any|null>`.
- **Proper fix**: generate types from the backend (`openapi-typescript`/`orval`) or hand-write
  `types.ts`; use `unknown` + narrowing in the `setupApi` mappers (they exist *because* input is
  untrusted — `any` defeats their purpose).

### F7. Duplicate/legacy toasting and dead SSR guards · P2/P3
- `crm/leads/page.tsx:724-737` re-implements a `uiToast` + `setTimeout` auto-dismiss when `sonner`
  (already a dependency) does this. Owner Chaitanya.
- `p2p/pr/page.tsx:1248-1253,1285` — `typeof window === "undefined"` Next.js SSR guards; dead in Vite,
  and the false branch would wipe state if it ever ran.
- **Proper fix**: use `toast.*` from `sonner`; delete the SSR guards.

### F8. `localStorage` as primary store for business data · P2
- `p2p/vendors/page.tsx:1927-1943,2024,2229` (`fawnix.p2p.vendor.draft`), `p2p/pr/page.tsx:1247-1295`
  (sourcing state per requisition). No versioning, TTL, multi-tab conflict handling, or audit trail;
  a model change silently corrupts stored drafts. Owner Chaitanya. `project-management` also layers a
  `localStorage` cache over TanStack Query (dual source of truth).
- **Proper fix**: server-persist drafts via a mutation; if local persistence is truly needed, version
  the key and validate with a Zod schema on read.

---

## Consistency / hygiene

### F9. `"use client"` in 25 files · P3
- A Next.js directive; a **no-op in Vite**. Misleads contributors. Owner mostly Chaitanya.
- **Proper fix**: delete all (`grep -rl '"use client"' src`).

### F10. Non-null `!` coupled to `enabled` guards · P2 **[migrated]**
- `CandidateProfilePage.tsx:57,85` — `id!` / `application!.application_id` guarded only by a separate
  `enabled:` flag; the two can drift. Owner Ravi.
- **Proper fix**: narrow the route param type or throw explicitly in `queryFn`; don't assert.

### F11. Hardcoded option lists duplicated across components · P2 **[migrated]**
- Interview types `['technical','hr','managerial','final']` hardcoded in `CandidateProfilePage:327` and
  `OpenPositionsPage:488`; position statuses similarly. Must match backend enums. Owner Ravi.
- **Proper fix**: `src/modules/recruitment/constants.ts` `as const` arrays + derived union types (or
  generated enums).

### F12. `ApplicationFormBuilderPage` 767-line monolith with 3 modes · P2 **[migrated]**
- Build / preview / submissions all in one `{tab === x && …}` return, plus the nested-component DnD
  bug ([B8](./real-bugs.md)). Owner Ravi.
- **Proper fix**: split into `FormBuilder`, `FormPreview`, `FormSubmissionsTable`, `FormSettings`;
  parent is a thin tab router.

---

## Top 5 systemic (frontend)
1. **God-components with unbounded `useState`** — decompose + `react-hook-form` for every form panel.
2. **Copy-paste across P2P pages** — extract shared format/util/components (see [redundancy.md](./redundancy.md)).
3. **File-level `eslint-disable` hiding real effect/render bugs** — un-suppress and fix.
4. **No data layer in migrated modules** — establish `hooks.ts` + `queryKeys.ts` + `types.ts` on one
   module, then replicate.
5. **`any` + `localStorage`-as-database** — type the API surface; move business state to the server.

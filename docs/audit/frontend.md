# Frontend Audit

Scope: `src/`. Standards reference: [frontend-react-typescript.md](../coding-standards/frontend-react-typescript.md).

---

## <a id="vms"></a>1. P2 — The "visitor management" module is a foreign body

`src/modules/visitor management/` was clearly copied from a separate React project and never
integrated. Symptoms:

- **Literal space in the folder name** — breaks on some tooling/OSes and forces
  `import("../modules/visitor management/routes/AppRoutes")` with a `// @ts-ignore`
  (`router.tsx:98`) because the folder is deliberately excluded from type-checking (yet sits
  inside `src/`, which `tsconfig` includes — a fragile contradiction).
- **Its own entry points** (`main.tsx`, `App.tsx`, `index.css`, `App.css`), **its own UI kit**
  (`Button`, `Input`, `Table`, `Modal`, `Alert` under `components/common/`) — zero reuse of
  `src/components/ui/`.
- **Its own auth** (`vms_auth_token`, a separate `ProtectedRoute` that redirects to `/login`,
  not `/vms/login` — a redirect-loop risk) and **its own HTTP client** (`fetch`, not the shared
  axios instance).
- **Hardcoded ngrok base URL** and demo credentials — see [security §3/§4](./security.md#3).

**Recommendation**: decide the boundary explicitly. Either (a) fully integrate it — rename to
`visitor-management`, adopt the shared axios client, shared UI, and shared auth; or (b) extract
it as a true separate micro-frontend with a documented contract. The current in-between state
is the worst of both.

---

## <a id="god-components"></a>2. P2 — God-components

Several route components have grown to unmaintainable size:

| File | ~Lines | Notes |
|---|---|---|
| `src/modules/task-management/page.tsx` | 4,128 | 28 `useState`, 4 `eslint-disable` headers; list/kanban/board/detail/comments/timer/PDF all in one. |
| `src/modules/purchases/p2p/pr/page.tsx` | 2,972 | PR + approval + PDF. |
| `src/modules/purchases/p2p/po/page.tsx` | 2,261 | |
| `src/modules/purchases/p2p/vendors/page.tsx` | 2,239 | `localStorage` draft persistence. |
| `src/modules/project-management/pages/MeetingsPage.tsx` | 1,877 | |
| `src/modules/sales/page.tsx` | 1,844 | |
| `src/modules/sales/orders/components.tsx` | 1,736 | Misnamed "components" bag. |
| `src/modules/crm/leads/page.tsx` | 1,488 | |
| `src/modules/users/page.tsx` | 1,237 | |
| `src/modules/inventory/page.tsx` | 1,212 | |
| `src/modules/project-management/components/ProjectForm.tsx` | 1,180 | Single form. |

These are the hardest files to test and the most bug-prone. **Recommendation**: extract
sub-views/sections into `components/`, lift data logic into `hooks.ts`, and add tests as you
split. The multiple `eslint-disable` headers on the worst offenders (`preserve-manual-memoization`,
`set-state-in-effect`, `purity`) are suppressing real correctness smells.

---

## <a id="data"></a>3. P2 — Inconsistent data layer

- **Competing HTTP clients**: the main app uses the shared axios instance
  (`src/services/api-client.ts`), but VMS uses raw `fetch`. Standardize on axios.
- **Inline query keys**: recruitment, approvals, org, integrations, and forms call
  `useQuery`/`useMutation` with ad-hoc string keys (`['postings']`, `['approval-flows']`, …)
  instead of a `*Keys` factory. This makes invalidation unreliable and keys collision-prone.
- **No global `staleTime`**: the `QueryClient` in `src/app/providers.tsx` sets no defaults, so
  queries that don't override it refetch on every window focus/mount. Add sane defaults.
- **Dual cache**: `project-management` layers a `localStorage` cache
  (`fawnix.project-management.projects-cache`) on top of Query — two sources of truth.
- **Weakly-typed aggregate API** in `src/lib/api.ts` (`params?: object`, `any` mappers) plus
  duplicate `normalizeRole` in both `lib/api.ts` and `lib/setupApi.ts`.

**Recommendation**: give every module a `hooks.ts` + key factory (follow `crm/leads`), route
all HTTP through the shared client, set `QueryClient` defaults, and remove the `localStorage`
cache layer.

---

## <a id="tests"></a>4. P1 — No tests

There is no test tooling or test files in `src/` (`package.json` has no test runner). Combined
with god-components, refactoring is high-risk. **Recommendation**: add Vitest + React Testing
Library; start with the data hooks and the components being split out of the god-components.

---

## 5. P3 — TypeScript & lint hygiene

- **~87 `: any`** across ~40 files (heaviest in `src/lib/*` mappers and `recruitment/*`). Replace
  with generated/proper response types.
- **25 `"use client"` directives** — a Next.js no-op in Vite. Remove all.
- **~7 files with `eslint-disable`** headers (sales/orders, p2p/pr, p2p/vendors,
  task-management) — each suppresses a real rule; fix the underlying issue.
- **Non-null assertions** (`x!.foo`) in sales/recruitment/p2p — validate instead of asserting.
- **Two ESLint configs**: flat `eslint.config.js` **and** legacy `.eslintrc.cjs`. Keep the flat
  one, delete the legacy one.
- **`tailwindcss-animate`** is a dependency but not registered in `tailwind.config.ts`
  (`plugins: []`) — wire it in or drop it.

---

## 6. P3 — Dead code & clutter (frontend)

- `src/app/layout.tsx` — unused stub (real shell is `components/layout/AppLayout.tsx`).
- `src/modules/sales/orders/{approvals,delivery,invoices,reports,returns}-page.tsx` — not
  imported anywhere; the router `<Navigate>`s past them.
- `src/modules/crm/contacts/page.tsx` — no route (only its `hooks.ts` is used).
- `src/modules/purchases/page.tsx` + `shared.tsx` — `/purchases` redirects to `/p2p`; unused.
- Commented-out route imports in `router.tsx` (dashboard, accounting, old CRM path).
- `src/modules/recruitment/TalentPoolPage.tsx` renders entirely from a `mockPool` constant —
  no API calls; non-functional page.
- `formatDate`/`fmtDate` re-implemented in ~14 files despite a canonical `src/lib/utils.ts` —
  consolidate.
- Stray `console.log`/`console.error`/`console.warn` in several VMS files.

The consolidated, checkable list is in the [cleanup checklist](./cleanup-checklist.md).

---

## What's good

- Modern, coherent stack (React 19, TS strict, Vite 7, Tailwind v4, TanStack Query, RHF+Zod).
- The **canonical axios client** is well done: token injection + a correctly deduplicated
  refresh (singleton promise).
- The best modules (`crm/leads`, `inventory`, `task-management`'s `hooks.ts`) demonstrate a
  clean, repeatable pattern — the target the rest should converge to.
- `cn()` usage is consistent (~198 call sites).
- Route guards + a 45-permission RBAC model are already in place.

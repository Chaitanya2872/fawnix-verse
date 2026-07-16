# Frontend Architecture

The frontend is a single-page React 19 application in `src/`, bundled by Vite 7.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | React 19 (function components + hooks) |
| Language | TypeScript 5.9, `strict: true` |
| Build | Vite 7, `@vitejs/plugin-react`, `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 + shadcn/ui (`new-york`, neutral base) |
| Routing | react-router-dom 7 (`createBrowserRouter`) |
| Server state | TanStack Query v5 |
| Forms | react-hook-form 7 + Zod 4 (`@hookform/resolvers`) |
| HTTP | axios 1.x |
| Icons | lucide-react |
| Misc | recharts, jspdf, react-qr-code, sonner (toasts), @dnd-kit |

Path alias: `@/* → src/*` (`tsconfig.app.json`, `vite.config.ts`).

---

## 2. Bootstrap & shell

```
src/main.tsx
  └─ StrictMode
      └─ ErrorBoundary            (src/app/ErrorBoundary.tsx — class component)
          └─ Providers            (src/app/providers.tsx — QueryClient + Sonner Toaster)
              └─ RouterProvider   (src/app/router.tsx — createBrowserRouter)
```

- **`src/app/providers.tsx`** — a single module-level `QueryClient`. Note: it sets **no
  default options** (staleTime, retry). See the [frontend audit](../audit/frontend.md).
- **`src/app/router.tsx`** (~787 lines) — flat route table, mostly **eager imports**
  (no code-splitting except the VMS module). Route guards are applied inline.
- **`src/components/layout/AppLayout.tsx`** — the real app shell (Sidebar + Topbar +
  `<Outlet/>`). Note: `src/app/layout.tsx` also exists but is an unused stub.

---

## 3. Module layout (`src/modules/`)

The app is organized **feature-first**. Each module owns its pages, data hooks, and types.
17 modules exist:

```
crm/  (leads, contacts, accounts, opportunities, presales)
sales/ (+ orders)
purchases/ (+ p2p: pr, po, receipt, payment, vendors, budget, alerts, …)
inventory/
recruitment/
project-management/
task-management/
org/  (setup, organization)
forms/
approvals/
integrations/
reports/
users/
access/
auth/  (guards, permissions, login)
public/
visitor management/   ← literal space in folder name; see audit
```

### The intended module convention
A well-structured module (e.g. `crm/leads`, `inventory`, `task-management`) contains:

```
<module>/
  api.ts        # axios calls, returns typed data
  hooks.ts      # TanStack Query hooks + a `<name>Keys` key factory
  types.ts      # domain types
  page.tsx      # route component
  components/   # module-local components (when it grows)
```

**Convention adherence is inconsistent.** Some modules (recruitment, approvals, org,
integrations, forms) skip `hooks.ts`/`api.ts` and call `useQuery` inline with ad-hoc string
keys. The `visitor management` module follows an entirely different structure (its own
`main.tsx`, `App.tsx`, auth, UI kit). This is catalogued in the audit.

---

## 4. Data layer

### Canonical client — `src/services/api-client.ts`
- One `axios.create()` with `baseURL = VITE_API_URL ?? "/api"`.
- **Request interceptor** injects the bearer token from `localStorage`
  (`fawnix.accessToken`).
- **Response interceptor** handles `401` by attempting a single deduplicated token refresh
  (singleton promise), then clearing tokens on failure.
- A second instance `rawApi` (no auth) is used for public endpoints.

### Aggregate API namespaces — `src/lib/`
`api.ts`, `setupApi.ts`, `orgApi.ts`, `formsApi.ts` define large objects
(`recruitmentApi`, `usersApi`, `approvalsApi`, …). These re-use the axios instance but are
weakly typed (`params?: object`, `any` mappers). Considered a secondary/legacy pattern.

### Server state — TanStack Query
- Structured modules export `use*` hooks with a `*Keys` factory.
- Less-structured modules use inline string keys, which are collision-prone.
- No global default `staleTime` → many queries refetch on window focus.

---

## 5. Auth & authorization

- Tokens live in `localStorage` (`fawnix.accessToken` / `fawnix.refreshToken`).
- Guards in `src/modules/auth/guards.tsx`: `PublicOnlyRoute`, `ProtectedRoute`,
  `RequirePermission`.
- `src/modules/auth/permissions.ts` defines 45 `PERMISSIONS` constants and `hasPermission()`
  with layered resolution (superuser → exact → legacy page → module fallback).
- The `visitor management` module has a **separate** auth flow (`vms_auth_token`, its own
  `ProtectedRoute`) — a known integration gap.

---

## 6. UI system

- **shadcn/ui** primitives in `src/components/ui/` (button, card, dialog, dropdown-menu,
  form, input, label, sheet, DatePicker). Configured via `components.json`.
- **`cn()`** (`src/lib/utils.ts`) = `twMerge(clsx(...))`; used ~198 times — the standard
  class-merge helper.
- **Tailwind v4** with a `brand` color ramp + Inter font in `tailwind.config.ts`.
  (`tailwindcss-animate` is installed but not wired into `plugins` — audit item.)

---

## 7. State management

- **Server state**: TanStack Query (dominant).
- **Local state**: `useState` (some pages have 20–28 `useState` calls — god-components).
- **Context**: one significant context — `ProjectsContext` in `project-management/`.
- No Redux/Zustand/Jotai. No global client store.

---

## 8. Where to look

| You want to… | Go to |
|---|---|
| Add a route | `src/app/router.tsx` |
| Change the app shell | `src/components/layout/` |
| Configure HTTP/auth | `src/services/api-client.ts` |
| Add a feature | `src/modules/<feature>/` (follow `crm/leads` as the template) |
| Add a UI primitive | `npx shadcn add …` → `src/components/ui/` |
| Change permissions | `src/modules/auth/permissions.ts` |

See the [frontend coding standards](../coding-standards/frontend-react-typescript.md) for how
new frontend code should be written, and the [frontend audit](../audit/frontend.md) for what
needs fixing.

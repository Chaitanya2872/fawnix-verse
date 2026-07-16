# Frontend Coding Standards — React 19 + TypeScript

Applies to everything in `src/`. Sources are listed per section.

---

## 1. React 19

- **Function components + hooks only.** No class components (the one exception is the top-level
  `ErrorBoundary`, which must be a class because React has no hook equivalent).
- Prefer React 19 primitives where they fit: `useActionState` (form state, replaces
  `useFormState`), `useOptimistic` (optimistic UI), `use()` for reading context/promises.
- `forwardRef` is no longer required — pass `ref` as a normal prop. Use `<Context value={…}>`,
  not `<Context.Provider>`.
- Wrap lazy routes and suspending queries in `<Suspense fallback={…}>`, each paired with an
  error boundary.
- **React Compiler** (stable, Oct 2025) can replace manual `useMemo`/`useCallback`/`React.memo`.
  If adopted, add it as the first Babel plugin and stop hand-memoizing. Until adopted, memoize
  deliberately, not reflexively.

_Sources: <https://react.dev/blog/2024/12/05/react-19>, <https://react.dev/blog/2025/10/07/react-compiler-1>_

---

## 2. TypeScript

- `strict: true` is mandatory (already on). Prefer also enabling `noUncheckedIndexedAccess`.
- **`any` is banned in application code.** Use `unknown` + a type guard for untrusted data
  (API responses, `catch` blocks). Use `satisfies` instead of `as` where possible.
- **Generate API types** from the backend rather than hand-writing them; never sprinkle `any`
  over untyped responses.
- Model mutually-exclusive states as **discriminated unions**, not bags of optional booleans:

  ```ts
  type State =
    | { status: 'loading' }
    | { status: 'success'; data: Order }
    | { status: 'error'; error: string }
  ```

- Enforce with ESLint: `@typescript-eslint/no-explicit-any: error`,
  `@typescript-eslint/no-floating-promises: error`.

> Current state: ~87 `any` annotations and 25 no-op `"use client"` directives exist — see
> [frontend audit](../audit/frontend.md).

_Sources: <https://www.typescriptlang.org/tsconfig/strict.html>, <https://rishikc.com/articles/typescript-strict-mode-best-practices/>_

---

## 3. Folder structure

- **Feature-first.** One folder per domain under `src/modules/<feature>/`.
- A module owns: `api.ts` (calls), `hooks.ts` (Query hooks + key factory), `types.ts`,
  `page.tsx`, and `components/` when it grows. Follow `src/modules/crm/leads` as the template.
- **Shared** UI lives in `src/components/ui/`; shared utils in `src/lib/` / `src/hooks/`.
  Shared code must **not** import from a feature.
- **Files: kebab-case** (`order-list.tsx`, `use-create-order.ts`). **No spaces in folder
  names** (the `visitor management/` folder violates this).
- Barrel `index.ts` files only at a feature's public edge, with named exports — never
  `export *`, never deep barrel chains (they bloat the bundle).

_Sources: <https://www.robinwieruch.de/react-folder-structure/>, <https://adjoe.io/company/engineer-blog/moving-to-feature-based-react-architecture/>_

---

## 4. Server state — TanStack Query v5

- **Every query lives in a `hooks.ts` with a key factory.** No inline string keys in
  components.

  ```ts
  export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (f: OrderFilters) => [...orderKeys.lists(), f] as const,
    detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  }
  ```

- Configure the `QueryClient` **once** with sane defaults (this is currently missing):

  ```ts
  new QueryClient({ defaultOptions: { queries: {
    staleTime: 60_000, retry: 2, refetchOnWindowFocus: false } } })
  ```

- Mutations invalidate by key on success:
  `qc.invalidateQueries({ queryKey: orderKeys.lists() })`.
- v5 rules: object signature only; no `onSuccess`/`onError` on `useQuery`; use
  `queryClient.clear()` on logout.

> Current state: inline ad-hoc keys across recruitment/approvals/org/integrations/forms, and no
> global `staleTime`. See [frontend audit](../audit/frontend.md).

_Sources: <https://tanstack.com/query/v5/docs/framework/react/reference/queryOptions>, <https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations>_

---

## 5. Forms — react-hook-form + Zod

- Define a Zod schema; derive the type with `z.infer`. Never hand-write the form type.
- Always pass `defaultValues`. Use `zodResolver`.
- `register` for native inputs; `Controller` only for controlled third-party components.
- Use `watch('field')`, not `watch()` (the latter re-renders the whole form).
- **Validate on the server too** — client Zod is UX only. Share the schema where feasible.

_Sources: <https://github.com/react-hook-form/resolvers>_

---

## 6. HTTP — axios

- **One module-level axios instance** (`src/services/api-client.ts`). Never create instances
  or register interceptors inside components/functions (they stack and double-fire).
- Request interceptor attaches the token; response interceptor handles `401` with a **single
  queued refresh** (the current implementation does this — keep it).
- All feature `api.ts` files use this shared instance. Do **not** introduce `fetch`-based
  clients (the `visitor management` module currently does — audit item).
- Return typed data from `api.ts`; do not leak `AxiosResponse` into components.

_Sources: <https://github.com/axios/axios/issues/4861>_

---

## 7. Styling — Tailwind v4 + shadcn/ui

- Merge classes with `cn()` (`src/lib/utils.ts`) — never string-concatenate Tailwind classes.
- Use **semantic tokens** (`bg-primary`, `text-muted-foreground`), not raw palette values
  (`bg-blue-500`).
- Build domain wrappers (`<SaveButton>`) over raw primitives; use `class-variance-authority`
  for variants.
- Commit shadcn components unmodified, then customize — keeps future updates diffable.
- Tailwind v4 syntax: `bg-linear-to-r` (not `bg-gradient-to-r`), `shadow-xs`, `size!` suffix
  for `!important`, `bg-black/50` for opacity. If a plugin (e.g. `tailwindcss-animate`) is a
  dependency, it must be wired into the config or removed.

_Sources: <https://tailwindcss.com/docs/upgrade-guide>, <https://rupeshpoudel.com.np/blog/shadcn-best-practices>_

---

## 8. Component size & state

- Keep route components thin; extract sections into `components/`. Target < 400 lines per
  file; a component with 15+ `useState` calls is a refactor signal.
- Prefer server state (Query) over duplicating it in local state or `localStorage`.
- Lazy-load routes (`React.lazy`) to enable code-splitting — currently only VMS does this.

> Current state: several 1,000–4,000-line god-components (task-management `page.tsx` ~4,128
> lines). See [frontend audit](../audit/frontend.md).

---

## 9. Lint & format

- **One** ESLint config: the flat `eslint.config.js`. Delete the legacy `.eslintrc.cjs`
  (having both is ambiguous — audit item).
- Prettier owns formatting; ESLint owns quality. Run both in CI with
  `eslint --max-warnings 0`.

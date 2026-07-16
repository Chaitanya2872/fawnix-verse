# auth — Module Audit

## Summary

The `auth` module (`src/modules/auth/`) is the identity backbone for the entire application: it owns the login page (password + OTP flows), the TanStack Query hooks for the current-user session, the route guards (`PublicOnlyRoute`, `ProtectedRoute`, `RequirePermission`), and the full permission/RBAC model. Overall health is **good for a junior codebase** — the layering is clean, there are no raw `any` types, no `@ts-ignore`, and no mock data. The headline risks are: (1) a parallel shadow authentication system in `visitor management` that writes its own tokens to `localStorage` and hardcodes a ngrok tunnel URL in production source; (2) a hardcoded fallback redirect path in `page.tsx` that diverges from the canonical logic in `permissions.ts`; (3) `getRedirectPath` is copy-pasted verbatim between `page.tsx` and `guards.tsx` with a different signature; and (4) the `isPending` spinner branch inside `RequirePermission` is dead code because `ProtectedRoute` already waits for the query to settle before rendering children.

---

## Surface Map

### Pages / Routes

| File | Route | Purpose |
|---|---|---|
| `page.tsx` | `/login` | Password + OTP login form |
| `unauthorized.tsx` | `/unauthorized` | "Access restricted" error page (static) |

### Hooks

| Export | File | What it does |
|---|---|---|
| `useCurrentUser` | `hooks.ts` | Fetches `/auth/me`, staleTime 5 min, retry=false |
| `useLogin` | `hooks.ts` | Password login mutation; seeds query cache on success |
| `useRequestOtp` | `hooks.ts` | OTP request mutation (no cache side-effect) |
| `useVerifyOtp` | `hooks.ts` | OTP verify mutation; seeds query cache on success |
| `useLogout` | `hooks.ts` | Calls `logout()`, clears entire query cache on settled |

### Query Key Factory

| Key | Value | Declared in |
|---|---|---|
| `authKeys.all` | `["auth"]` | `hooks.ts:7` |
| `authKeys.currentUser()` | `["auth", "me"]` | `hooks.ts:8` |

### Guards / Route Components

| Export | File | Purpose |
|---|---|---|
| `PublicOnlyRoute` | `guards.tsx` | Redirects logged-in users away from `/login` |
| `ProtectedRoute` | `guards.tsx` | Blocks unauthenticated users from the app |
| `RequirePermission` | `guards.tsx` | Blocks users missing a specific permission |
| `AuthStatusScreen` | `guards.tsx` | Internal loading spinner (not exported) |

### API Functions

| Function | Endpoint | HTTP |
|---|---|---|
| `login()` | `/auth/login` | POST (rawApi) |
| `requestOtp()` | `/auth/request-otp` | POST (rawApi) |
| `verifyOtp()` | `/auth/verify-otp` | POST (rawApi) |
| `logout()` | `/auth/logout` | POST (api) |
| `fetchCurrentUser()` | `/auth/me` | GET (api) |

### Key Types

| Type | File | Notes |
|---|---|---|
| `CurrentUser` | `types.ts:1` | `roles: string[]`, `permissions: string[]` |
| `AuthTokens` | `types.ts:14` | Includes unused `accessTokenExpiresAt` / `refreshTokenExpiresAt` |
| `RequestOtpRequest` | `types.ts:22` | snake_case field `emp_code` (inconsistent with rest) |
| `VerifyOtpRequest` | `types.ts:32` | snake_case field `emp_code` (inconsistent with rest) |
| `Permission` | `permissions.ts:47` | Derived union type from `PERMISSIONS` const |

---

## Findings

### P0 — Critical

---

#### AUT-01 · Parallel shadow auth system in `visitor management` bypasses app auth entirely

- **File:** `src/modules/visitor management/services/authService.ts:1-95` and `src/modules/visitor management/services/apiConfig.ts:1-10`
- **Severity:** P0 | **Confidence:** High
- **Owner:** Vaishnavi Nerella

**Offending code (`authService.ts:57-65`):**
```ts
const demoUser = {
  token: "offline-demo-token",
  username,
  fullName: username === "admin" ? "Admin User" : username,
  role: "ADMIN",
  offline: true,
};
localStorage.setItem(TOKEN_KEY, demoUser.token);
localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
```

**Offending code (`apiConfig.ts:1`):**
```ts
const fallbackBaseUrl = "https://5d7e-122-164-68-247.ngrok-free.app";
```

**Why it is wrong:**
The visitor-management sub-module maintains a completely separate authentication stack: its own `localStorage` keys (`vms_auth_token`, `vms_auth_user`), its own `authFetch` wrapper, its own login/logout lifecycle, and its own `/api/auth/me` call. When the backend is unreachable (any `TypeError: Failed to fetch`), **any** username/password combination silently authenticates as a fully privileged ADMIN via the hardcoded `"offline-demo-token"`. This is a development shortcut committed to production source. Additionally, a private ngrok tunnel URL (`5d7e-122-164-68-247.ngrok-free.app`) is the hardcoded fallback base URL — it leaks infrastructure topology and will stop working when the tunnel expires.

**Proper fix:**
1. Delete the offline demo-session fallback entirely (`authService.ts:53-67`).
2. Replace `apiConfig.ts` fallback with `""` or remove it and throw if `VITE_API_BASE_URL` is missing:
   ```ts
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
   if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not set");
   ```
3. Migrate visitor-management to use the central `api` instance from `@/services/api-client` and `useCurrentUser` from `@/modules/auth/hooks` — eliminating the parallel auth layer.

---

### P1 — High

---

#### AUT-02 · Hardcoded default redirect path in `page.tsx` ignores RBAC

- **File:** `src/modules/auth/page.tsx:20-29`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
function getRedirectPath(state: unknown) {
  const redirectState = state as RedirectState | null;
  const from = redirectState?.from;

  if (!from?.pathname) {
    return "/crm/leads";   // ← hardcoded
  }

  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}
```

**Why it is wrong:**
When a user logs in without a redirect state (direct navigation to `/login`), they are always sent to `/crm/leads` regardless of their permissions. A user who has `module.inventory` access but not `page.crm.leads` will land on a page they are not authorized to see. `permissions.ts` already implements `getDefaultAuthorizedPath()` which performs an RBAC-aware candidate walk. The login page duplicates and undermines that logic.

**Proper fix:**
After login, the `onSuccess` callback already has the `session` (which includes `session.user`). Use `getDefaultAuthorizedPath`:
```ts
// hooks.ts - pass user from session
// page.tsx handleSubmit:
const session = await loginMutation.mutateAsync(credentials);
navigate(
  redirectTo !== "/crm/leads"   // only if explicit from-state
    ? redirectTo
    : getDefaultAuthorizedPath(session.user),
  { replace: true }
);
```

The cleanest fix: remove the local `getRedirectPath` and use `getDefaultAuthorizedPath(session.user)` as the fallback:
```ts
import { getDefaultAuthorizedPath } from "./permissions";

function getRedirectPath(state: unknown, user: CurrentUser): string {
  const from = (state as RedirectState | null)?.from;
  if (!from?.pathname) return getDefaultAuthorizedPath(user);
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}
```

---

#### AUT-03 · `getRedirectPath` duplicated between `page.tsx` and `guards.tsx` with diverging signatures

- **File:** `src/modules/auth/page.tsx:20-29` vs `src/modules/auth/guards.tsx:25-42`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code (`page.tsx:20`):**
```ts
function getRedirectPath(state: unknown) {   // no fallback param
  // ...
  if (!from?.pathname) {
    return "/crm/leads";   // hardcoded fallback
  }
```

**Offending code (`guards.tsx:25`):**
```ts
function getRedirectPath(state: unknown, fallbackPath: string) {  // has fallback param
  // ...
  if (!from?.pathname) {
    return fallbackPath;
  }
```

**Why it is wrong:**
The two functions are structurally identical except one takes a `fallbackPath` parameter and the other hardcodes `/crm/leads`. This is copy-paste drift — when one is fixed (e.g., path construction changes to handle relative paths), the other will be missed. It also creates two sources of truth for the same redirect-state parsing logic.

**Proper fix:**
Extract to a shared utility, e.g. `src/modules/auth/utils.ts`:
```ts
export function getRedirectPath(state: unknown, fallbackPath: string): string {
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  if (!from?.pathname) return fallbackPath;
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}
```
Both `page.tsx` and `guards.tsx` import from there.

---

#### AUT-04 · `RequirePermission` `isPending` spinner is dead code — never rendered

- **File:** `src/modules/auth/guards.tsx:118-124`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
export function RequirePermission({ permission, children }) {
  const currentUserQuery = useCurrentUser({ enabled: sessionPresent });

  if (currentUserQuery.isPending) {          // ← never reached
    return (
      <AuthStatusScreen
        title="Checking permissions"
        description="Verifying your access to this module."
      />
    );
  }
  // ...
}
```

**Why it is wrong:**
`RequirePermission` is exclusively used inside `ProtectedRoute` children (confirmed in `src/app/router.tsx:130-213`). `ProtectedRoute` renders `<Outlet />` only when `currentUserQuery.data` is truthy — meaning the query has already settled. Both components use the **same query key** (`authKeys.currentUser()`), so `RequirePermission`'s `useCurrentUser` call hits the cache and is never in a pending state by the time it renders. The spinner is an invisible dead branch that creates a false confidence that permission checks have a loading state.

**Proper fix:**
Remove the dead branch. The component can be simplified to:
```tsx
export function RequirePermission({ permission, children }) {
  const location = useLocation();
  const { data: user } = useCurrentUser();

  if (!user || !hasPermission(user, permission)) {
    return <Navigate to="/access/request" replace state={{ from: location }} />;
  }

  return children;
}
```
This is also correct because `ProtectedRoute` guarantees a user exists.

---

#### AUT-05 · `clearAuthTokens()` called inside `useEffect` causes a flicker render before redirect

- **File:** `src/modules/auth/guards.tsx:49-53` and `81-85`
- **Severity:** P1 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code (both `PublicOnlyRoute` and `ProtectedRoute`):**
```ts
useEffect(() => {
  if (currentUserQuery.isError) {
    clearAuthTokens();
  }
}, [currentUserQuery.isError]);
```

**Why it is wrong:**
`useEffect` runs **after paint**. When `currentUserQuery.isError` becomes true, the render cycle completes before `clearAuthTokens()` is called. On that render, in `ProtectedRoute`:
- `sessionPresent` is still `true` (tokens not yet cleared)
- `isPending` is `false`
- `!currentUserQuery.data` is `true` → renders `<Navigate to="/login" />`

So the redirect happens correctly on the current render — meaning the `useEffect` is redundant side-effect cleanup that's already handled. However, the `PublicOnlyRoute` case is more fragile: the component renders `<Outlet />` on error (correct), but `clearAuthTokens` in the effect means stale tokens persist for one render cycle. The real concern is consistency: in `ProtectedRoute`, the redirect fires from `!currentUserQuery.data` without needing the effect. The effect is an orphaned "just in case" that adds cognitive overhead and a two-render flush.

**Proper fix:**
Remove both `useEffect` blocks. Instead, handle the error state explicitly in render:
```tsx
if (currentUserQuery.isError) {
  clearAuthTokens();
  return <Navigate to="/login" replace state={{ from: location }} />;
}
```

---

### P2 — Medium

---

#### AUT-06 · OTP `type` attribute missing on `<Input>` — no `inputmode`, no `autocomplete="one-time-code"`

- **File:** `src/modules/auth/page.tsx:267-279`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
<Input
  id="otp"
  value={otpForm.otp}
  onChange={...}
  placeholder="Enter OTP"
  className="..."
  required
/>
```

**Why it is wrong:**
The OTP input lacks `type="text"` (or `type="number"`), `inputmode="numeric"`, and `autoComplete="one-time-code"`. Without `autoComplete="one-time-code"`, modern browsers and iOS/Android cannot auto-suggest the OTP from SMS. Without `inputmode="numeric"`, mobile users get the full keyboard instead of the numeric pad. This degrades UX significantly on mobile where OTP flows are most common.

**Proper fix:**
```tsx
<Input
  id="otp"
  type="text"
  inputMode="numeric"
  autoComplete="one-time-code"
  pattern="[0-9]*"
  value={otpForm.otp}
  onChange={...}
  placeholder="Enter OTP"
  required
/>
```

---

#### AUT-07 · Switching auth tabs does not reset OTP form state or error messages

- **File:** `src/modules/auth/page.tsx:141-161`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
onClick={() => {
  setAuthMode("password");
  setErrorMessage(null);   // only errorMessage is cleared
}}
// ...
onClick={() => {
  setAuthMode("otp");
  setErrorMessage(null);   // only errorMessage is cleared
}}
```

**Why it is wrong:**
When a user switches from the OTP tab back to the password tab, `otpForm`, `otpStatus`, and the mutation state from `requestOtpMutation` / `verifyOtpMutation` are not reset. If they then switch back to OTP, stale state is shown — a previously sent OTP message ("`OTP sent. Expires in 5 min`") remains visible even though the OTP may have expired, or a previous partial `otp` value sits in the field. The `credentials` state similarly leaks in the reverse direction.

**Proper fix:**
```tsx
onClick={() => {
  setAuthMode("otp");
  setErrorMessage(null);
  setCredentials({ email: "", password: "" }); // reset password form
}}
// and symmetric for switching to password:
onClick={() => {
  setAuthMode("password");
  setErrorMessage(null);
  setOtpForm({ empCode: "", otp: "" });
  setOtpStatus(null);
}}
```
Alternatively, refactor each auth mode into its own component so React unmounts/remounts state automatically.

---

#### AUT-08 · `AuthTokens.accessTokenExpiresAt` and `refreshTokenExpiresAt` declared but never consumed

- **File:** `src/modules/auth/types.ts:17-18`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;    // ← never read
  refreshTokenExpiresAt: string;   // ← never read
}
```

**Why it is wrong:**
The expiry timestamps are typed but never read anywhere in the codebase (confirmed by exhaustive grep). The `api-client.ts` `storeAuthTokens` function only persists `accessToken` and `refreshToken`. Token expiry is handled entirely reactively (on 401) rather than proactively. This means the app will silently wait until the server rejects a request before attempting to refresh — adding one extra failed API call latency on every session resume. If expiry-based proactive refresh is ever needed, the fields are already part of the API response but no infrastructure uses them.

**Proper fix (option A — accept reactive refresh as-is):**
Remove the unused fields from the type to avoid confusion:
```ts
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

**Proper fix (option B — proactive refresh):**
Parse and store expiry in `localStorage` and check before each request in `withAuthHeader`.

---

#### AUT-09 · OTP types use `snake_case` fields inconsistent with the rest of the codebase

- **File:** `src/modules/auth/types.ts:23, 33` and `src/modules/auth/page.tsx:43, 70, 86`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code (`types.ts`):**
```ts
export interface RequestOtpRequest {
  emp_code: string;   // snake_case
}
export interface VerifyOtpRequest {
  emp_code: string;   // snake_case
  otp: string;
}
```

**Offending code (`page.tsx:43`):**
```ts
const [otpForm, setOtpForm] = useState({
  empCode: "",   // camelCase in state
  otp: "",
});
// ...
emp_code: otpForm.empCode.trim(),   // mapped to snake_case at call-site
```

**Why it is wrong:**
All other types in `types.ts` — `CurrentUser`, `LoginRequest`, `AuthTokens` — use camelCase. The OTP types use snake_case to match the backend field name directly. This inconsistency forces a manual mapping at the call-site (`empCode` → `emp_code`) that is easy to get wrong and makes the intent unclear. `RequestOtpResponse` also mixes: `expires_in_minutes` (snake_case) alongside camelCase-mapped downstream state (`expiresInMinutes`).

**Proper fix:**
If the backend requires snake_case, either:
1. Use a camelCase type and let `axios` transform with a response/request transformer, or
2. Accept that this endpoint uses a different convention and **add a comment** explaining why, so future developers do not "normalize" it and break the API call.

At minimum, make `RequestOtpResponse` consistent:
```ts
export interface RequestOtpResponse {
  expires_in_minutes?: number;   // or expiresInMinutes with transformer
  message?: string;
  success?: boolean;
}
```

---

#### AUT-10 · Query key `["auth", "me"]` used as an inline string literal in `access/page.tsx`

- **File:** `src/modules/access/page.tsx:305`
- **Severity:** P2 | **Confidence:** High
- **Owner:** (check via `git log -- src/modules/access/page.tsx`)

**Offending code:**
```ts
queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
```

**Why it is wrong:**
`authKeys.currentUser()` returns `["auth", "me"] as const` (defined in `src/modules/auth/hooks.ts:8`). The access page bypasses the factory and uses a raw literal. If the key ever changes (e.g., to `["auth", "current-user"]`), this inline reference will silently stop invalidating, leaving stale user data after a permission grant — which is the exact case this invalidation is meant to handle.

**Proper fix:**
```ts
import { authKeys } from "@/modules/auth/hooks";
// ...
queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
```

---

#### AUT-11 · `hasPermission` parameter typed as `string` instead of `Permission`, silently accepts garbage

- **File:** `src/modules/auth/permissions.ts:68-70`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: string   // ← should be Permission
): boolean {
```

**Why it is wrong:**
The `Permission` union type (`permissions.ts:47`) enumerates all valid permission strings. By widening the parameter to `string`, the compiler will not catch typos such as `hasPermission(user, "module.crm.leads")` (wrong key) or `hasPermission(user, "page.admin")` (non-existent key). Every call-site in the codebase that passes a `PERMISSIONS.*` value works fine, but the type erasure removes the safety net entirely. The same issue affects `hasAnyPermission`.

**Proper fix:**
```ts
export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: Permission   // narrowed
): boolean {
```
and
```ts
export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissions: Permission[]
): boolean {
```

---

### P3 — Low

---

#### AUT-12 · `AuthStatusScreen` shows a spinner animation even for `RequirePermission` (dead as noted in AUT-04) — misleading component name

- **File:** `src/modules/auth/guards.tsx:8-23`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
function AuthStatusScreen({ title, description }: AuthStatusScreenProps) {
  return (
    // ... always shows an animated spinner
    <div className="mx-auto h-10 w-10 animate-spin rounded-full ..." />
```

**Why it is wrong:**
The spinner conveys "loading". But `RequirePermission`'s use of it (when/if it were reachable) would only ever be called once at startup — the spinner would flash and immediately redirect. After fixing AUT-04, this component is only used for two legitimate loading states. The name `AuthStatusScreen` is generic enough to be reused incorrectly. Minor concern only.

**Proper fix:** Rename to `AuthLoadingScreen` to make the "loading" intent explicit and avoid future misuse.

---

#### AUT-13 · `ROLE_MASTER` is a magic string with no constant defined

- **File:** `src/modules/auth/permissions.ts:73`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
if (user.roles?.includes("ROLE_MASTER")) {
  return true;
}
```

**Why it is wrong:**
`PERMISSIONS` is a carefully typed const object, yet the super-admin role check uses a raw string literal. If the backend renames this role, a search for `"ROLE_MASTER"` might miss usages. Minor, but inconsistent with the surrounding code's approach to constants.

**Proper fix:**
```ts
const ROLES = {
  MASTER: "ROLE_MASTER",
} as const;

if (user.roles?.includes(ROLES.MASTER)) {
```

---

#### AUT-14 · `MODULE_PERMISSION_MAP` is declared but never used in the codebase

- **File:** `src/modules/auth/permissions.ts:49-66`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export const MODULE_PERMISSION_MAP: Record<string, Permission> = {
  crm: PERMISSIONS.MODULE_CRM,
  inventory: PERMISSIONS.MODULE_INVENTORY,
  // ... 14 entries
};
```

**Why it is wrong:**
A grep across the entire `src/` tree finds no import or reference to `MODULE_PERMISSION_MAP`. It is exported dead code. Its existence suggests it was intended for a route-based permission resolver that was never implemented, or a refactor that extracted `resolveModulePermission` as an internal function instead.

**Proper fix:** Remove the export or, if it is intended for a future feature, add a comment explaining its purpose so it is not silently deleted.

---

#### AUT-15 · `getDefaultAuthorizedPath` does not include `crm/contacts` in its candidate list

- **File:** `src/modules/auth/permissions.ts:102-126`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code:**
```ts
const candidates: Array<{ path: string; permission: Permission }> = [
  // ...
  { path: "/crm/leads", permission: PERMISSIONS.PAGE_CRM_LEADS },
  { path: "/crm/accounts", permission: PERMISSIONS.PAGE_CRM_ACCOUNTS },
  { path: "/crm/presales", permission: PERMISSIONS.PAGE_CRM_PRESALES },
  { path: "/crm/opportunities", permission: PERMISSIONS.PAGE_CRM_OPPORTUNITIES },
  // ← PAGE_CRM_CONTACTS ("page.crm.contacts") missing
```

**Why it is wrong:**
`PERMISSIONS.PAGE_CRM_CONTACTS` is defined (`permissions.ts:22`) and presumably there is a CRM contacts route, but it is excluded from `getDefaultAuthorizedPath`. A user with only `page.crm.contacts` permission would fall through all candidates and land on `/access/request` as the default — even though they have valid access to a page.

**Proper fix:**
Add the missing entry:
```ts
{ path: "/crm/contacts", permission: PERMISSIONS.PAGE_CRM_CONTACTS },
```
Audit all `PERMISSIONS.PAGE_*` entries to ensure all authorized pages are covered in the candidates list.

---

## Redundancy

| Clone pair | Nature |
|---|---|
| `page.tsx:20-29` ↔ `guards.tsx:25-42` | `getRedirectPath` copy-pasted with different signature and hardcoded fallback. Body is functionally identical (state cast + from reconstruction). |

No other intra-module or cross-module duplicates found at significant scale. The `useCurrentUser({ enabled: hasStoredSession() })` pattern repeated in `access/page.tsx`, `users/page.tsx`, `integrations/page.tsx`, `recruitment/IntakePage.tsx`, and `recruitment/OpenPositionsPage.tsx` is repetitive but is a call-site pattern, not a duplicated helper — acceptable as-is.

---

## Tests & Gaps

**Test coverage: zero.** There are no test files anywhere in the repository (`*.test.*`, `*.spec.*` — confirmed by find). Despite `vitest` or `jest` being absent from `package.json` scripts and devDependencies, `react-hook-form` is installed (for `src/components/ui/form.tsx`) and none of the auth logic is exercised by automated tests.

Critical untested paths:
- `hasPermission` with `ROLE_MASTER`, wildcard module fallback, and legacy page permission chains.
- `getDefaultAuthorizedPath` candidate-walk order (priority of paths matters).
- `PublicOnlyRoute` / `ProtectedRoute` rendering behavior on error vs. success states.
- Token refresh race condition in `api-client.ts` (the `refreshSessionPromise` singleton).
- OTP resend while a previous request is in-flight.

---

## Coverage Note

**Fully inspected:**
- All 7 files in `src/modules/auth/` (761 lines total, every line read).
- `src/services/api-client.ts` (the token storage and refresh logic that auth module depends on).
- `src/modules/access/page.tsx` (the one cross-module file that hand-writes the `authKeys` query key).
- `src/modules/visitor management/services/authService.ts` and `apiConfig.ts` (parallel auth system).
- `src/app/router.tsx` (guard nesting confirming AUT-04 dead code).

**Skimmed:**
- Other consumer modules (`users/page.tsx`, `integrations/page.tsx`, etc.) — only the imports from `@/modules/auth/*` were reviewed, not their full content.
- `visitor management` sub-module beyond `authService.ts` and `apiConfig.ts` — that module is a separate embedded app and warrants its own audit.

**Overall confidence: High** for findings within `src/modules/auth/`. AUT-15 (missing contacts candidate) is marked Medium because there may be an intentional routing reason for the omission not visible from the source alone.

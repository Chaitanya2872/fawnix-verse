# visitor-management — Module Audit

**Date:** 2026-07-14
**Auditor:** Claude Code (Sonnet 4.6)
**Scope:** `src/modules/visitor management/` (path contains a space; all shell references require quoting)

---

## Summary

The visitor-management module is a fully self-contained mini-app (own `main.tsx`, `App.tsx`, login flow, layout, routing) that is lazy-loaded into the monorepo router at the `/vms/*` path prefix. Its core purpose is the full visitor lifecycle: registration, multi-angle face capture, QR-based desk check-in, and operational reporting. The module is architecturally coherent and recent rewrites have produced well-structured pages, but it carries several serious reliability and security risks: server-side action errors (403, 500) are silently discarded whenever a visitor exists in the localStorage cache; a hardcoded live ngrok URL is the production fallback API base; the `VisitorVerification` and `ValidationDetails` face-match UI returns a fake "96%" confidence score without invoking `faceCaptureService.verifyFace`; and the Settings page shows a "save" confirmation toast while persisting nothing. The module uses no TanStack Query — all remote state is managed with custom `useEffect`/`useState` hooks, which is acceptable but leaves data inconsistent across concurrent pages and requires full page refreshes. A parallel legacy component set (`components/common/`, `utils/visitorUtils.ts`, CSS-based pages) co-exists with the newer Tailwind/Shadcn components, with several functions duplicated in both.

---

## Surface Map

### Routes

| Path | Component | Notes |
|---|---|---|
| `/vms/` | `→ /vms/dashboard` | redirect |
| `/vms/login` | `Login` (`loginpage.tsx`) | public, CSS-based |
| `/vms/dashboard` | `Dashboard` | Tailwind |
| `/vms/visitors` | `VisitorRequests` | full CRUD table |
| `/vms/visitors/new` | `CreateVisitor` | form |
| `/vms/visitors/:id` | `VisitorDetails` | profile + actions |
| `/vms/approvals` | `Approvals` | filtered pending queue |
| `/vms/desk` | `CheckInOut` | face verify + actions |
| `/vms/history` | `VisitorHistory` | completed/rejected |
| `/vms/reports` | `Reports` | analytics |
| `/vms/settings` | `Settings` | UI-only (no persistence) |
| `/vms/face-registration` | `FaceCapture` | multi-pose camera |
| `/vms/face-registration/:id` | `FaceCapture` | same page, param optional |
| Legacy redirects (8) | `Navigate` components | `visitor-verification`, `check-in-out`, etc. |

### Services / Data Layer

| File | Purpose |
|---|---|
| `services/apiConfig.ts` | Single `API_BASE_URL` export with ngrok fallback |
| `services/authService.ts` | Login, token storage, `authFetch` wrapper |
| `services/visitorRequestService.ts` | All CRUD operations; localStorage offline layer |
| `services/flowService.ts` | localStorage read/write for visitor cache |
| `services/faceCaptureService.ts` | Face upload + multi-endpoint verify |
| `services/validationService.ts` | QR verify endpoint (thin wrapper; not used by main desk flow) |
| `services/visitorService.ts` | Dead: only `createVisitor`, nothing imports it |

### Hooks

| File | Exports |
|---|---|
| `hooks/useVisitors.ts` | `useVisitors`, `useVisitor`, `useVisitorActions` |

### Utilities

| File | Exports | Status |
|---|---|---|
| `utils/visitorWorkflow.ts` | Full typed util set (format, status, stats, CSV) | Active |
| `utils/visitorUtils.ts` | Duplicates of same functions, untyped | Legacy |

### Components

| Layer | Components |
|---|---|
| `components/vms/` | `VisitorTable`, `VisitorActionDialog`, `BadgePreview`, `StatusPill`, `VmsPage`/`VmsCard`/`VmsCardHeader`/`EmptyState` |
| `components/common/` | `Alert`, `Button`, `ConfirmDialog`, `Icons`, `Input`, `Modal`, `StatusBadge`, `Table` |
| `components/layout/` | `Header`, `Sidebar`, `Navbar` (Navbar is dead — not imported anywhere) |

---

## Findings

### P0 — Critical

---

#### VIS-01 — Server errors (403, 500) silently discarded when visitor is in cache

**File:** `src/modules/visitor management/services/visitorRequestService.ts:267-274`, `280-296`, `310-316`, `360-367`, `381-389`
**Severity:** P0 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// approve catch block (line 267):
const found = getCachedVisitor(id);
if (!found && !isNetworkError(err)) throw err;   // <-- only throws if found is null
// when found is truthy: ANY server error (403 Forbidden, 500 Internal, 409 Conflict)
// is silently swallowed; localStorage is updated as if the action succeeded
flowService.updateVisitor(id, { status: "Approved" });
```

**Why wrong:** If the backend returns 403 (permission denied) or 500 for an approve/reject/checkIn/checkOut, and the visitor exists in the local cache, the condition `!found && !isNetworkError(err)` is `false && true = false` — the error is never re-thrown. localStorage is updated to "Approved"/"Checked In" optimistically. The next full page load may show a stale status, or the visitor may appear admitted while the backend rejected the operation. This applies to all five mutating methods.

**Fix:** Separate network-only fallback from error suppression. Only perform the offline fallback when it is genuinely a network error:
```ts
catch (err) {
  if (!isNetworkError(err)) throw err;   // always propagate HTTP errors
  const found = getCachedVisitor(id);
  if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err });
  console.warn("[offline] approve -> localStorage");
  flowService.updateVisitor(id, { status: "Approved" });
  return { ...found, status: "Approved" };
}
```

---

#### VIS-02 — Hardcoded live ngrok URL as production API fallback

**File:** `src/modules/visitor management/services/apiConfig.ts:1`
**Severity:** P0 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const fallbackBaseUrl = "https://5d7e-122-164-68-247.ngrok-free.app";
```

**Why wrong:** ngrok free-tier tunnels expire and are regenerated per session. When `VITE_API_BASE_URL` is not set (e.g., a CI preview build, staging, or a fresh local dev session), every API call silently falls through to a tunnel that may already be dead, or worse — points to an entirely different developer's machine after the original URL is recycled by ngrok. This can cause data leaks or auth token submissions to a third party.

**Fix:** Remove the fallback entirely. Throw at startup if the env var is absent in non-development builds:
```ts
const envUrl = import.meta?.env?.VITE_API_BASE_URL;
if (!envUrl?.trim()) {
  throw new Error("VITE_API_BASE_URL is required. Add it to your .env file.");
}
export const API_BASE_URL = envUrl.trim().replace(/\/$/, "");
```

---

#### VIS-03 — Fake face-match result: VisitorVerification.tsx returns hardcoded "96%" confidence

**File:** `src/modules/visitor management/pages/VisitorVerification/VisitorVerification.tsx:111-113`
**Severity:** P0 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// runFaceMatch() — never calls faceCaptureService.verifyFace
const runFaceMatch = () => {
  if (selectedVisitor.photo || selectedVisitor.faceRegistered) {
    setFaceResult({ type: "success", title: "Face match verified",
      message: "Live preview matches the registered photo.", score: "96%" });
  } else {
    setFaceResult({ type: "error", ..., score: "0%" });
  }
};
```

Same fake result in `ValidationDetails.tsx:121-124`. The function does not invoke `faceCaptureService.verifyFace`. It simply checks whether a photo exists and always returns success with a hardcoded 96% confidence. Security staff are being shown a fabricated green check — this is a security control bypass.

**Why wrong:** The page visually presents itself as performing live face verification but only checks a boolean flag. Any visitor with a photo on file will "pass" face verification unconditionally.

**Fix:** Replace both `runFaceMatch` implementations with the async call used correctly in `CheckInOut.tsx:137-168`:
```ts
const runFaceMatch = async () => {
  const imageBase64 = captureLiveFrame();
  if (!imageBase64) { /* error */ return; }
  stopCamera();
  setFaceMode("verifying");
  try {
    const result = await faceCaptureService.verifyFace({
      requestId: selectedVisitor.id,
      imageBase64,
      qrCodeData: selectedVisitor.qrCodeData,
      visitorId: selectedVisitor.visitorId,
    });
    setFaceResult({ type: "success", score: `${result.confidence ?? "?"}%`,
      title: "Face match verified", message: result.message });
  } catch (err) {
    setFaceResult({ type: "error", title: "Verification failed",
      message: err instanceof Error ? err.message : "Face did not match.", score: "0%" });
  }
};
```

---

#### VIS-04 — Offline auth bypass: any username/password accepted when server is unreachable

**File:** `src/modules/visitor management/services/authService.ts:54-67`
**Severity:** P0 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// On network error, ANY credentials succeed:
const demoUser = {
  token: "offline-demo-token",
  username,
  role: "ADMIN",    // always ADMIN
  offline: true,
};
localStorage.setItem(TOKEN_KEY, demoUser.token);
```

**Why wrong:** If the VPN drops or the server is momentarily unreachable, any employee (or attacker on the LAN) can sign in as ADMIN using any username/password. The "offline-demo-token" string is sent as a Bearer token on subsequent requests — the `authFetch` wrapper adds it to every call. Should the server come back online while the tab is open, requests will be sent with this fake token, likely resulting in 401s which then redirect to login — but in the meantime, the user has full UI access.

**Fix:** Remove the offline login fallback entirely. The login page should always require a live authentication response. If offline support is a genuine product requirement, document it and gate it with an explicit feature flag, never silently:
```ts
// Remove lines 54-68 entirely; just rethrow the error
if (err instanceof TypeError && err.message === "Failed to fetch") {
  throw new Error("Cannot reach the authentication server. Check your connection.");
}
throw err;
```

---

### P1 — High

---

#### VIS-05 — Settings page shows "saved" toast but persists nothing

**File:** `src/modules/visitor management/pages/Settings/Settings.tsx:26-29`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const saveSettings = () => {
  setSaved(true);
  window.setTimeout(() => setSaved(false), 2400);
};
```

**Why wrong:** There is no `localStorage.setItem`, no API call, no state persistence of any kind. The settings toggles are purely ephemeral — refreshing the page resets all values to `initialSettings`. Users (and security admins) believe they have configured "Approval gate" or "Face verification required" behavior, but these settings have zero effect on the actual application.

**Fix:** Persist to `localStorage` at minimum, or ideally `PUT /api/settings` to the backend. At least display a warning that settings are session-only until a backend endpoint exists:
```ts
const saveSettings = () => {
  localStorage.setItem("vms_settings", JSON.stringify(settings));
  setSaved(true);
  window.setTimeout(() => setSaved(false), 2400);
};
// Load on mount:
const [settings, setSettings] = useState<SettingsState>(() => {
  try {
    const raw = localStorage.getItem("vms_settings");
    return raw ? { ...initialSettings, ...JSON.parse(raw) } : initialSettings;
  } catch { return initialSettings; }
});
```

---

#### VIS-06 — 401 redirect lands on `/login` instead of `/vms/login`

**File:** `src/modules/visitor management/services/authService.ts:28`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
window.location.href = "/login";   // should be VMS_PATHS.login or "/vms/login"
```

**Why wrong:** When a request returns 401, the user is sent to `/login` which is the monorepo's root login page (or a 404), not the VMS login page at `/vms/login`. The user loses their session context and gets a broken page.

**Fix:**
```ts
import { VMS_PATHS } from "../routes/paths";
// ...
window.location.href = VMS_PATHS.login;   // "/vms/login"
```

---

#### VIS-07 — `refresh()` in `useVisitors` silently fails without setting `loading = true`

**File:** `src/modules/visitor management/hooks/useVisitors.ts:16-21`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const refresh = useCallback(async () => {
  setError(null);                           // <-- no setLoading(true)
  const data = await visitorRequestService.getAll(filter);
  setVisitors(data as VisitorRecord[]);
  return data as VisitorRecord[];
}, [filter]);
```

**Why wrong:** Pages like `Approvals.tsx` disable the Refresh button using `disabled={loading}`, but `loading` stays `false` during a manual refresh. The button appears active throughout the network call, and if clicked again rapidly, multiple concurrent requests will race. Additionally, if `getAll` throws, the error is not caught — it propagates as an unhandled promise rejection and the page's error state is never set. Pages that `await refresh()` inside `useVisitorActions.onComplete` will also silently swallow errors.

**Fix:**
```ts
const refresh = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await visitorRequestService.getAll(filter);
    setVisitors(data as VisitorRecord[]);
    return data as VisitorRecord[];
  } catch (err) {
    setError(getErrorMessage(err, "Could not refresh visitors."));
    return [] as VisitorRecord[];
  } finally {
    setLoading(false);
  }
}, [filter]);
```

---

#### VIS-08 — URL query param `filter` is not URL-encoded in `getAll`

**File:** `src/modules/visitor management/services/visitorRequestService.ts:172`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const url = filter
  ? `${API_BASE_URL}/api/visitor-requests?filter=${filter}`  // not encoded
  : `${API_BASE_URL}/api/visitor-requests`;
```

**Why wrong:** If `filter` ever contains special characters (spaces, `&`, `=`, `+`) the URL will be malformed or will inject additional query parameters. The `search` method on line 228 correctly uses `encodeURIComponent` for its keyword, making this inconsistency likely to persist as junior devs copy the pattern from `getAll`.

**Fix:**
```ts
const url = filter
  ? `${API_BASE_URL}/api/visitor-requests?filter=${encodeURIComponent(filter)}`
  : `${API_BASE_URL}/api/visitor-requests`;
```

---

#### VIS-09 — Dead code: `PhotoSaved.tsx` and `VisitorDetailsSaved.tsx` navigate to non-existent routes

**File:** `src/modules/visitor management/pages/PhotoSaved/PhotoSaved.tsx:16-17`
**File:** `src/modules/visitor management/pages/VisitorDetailsSaved/VisitorDetailsSaved.tsx:16-17`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// PhotoSaved.tsx:16
navigate("/visitor-validation")  // hits the catch-all -> /vms/dashboard
navigate("/dashboard")            // also wrong, should be /vms/dashboard

// VisitorDetailsSaved.tsx:16
navigate("/face-capture")         // caught by legacy redirect -> /vms/face-registration (ok by luck)
navigate("/dashboard")            // wrong
```

**Why wrong:** Neither page is registered in `AppRoutes.tsx` (they have no `<Route>` entry). The `VMS_LEGACY_REDIRECTS` list redirects their paths to current routes, but neither page navigates to its own registered path — the buttons simply navigate to bare paths that land on the catch-all `<Navigate to={VMS_PATHS.dashboard} replace />`. These pages are dead code serving no navigation purpose.

**Fix:** Delete both pages entirely; add any needed success confirmation to the flow that previously relied on them. If they must remain, use `VMS_PATHS.*` constants and register them in `AppRoutes.tsx`.

---

#### VIS-10 — `CameraCapture.tsx` has 233 lines of commented-out code above the live implementation

**File:** `src/modules/visitor management/pages/FaceCapture/CameraCapture.tsx:1-235`
**Severity:** P1 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// Lines 1–235: entire previous implementation commented out with // prefix
// import { useEffect, useRef, useState } from "react";
// ...
// export default CameraCapture;
import { useEffect, useRef, useState } from "react"; // line 236: live code starts
```

**Why wrong:** 233 lines of dead commented-out code precede the live implementation in the same file. This makes the file 554 lines total. Junior devs may edit the commented block believing it is active. File review diffs are polluted. This is clearly a copy-paste migration artifact, not intentional documentation.

**Fix:** Delete lines 1–235 (the block-commented prior implementation). Version control preserves history if needed.

---

### P2 — Medium

---

#### VIS-11 — `approve`/`reject` write localStorage BEFORE confirming server success

**File:** `src/modules/visitor management/services/visitorRequestService.ts:262-265`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
// In the try block (success path):
const data = await handleResponse(res);
const visitor = normalize(data);
flowService.updateVisitor(id, { status: "Approved" });   // updated before checking data
return visitor;
```

**Why wrong:** `handleResponse` can throw if the response body is not JSON, but localStorage is already mutated. If the server returns a 200 with a non-JSON body (e.g., HTML error page from a proxy), `normalize` will receive an empty object `{}`, visitor fields will be undefined, but localStorage will show "Approved". Move the localStorage update after the visitor is successfully normalized.

---

#### VIS-12 — `getById` has unreachable `return found` after unconditional throw

**File:** `src/modules/visitor management/services/visitorRequestService.ts:219-220`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
} catch (err) {
  const found = getCachedVisitor(id);          // line 211 — may be null
  if (found) {
    console.warn("[cache] getById -> localStorage/current visitor");
    return found;                              // only path that returns found non-null
  }
  if (!isNetworkError(err)) throw err;         // throws non-network errors
  console.warn("[offline] getById -> localStorage");
  if (!found) throw new Error(`Visitor ${id} not found.`, { cause: err }); // always true
  return found;                                // DEAD — `found` is always null here
}
```

**Why wrong:** The `return found` on the last line can never execute. At that point `found` is `null` (because the `if (found) { return }` already handled the non-null case) and the prior `if (!found) throw` always throws. This is dead code that gives the false impression there is a valid return path.

**Fix:** Remove the dead `return found` line. Make the intent explicit:
```ts
if (!isNetworkError(err)) throw err;
throw new Error(`Visitor ${id} not found in local cache.`, { cause: err });
```

---

#### VIS-13 — `VisitorStatus` type uses `| string` escape hatch defeating type safety

**File:** `src/modules/visitor management/types.ts:3-12`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
export type VisitorStatus =
  | "Pending" | "Approved" | "Rejected" | "Cancelled"
  | "Checked In" | "Checked Out" | "Completed" | "Arrived"
  | string;   // <-- this makes the union = string
```

**Why wrong:** `"Pending" | string` is exactly equivalent to `string`. TypeScript collapses the literal types, meaning `StatusPill`, `normalizeStatus`, and all status comparisons receive no type checking benefit. A typo like `"Approvd"` or a new backend status will never be caught at compile time.

**Fix:** Remove `| string` from the union. Handle unknown statuses at the normalization boundary in `visitorRequestService.ts normalize()`:
```ts
export type VisitorStatus =
  | "Pending" | "Approved" | "Rejected" | "Cancelled"
  | "Checked In" | "Checked Out" | "Completed" | "Arrived";
```

---

#### VIS-14 — Entire `services/visitorRequestService.ts` is untyped (implicit `any` throughout)

**File:** `src/modules/visitor management/services/visitorRequestService.ts`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

Functions `isNetworkError`, `resolveStatus`, `normalize`, `handleResponse`, `isLocalOnlyVisitor`, `getCachedVisitor`, `mergeLocalOnlyVisitors`, `localStats`, and all service methods have no parameter types. TypeScript treats all parameters as `implicit any`, which means:
- `normalize(req)`: `req` is `any`; accessing undefined fields silently returns `undefined`
- `getCachedVisitor(id)`: `id` is `any`
- `localStats(visitors)`: `visitors` is `any`

No compile-time protection for backend response shape changes.

**Fix:** Define a `BackendVisitorRequest` interface for the raw API shape and type all private helpers:
```ts
interface BackendVisitorRequest {
  id: number;
  visitorFullName?: string;
  status?: string;
  arrived?: boolean;
  // ... etc.
}

const normalize = (req: BackendVisitorRequest): VisitorRecord => ({ ... });
```

---

#### VIS-15 — `visitorService.ts` is dead code: never imported anywhere

**File:** `src/modules/visitor management/services/visitorService.ts`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const visitorService = {
  createVisitor: async (data) => { ... }  // hits /visitors (wrong endpoint)
};
export default visitorService;
```

`visitorRequestService.create` (which uses `/api/visitor-requests`) handles creation. `visitorService.createVisitor` calls the bare `/visitors` endpoint (missing `/api/` prefix) and has an untyped `data` parameter. No file in the module imports it.

**Fix:** Delete the file.

---

#### VIS-16 — `index-as-key` used for decorative QR grid spans in 3 places

**File:** `src/modules/visitor management/pages/VisitorVerification/VisitorVerification.tsx:176`
**File:** `src/modules/visitor management/pages/CheckInOut/CheckInOut.tsx:239`
**File:** `src/modules/visitor management/pages/VisitorValidation/ValidationDetails.tsx:179`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```tsx
{Array.from({ length: 25 }).map((_, i) => <span key={i} />)}   // VisitorVerification.tsx:176
{Array.from({ length: 25 }).map((_, index) => (                // CheckInOut.tsx:239
  <span key={index} ... />
))}
```

**Why wrong:** These 25 `<span>` elements are a static decorative grid (fake QR pattern). The index key anti-pattern is used, but since the array is static and never reordered this is acceptable in terms of runtime correctness. However, it indicates the pattern was cargo-culted. More importantly, the same decorative grid is copy-pasted three times. Extract to a `<QrPlaceholder />` component.

---

#### VIS-17 — Untyped params in `utils/visitorUtils.ts`; duplicate of `visitorWorkflow.ts`

**File:** `src/modules/visitor management/utils/visitorUtils.ts`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
export const normalizeStatus = (visitor) => { ... }   // visitor: any
export const getVisitorStats = (visitors) => { ... }  // visitors: any
export const formatDateTime = (date = new Date()) =>  // always takes a Date, not a string
export const initials = (name = "Visitor") => { ... }
```

`visitorWorkflow.ts` contains typed equivalents of all four functions. `visitorUtils.ts` is imported only by `VisitorVerification.tsx` (line 8) and `ValidationDetails.tsx` (line 7). The `formatDateTime` signature differs — it takes a `Date` while `visitorWorkflow.formatDateTime` takes `string | null` — so callers that pass ISO strings to `visitorUtils.formatDateTime` pass the string to `new Intl.DateTimeFormat().format()` which will coerce it incorrectly on some runtimes.

**Fix:** Migrate both pages to import from `visitorWorkflow.ts` and delete `visitorUtils.ts`.

---

#### VIS-18 — `Navbar.tsx` is dead code (unused layout component)

**File:** `src/modules/visitor management/components/layout/Navbar.tsx`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

`Navbar` is never imported anywhere. `MainLayout.tsx` imports `Header` and `Sidebar`. `Navbar.tsx` contains a hardcoded "Admin" user chip and non-functional notification button.

**Fix:** Delete the file.

---

#### VIS-19 — Common component set (`common/Button`, `common/Input`, `common/Modal`, `common/ConfirmDialog`, `common/Table`) largely unused

**File:** `src/modules/visitor management/components/common/`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

`Alert`, `Icons`, and `StatusBadge` from `components/common/` are used by the three legacy-style pages (`CameraCapture`, `VisitorVerification`, `ValidationDetails`). `Button`, `Input`, `Modal`, `ConfirmDialog`, and `Table` have no imports in the module at all — all newer pages use Shadcn's `@/components/ui/*` instead.

**Fix:** Delete unused common components (`Button.tsx`, `Input.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `Table.tsx`). The remaining three (`Alert`, `Icons`, `StatusBadge`) should be migrated when the legacy pages are refactored to the Tailwind/Shadcn pattern.

---

#### VIS-20 — `CameraCapture.tsx` has 17 `useState` calls; 554 lines total

**File:** `src/modules/visitor management/pages/FaceCapture/CameraCapture.tsx:256-271`
**Severity:** P2 **Confidence:** Med
**Owner:** Vaishnavi Nerella

```ts
const [mode, setMode] = useState("idle");           // untyped string
const [poseIndex, setPoseIndex] = useState(0);
const [captures, setCaptures] = useState<Record<string, string>>({});
const [preview, setPreview] = useState(null);       // null, not typed
const [alert, setAlert] = useState(null);           // null, not typed
const [starting, setStarting] = useState(false);
const [saving, setSaving] = useState(false);
const [uploadProgress, setUploadProgress] = useState(null);  // null, not typed
const [currentVisitor, setCurrentVisitor] = useState(() => flowService.getCurrentVisitor());
// + useEffect, video/canvas/file/stream refs
```

This component handles: camera lifecycle, multi-pose capture, file upload fallback, upload progress tracking, visitor display, alert display, and navigation. It reads from `flowService` (global mutable localStorage) to discover the current visitor, bypassing the route params (the `id` param from the parent `FaceCapture.tsx` is never passed to `CameraCapture`).

**Fix:** Split into `CameraPanel`, `PoseChecklist`, and `VisitorSidePanel`. Pass the visitor as a prop from `FaceCapture.tsx` (which already loads it via `useVisitor(id)`) instead of reading from `flowService` again.

---

#### VIS-21 — `VisitorRecord.id` typed as `string | number` causes repeated `String(id)` noise

**File:** `src/modules/visitor management/types.ts:15`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
export type VisitorRecord = {
  id: string | number;   // forces String(id) at every comparison site
  visitorId?: string;
  // ...
```

Every comparison in `flowService.ts`, `visitorRequestService.ts`, and hooks uses `String(id)` to normalize. The backend returns numeric IDs; the field should be typed as `number` with a display-only `visitorId: string` for the formatted "VISITOR_123" string. This dual-type proliferates defensive string coercions throughout the codebase.

---

#### VIS-22 — `VisitorVerification.tsx` navigates to bare `/face-registration` (non-VMS path)

**File:** `src/modules/visitor management/pages/VisitorVerification/VisitorVerification.tsx:147`
**Severity:** P2 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const goRegisterFace = () => {
  if (selectedVisitor) flowService.setCurrentVisitor(selectedVisitor);
  navigate("/face-registration");    // should be VMS_PATHS.faceRegistration = "/vms/face-registration"
};
```

The legacy redirect at `/vms/face-capture → /vms/face-registration` does not cover `/face-registration` (no VMS prefix). This navigates outside the VMS app entirely and will 404 or land on the monorepo catch-all.

**Fix:**
```ts
navigate(VMS_PATHS.faceRegistration);
```

---

### P3 — Low

---

#### VIS-23 — Demo credentials visually displayed in production login UI

**File:** `src/modules/visitor management/pages/Login/loginpage.tsx:7, 196-202`
**Severity:** P3 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const DEMO = { username: "admin", password: "secret" };
// ...
<div className="login-demo-box-creds">admin&nbsp;/&nbsp;secret</div>
<button type="button" className="login-demo-fill" onClick={fillDemo}>Fill</button>
```

Demo credentials are hardcoded and displayed on the login form. Even if this is a development convenience, shipping this to staging or production gives anyone visiting `/vms/login` one-click access.

**Fix:** Gate the demo box behind `import.meta.env.DEV` or remove it entirely.

---

#### VIS-24 — `ngrok-skip-browser-warning` header baked into every production request

**File:** `src/modules/visitor management/services/authService.ts:18, 41`
**Severity:** P3 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
"ngrok-skip-browser-warning": "true",
```

This header exists solely to bypass ngrok's interstitial page. Sending it to a real production backend is harmless but unnecessary noise. It also signals that the API base URL config (VIS-02) was never properly set up for production.

**Fix:** Remove once the ngrok fallback URL is removed (VIS-02 fix). If ngrok must be retained for dev, add this header only in development:
```ts
...(import.meta.env.DEV && { "ngrok-skip-browser-warning": "true" }),
```

---

#### VIS-25 — `Header.tsx` duplicates route-to-title mapping; VMS_PATHS changes break it silently

**File:** `src/modules/visitor management/components/layout/Header.tsx:5-15`
**Severity:** P3 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const routeTitles: Record<string, [string, string]> = {
  "/vms/dashboard":         ["Dashboard",         "Today's overview..."],
  "/vms/visitors/new":      ["New Visitor",        ...],
  // etc. — hardcoded strings, not derived from VMS_PATHS
};
```

This object lists 9 route paths as raw strings. Each page component also declares its own `title` and `description` inside `VmsPage`. Adding a route requires updating both `AppRoutes.tsx` and `Header.tsx`. When a path changes in `VMS_PATHS`, the header silently falls back to "Visitor Management".

**Fix:** Remove the `routeTitles` map. The `VmsPage` component already renders the title/description in the page header area; the topbar should just show the module name.

---

#### VIS-26 — 23 `console.log`/`console.warn`/`console.error` calls will appear in production

**File:** Multiple files across the module
**Severity:** P3 **Confidence:** High
**Owner:** Vaishnavi Nerella

Notable production `console.log` calls:
- `CameraCapture.tsx:391`: logs full API response for face upload on every pose
- `ValidationDetails.tsx:74`: logs QR verification response including visitor PII
- `ValidationDetails.tsx:97`, `151`: logs action errors

The `console.warn` calls in service fallback paths are intentional tracing and are acceptable, but raw `console.log` with API response bodies exposes visitor PII in browser dev tools in production.

**Fix:** Remove `console.log` calls that log API response bodies. The `console.warn` tracing in offline paths may be retained but should be guarded by a debug flag in a production build.

---

#### VIS-27 — `Sidebar.tsx` hardcodes all nav paths as string literals instead of `VMS_PATHS`

**File:** `src/modules/visitor management/components/layout/Sidebar.tsx:4-12`
**Severity:** P3 **Confidence:** High
**Owner:** Vaishnavi Nerella

```ts
const navItems = [
  { to: "/vms/dashboard",   label: "Dashboard",   ... },
  { to: "/vms/visitors/new", label: "New Visitor", ... },
  // ...
];
```

All 8 nav entries use raw string literals. `VMS_PATHS` is not imported. If `VMS_BASE_PATH` changes (or the module is hosted at a different prefix), the sidebar will silently break.

**Fix:** Import and use `VMS_PATHS`:
```ts
import { VMS_PATHS } from "../../routes/paths";
const navItems = [
  { to: VMS_PATHS.dashboard, label: "Dashboard", ... },
  // ...
];
```

---

## Redundancy

Concrete clone pairs within this module:

| Finding | Location A | Location B | Description |
|---|---|---|---|
| R-01 | `utils/visitorUtils.ts:1-7` (`normalizeStatus`) | `utils/visitorWorkflow.ts:21-23` (`normalizeStatus`) | Same function, different signatures and behavior |
| R-02 | `utils/visitorUtils.ts:13-19` (`getVisitorStats`) | `utils/visitorWorkflow.ts:154-164` (`getVisitorStats`) | Duplicate stats computation; utils version is untyped |
| R-03 | `utils/visitorUtils.ts:21-25` (`formatDateTime`) | `utils/visitorWorkflow.ts:78-88` (`formatDateTime`) | Different signatures: `Date` vs `string \| null` |
| R-04 | `utils/visitorUtils.ts:27-33` (`initials`) | `utils/visitorWorkflow.ts:109-116` (`getInitials`) | Same logic, different function name |
| R-05 | `pages/VisitorVerification/VisitorVerification.tsx:10-29` (`getQrExpiryStatus`) | `pages/VisitorValidation/ValidationDetails.tsx:9-35` (`getQrExpiryStatus`) | Identical function, copy-pasted verbatim between two files |
| R-06 | `pages/CheckInOut/CheckInOut.tsx:461-467` (`function DetailRow`) | `pages/VisitorDetails/VisitorDetails.tsx:259-265` (`function DetailRow`) | Identical component body; different outer container class |
| R-07 | `pages/VisitorVerification/VisitorVerification.tsx:176` (QR grid) | `pages/CheckInOut/CheckInOut.tsx:237-239` (QR grid) | `Array.from({ length: 25 }).map((_, i) => <span key={i} />)` — identical decorative pattern |
| R-08 | `pages/VisitorVerification/VisitorVerification.tsx:176` (QR grid) | `pages/VisitorValidation/ValidationDetails.tsx:179` (QR grid) | Third copy of same QR placeholder |
| R-09 | `pages/PhotoSaved/PhotoSaved.tsx:3,8` (uses `VisitorValidation.css`) | `pages/VisitorDetailsSaved/VisitorDetailsSaved.tsx:3,8` (uses `VisitorValidation.css`) | Both dead-code pages use the same CSS from a sibling folder |
| R-10 | `services/visitorRequestService.ts:349-367` (`checkIn`) vs `373-389` (`checkOut`) | — | Identical structure differing only in endpoint path and status string; should be a single `performCheckAction(id, qrCodeData, direction)` |

---

## Tests & Gaps

**Test coverage:** Zero. No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files exist anywhere in the module.

Critical paths with no tests:
- `normalize()` in `visitorRequestService.ts` — mapping from raw backend shape to `VisitorRecord`; a single field rename in the API will silently produce empty UI fields
- `resolveStatus()` — the `arrived` flag logic that converts `APPROVED + arrived` to "Checked In"
- `getVisitWindowState()` — time-based eligibility for check-in; DST edge cases are untested
- Offline fallback behavior in all service methods — localStorage state mutations that override backend results
- `canApprove`, `canCheckIn`, `canCheckOut`, `canReject` — workflow gate functions; wrong output allows illegal state transitions

**Recommended first tests:**
1. Unit tests for `normalize()` with representative backend payloads (including null fields, backend status strings in various cases)
2. Unit tests for `resolveStatus()` covering all APPROVED/arrived combinations
3. Unit tests for `getVisitWindowState()` for before/during/after window edge cases

---

## Coverage Note

**Fully inspected:** All 56 TypeScript/TSX/CSS source files were read in full. Git authorship was checked for key files. All service functions were traced including their catch blocks.

**Skimmed:** `components/common/Button.tsx`, `components/common/Input.tsx`, `components/common/Modal.tsx`, `components/common/ConfirmDialog.tsx` — these were confirmed unused by grep and not read in full.

**Not inspected:** CSS files (`App.css`, `index.css`, `Login.css`, `CreateVisitor.css`, `FaceCapture.css`, `VisitorValidation.css`) — style bugs are out of scope for this audit.

**Not reachable:** The monorepo `src/app/router.tsx` confirms the module is lazy-loaded at `vms/*`. The module's own `main.tsx`/`App.tsx` suggest it was previously a standalone Vite app that was integrated. Whether `main.tsx` is still used as a standalone entry point or is dead is unclear from static analysis alone — it is not referenced from any monorepo import.

**Confidence overall:** High for correctness and security findings (P0/P1). High for redundancy (directly confirmed by grep). Medium for the god-component assessment of `CameraCapture` (the refactor recommendation is directional, not prescriptive).

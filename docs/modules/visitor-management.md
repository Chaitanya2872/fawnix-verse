# Visitor Management Module

The Visitor Management System (VMS) lives under:

```text
src/modules/visitor management/
```

The folder name contains a space. Quote the path in shell commands.

## Purpose

VMS manages the visitor lifecycle:

- Create visitor requests.
- Review and approve or reject requests.
- Register visitor photos.
- Verify QR codes.
- Check visitors in and out.
- Review visitor history and operational reports.
- Configure visitor settings.

## Routing

The ERP shell mounts VMS at:

```text
/vms/*
```

The route is protected by the main ERP auth guard and requires `module.vms` or
`ROLE_MASTER`.

VMS routes are defined in:

- `src/app/router.tsx`
- `src/modules/visitor management/routes/AppRoutes.tsx`
- `src/modules/visitor management/routes/paths.ts`

Current routes:

| Route | Page |
|---|---|
| `/vms` | Redirects to `/vms/dashboard` |
| `/vms/login` | VMS login component |
| `/vms/dashboard` | Dashboard |
| `/vms/visitors` | Visitor requests |
| `/vms/visitors/new` | Create visitor |
| `/vms/visitors/:id` | Visitor details |
| `/vms/approvals` | Approval queue |
| `/vms/desk` | Check-in/check-out desk |
| `/vms/history` | Visitor history |
| `/vms/reports` | Reports |
| `/vms/settings` | Settings |
| `/vms/face-registration` | Face registration |
| `/vms/face-registration/:id` | Face registration for a visitor |

Legacy route aliases redirect to the canonical paths. Keep new navigation on
the canonical paths in `paths.ts`.

## Module Structure

```text
visitor management/
  App.tsx
  routes/
    AppRoutes.tsx
    paths.ts
  pages/
    Dashboard/
    VisitorRequests/
    CreateVisitor/
    VisitorDetails/
    Approvals/
    CheckInOut/
    VisitorHistory/
    Reports/
    Settings/
    FaceCapture/
  components/
    vms/
    common/
    layout/
  hooks/
    useVisitors.ts
  services/
    apiConfig.ts
    authService.ts
    visitorRequestService.ts
    faceCaptureService.ts
    validationService.ts
    flowService.ts
  utils/
    visitorUtils.ts
    visitorWorkflow.ts
  types.ts
```

## Design System Usage

VMS pages should use the shared ERP design system instead of raw page-local card
and button styles.

Preferred VMS wrappers are in:

```text
src/modules/visitor management/components/vms/VmsPage.tsx
```

Use:

- `VmsPage` for page title, subtitle, top actions, and spacing.
- `VmsCard` and `VmsCardHeader` for module panels.
- `VmsMetricCard` for dashboard/report metrics.
- `VmsInfoTile` for compact details.
- `VmsAlert` for inline state messages.
- `VmsIconBadge` for icon containers.
- `vmsTextareaClassName` and `vmsSelectClassName` for form controls that do not
  yet have shared primitives.

Use shared UI primitives from `src/components/ui/` where available:

- `Button`
- `Card`
- `Dialog`
- `Input`
- `Label`

Use `cn()` from `src/lib/utils.ts` when composing class names.

Prefer semantic tokens:

- `bg-card`
- `text-card-foreground`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-muted`
- `bg-accent`
- `text-primary`
- `ring-ring`

Status-specific colors are acceptable for clear state communication, such as
approved, pending, rejected, checked in, and checked out.

## Data Flow

VMS uses fetch-based services rather than the shared axios client.

Main visitor service:

```text
src/modules/visitor management/services/visitorRequestService.ts
```

Main hooks:

```text
src/modules/visitor management/hooks/useVisitors.ts
```

Typical flow:

1. A page calls `useVisitors`, `useVisitor`, or `useVisitorActions`.
2. The hook calls `visitorRequestService`.
3. `visitorRequestService` calls VMS API endpoints through `authFetch`.
4. API responses are normalized into the frontend `VisitorRecord` shape.
5. `flowService` mirrors data to localStorage for continuity and offline demo use.

## API Configuration

VMS resolves its API base URL from:

```env
VITE_API_BASE_URL=
```

When this variable is empty, VMS calls relative endpoints:

```text
/api/visitor-requests
```

If `VITE_API_BASE_URL` ends with `/api`, VMS strips that suffix and still builds
paths like:

```text
<base>/api/visitor-requests
```

The outer ERP auth guard still uses the shared axios client configured by
`VITE_API_URL`. A VMS route may fail before VMS services run if `/api/auth/me`
cannot be reached.

## Main API Endpoints

`visitorRequestService` uses these endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/visitor-requests` | Create visitor request |
| `GET` | `/api/visitor-requests` | List visitor requests |
| `GET` | `/api/visitor-requests/{id}` | Get visitor details |
| `GET` | `/api/visitor-requests/search?keyword=...` | Search visitors |
| `GET` | `/api/visitor-requests/statistics` | Load dashboard statistics |
| `POST` | `/api/visitor-requests/{id}/approve` | Approve request |
| `POST` | `/api/visitor-requests/{id}/reject` | Reject request |
| `DELETE` | `/api/visitor-requests/{id}` | Delete request |
| `POST` | `/api/visitor-requests/verify-qr` | Verify QR code |
| `POST` | `/api/visitor-requests/{id}/check-in` | Check in visitor |
| `POST` | `/api/visitor-requests/{id}/check-out` | Check out visitor |

Face capture and validation services define additional endpoints in their
service files.

## Offline Demo Behavior

Some VMS services fall back to localStorage when the browser cannot reach the
server and the app is running in development mode. This fallback is intended for
local demos and UI work. It does not replace backend integration testing.

Fallback is enabled when:

- `import.meta.env.DEV` is true, or
- `VITE_VMS_DEMO_MODE=true`

Only true network failures use this fallback. HTTP errors still surface as errors.

## Troubleshooting

If VMS shows `Network Error`:

1. Check `VITE_API_URL`; the ERP auth guard uses it for `/api/auth/me`.
2. For local development, prefer `VITE_API_URL=/api`.
3. Confirm the gateway is running and reachable.
4. Confirm CORS allows the exact frontend origin and port.
5. Restart Vite after changing `.env`.
6. Confirm the signed-in user has `module.vms` or `ROLE_MASTER`.

If the page redirects to `/login`, the main ERP auth guard did not accept the
current session. Check the `fawnix.accessToken` and `fawnix.refreshToken` values
and the `/api/auth/me` response.

If VMS-specific data is missing but the shell loads, check the VMS fetch calls to
`/api/visitor-requests` and the localStorage fallback state.

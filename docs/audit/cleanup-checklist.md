# Cleanup Checklist

Actionable, low-risk cleanups. Each item is independently checkable. Grouped by area. This is
the "potential code cleanups" deliverable — none of these change behavior except where noted.

> Before deleting anything, confirm it is truly unused (grep for imports/routes). Items marked
> ⚠ change behavior or need a decision.

---

## Security (do first — see [security.md](./security.md))

- [ ] Rotate the two live Gemini keys; blank them in
      `ml/speech-to-text-service/.env.example`; purge from git history.
- [ ] Remove usable default secrets (`JWT_SECRET`, `INTERNAL_SERVICE_SECRET`,
      `DEV_ADMIN_PASSWORD=Admin@123`, `POSTGRES_PASSWORD=postgres`,
      `MINIO_ROOT_PASSWORD=minioadmin`); make them required at startup. ⚠
- [ ] Remove the ngrok fallback URL + `admin/secret` demo creds + `ngrok-skip-browser-warning`
      header from `src/modules/visitor management/`. ⚠
- [ ] Remove the VMS "offline demo" session forging in `authService.ts`. ⚠
- [ ] Add a secret scanner (gitleaks/trufflehog) to CI.

---

## Repository clutter (root)

- [ ] Move or delete the 4 UUID plan files (`*_plan.md`) — they're tracked in git root. If kept,
      move under `docs/`.
- [ ] Delete `.tmp-contact-modal-debug.png` (tracked debug screenshot).
- [ ] Remove `graphify-out/` from the repo and add it to `.gitignore` (tool output).
- [ ] Fix `.gitignore`: `.env` is listed **twice**; add `graphify-out/`, `*.tmp-*`, and confirm
      plan artifacts are ignored.
- [ ] Delete the legacy ESLint config `.eslintrc.cjs` (the flat `eslint.config.js` is the real
      one). ⚠ verify no tooling references it.
- [ ] Update the root `README.md` — it's still the default Vite template, not a project readme.

---

## Backend dead code / stubs

- [ ] Delete `backend/src/` — 53-file legacy monolith, not a Maven module, never compiled;
      also removes a committed `Admin@123`. ⚠ confirm nothing references it.
- [ ] Decide `hrms-service`'s fate: implement, or remove from gateway routes + compose + parent
      POM. ⚠
- [ ] Decide `analytics-service`'s fate: implement, or stop routing/registering the stub. ⚠
- [ ] Consolidate the two approval internal controllers (`InternalApprovalController` vs
      `InternalApprovalsController`). ⚠
- [ ] Rename residual `hirepath` defaults (e.g. `${RECRUITMENT_S3_BUCKET:hirepath}`).

---

## Frontend dead code

Confirm each is unimported before deleting:

- [ ] `src/app/layout.tsx` (unused stub; real shell is `components/layout/AppLayout.tsx`).
- [ ] `src/modules/sales/orders/{approvals,delivery,invoices,reports,returns}-page.tsx`
      (never imported; router `<Navigate>`s past them).
- [ ] `src/modules/crm/contacts/page.tsx` (no route; only its `hooks.ts` is used). ⚠
- [ ] `src/modules/purchases/page.tsx` + `shared.tsx` (`/purchases` → `/p2p`).
- [ ] Remove commented-out route imports in `src/app/router.tsx` (dashboard, accounting, old CRM).
- [ ] `src/modules/recruitment/TalentPoolPage.tsx` — replace the `mockPool` constant with a real
      API call, or remove the page. ⚠

---

## Frontend consistency (mechanical)

- [ ] Remove all **25 `"use client"`** directives (no-ops in Vite).
- [ ] Consolidate ~14 local `formatDate`/`fmtDate` copies onto `src/lib/utils.ts`.
- [ ] Remove the duplicate `normalizeRole` (keep one of `lib/api.ts` / `lib/setupApi.ts`).
- [ ] Register `tailwindcss-animate` in `tailwind.config.ts`, or drop the dependency.
- [ ] Remove stray `console.*` calls in `src/modules/visitor management/`.
- [ ] Set default options on the `QueryClient` in `src/app/providers.tsx`
      (`staleTime`, `retry`, `refetchOnWindowFocus`). ⚠ behavior change (intended).
- [ ] Rename `src/modules/visitor management/` → `visitor-management` (removes the space). ⚠
      requires import + route updates.

---

## Infra hygiene

- [ ] Add a non-root `USER` to `backend/Dockerfile` and `ml/.../Dockerfile`.
- [ ] Remove `-Dmaven.wagon.http.ssl.insecure/allowall` from `backend/Dockerfile`.
- [ ] Pin `minio/minio` and `minio/mc` (and other floating tags) by digest.
- [ ] Add `restart: unless-stopped` to the root `frontend` service.
- [ ] Expand `.dockerignore` to exclude `.env*`, `PRD/`, `graphify-out/`, `*_plan.md`.
- [ ] Exclude `__pycache__` from the STT image build context.
- [ ] Add per-service resource limits in compose.

---

## Larger refactors (track as issues, not one-shot cleanups)

These are real but bigger than a checklist item — link them to the relevant audit section:

- Split the god-components ([frontend §2](./frontend.md#god-components)).
- Extract a shared backend security library ([backend §5](./backend.md#security-dup)).
- Complete the `com.hirepath` → `com.fawnix` migration ([backend §1](./backend.md#hirepath)).
- Add exception handlers to the 8 HirePath services ([backend §2](./backend.md#exceptions)).
- Give every frontend module a `hooks.ts` + key factory ([frontend §3](./frontend.md#data)).
- Integrate or extract the VMS module ([frontend §1](./frontend.md#vms)).
- Introduce automated tests, front and back ([backend §6](./backend.md#tests)).
- Reconcile dev/prod compose + real CI gates ([infrastructure §2/§5](./infrastructure.md#cicd)).

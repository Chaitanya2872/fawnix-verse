# Fawnix Verse — Documentation

Fawnix Verse is an ERP-style, multi-module business platform built as a **React 19 SPA**
frontend backed by a **Spring Boot 3 microservices** system, with a **Python speech-to-text**
ML service, orchestrated through **Docker Compose**.

The platform is the result of merging two products — **Fawnix** (CRM / sales / procurement /
inventory) and **HirePath** (HRMS / recruitment / org / forms / approvals) — see
[`migration-log.md`](./migration-log.md). Several artifacts of that merge are still visible in
the code and are documented in the audit.

---

## How this documentation is organized

| Folder | Purpose | Start here |
|---|---|---|
| [`architecture/`](./architecture/) | How the system is built today — the "as-is" map. | [overview.md](./architecture/overview.md) |
| [`coding-standards/`](./coding-standards/) | The conventions the code **should** follow, with sources. | [README.md](./coding-standards/README.md) |
| [`audit/`](./audit/) | Code review: findings, risks, and cleanup work. | [README.md](./audit/README.md) |

Other existing docs:

- [`migration-log.md`](./migration-log.md) — HirePath → Fawnix merge history.
- [`o2c-implementation-plan.md`](./o2c-implementation-plan.md) — Order-to-Cash plan.

---

## The 60-second tour

```
Browser (React 19 SPA, Vite)
   │  /api/*
   ▼
Caddy (prod TLS)  ──►  API Gateway (Spring Cloud Gateway :8080)
                          │   validates JWT, CORS, routing
                          ▼
                     Eureka (:8761) service discovery
                          │
        ┌─────────────────┼───────────────────────────────┐
        ▼                 ▼                                 ▼
  identity-service   crm-service ... (15 domain services)  procurement-service
        │                 │                                 │
        ▼                 ▼                                 ▼
   PostgreSQL (one DB per service) · Redis · MinIO (objects) · STT ML service
```

- **Frontend**: `src/` — React 19, TypeScript (strict), Vite 7, Tailwind v4, shadcn/ui,
  TanStack Query, React Hook Form + Zod, axios. Organized into feature **modules**
  (`src/modules/*`).
- **Backend**: `backend/` — Maven multi-module, Spring Boot 3.3.5 on Java 17, Spring Cloud
  2023.0.3. Platform modules (`eureka-server`, `api-gateway`) plus 15 domain services.
- **ML**: `ml/speech-to-text-service/` — Python service that transcribes CRM call recordings.
- **Infra**: `compose.yml` (24 services), `docker/` (frontend nginx, postgres/minio bootstrap),
  `.github/workflows/deploy-ec2.yml` (CI/CD).

---

## Document status & conventions

- These docs describe the codebase **as of 2026-07-14** (commit `5939027`).
- Audit findings carry a severity: **P0** (critical / security), **P1** (high),
  **P2** (medium), **P3** (low / tech debt).
- File references use `path:line` form so they are clickable in most editors.
- Coding-standard docs cite external sources so the rules are auditable, not opinion.

> **Read the [security findings](./audit/security.md) first.** There are committed live API
> keys and default credentials that need action before anything else.

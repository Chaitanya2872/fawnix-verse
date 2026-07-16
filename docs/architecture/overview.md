# Architecture Overview

Fawnix Verse is a modular ERP platform. This document maps the system as it exists today
so that new contributors can orient quickly and reviewers have a shared reference.

---

## 1. System context

```
                       ┌──────────────────────────────────────────┐
                       │                Browser                    │
                       │   React 19 SPA (Vite build, served by     │
                       │   nginx in prod / vite dev server locally)│
                       └───────────────────┬──────────────────────┘
                                           │ HTTPS
                                           ▼
                         ┌─────────────────────────────────────┐
   Production only ─────►│  Caddy  (TLS, ACME, reverse proxy)   │
                         │  fawnixverse.acstechnologies.co.in   │
                         └───────────────┬─────────────────────┘
                            /api/*        │        /*
                                          ▼
                         ┌─────────────────────────────────────┐
                         │  API Gateway (Spring Cloud Gateway)  │
                         │  :8080 — routing, JWT auth, CORS     │
                         └───────────────┬─────────────────────┘
                                         │ lb:// (Eureka-resolved)
                    ┌────────────────────┼────────────────────────┐
                    ▼                    ▼                         ▼
            identity-service       crm-service   …13 more…   procurement-service
              :8081                  :8082                        :8093
                    │                    │                         │
       ┌────────────┴───────┬────────────┴──────────┬──────────────┘
       ▼                    ▼                        ▼
  PostgreSQL 16       MinIO (S3 objects)        Redis          Python STT service
  (DB per service)    call recordings, files    (notifications)  :8000
```

---

## 2. Component inventory

### Platform (`backend/platform/`)
| Component | Port | Role |
|---|---|---|
| `eureka-server` | 8761 | Service registry / discovery. |
| `api-gateway` | 8080 | Single ingress. Validates JWT, applies CORS, routes to services. |

### Domain services (`backend/services/`)
| Service | Port | Domain | Origin |
|---|---|---|---|
| `identity-service` | 8081 | Auth, users, access requests, RBAC | Fawnix |
| `crm-service` | 8082 | Leads, contacts, accounts, deals, activities, integrations (Meta/WhatsApp), call recordings | Fawnix |
| `inventory-service` | 8083 | Products, stock, warehouses, transactions | Fawnix |
| `hrms-service` | 8084 | HR (skeleton only — see audit) | Fawnix |
| `sales-service` | 8085 | Quotations, orders, invoices, deliveries (O2C) | Fawnix |
| `org-service` | 8086 | Organization setup, structure | HirePath |
| `forms-service` | 8087 | Dynamic form builder | HirePath |
| `approval-service` | 8088 | Approval flows / workflow engine | HirePath |
| `recruitment-service` | 8089 | Candidates, postings, interviews, offers | HirePath |
| `integration-service` | 8090 | External integrations | HirePath |
| `analytics-service` | 8091 | Analytics (stub — returns zeros) | HirePath |
| `notifications-service` | 8092 | Outbox-based notifications (Redis) | HirePath |
| `procurement-service` | 8093 | Purchase requests, POs, receipts, vendors (P2P) | Fawnix |
| `task-service` | 8094 | Tasks, AI note import (OpenAI) | HirePath |
| `project-service` | 8095 | Projects, meetings | Fawnix |

### Data & supporting infra
| Component | Role |
|---|---|
| PostgreSQL 16 | One logical database per service (`fawnix_identity`, `fawnix_crm`, …). |
| Redis 7 | Backing store for notifications-service. |
| MinIO | S3-compatible object storage (call recordings, form/recruitment attachments). |
| `speech-to-text-service` (Python) | Transcribes CRM call recordings; also meeting-notes via faster-whisper. |

### Frontend (`src/`)
React 19 SPA. Feature-first module layout under `src/modules/` (17 modules). See
[frontend.md](./frontend.md).

---

## 3. Request lifecycle (authenticated call)

1. SPA calls `/api/<domain>/...` via the shared axios client (`src/services/api-client.ts`),
   which injects `Authorization: Bearer <accessToken>` from `localStorage`.
2. In dev, Vite proxies `/api` → gateway. In prod, Caddy routes `/api/*` → gateway;
   `/*` → nginx-served SPA.
3. The **API Gateway** runs `GatewayAuthenticationFilter`, validating the JWT with
   `GatewayJwtService`. Public paths (`/api/auth/**`, webhooks) bypass it.
4. The gateway forwards to the target service via `lb://SERVICE-NAME` (Eureka-resolved),
   **except** identity-service (hardcoded URL) and inventory/procurement (`StripPrefix=1`).
5. Each service **re-validates the JWT** with its own copy of the security stack
   (`JwtAuthenticationFilter`) — defense in depth, but duplicated (see audit).
6. Service executes: `controller → service → repository (JPA) → PostgreSQL`. DTO mapping is
   hand-written. Errors flow through `GlobalExceptionHandler` → `ApiErrorResponse` (where present).

---

## 4. Inter-service communication

- **Discovery**: Eureka client-side load balancing (`lb://`).
- **Sync calls**: OpenFeign (declarative) is the dominant pattern; a few services use
  `RestTemplate` with hardcoded URLs (audit item).
- **Service-to-service auth**: three coexisting mechanisms — `X-Internal-Service-Secret`
  header, service-issued JWT (`ServiceJwtProvider`), and plain RestTemplate. This
  inconsistency is documented in the [backend audit](../audit/backend.md).

Known Feign edges: `recruitment → identity/notifications/approval/integration/forms`,
`org → identity/approval`, `procurement → inventory`, `approval → notifications/recruitment`,
`task → notifications`, `forms → notifications`.

---

## 5. Cross-cutting concerns

| Concern | Where it lives | Notes |
|---|---|---|
| AuthN | JWT (JJWT 0.12.6), validated at gateway **and** per service | Dual-secret support (`JWT_SECRET`, `FAWNIX_JWT_SECRET`) for external SSO. |
| AuthZ | `identity-service` roles + frontend `permissions.ts` | 45 permission constants, layered fallback resolution. |
| Persistence | Spring Data JPA + Flyway per service | `ddl-auto: validate`; migrations `V{n}__*.sql`. |
| Object storage | MinIO via `crm-service` `storage/` (MinIO SDK); recruitment via AWS S3 SDK | Two different SDKs for the same concept. |
| Config | `@ConfigurationProperties` + `${ENV:default}` in `application.yml` | No Spring profiles used. |
| Errors | `@RestControllerAdvice` `GlobalExceptionHandler` | Present in 6 services, missing in the 8 HirePath services. |

---

## 6. Deployment topology

- **Single EC2 host** runs the entire 24-container Compose stack.
- **CI/CD**: push to `master` → GitHub Actions SSHes into EC2 → `docker compose up --build`.
  No test/lint gate, no registry, no staging. See [infrastructure.md](./infrastructure.md).
- Two compose files exist: `compose.yml` (dev, 24 services) and `PRD/compose.yml`
  (prod subset, 16 services, adds Caddy). They have **drifted** — see the audit.

---

## 7. Notable architectural characteristics

**Strengths**
- Clean feature-per-service decomposition with per-service databases.
- Consistent gateway + Eureka + Feign backbone.
- Type-safe frontend (TS strict) with a modern, well-chosen stack.
- Externalized config via `@ConfigurationProperties`.

**Risks (detailed in [audit/](../audit/))**
- Incomplete HirePath→Fawnix merge (8 services still `com.hirepath.*`, missing exception
  handlers, residual bucket names).
- Security stack copy-pasted into ~14 services; three inconsistent internal-auth schemes.
- The "visitor management" frontend module is a foreign body (own auth, own HTTP client,
  hardcoded ngrok URL, excluded from type-checking).
- Zero automated tests, front or back.
- Committed secrets and default credentials.

Continue to the layer-specific maps:
[frontend.md](./frontend.md) · [backend.md](./backend.md) · [infrastructure.md](./infrastructure.md)

# Per-Flow Audit — Consolidated Roll-up

The full granular census: **32 flows** (15 services + api-gateway + eureka + 15 frontend modules),
each deep-audited by a dedicated sub-agent, then **reviewed by a second agent** for accuracy and insight
(spot-checking claims against source); reports scoring < 8/10 were revised. Produced 2026-07-14.

## Totals

| | Findings | P0 | P1 | P2 | P3 |
|---|--:|--:|--:|--:|--:|
| Backend + platform (17) | 326 | 38 | 83 | 104 | 101 |
| Frontend (15) | 303 | 23 | 75 | 109 | 93 |
| **All (32)** | **629** | **61** | **158** | **213** | **194** |

> This supersedes the earlier 13-bug figure — that was a ~2.5% hotspot sample. This is the census:
> **629 findings, 61 P0, 158 P1** across every flow, all confidence-tagged.

## Worst flows (by weighted P0×3 + P1)

| Flow | Kind | P0 | P1 | Total | Report |
|---|---|--:|--:|--:|---|
| **integration-service** | backend | 4 | 6 | 24 | [services/integration-service.md](../services/integration-service.md) |
| **visitor-management** | frontend | 4 | 6 | 27 | [modules/visitor-management.md](../modules/visitor-management.md) |
| **task-service** | backend | 4 | 5 | 25 | [services/task-service.md](../services/task-service.md) |
| **forms-service** | backend | 3 | 8 | 25 | [services/forms-service.md](../services/forms-service.md) |
| **notifications-service** | backend | 3 | 7 | 25 | [services/notifications-service.md](../services/notifications-service.md) |
| **crm-service** | backend | 3 | 6 | 24 | [services/crm-service.md](../services/crm-service.md) |
| **org** | frontend | 3 | 5 | 23 | [modules/org.md](../modules/org.md) |
| **recruitment** | frontend | 2 | 8 | 26 | [modules/recruitment.md](../modules/recruitment.md) |
| **inventory-service** | backend | 3 | 4 | 17 | [services/inventory-service.md](../services/inventory-service.md) |
| **procurement-service** | backend | 3 | 4 | 21 | [services/procurement-service.md](../services/procurement-service.md) |

## Backend + platform

| Flow | P0 | P1 | P2 | P3 | Total | Score | Report |
|---|--:|--:|--:|--:|--:|:--:|---|
| **integration-service** | 4 | 6 | 7 | 7 | 24 | 8/10 | [report](./services/integration-service.md) |
| **task-service** | 4 | 5 | 7 | 9 | 25 | 8/10 | [report](./services/task-service.md) |
| **forms-service** | 3 | 8 | 8 | 6 | 25 | 9/10 | [report](./services/forms-service.md) |
| **notifications-service** | 3 | 7 | 7 | 8 | 25 | 8/10 | [report](./services/notifications-service.md) |
| **crm-service** | 3 | 6 | 6 | 9 | 24 | 9/10 | [report](./services/crm-service.md) |
| **procurement-service** | 3 | 4 | 8 | 6 | 21 | 8/10 | [report](./services/procurement-service.md) |
| **inventory-service** | 3 | 4 | 5 | 5 | 17 | 8/10 | [report](./services/inventory-service.md) |
| **identity-service** | 2 | 7 | 7 | 6 | 22 | 9/10 | [report](./services/identity-service.md) |
| **org-service** | 2 | 6 | 8 | 7 | 23 | 8/10 | [report](./services/org-service.md) |
| **recruitment-service** | 2 | 6 | 9 | 6 | 23 | 8/10 | [report](./services/recruitment-service.md) |
| **sales-service** | 2 | 5 | 6 | 4 | 17 | 8/10 | [report](./services/sales-service.md) |
| **analytics-service** | 2 | 4 | 4 | 3 | 13 | 9/10 | [report](./services/analytics-service.md) |
| **api-gateway** | 2 | 3 | 4 | 4 | 13 | 8/10 | [report](./services/api-gateway.md) |
| **hrms-service** 🔁 | 2 | 3 | 3 | 2 | 10 | 7/10 | [report](./services/hrms-service.md) |
| **approval-service** | 1 | 4 | 8 | 9 | 22 | 8/10 | [report](./services/approval-service.md) |
| **project-service** | 0 | 3 | 6 | 7 | 16 | 8/10 | [report](./services/project-service.md) |
| **eureka-server** | 0 | 2 | 1 | 3 | 6 | 8/10 | [report](./services/eureka-server.md) |

## Frontend

| Flow | P0 | P1 | P2 | P3 | Total | Score | Report |
|---|--:|--:|--:|--:|--:|:--:|---|
| **visitor-management** | 4 | 6 | 12 | 5 | 27 | 8/10 | [report](./modules/visitor-management.md) |
| **org** | 3 | 5 | 8 | 7 | 23 | 8/10 | [report](./modules/org.md) |
| **recruitment** | 2 | 8 | 8 | 8 | 26 | 8/10 | [report](./modules/recruitment.md) |
| **sales** | 2 | 6 | 11 | 6 | 25 | 8/10 | [report](./modules/sales.md) |
| **purchases** | 2 | 6 | 7 | 8 | 23 | 8/10 | [report](./modules/purchases.md) |
| **task-management** | 2 | 6 | 10 | 5 | 23 | 9/10 | [report](./modules/task-management.md) |
| **project-management** | 2 | 6 | 7 | 4 | 19 | 9/10 | [report](./modules/project-management.md) |
| **crm** | 2 | 5 | 7 | 7 | 21 | 9/10 | [report](./modules/crm.md) |
| **forms** | 2 | 5 | 7 | 6 | 20 | 8/10 | [report](./modules/forms.md) |
| **auth** | 1 | 4 | 6 | 4 | 15 | 8/10 | [report](./modules/auth.md) |
| **approvals** | 1 | 3 | 5 | 6 | 18 | 8/10 | [report](./modules/approvals.md) |
| **users** | 0 | 5 | 5 | 7 | 17 | 8/10 | [report](./modules/users.md) |
| **inventory** | 0 | 4 | 6 | 8 | 18 | 8/10 | [report](./modules/inventory.md) |
| **integrations** | 0 | 3 | 6 | 7 | 16 | 8/10 | [report](./modules/integrations.md) |
| **reports** | 0 | 3 | 4 | 5 | 12 | 8/10 | [report](./modules/reports.md) |

## Systemic patterns (recur across many flows)

These appeared in report after report — fix them once, centrally (see
[redundancy.md](./redundancy.md) and [fixing-properly.md](./fixing-properly.md)):

- **No tests anywhere.** Zero `src/test` in any of the 15 services; no frontend test runner. Monorepo-wide.
- **Security stack copy-pasted into 15 services** (JWT filter/service/config) → `common-security`.
- **`SecurityConfig` in the root package in 5 services** (inventory, project, task, procurement, sales) — not under `security/config/`.
- **Missing `GlobalExceptionHandler`** in the 8 `com.hirepath` services → default error bodies break the frontend contract.
- **Entity audit fields copied into 46 entities** → `@MappedSuperclass` + JPA Auditing.
- **External HTTP calls inside `@Transactional`** (crm, sales, and others) → connection-pool exhaustion + split-brain state.
- **`findAll()`-then-filter-in-Java** on list endpoints → OOM at real data volume.
- **Committed default secrets** (`JWT_SECRET`, `Admin@123`, `minioadmin`) and **live Gemini keys** in git.
- **`com.hirepath` namespace + groupId** still in 8 migrated services.
- **`hrms-service` uses `spring-boot-starter-jdbc`, not JPA** (review-surfaced) — the first JPA entity added will fail at startup.

## Coverage & confidence

- **32/34 targets audited.** `access` + `public` frontend modules (1 file each) were not
  given separate reports — trivial, and their concern (route guard) is covered in `auth`.
- Every report was independently reviewed; scores ranged 7–9/10. Only **hrms-service** needed revision
  (7→revised: added the JDBC-not-JPA gap, corrected the root-`SecurityConfig` scope to 5 services, and
  reframed the missing-tests point as monorepo-wide).
- Findings are confidence-tagged **High/Med/Low** inside each report — Low items are suspicions to confirm,
  not established facts.

## Reports
- Backend index: [../services/README.md](../services/README.md)
- Frontend index: [../modules/README.md](../modules/README.md)

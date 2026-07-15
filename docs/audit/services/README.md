# Backend Service Audits

Per-service granular reports from the 32-flow census (2026-07-14). Each report lists every
endpoint/entity/migration + every finding with `file:line`, severity, **confidence**, owner, quoted
code, and the proper fix. 🔁 = report was revised after review.

**Backend + platform totals — 326 findings:** P0 38 · P1 83 · P2 104 · P3 101

| Flow | P0 | P1 | P2 | P3 | Total | Score | Report |
|---|--:|--:|--:|--:|--:|:--:|---|
| **integration-service** | 4 | 6 | 7 | 7 | 24 | 8/10 | [report](./integration-service.md) |
| **task-service** | 4 | 5 | 7 | 9 | 25 | 8/10 | [report](./task-service.md) |
| **forms-service** | 3 | 8 | 8 | 6 | 25 | 9/10 | [report](./forms-service.md) |
| **notifications-service** | 3 | 7 | 7 | 8 | 25 | 8/10 | [report](./notifications-service.md) |
| **crm-service** | 3 | 6 | 6 | 9 | 24 | 9/10 | [report](./crm-service.md) |
| **procurement-service** | 3 | 4 | 8 | 6 | 21 | 8/10 | [report](./procurement-service.md) |
| **inventory-service** | 3 | 4 | 5 | 5 | 17 | 8/10 | [report](./inventory-service.md) |
| **identity-service** | 2 | 7 | 7 | 6 | 22 | 9/10 | [report](./identity-service.md) |
| **org-service** | 2 | 6 | 8 | 7 | 23 | 8/10 | [report](./org-service.md) |
| **recruitment-service** | 2 | 6 | 9 | 6 | 23 | 8/10 | [report](./recruitment-service.md) |
| **sales-service** | 2 | 5 | 6 | 4 | 17 | 8/10 | [report](./sales-service.md) |
| **analytics-service** | 2 | 4 | 4 | 3 | 13 | 9/10 | [report](./analytics-service.md) |
| **api-gateway** | 2 | 3 | 4 | 4 | 13 | 8/10 | [report](./api-gateway.md) |
| **hrms-service** 🔁 | 2 | 3 | 3 | 2 | 10 | 7/10 | [report](./hrms-service.md) |
| **approval-service** | 1 | 4 | 8 | 9 | 22 | 8/10 | [report](./approval-service.md) |
| **project-service** | 0 | 3 | 6 | 7 | 16 | 8/10 | [report](./project-service.md) |
| **eureka-server** | 0 | 2 | 1 | 3 | 6 | 8/10 | [report](./eureka-server.md) |

Frontend module reports: [../modules/](../modules/README.md) · Roll-up: [../granular/census-rollup.md](../granular/census-rollup.md)

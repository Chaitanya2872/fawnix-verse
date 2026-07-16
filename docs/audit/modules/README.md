# Frontend Module Audits

Per-module granular reports from the 32-flow census (2026-07-14). Each lists pages/hooks/components
+ every finding with `file:line`, severity, **confidence**, owner, quoted code, and the proper fix.

**Frontend totals — 303 findings:** P0 23 · P1 75 · P2 109 · P3 93

> Not separately audited: `access` and `public` (1 file each — trivial). Covered indirectly via `auth`.

| Flow | P0 | P1 | P2 | P3 | Total | Score | Report |
|---|--:|--:|--:|--:|--:|:--:|---|
| **visitor-management** | 4 | 6 | 12 | 5 | 27 | 8/10 | [report](./visitor-management.md) |
| **org** | 3 | 5 | 8 | 7 | 23 | 8/10 | [report](./org.md) |
| **recruitment** | 2 | 8 | 8 | 8 | 26 | 8/10 | [report](./recruitment.md) |
| **sales** | 2 | 6 | 11 | 6 | 25 | 8/10 | [report](./sales.md) |
| **purchases** | 2 | 6 | 7 | 8 | 23 | 8/10 | [report](./purchases.md) |
| **task-management** | 2 | 6 | 10 | 5 | 23 | 9/10 | [report](./task-management.md) |
| **project-management** | 2 | 6 | 7 | 4 | 19 | 9/10 | [report](./project-management.md) |
| **crm** | 2 | 5 | 7 | 7 | 21 | 9/10 | [report](./crm.md) |
| **forms** | 2 | 5 | 7 | 6 | 20 | 8/10 | [report](./forms.md) |
| **auth** | 1 | 4 | 6 | 4 | 15 | 8/10 | [report](./auth.md) |
| **approvals** | 1 | 3 | 5 | 6 | 18 | 8/10 | [report](./approvals.md) |
| **users** | 0 | 5 | 5 | 7 | 17 | 8/10 | [report](./users.md) |
| **inventory** | 0 | 4 | 6 | 8 | 18 | 8/10 | [report](./inventory.md) |
| **integrations** | 0 | 3 | 6 | 7 | 16 | 8/10 | [report](./integrations.md) |
| **reports** | 0 | 3 | 4 | 5 | 12 | 8/10 | [report](./reports.md) |

Backend reports: [../services/](../services/README.md) · Roll-up: [../granular/census-rollup.md](../granular/census-rollup.md)

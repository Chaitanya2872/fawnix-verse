# Fawnix Verse

Fawnix Verse is a modular ERP platform with a React SPA frontend and a Spring Boot
microservices backend. It covers CRM, sales, purchases, inventory, recruitment,
forms, approvals, organization setup, reports, tasks, projects, and visitor
management.

The repository is a single workspace:

```text
fawnix-verse/
  src/        React 19 + TypeScript + Vite frontend
  backend/    Spring Boot 3.3 + Java 17 Maven multi-module backend
  ml/         Python speech-to-text service
  docker/     Supporting Docker assets
  docs/       Architecture, development, audit, and module documentation
  compose.yml Full local stack definition
```

## Stack

| Layer | Main tools |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui, TanStack Query, axios |
| Backend | Java 17, Spring Boot 3.3.5, Spring Cloud Gateway, Eureka, OpenFeign, JPA, Flyway |
| Data | PostgreSQL, Redis, MinIO |
| ML | Python speech-to-text service |
| Deployment | Docker Compose, nginx frontend image, Caddy in production compose |

## Key Modules

- CRM: leads, accounts, contacts, opportunities, presales, integrations.
- Sales: orders, shipments, invoices, returns, payments, reports.
- Purchases/P2P: purchase requests, budget checks, vendors, POs, receipts, invoices, payments.
- Inventory: products, stock, warehouses, transactions, bills, invoices.
- Recruitment: hiring requests, positions, postings, candidates, interviews, offers.
- Organization and setup: company setup, users, roles, hierarchy, workflows.
- Approvals and forms: workflow approvals and dynamic forms.
- Tasks and projects: work tracking, project boards, milestones, meetings.
- Visitor Management (VMS): visitor requests, approvals, check-in/out desk, history, reports, settings.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

By default Vite serves the app at `http://localhost:5173/`. If that port is busy,
Vite may choose another port. When using a different port, make sure the backend
CORS allow-list includes that origin.

Run a frontend build:

```bash
npm run build:frontend
```

Run the full stack with Docker Compose:

```bash
docker compose up --build
```

Stop the stack:

```bash
docker compose down
```

## Local API Configuration

The frontend API client reads `VITE_API_URL`:

```env
VITE_API_URL=/api
```

Use `/api` for local development when the Vite proxy should forward API calls to
the gateway. The proxy target defaults to `http://localhost:8080` and can be
overridden with:

```env
VITE_PROXY_TARGET=http://localhost:8080
```

If `VITE_API_URL` points directly at a deployed API, browser CORS rules apply.
For example, a local frontend running on `http://127.0.0.1:5175` can fail with
Axios `Network Error` if the gateway only allows `http://127.0.0.1:5173`.

The VMS module also reads `VITE_API_BASE_URL` for its own fetch-based services.
When unset, VMS calls relative `/api/...` endpoints.

## Common Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite frontend |
| `npm run build:frontend` | Build frontend only |
| `npm run lint` | Lint frontend source |
| `npm run build:backend` | Package backend Maven modules without tests |
| `npm run dev:eureka` | Run Eureka locally |
| `npm run dev:gateway` | Run API gateway locally |
| `npm run dev:identity` | Run identity service locally |
| `npm run dev:crm` | Run CRM service locally |
| `npm run docker:up` | Build and run Compose stack |
| `npm run docker:down` | Stop Compose stack |

## Backend Services

| Service | Port | Purpose |
|---|---:|---|
| `eureka-server` | 8761 | Service registry |
| `api-gateway` | 8080 | API ingress, JWT validation, CORS, routing |
| `identity-service` | 8081 | Auth, users, roles, permissions |
| `crm-service` | 8082 | CRM domain |
| `inventory-service` | 8083 | Inventory domain |
| `hrms-service` | 8084 | HRMS domain |
| `sales-service` | 8085 | Sales/order-to-cash domain |
| `org-service` | 8086 | Organization setup |
| `forms-service` | 8087 | Dynamic forms |
| `approval-service` | 8088 | Approval workflows |
| `recruitment-service` | 8089 | Recruitment domain |
| `integration-service` | 8090 | External integration settings |
| `analytics-service` | 8091 | Analytics endpoints |
| `notifications-service` | 8092 | Notifications |
| `procurement-service` | 8093 | Purchase-to-pay domain |
| `task-service` | 8094 | Task management |
| `project-service` | 8095 | Project management |

## Documentation

- [Documentation index](docs/README.md)
- [Getting started and local development](docs/development.md)
- [Architecture overview](docs/architecture/overview.md)
- [Frontend architecture](docs/architecture/frontend.md)
- [Backend architecture](docs/architecture/backend.md)
- [Infrastructure and deployment](docs/architecture/infrastructure.md)
- [Visitor Management module](docs/modules/visitor-management.md)
- [Coding standards](docs/coding-standards/README.md)
- [Audit notes](docs/audit/README.md)

## Important Notes

- Do not commit real secrets or production credentials. Use `.env` locally and
  keep production secrets in the deployment environment.
- The frontend is permission-gated. VMS requires `module.vms` or `ROLE_MASTER`.
- The local `.env` may point to the deployed API. Change `VITE_API_URL` to `/api`
  when working against a local gateway.
- Some audit documents describe known migration and integration risks. Review
  `docs/audit/` before making broad architecture changes.

# Getting Started and Local Development

This guide covers the common local workflows for Fawnix Verse.

## Prerequisites

- Node.js 20 or newer
- npm
- Java 17
- Maven 3.9 or newer
- Docker Desktop, if running the full stack locally

## First Setup

Install frontend dependencies:

```bash
npm install
```

Create or update `.env` from `.env.compose.example`. Replace default secrets for
anything outside local development.

For a local frontend talking through the Vite proxy, use:

```env
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
```

For a frontend that intentionally talks to a deployed API, set:

```env
VITE_API_URL=https://your-api-host.example.com/api
```

When using a deployed API directly, the deployed gateway must allow the local
frontend origin in CORS.

## Frontend Development

Start the React app:

```bash
npm run dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173/
```

Useful frontend commands:

```bash
npm run lint
npm run build:frontend
npm run preview
```

The frontend route table lives in `src/app/router.tsx`. The app shell is in
`src/components/layout/`. Shared UI primitives live in `src/components/ui/`.

## Full Stack With Docker Compose

Build and run the full stack:

```bash
docker compose up --build
```

Follow logs:

```bash
docker compose logs -f
```

Stop containers:

```bash
docker compose down
```

The Compose stack includes PostgreSQL, Redis, MinIO, Eureka, the gateway, the
domain services, the frontend image, and the speech-to-text service.

## Backend Development

The backend is a Maven multi-module project under `backend/`.

Build all backend modules:

```bash
npm run build:backend
```

Run core backend components locally:

```bash
npm run dev:eureka
npm run dev:gateway
npm run dev:identity
```

Run a domain service:

```bash
npm run dev:crm
npm run dev:inventory
npm run dev:sales
npm run dev:tasks
npm run dev:projects
```

Most domain services expect PostgreSQL and Eureka to be available. The gateway
routes API calls to services using Eureka service discovery.

## Important Ports

| Component | Default port |
|---|---:|
| Frontend dev server | 5173 |
| API gateway | 8080 |
| Eureka | 8761 |
| Identity service | 8081 |
| CRM service | 8082 |
| Inventory service | 8083 |
| Sales service | 8085 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO console | 9001 |
| Speech-to-text service | 8000 |

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_API_URL` | Frontend | Base URL for shared axios API client |
| `VITE_PROXY_TARGET` | Vite | Target for local `/api` proxy |
| `VITE_API_BASE_URL` | VMS frontend services | Optional base URL for VMS fetch calls |
| `JWT_SECRET` | Gateway and services | JWT signing/validation secret |
| `FAWNIX_JWT_SECRET` | Gateway and services | Optional secondary JWT secret |
| `INTERNAL_SERVICE_SECRET` | Backend services | Internal service authentication |
| `POSTGRES_USER` | Database/services | PostgreSQL username |
| `POSTGRES_PASSWORD` | Database/services | PostgreSQL password |
| `MINIO_ROOT_USER` | MinIO | MinIO root user |
| `MINIO_ROOT_PASSWORD` | MinIO | MinIO root password |
| `REDIS_HOST` | Notifications service | Redis host |
| `REDIS_PORT` | Notifications service | Redis port |

## Network Error Checklist

If the browser shows `Network Error`, check these first:

1. Confirm the backend gateway is running at the URL configured by `VITE_API_URL`
   or `VITE_PROXY_TARGET`.
2. For local proxy mode, set `VITE_API_URL=/api`.
3. If calling a deployed API directly, confirm CORS allows the exact frontend
   origin, including port. `http://127.0.0.1:5173` and `http://127.0.0.1:5175`
   are different origins.
4. Check that the login/auth endpoint is reachable. The protected app shell calls
   `/api/auth/me` before rendering protected routes.
5. Restart Vite after changing `.env`; Vite reads env variables at startup.

## Build Verification

Before handing off frontend work:

```bash
npm run build:frontend
npm run lint
```

Before handing off backend work:

```bash
npm run build:backend
```

For broad changes, run Docker Compose once to catch service wiring and env drift.

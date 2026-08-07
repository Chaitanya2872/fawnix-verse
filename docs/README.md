# Fawnix Verse Documentation

Fawnix Verse is an ERP-style, multi-module business platform built with a
React 19 SPA frontend, a Spring Boot 3 microservices backend, and a Python
speech-to-text service.

## Start Here

| Document | Purpose |
|---|---|
| [Project README](../README.md) | High-level overview, stack, quick start, service ports |
| [Getting started](./development.md) | Local setup, env variables, run commands, troubleshooting |
| [Architecture overview](./architecture/overview.md) | System map and request lifecycle |
| [Frontend architecture](./architecture/frontend.md) | Frontend stack, routing, modules, data layer |
| [Backend architecture](./architecture/backend.md) | Backend services, patterns, persistence, integrations |
| [Infrastructure](./architecture/infrastructure.md) | Compose, deployment, networking, CI/CD |
| [Visitor Management module](./modules/visitor-management.md) | VMS routes, design-system usage, data flow, API notes |
| [Coding standards](./coding-standards/README.md) | Frontend, backend, Docker, and workflow conventions |
| [Audit notes](./audit/README.md) | Known risks, cleanup work, and review findings |

## Repository Map

```text
src/        React frontend
backend/    Java Spring Boot backend
ml/         Python speech-to-text service
docker/     Docker build and bootstrap assets
docs/       Project documentation
PRD/        Production compose/deployment artifacts
scripts/    Utility scripts
```

## Runtime Shape

```text
Browser
  |
  | /api/*
  v
API Gateway :8080
  |
  | Eureka service discovery
  v
Domain services :8081-8095
  |
  v
PostgreSQL, Redis, MinIO, speech-to-text service
```

In local frontend development, Vite can proxy `/api` to the gateway. In
production, Caddy and nginx serve the SPA and route API traffic to the gateway.

## Module Documentation

- [Visitor Management](./modules/visitor-management.md)

Add module-level docs under `docs/modules/` when a module has special routing,
API behavior, local state, or design-system conventions that are not obvious
from the general architecture docs.

## Operational Notes

- Keep real secrets out of git.
- Review `docs/audit/` before large refactors.
- Use the shared frontend design system for new UI work.
- Prefer local `/api` proxy mode for frontend development unless testing a
  deployed backend intentionally.

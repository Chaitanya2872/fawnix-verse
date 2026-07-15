# Coding Standards

The conventions Fawnix Verse code should follow. Each rule is backed by an external source so
it is auditable rather than opinion. Where the current codebase diverges, the relevant
[audit](../audit/) doc is linked.

These standards reflect the actual stack (React 19 / TS / Vite, Spring Boot 3 / Java 17,
Docker Compose) and current (2025–2026) recommended practice.

---

## Documents

| Doc | Scope |
|---|---|
| [frontend-react-typescript.md](./frontend-react-typescript.md) | React 19, TypeScript, TanStack Query, RHF+Zod, Tailwind/shadcn, axios. |
| [backend-spring-boot.md](./backend-spring-boot.md) | Package layout, DTO/mapping, exceptions, Spring Cloud, JWT, Flyway, config, testing. |
| [docker-devops.md](./docker-devops.md) | Dockerfiles, Compose, secrets, CI/CD. |
| [git-and-workflow.md](./git-and-workflow.md) | Conventional commits, lint/format gates, ADRs, PR hygiene. |

---

## How to use these

1. **New code** must follow the relevant standard.
2. **Touched code** should be moved toward the standard when the change is low-risk and in
   scope (see the global rule: fix adjacent breakage, don't gold-plate).
3. **Deviations** must be justified in the PR. Repeated deviations become audit items.

---

## Non-negotiables (apply everywhere)

- **No committed secrets.** Ever. Not in `.env.example`, not in `application.yml` defaults,
  not in source. Use env vars / secret stores. (This is currently violated — see
  [security](../audit/security.md).)
- **No `any` in application code** (frontend) / **no raw entity exposure** (backend).
- **One HTTP client, one auth mechanism** per tier. No parallel/competing clients.
- **Automated gates before merge**: type-check, lint, format, tests. A green build is the
  minimum bar, not a bonus.
- **Feature-first organization.** Code that changes together lives together.
- **Kebab-case files, no spaces in paths.**

---

## Adopting these on a legacy codebase

This project predates these written standards, so full compliance is a migration, not a flip.
Recommended order:

1. Fix P0 security items (secrets, credentials) — see the audit.
2. Add the CI gates (even in warn-only mode first) so new code can't regress.
3. Bring new modules/services into compliance as they're written.
4. Refactor the worst existing offenders (god-components, duplicated security stack)
   opportunistically, behind tests.

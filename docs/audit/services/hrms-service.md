# hrms-service — Service Audit

**Audited:** 2026-07-14
**Auditor:** Senior Code Auditor (automated, via Claude Code)
**Commit range:** b3473b8 → 32e214a (2 commits touching this service)
**Primary author across all files:** Chaitanya2872

---

## Summary

`hrms-service` is a **pure scaffold** — it contains only a `main` class, a `SecurityConfig`, one Flyway baseline migration that creates a single-row metadata table, and an `application.yml`. There are zero controllers, zero entities, zero business logic, and no `src/test` tree. The service boots and registers with Eureka but cannot serve a single real request.

Three headline risks stand out:

1. The security config uses `.anyRequest().denyAll()` instead of the project-standard `.anyRequest().authenticated()`, meaning all API calls will return HTTP 403 forever, even after real routes are added.
2. The entire JWT + internal-service-auth filter stack that every production-ready service in this monorepo carries is absent, so even correcting the `denyAll` rule would still leave the service unable to authenticate any caller.
3. The service declares `spring-boot-starter-jdbc` (pom.xml:24) instead of `spring-boot-starter-data-jpa`, which every other service in the monorepo uses. JPA/Hibernate auto-configuration is absent, meaning any developer who adds a `@Entity` class will hit an `EntityManagerFactory not found` startup failure with no explanation.

---

## Surface map

### Endpoints

| Controller | Method | Path | Notes |
|---|---|---|---|
| — | — | — | **None exist.** The service has no controllers. |

Only the two actuator endpoints exposed by Spring Boot Actuator itself are reachable:

| Exposed by | Path | Auth rule |
|---|---|---|
| Spring Actuator | `GET /actuator/health` | `permitAll` (`SecurityConfig.java:20`) |
| Spring Actuator | `GET /actuator/info` | `permitAll` (`SecurityConfig.java:20`) |

### Entities / Tables

| Entity class | Table | Source |
|---|---|---|
| — | `service_metadata` | `V1__baseline.sql:1` — placeholder only, no HRMS domain tables |

### Flyway migrations

| File | Version | Description |
|---|---|---|
| `V1__baseline.sql` | 1 | Creates `service_metadata` table and upserts a single row. This is not an HRMS domain schema; it is a pure bootstrap marker. |

### Feign / RestTemplate outbound calls

None.

### Configuration properties (`application.yml`)

| Key | Default value | Notes |
|---|---|---|
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/fawnix_hrms` | env-var backed |
| `spring.datasource.username` | `postgres` | hardcoded fallback — see HRM-03 |
| `spring.datasource.password` | `postgres` | hardcoded fallback — see HRM-03 |
| `server.port` | `8084` | env-var backed |
| `eureka.client.service-url.defaultZone` | `http://localhost:8761/eureka/` | env-var backed |
| `management.endpoints.web.exposure.include` | `health,info` | correct — minimal actuator surface |

`app.security.jwt.*` and `app.security.internal-service-secret` are entirely absent. See HRM-04.

### Security wiring

`SecurityConfig.java` — 25 lines total. No `JwtAuthenticationFilter`, no `InternalServiceAuthFilter`, no `RestAuthenticationEntryPoint`, no `RestAccessDeniedHandler`, no `@EnableMethodSecurity`. Deviates from every production-ready service in the monorepo.

---

## Findings

### P0 — Critical

---

#### HRM-01 — All non-actuator requests permanently denied by `.denyAll()`

**File:** `src/main/java/com/fawnix/hrms/SecurityConfig.java:19-21`
**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/health", "/actuator/info").permitAll()
    .anyRequest().denyAll());
```

**Why it is wrong:**
`.denyAll()` returns HTTP 403 for every request that is not an actuator path, unconditionally. This is not "deny until auth is wired" — it is absolute and overrides filter outcomes entirely. The moment any controller is added to this service, its endpoints will return 403 regardless of whether the caller presents a valid JWT. A developer adding the first HRMS endpoint will see a 403 with no explanation and waste debugging time on an unreachable route.

**Proper fix:**
Replace `.denyAll()` with `.authenticated()` and wire the JWT + internal-service-auth filters following the established monorepo pattern (see also HRM-02):
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/health", "/actuator/info").permitAll()
    .requestMatchers("/internal/**").permitAll()
    .anyRequest().authenticated())
.addFilterBefore(internalServiceAuthFilter, UsernamePasswordAuthenticationFilter.class)
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
```
Reference: `recruitment-service/src/main/java/com/hirepath/recruitment/security/config/SecurityConfig.java:44-50`.

---

#### HRM-02 — Entire JWT authentication filter stack absent; service cannot authenticate any caller

**File:** `src/main/java/com/fawnix/hrms/SecurityConfig.java` (whole file)
**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
The `SecurityConfig` class has no filter injections, no `addFilterBefore(…)` calls, and no `@EnableMethodSecurity` annotation. The entire `security/` package tree does not exist in `com.fawnix.hrms`.

**Why it is wrong:**
Every production-ready service in this monorepo ships `security/filter/JwtAuthenticationFilter` and `security/filter/InternalServiceAuthFilter`. Without them, the `SecurityContext` is never populated from the `Authorization: Bearer` header. Even if `.denyAll()` is fixed to `.authenticated()`, all protected endpoints will return HTTP 401 because no filter populates the principal. Additionally, `@EnableMethodSecurity` is absent, meaning `@PreAuthorize` annotations on future service methods will be **silently ignored** — a dangerous footgun when role-based access control is added later.

**Proper fix:**
Create the following package tree, copying from any peer service (e.g. `analytics-service` or `recruitment-service`) and adjusting the package root to `com.fawnix.hrms`:
```
com.fawnix.hrms.security.filter.JwtAuthenticationFilter
com.fawnix.hrms.security.filter.InternalServiceAuthFilter
com.fawnix.hrms.security.handler.RestAuthenticationEntryPoint
com.fawnix.hrms.security.handler.RestAccessDeniedHandler
com.fawnix.hrms.security.jwt.JwtService
com.fawnix.hrms.security.jwt.JwtProperties
com.fawnix.hrms.security.service.AppUserDetails
```
Add `@EnableMethodSecurity` to `SecurityConfig`. Also add `app.security.jwt.*` to `application.yml` (see HRM-04). This is a multi-file effort — budget 2-3 hours minimum.

---

### P1 — High

---

#### HRM-03 — Hardcoded default DB credentials committed to version history

**File:** `src/main/resources/application.yml:6-7`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```yaml
username: ${HRMS_DB_USERNAME:postgres}
password: ${HRMS_DB_PASSWORD:postgres}
```

**Why it is wrong:**
The fallback values `postgres`/`postgres` are committed to git. If `HRMS_DB_USERNAME` or `HRMS_DB_PASSWORD` are unset in any deployment environment (staging, CI, a developer's machine), the service silently connects using the PostgreSQL superuser account with a well-known default password. For an HRMS service that will store payroll, headcount, and employment contracts, this is a high-impact credential exposure. The same pattern exists across the monorepo (systemic issue), but HRMS data sensitivity makes it a P1 here.

**Proper fix:**
Remove the fallback values entirely so startup fails fast:
```yaml
username: ${HRMS_DB_USERNAME}
password: ${HRMS_DB_PASSWORD}
```
Add a `.env.example` file to the repo root (if one does not exist) documenting required env vars, and inject secrets via a secrets manager in CI/CD.

---

#### HRM-04 — `app.security.*` config block absent; service will fail to start once JWT filters are wired

**File:** `src/main/resources/application.yml` (entire file)
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
The entire `app.security.jwt.*` and `app.security.internal-service-secret` keys are absent.

**Why it is wrong:**
Once the JWT filter stack from HRM-02 is added, `JwtProperties` (a `@ConfigurationProperties` bean) will attempt to bind `app.security.jwt.secret` and related keys at startup. If these are missing, Spring Boot will either fail to start with a `BindException` or bind a `null` secret, causing every token verification to throw a runtime exception. Every peer service carries this block — for example, from `analytics-service/application.yml`:
```yaml
app:
  security:
    jwt:
      issuer: fawnix-verse
      access-token-expiration-minutes: 30
      refresh-token-expiration-days: 14
      secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
    internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Proper fix:**
Add the above block verbatim to `application.yml`. The dev-fallback values are acceptable for local development as long as `JWT_SECRET` and `INTERNAL_SERVICE_SECRET` are overridden by real secrets in all non-local environments.

---

#### HRM-10 — `spring-boot-starter-jdbc` instead of `spring-boot-starter-data-jpa`; JPA auto-configuration absent

**File:** `pom.xml:24`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
```

**Why it is wrong:**
`hrms-service` is the only service in the entire monorepo that declares `spring-boot-starter-jdbc` rather than `spring-boot-starter-data-jpa`. Every other service — `analytics-service`, `approval-service`, `crm-service`, `forms-service`, `identity-service`, `integration-service`, `inventory-service`, `notifications-service`, `org-service`, `procurement-service`, `project-service`, `recruitment-service`, `sales-service`, and `task-service` — all declare `spring-boot-starter-data-jpa`. The `jdbc` starter provides `JdbcTemplate` and connection pooling, but it intentionally excludes Hibernate and the JPA persistence provider. As a result, `EntityManagerFactory` is never auto-configured. The moment any developer adds a `@Entity` class or a Spring Data JPA repository to `hrms-service`, the application context will fail to start with:

```
Parameter 0 of constructor in … required a bean of type 'javax.persistence.EntityManagerFactory' that could not be found.
```

This failure surface is invisible at scaffold time but will produce a confusing, hard-to-diagnose startup crash on the first day real HRMS domain code is added. An HRMS service by definition will need employee, department, payroll, and contract entities — making this a ticking time bomb, not a theoretical concern.

**Proper fix:**
Replace in `pom.xml`:
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```
No other changes are required — Flyway and the PostgreSQL driver remain; JPA auto-configuration will then activate on the existing `spring.datasource.*` properties in `application.yml`.

---

### P2 — Medium

---

#### HRM-05 — `SecurityConfig` lives in the root package, part of a 5-service systemic pattern that has been perpetuated

**File:** `src/main/java/com/fawnix/hrms/SecurityConfig.java:1`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
package com.fawnix.hrms;
```

**Why it is wrong:**
The established monorepo standard is to place `SecurityConfig` under a `security.config` subpackage. The services that follow this standard are:
- `analytics-service`: `com.hirepath.analytics.security.config.SecurityConfig`
- `approval-service`: `com.hirepath.approval.security.config.SecurityConfig`
- `crm-service`: `com.fawnix.crm.security.config.SecurityConfig`
- `forms-service`: `com.hirepath.forms.security.config.SecurityConfig`
- `identity-service`: `com.fawnix.identity.security.config.SecurityConfig`
- `integration-service`: `com.hirepath.integration.security.config.SecurityConfig`
- `notifications-service`: `com.hirepath.notifications.security.config.SecurityConfig`
- `org-service`: `com.hirepath.org.security.config.SecurityConfig`
- `recruitment-service`: `com.hirepath.recruitment.security.config.SecurityConfig`

However, `hrms-service` is not an isolated case. The root-package placement pattern has already been copied into five other stub services:
- `inventory-service`: `com.fawnix.inventory.SecurityConfig` (53 lines)
- `project-service`: `com.fawnix.project.SecurityConfig` (47 lines)
- `procurement-service`: `com.fawnix.procurement.SecurityConfig` (47 lines)
- `sales-service`: `com.fawnix.sales.SecurityConfig` (47 lines)
- `task-service`: `com.hirepath.task.SecurityConfig` (47 lines)

This makes the misplacement a **5-service systemic pattern**, not an anomaly. The framing "do not perpetuate in hrms-service" understates the scope — it has already been perpetuated across inventory, project, procurement, sales, and task services. The correct resolution is a monorepo-wide remediation of all six offending services, not a point fix on hrms-service alone.

Placing security config in the root package co-mingles infrastructure concerns with the application entry point, makes package-level component scanning rules fragile, and means the 7+ security support classes that will be added (filters, handlers, JWT service, properties) will have no natural home.

**Proper fix:**
Move `SecurityConfig` to `com.fawnix.hrms.security.config.SecurityConfig`. Create the sibling packages: `.security.filter`, `.security.handler`, `.security.jwt`, `.security.service`. Schedule the same move for `inventory-service`, `project-service`, `procurement-service`, `sales-service`, and `task-service`.

---

#### HRM-06 — V1 migration creates an application-value-free metadata table instead of a domain schema

**File:** `src/main/resources/db/migration/V1__baseline.sql:1-9`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```sql
CREATE TABLE IF NOT EXISTS service_metadata (
  service_name VARCHAR(100) PRIMARY KEY,
  bootstrapped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO service_metadata (service_name, bootstrapped_at)
VALUES ('hrms-service', CURRENT_TIMESTAMP)
ON CONFLICT (service_name) DO UPDATE SET bootstrapped_at = EXCLUDED.bootstrapped_at;
```

**Why it is wrong:**
The `service_metadata` table is queried by no application code and carries no domain information. No other active service in the monorepo (approval, crm, forms, org, recruitment, etc.) uses this pattern — the identical file appears only in `inventory-service`, `sales-service`, and `procurement-service`, all of which are similarly unfinished stubs. Using V1 for a bootstrap marker means real HRMS domain tables (employees, departments, contracts, leave balances, payroll records) will start at V2, with V1 containing confusing placeholder infrastructure.

**Proper fix:**
Once the HRMS domain schema is designed, replace `V1__baseline.sql` entirely with the real domain schema. Remove the `service_metadata` table — Flyway's built-in `flyway_schema_history` table already records migration timestamps; a separate `service_metadata` table adds nothing.

---

#### HRM-07 — `TIMESTAMP` column in migration lacks time-zone awareness

**File:** `src/main/resources/db/migration/V1__baseline.sql:3`
**Severity:** P2 | **Confidence:** Medium
**Owner:** Chaitanya2872

**Offending code:**
```sql
bootstrapped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**Why it is wrong:**
`TIMESTAMP` (without time zone) in PostgreSQL stores values in the session's local time zone with no zone metadata, which produces silent errors when the DB server, application server, or client operate in different time zones. PostgreSQL best practice — and the pattern used consistently in active services (`org-service`, `approval-service`, `recruitment-service`) — is `TIMESTAMPTZ`. For an HRMS service that will track employment dates, leave dates, payroll periods, and contract start/end dates, establishing `TIMESTAMP` as the baseline pattern will cause costly timezone bugs in future migrations.

**Proper fix:**
```sql
bootstrapped_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
```
Apply `TIMESTAMPTZ` to all date/time columns in all future HRMS migrations.

---

### P3 — Low / Hygiene

---

#### HRM-08 — `spring-boot-starter-test` absent from `pom.xml`; part of a monorepo-wide test infrastructure deficit

**File:** `pom.xml` (whole file)
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Why it is wrong:**
`hrms-service/pom.xml` does not declare `spring-boot-starter-test`. Running `mvn test` in this module produces zero test executions with no warning or error, meaning CI pipelines will report a green test pass that actually ran nothing.

This is not a hrms-specific anomaly — it is part of a broader monorepo deficit. No service in the entire monorepo has a `src/test/` directory. Services that declare `spring-boot-starter-test` but have zero test code (the dependency is declared but dead) are: `analytics-service`, `approval-service`, `forms-service`, `notifications-service`, `crm-service`, `identity-service`, `integration-service`, `org-service`, `procurement-service`, and `recruitment-service`. Services that lack even the dependency declaration are: `hrms-service`, `inventory-service`, `project-service`, `sales-service`, and `task-service` (five services in total).

The audit previously implied that analytics-service, approval-service, forms-service, and notifications-service "have tests" and therefore serve as a meaningful baseline. That characterisation is false — declaring the dependency and having tests are not the same thing. None of those services has a single test class in `src/test/`. The monorepo has never executed a single unit or integration test.

**Proper fix:**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```
Adding this dependency to `hrms-service` is a necessary but not sufficient step. The monorepo-wide deficit warrants a separate initiative: establish a minimum `@SpringBootTest` context-load test in every service so that misconfigured beans surface in CI rather than at deployment time.

---

#### HRM-09 — No `src/test` directory; zero test coverage

**Location:** `backend/services/hrms-service/src/` — `test/` subdirectory absent
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Why it is wrong:**
There is not even a generated `HrmsServiceApplicationTests.java` context-load test. When real HRMS functionality is added, there will be no baseline test infrastructure and no CI gate to catch regressions. The absence of even a context-load test means configuration errors (missing beans, bad `@ConfigurationProperties` bindings) will only surface at deployment time. As noted in HRM-08, this is true of every service in the monorepo — but hrms-service is a greenfield opportunity to set the pattern correctly from the start.

**Proper fix:**
Add a minimal context-load test now, before any domain code is written:
```
src/test/java/com/fawnix/hrms/HrmsServiceApplicationTests.java
```
```java
@SpringBootTest
class HrmsServiceApplicationTests {
    @Test
    void contextLoads() {}
}
```
This acts as a CI tripwire that catches misconfigurations before they reach a deployment environment.

---

## Redundancy

### Cross-service structural duplication (concrete pairs)

| Pattern | hrms-service location | Identical / near-identical in |
|---|---|---|
| Actuator `health`/`info` `permitAll` rule | `SecurityConfig.java:20` | `analytics-service/.../SecurityConfig.java:45`, `recruitment-service/.../SecurityConfig.java:45`, `forms-service/.../SecurityConfig.java:45`, `notifications-service/.../SecurityConfig.java:45`, `org-service/.../SecurityConfig.java:45` |
| `service_metadata` table + bootstrap insert | `V1__baseline.sql:1-9` | `inventory-service/V1__baseline.sql:1-9` (identical DDL, differs only in service name), `sales-service/V1__baseline.sql:1-9` (identical), `procurement-service/V1__baseline.sql:1-9` (identical) |
| `spring.datasource.password: ${…:postgres}` | `application.yml:7` | Same fallback in `analytics-service/application.yml`, `recruitment-service/application.yml`, `forms-service/application.yml`, and every other service |
| `eureka.client.service-url.defaultZone` block | `application.yml:17-19` | Verbatim in every service `application.yml` across the monorepo |
| `management.endpoints.web.exposure.include: health,info` | `application.yml:22-25` | Verbatim in every service `application.yml` across the monorepo |
| `SecurityConfig` in root package | `SecurityConfig.java:1` | `inventory-service/SecurityConfig.java:1`, `project-service/SecurityConfig.java:1`, `procurement-service/SecurityConfig.java:1`, `sales-service/SecurityConfig.java:1`, `task-service/SecurityConfig.java:1` |

**Systemic note on security stack duplication:** Once the JWT filter stack is added to `hrms-service` (fix for HRM-01/HRM-02), `JwtAuthenticationFilter`, `InternalServiceAuthFilter`, `JwtService`, `JwtProperties`, `RestAccessDeniedHandler`, and `RestAuthenticationEntryPoint` will exist in their **sixth copy** across the monorepo. The correct long-term resolution is a shared `fawnix-security-starter` Spring Boot auto-configuration library module. That is a monorepo-wide architectural change outside the scope of this service audit, but the hrms-service implementation is a clean opportunity to do it right if that initiative is ever started.

---

## Tests & gaps

| Area | Status |
|---|---|
| Unit tests | None — `src/test/` directory does not exist |
| Integration tests | None |
| Spring context load test | None — no `@SpringBootTest` smoke test |
| `spring-boot-starter-test` in `pom.xml` | Absent |
| Test coverage | 0% (no application code to test, no test framework wired) |

When HRMS functionality is built out, the following test types will be required:
- `@WebMvcTest` for controllers (with mocked `JwtAuthenticationFilter` and `@MockBean` service layer)
- `@DataJpaTest` for repository layer (requires switching to `spring-boot-starter-data-jpa` — see HRM-10)
- `@SpringBootTest` with Testcontainers for PostgreSQL end-to-end

---

## Coverage note

**Fully inspected:**
- All 5 files in the service tree: `pom.xml`, `HrmsServiceApplication.java`, `SecurityConfig.java`, `application.yml`, `V1__baseline.sql`
- Git log for authorship on every file (2 commits, single author: Chaitanya2872)
- Cross-service comparison of `SecurityConfig` patterns across all 15 sibling services — line counts verified against source for all files cited in the Redundancy table
- Cross-service comparison of `V1__baseline.sql` across all 15 sibling services
- Parent `pom.xml` for dependency management context
- All 14 peer service `pom.xml` files for `spring-boot-starter-data-jpa` and `spring-boot-starter-test` presence
- `src/` directory structure of all 8 services cited in HRM-08 — confirmed no `src/test/` exists in any of them

**Not applicable (code does not exist):**
- Controllers, entities, repositories, service classes, DTOs, Feign clients — none exist
- `GlobalExceptionHandler` — none exists (expected but N/A for a stub)
- `@Transactional` placement and visibility analysis
- N+1 / `findAll()`-then-filter-in-Java analysis
- JWT token validation logic inspection
- Race conditions in ID/number generation
- Flyway checksum conflict analysis (only one migration)

**Overall confidence:** High. With only 37 lines of Java across 2 files and 9 lines of SQL, the probability of a missed finding is extremely low. All 10 findings are structural or architectural gaps, not subtle logic bugs — they are all unambiguous. Every file:line citation in this report has been verified against the live source.

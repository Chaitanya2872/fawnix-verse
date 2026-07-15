# Backend Audit

Scope: `backend/`. Standards reference: [backend-spring-boot.md](../coding-standards/backend-spring-boot.md).

---

## <a id="hirepath"></a>1. P2 — Incomplete HirePath → Fawnix merge

Eight services still live under the **`com.hirepath`** namespace **and** declare
`<groupId>com.hirepath</groupId>` / `<version>0.1.0</version>` in their POMs while the parent
is `com.fawnix` / `0.0.1-SNAPSHOT` (confirmed: 8 `pom.xml` files match `com.hirepath`):

`analytics-service`, `approval-service`, `forms-service`, `integration-service`,
`notifications-service`, `org-service`, `recruitment-service`, `task-service`.

These services also vary structurally from the Fawnix convention (`domain/` instead of
`entity/`, `SecurityConfig` at the application root package, DTOs scattered). Residual
artifacts include the recruitment S3 default bucket name `hirepath`
(`${RECRUITMENT_S3_BUCKET:hirepath}`).

**Recommendation**: complete the rebrand — migrate packages to `com.fawnix.*`, fix the POM
groupId/version, align package layout, and rename residual `hirepath` defaults. Do it per
service, behind tests.

---

## <a id="exceptions"></a>2. P1 — Missing global exception handling in 8 services

`@RestControllerAdvice GlobalExceptionHandler` + `ApiErrorResponse` exist in **crm, identity,
inventory, procurement, sales, task**, but are **absent** in the HirePath services (org,
recruitment, forms, approval, integration, notifications, analytics).

**Impact**: Unhandled exceptions in those services return Spring's default `/error` JSON, which
does **not** match the `ApiErrorResponse` shape the frontend expects — so error handling breaks
for exactly those modules. Several of these services also `catch (Exception ex)` broadly in
controllers without translating or logging (e.g. `RecruitmentController` ~L704/715,
`CandidateController` ~L421/430, `org SetupController` ~L191/200).

**Recommendation**: add a shared `GlobalExceptionHandler` (ideally in a common library) to
every service; replace broad catches with typed exceptions.

---

## <a id="hrms"></a>3. P1 — `hrms-service` is non-functional but wired in

`hrms-service` contains only `HrmsServiceApplication` + a `SecurityConfig` that `denyAll()`s
every non-actuator request. It has no entities, controllers, or JPA config (only a placeholder
Flyway migration). Yet it is registered in Eureka and routed by the gateway
(`/api/hrms/**` → 8084).

**Impact**: any call to `/api/hrms/**` returns 403 silently; the service consumes a port,
container, and DB for nothing.

**Recommendation**: either implement it or remove it from the gateway routes, compose, and
parent POM until it's real.

---

## <a id="hardcoded-url"></a>4. P1 — Hardcoded service URL bypasses discovery

`sales-service`'s `InventoryReservationClient` calls inventory at
`${app.services.inventory-url:http://localhost:8083}` via `RestTemplate` — bypassing Eureka
with no fallback. In any containerized deployment where inventory isn't on `localhost:8083`,
stock reservation (part of order creation) **silently fails**.

Similarly, `crm → identity` uses a load-balanced `RestTemplate` + `X-Internal-Service-Secret`
rather than the Feign+discovery pattern used elsewhere.

**Recommendation**: use a Feign client referenced by service name (`lb://`), wrapped with a
Resilience4j circuit breaker.

---

## <a id="security-dup"></a>5. P2 — Duplicated security stack & three internal-auth schemes

- The JWT stack (`JwtService`, `JwtAuthenticationFilter`, `AppUserDetails`, `JwtProperties`,
  `RestAccessDeniedHandler`, `RestAuthenticationEntryPoint`) is **copy-pasted into ~14
  services** with only the package changed. A bug fix must be applied 14 times.
- **Three** internal service-to-service auth mechanisms coexist: `X-Internal-Service-Secret`
  header, service-issued JWT (`ServiceJwtProvider`), and plain `RestTemplate`. Some services
  use two at once. User identity is never propagated on internal calls.

**Recommendation**: extract a **shared security starter module** consumed by all services;
pick **one** internal-auth mechanism and apply it uniformly. Longer term, validate JWTs at the
gateway and propagate identity via trusted headers (see
[backend standards §5](../coding-standards/backend-spring-boot.md#5-security-jwt)).

---

## <a id="tests"></a>6. P1 — No tests

There are **no** `src/test/java` directories anywhere in the backend, despite
`spring-boot-starter-test` being on the classpath. Every service's business logic, mappers,
and the JWT code are untested. Combined with `-DskipTests` in the Dockerfile and no CI gate,
there is **zero** automated verification.

**Recommendation**: start with unit tests for service-layer logic and `JwtService`, then
`@DataJpaTest` repository tests on Testcontainers. Wire into CI as a merge gate.

---

## 7. P2 — Build & config consistency

- **Inline dependency versions** in service POMs (MinIO 8.6.0, POI 5.2.5, Commons CSV 1.10.0
  in crm; Spring AI 1.1.6 in task; AWS SDK 2.25.59 in recruitment) should move to the parent
  `<dependencyManagement>`.
- **No Spring profiles** are used (`spring.profiles.active` unset everywhere) — dev/prod
  differences are only expressed through env-var defaults.
- **`open-in-view`** is missing (defaults to `true`) for hrms/org — a JPA session anti-pattern.
- **`SPRING_MAIN_ALLOW_CIRCULAR_REFERENCES: true`** on CRM in `PRD/compose.yml` masks an
  unresolved circular bean dependency in the CRM context — fix the cycle rather than suppress it.
- **`MinioClient` is `new`-constructed** in `ObjectStorageService`'s constructor rather than a
  Spring bean — untestable and tightly coupled.

---

## 8. P2 — Stub & duplicate code

- **`analytics-service`** returns hardcoded zeros with no schema, yet is routed and registered.
  Implement or remove.
- **`approval-service`** has two near-duplicate internal controllers (`InternalApprovalController`
  → `/internal/approval-flows` and `InternalApprovalsController` → `/internal/approvals`).
  Consolidate.
- **`backend/src/`** — a 53-file legacy monolith that is **not** a Maven module (never compiled
  or deployed). It even commits `Admin@123` in its `application.yml`. **Delete it.**

---

## What's good

- Clean feature-per-service decomposition with per-service databases and Flyway everywhere.
- Parent POM centralizes the Spring Cloud BOM and the Spring Boot plugin.
- `ddl-auto: validate` and `open-in-view: false` are set correctly in most services.
- Consistent `@ConfigurationProperties` usage for structured config.
- The gateway + Eureka + Feign backbone is coherent; JPA Specifications are used well in the
  mature services (crm, sales, identity).
- Where present, `ApiErrorResponse` has a consistent, sensible schema.

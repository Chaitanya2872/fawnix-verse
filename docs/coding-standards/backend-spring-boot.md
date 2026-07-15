# Backend Coding Standards — Spring Boot 3 + Java 17

Applies to everything in `backend/`. Sources are listed per section.

---

## 1. Package structure

- **Package-by-feature with internal layers.** Each feature package owns its controller,
  service, repository, entity, dto, mapper, specification. Follow `com.fawnix.crm` as the
  reference.
- **One root namespace: `com.fawnix.<service>`.** The 8 HirePath services still use
  `com.hirepath.*` (and mismatched Maven groupId) — new work must not extend that namespace,
  and migrating it is an audit item.
- Cross-cutting code lives in `common/` (`exception/`, `response/`, `config/`) and `security/`.
- Use `entity/` for `@Entity` classes (not `domain/`); keep `SecurityConfig` under
  `security/config/`, not the application root package.
- Consider **Spring Modulith** to enforce boundaries in non-trivial services.

_Sources: <https://dev.to/kamlesh_patil/spring-boot-project-structure-best-practices-used-in-production-4h85>_

---

## 2. Layering & DTOs

- Controllers are thin: validate input, delegate to a service, return a DTO. **Never** return
  a JPA entity from a controller.
- Request DTOs: classes with Bean Validation (`@NotBlank`, `@Min`). Response DTOs: Java
  records.
- **Use MapStruct** for entity↔DTO mapping instead of hand-written mappers. Configure a shared
  `@MapperConfig(componentModel = "spring", unmappedTargetPolicy = ERROR)` so unmapped fields
  fail the build.
- Constructor injection everywhere (`@RequiredArgsConstructor`). No field injection.

> Current state: mapping is entirely hand-written `@Component` mappers (consistent, but
> boilerplate). Adopting MapStruct is a refactor, not urgent.

_Sources: <https://www.baeldung.com/mapstruct-ignore-unmapped-properties>, <https://bell-sw.com/blog/ultimate-guide-to-using-dtos-with-spring-boot/>_

---

## 3. Exception handling

- Every service must have a `@RestControllerAdvice` global handler. Prefer Spring Boot 3's
  **`ProblemDetail`** (RFC 7807) as the wire format; the existing `ApiErrorResponse` record is
  an acceptable house standard as long as it is applied **uniformly**.
- Map typed exceptions (`ResourceNotFoundException`, `BadRequestException`,
  `ForbiddenOperationException`) to the right status + a machine-readable `errorCode`.
- Production error config: `server.error.include-message: never`,
  `include-exception: false`.

> Current state: 8 HirePath services have **no** global handler and leak Spring's default
> error body. This breaks the frontend's error contract — see [backend audit](../audit/backend.md).

_Sources: <https://www.baeldung.com/spring-boot-return-errors-problemdetail>_

---

## 4. Spring Cloud (Gateway / Eureka / Feign)

- Gateway routes use `lb://SERVICE-NAME` (Eureka-resolved). **Do not hardcode service URLs.**
  identity-service (hardcoded URL) and `sales → inventory @ localhost:8083` are current
  violations.
- Eureka server disables self-registration (already correct).
- **Feign clients reference the service name**, never a URL (except true third-party APIs).
  Wrap Feign calls with **Resilience4j** circuit breakers before production.
- Standardize **one** internal service-to-service auth mechanism (today there are three:
  header secret, service JWT, plain RestTemplate).

_Sources: <https://dev.to/leriaetnasta/complete-microservices-architecture-with-spring-boot-spring-cloud-eureka-gateway-and-openfeign-5a2m>_

---

## 5. Security (JWT)

- **Validate the JWT at the gateway**, then propagate identity via trusted headers
  (`X-User-Id`, `X-User-Role`). Downstream services act as resource servers and enforce local
  RBAC without re-parsing the token.
- Extract the shared security stack into **one library module** consumed by all services,
  instead of copy-pasting `JwtService`/filters into every service (~14 copies today).
- Access tokens ≤ 15 min; refresh tokens in `httpOnly` cookies; sign with **RS256**
  (distributable public key) rather than a shared symmetric secret.
- **No default secrets.** Validate required secrets at startup (`@Validated`
  `@ConfigurationProperties` with `@NotBlank`) and fail fast if unset. Never ship
  `change-this-local-dev-secret` / `Admin@123` as usable fallbacks.

> Current state: security stack is duplicated per service; default secrets are committed. See
> [security](../audit/security.md).

_Sources: <https://javaguides.net/2025/02/spring-boot-microservices-security-best-practices.html>, <https://oril.co/blog/spring-cloud-gateway-security-with-jwt/>_

---

## 6. Persistence & Flyway

- Migrations: `V{version}__{description}.sql`, double underscore. **Never edit an applied
  migration** — add a new version.
- `spring.jpa.hibernate.ddl-auto: validate` in every environment (Flyway owns the schema).
- Set `spring.jpa.open-in-view: false` (missing in hrms/org today).
- Use JPA **Specifications** for dynamic filtering (already used in crm/sales/identity).

_Sources: <https://reflectoring.io/spring-boot-flyway-testcontainers/>_

---

## 7. Configuration

- `@ConfigurationProperties` (validated records) for structured config; `@Value` only for
  single simple values.
- Use Spring **profiles** (`application-dev.yml`, `application-prod.yml`) — currently none are
  defined.
- Secrets come from env vars / a secret store at runtime, never from committed defaults.

---

## 8. Testing (currently absent — highest-value addition)

There are **zero** tests in the backend. Target:

- **Unit tests** for service-layer business logic (JUnit 5 + Mockito).
- **`@DataJpaTest`** for repositories, backed by **Testcontainers** (`@ServiceConnection`,
  `postgres:16-alpine`, `@AutoConfigureTestDatabase(replace = NONE)`).
- **`@WebMvcTest`** / slice tests for controllers.
- Wire these into CI as a merge gate (see [docker-devops.md](./docker-devops.md)).

_Sources: <https://docs.spring.io/spring-boot/reference/testing/testcontainers.html>, <https://www.baeldung.com/spring-boot-built-in-testcontainers>_

---

## 9. Build & formatting

- Manage all dependency versions in the parent POM (`<dependencyManagement>`). Inline versions
  in service POMs (MinIO, POI, Commons CSV, Spring AI, AWS SDK) should move up.
- Add **Spotless** (`spotless:check` in CI, `spotless:apply` locally) and optionally
  Checkstyle for structure. Fail the build on formatting violations.
- Do not ship `-DskipTests` as the permanent build mode once tests exist.

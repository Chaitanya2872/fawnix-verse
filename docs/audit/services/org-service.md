# org-service — Service Audit

**Audited:** 2026-07-14  
**Root:** `backend/services/org-service`  
**Java package root:** `com.hirepath.org`  
**Auditor:** Claude Sonnet 4.6 (automated static review)

---

## Summary

`org-service` is a Spring Boot 3 / JPA service that manages organisational master data (company profile, departments, business units, teams, locations, designations, org-chart nodes, role mappings, vacancies, and policies) plus a multi-step onboarding "setup wizard". The service was introduced wholesale in a single "integrate HRMS modules" commit (author: Ravi-Shankar-ACS, commit `096c301`) and has had only one follow-up change (Vaishnavi Nerella, `6cf353e`). There are **zero tests**. The most critical issues are: (1) `Map.of("data", null)` throws `NullPointerException` at runtime when the company profile does not exist, (2) a stubbed `/api/setup/employees/import` endpoint that returns a hardcoded `"imported": 12` and does nothing, (3) no service layer — all eight+ repositories are injected directly into controllers, bypassing any transactional boundary, (4) mass duplication of the entire security stack (JWT, filters, handlers) across 14 sibling services with no shared library, and (5) a `Dockerfile EXPOSE 8082` that mismatches the configured server port `8086`.

---

## Surface Map

### Endpoints

| Controller | Method | Path | Notes |
|---|---|---|---|
| `SetupController` | GET | `/api/setup/company` | Returns first CompanyProfile row or null |
| `SetupController` | PUT | `/api/setup/company` | Upsert company profile |
| `SetupController` | GET | `/api/setup/employees` | List all setup_employees |
| `SetupController` | POST | `/api/setup/employees` | Add a setup employee |
| `SetupController` | POST | `/api/setup/employees/import` | **STUB** — returns hardcoded `{"imported":12}` |
| `SetupController` | GET | `/api/setup/policies` | List all policies |
| `SetupController` | GET | `/api/setup/progress` | Multi-source setup progress dashboard |
| `SetupController` | POST | `/api/setup/activate` | Mark setup as activated |
| `OrgAdminController` | GET | `/api/org/business-units` | List business units |
| `OrgAdminController` | POST | `/api/org/business-units` | Create business unit |
| `OrgAdminController` | GET | `/api/org/teams` | List teams |
| `OrgAdminController` | POST | `/api/org/teams` | Create team |
| `OrgAdminController` | GET | `/api/org/org-units` | List org units |
| `OrgAdminController` | POST | `/api/org/org-units` | Create org unit |
| `OrgAdminController` | GET | `/api/org/locations` | List locations |
| `OrgAdminController` | POST | `/api/org/locations` | Create location |
| `OrgAdminController` | GET | `/api/org/designations` | List designations |
| `OrgAdminController` | POST | `/api/org/designations` | Create designation |
| `OrgAdminController` | GET | `/api/org/nodes` | List org-chart nodes |
| `OrgAdminController` | PATCH | `/api/org/nodes/{id}/manager` | Set manager on an org node |
| `OrgAdminController` | GET | `/api/org/role-mappings` | List role mappings |
| `OrgAdminController` | PATCH | `/api/org/role-mappings/{id}` | Update role mapping department |
| `OrgAdminController` | GET | `/api/org/vacancies` | List vacancies |
| `OrgAdminController` | PATCH | `/api/org/vacancies/{id}` | Update vacancy status |
| `DepartmentController` | GET | `/api/departments` | List departments |
| `DepartmentController` | POST | `/api/departments` | Create department |

No DELETE endpoints exist for any entity.

### JPA Entities and Tables

| Entity | Table | PK Strategy | Audit Timestamps |
|---|---|---|---|
| `CompanyProfile` | `company_profile` | `GenerationType.UUID` | `createdAt`, `updatedAt` |
| `Department` | `departments` | `GenerationType.UUID` | `createdAt` only |
| `BusinessUnit` | `business_units` | `GenerationType.UUID` | `createdAt` only |
| `Team` | `teams` | `GenerationType.UUID` | `createdAt` only |
| `Location` | `locations` | `GenerationType.UUID` | `createdAt` only |
| `Designation` | `designations` | `GenerationType.UUID` | `createdAt` only |
| `OrgNode` | `org_nodes` | `GenerationType.UUID` | `createdAt`, `updatedAt` |
| `RoleMapping` | `role_mappings` | `GenerationType.UUID` | `createdAt`, `updatedAt` |
| `Vacancy` | `vacancies` | `GenerationType.UUID` | `createdAt`, `updatedAt` |
| `Policy` | `policies` | `GenerationType.UUID` | `createdAt`, `updatedAt` |
| `SetupEmployee` | `setup_employees` | `GenerationType.UUID` | `createdAt` only |
| `SetupConfig` | `setup_config` | `GenerationType.UUID` | `createdAt`, `updatedAt` |

### Flyway Migrations

| File | Description |
|---|---|
| `V1__create_org_schema.sql` | Creates all 12 tables; no indexes, no unique constraints beyond PKs |

### Outbound Feign Clients

| Client | Target Service | Path | Auth mechanism |
|---|---|---|---|
| `IdentityClient` | `identity-service` | GET `/internal/users/summary` | `X-Internal-Service-Secret` header (via global `RequestInterceptor`) |
| `ApprovalClient` | `approval-service` | GET `/internal/approval-flows/summary` | `X-Internal-Service-Secret` header (via global `RequestInterceptor`) |

---

## Findings

### P0 — Critical / Will Break in Production

---

#### ORG-01 — `Map.of("data", null)` throws `NullPointerException` when company profile absent

**File:** `SetupController.java:76-78`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// SetupController.java:75-78
@GetMapping("/company")
public Map<String, Object> getCompany() {
    CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElse(null);
    return Map.of("data", profile);   // <-- NullPointerException if profile is null
}
```

**Why it is wrong:** `java.util.Map.of()` (JDK 9+) explicitly prohibits null values and throws `NullPointerException` immediately. On a fresh deployment — or any tenant whose onboarding hasn't been seeded — `profile` is `null`, and every call to `GET /api/setup/company` crashes with HTTP 500 instead of returning a clean empty response.

**Fix:**
```java
return profile != null
    ? Map.of("data", profile)
    : Collections.singletonMap("data", null);  // or ResponseEntity with 204
```
A cleaner pattern is `Optional<CompanyProfile>` returned as a `ResponseEntity<?>` with 200/empty body.

---

#### ORG-02 — Stub import endpoint returns fabricated data

**File:** `SetupController.java:119-122`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
@PostMapping("/employees/import")
public Map<String, Object> importEmployees() {
    return Map.of("data", Map.of("imported", 12));
}
```

**Why it is wrong:** This endpoint is exposed (authenticated, no guards) and returns the hardcoded number `12` regardless of any payload. Any frontend that calls `POST /api/setup/employees/import` and reads `"imported"` will display a lie. No actual import happens. There is no `@Deprecated`, no TODO comment, and no feature flag — callers cannot distinguish this from real behavior.

**Fix:** Either (a) throw `501 NOT_IMPLEMENTED` until the feature is built, or (b) implement actual CSV/JSON ingestion and persist records. At minimum:
```java
return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
    .body(Map.of("error", "Employee import is not yet implemented"));
```

---

### P1 — High Severity / Correctness or Security Bug

---

#### ORG-03 — Race condition creating duplicate `company_profile` and `setup_config` rows

**File:** `SetupController.java:89` and `SetupController.java:181`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// line 89 (updateCompany)
CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElseGet(CompanyProfile::new);

// line 181 (activate)
SetupConfig config = setupConfigRepository.findAll().stream().findFirst().orElseGet(SetupConfig::new);
```

**Why it is wrong:** Two concurrent requests — one `PUT /api/setup/company` and one `POST /api/setup/activate` — that arrive before either has saved a row will each find zero rows, call `new CompanyProfile()`/`new SetupConfig()`, and both persist. The result is two rows in `company_profile` (or `setup_config`), neither of which can be distinguished as canonical. `findFirst()` will arbitrarily pick one per request afterward. There is no `UNIQUE` constraint on either table, no `@Lock(PESSIMISTIC_WRITE)`, and no `@Transactional` on these methods to provide isolation.

**Fix:** Add a `UNIQUE` constraint to prevent more than one row (e.g., a singleton sentinel column), and add `@Transactional` with `SERIALIZABLE` isolation on the upsert methods, or use a `findById(SINGLETON_ID)` pattern with a well-known fixed UUID.

---

#### ORG-04 — No `@Transactional` on any write path — multi-step saves are not atomic

**File:** `SetupController.java` (all write methods), `OrgAdminController.java` (all write methods), `SeedDataConfig.java:48-190`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

No `@Transactional` annotation exists anywhere in the service outside of the JPA repository layer. This has two direct consequences:

1. **Seed data:** `SeedDataConfig.java:48-190` calls `save()` / `saveAll()` eleven times across eleven different tables. If the process crashes mid-run, the database is left in a partially seeded state with no rollback.

2. **Org-node parent save (lines 138-142):** `nisha` is saved first to obtain its UUID, then `aarav.setManagerId(nisha.getId())` is called, and `aarav` is saved. If the second save fails, `nisha` remains in the database as an orphaned node without a child that references it. Under concurrent load this is also a race window.

**Fix:** Annotate the `seedOrgData` `CommandLineRunner` lambda body with a helper `@Transactional` `@Bean` or move seed logic into a `@Transactional` service method. Annotate every write-path controller endpoint handler method `@Transactional` (and move the logic into a dedicated `@Service` class so Spring's proxy intercepts it — see ORG-09).

---

#### ORG-05 — JWT issuer claim is never validated

**File:** `JwtService.java:60-66`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
private Claims extractClaims(String token) {
    return Jwts.parser()
        .verifyWith((javax.crypto.SecretKey) getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
}
```

`JwtProperties` stores `issuer: fawnix-verse` (from application.yml line 37), but the parser never calls `.requireIssuer(...)`. Any JWT signed with the same HMAC key but issued by a different service (or a spoofed issuer) will be accepted. In a microservices context where multiple services share the same secret, a token issued by one service is unconditionally accepted by all others.

**Fix:**
```java
return Jwts.parser()
    .verifyWith((javax.crypto.SecretKey) getSigningKey())
    .requireIssuer(jwtProperties.getIssuer())
    .build()
    .parseSignedClaims(token)
    .getPayload();
```

---

#### ORG-06 — Default secrets in application.yml committed to version control

**File:** `application.yml:40-41`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

The fallback strings `change-this-local-dev-secret-change-this-local-dev-secret` and `fawnix-internal-secret` are committed in source control. If environment variables are not set in a deployment, these literal strings become active secrets. Any developer with repo access can forge tokens or call internal endpoints.

**Fix:** Remove the fallback values. Use `${JWT_SECRET}` and `${INTERNAL_SERVICE_SECRET}` without defaults. The application should refuse to start if these are missing. Use Spring's `@ConfigurationProperties` validation with `@NotBlank` or a `@PostConstruct` validation check.

---

#### ORG-07 — Dockerfile EXPOSE port mismatches configured server port

**File:** `Dockerfile:9`, `application.yml:21`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Vaishnavi Nerella

```dockerfile
# Dockerfile:9
EXPOSE 8082
```
```yaml
# application.yml:21
server:
  port: ${SERVER_PORT:8086}
```

The container advertises port `8082` but the application binds to `8086`. Container orchestration tooling (Kubernetes probes, docker-compose port mappings, load-balancer health checks) will attempt to connect to `8082` and find nothing. The service will be marked unhealthy and traffic will not route to it.

**Fix:** Change `EXPOSE 8086` in the Dockerfile, or parameterise both with the same `SERVER_PORT` build arg.

---

#### ORG-08 — `/internal/**` security rule is dead config — no internal routes exist in this service

**File:** `SecurityConfig.java:46`, `InternalServiceAuthFilter.java:27-30`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// SecurityConfig.java:46
.requestMatchers("/internal/**").permitAll()

// InternalServiceAuthFilter.java:27-30
protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path == null || !path.startsWith("/internal/");
}
```

There are no controller routes under `/internal/**` in this service. All `/internal/...` references are on outbound Feign client paths (`IdentityClient`, `ApprovalClient`). The `permitAll()` rule and the `InternalServiceAuthFilter` bean are both loaded and executing per request, adding overhead and giving false confidence that internal endpoints are protected. If someone adds an `/internal/**` controller later without understanding this, the `permitAll()` rule means Spring Security will bypass authentication for it.

**Fix:** Remove the `/internal/**` matcher and `InternalServiceAuthFilter` bean unless internal endpoints are actually added. When adding real internal routes, gate them properly.

---

### P2 — Medium Severity / Design Bugs and Data Integrity

---

#### ORG-09 — No service layer: controllers inject repositories directly, violating layered architecture

**File:** `OrgAdminController.java:46-74` (8 repositories injected), `SetupController.java:38-71` (10 repositories injected)  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// OrgAdminController.java:46-54
private final BusinessUnitRepository businessUnitRepository;
private final TeamRepository teamRepository;
private final OrgUnitRepository orgUnitRepository;
private final LocationRepository locationRepository;
private final DesignationRepository designationRepository;
private final OrgNodeRepository orgNodeRepository;
private final RoleMappingRepository roleMappingRepository;
private final VacancyRepository vacancyRepository;
```

Repositories are Spring Data proxies. `@Transactional` on a controller method will NOT work through the proxy because Spring Security's `DelegatingFilterProxy` calls the controller directly, not through a Spring AOP proxy (controllers are not proxied by default in the same way as `@Service` beans). This means all transactional annotations placed on controller methods in this project are no-ops. Beyond transactionality, the controller is doing business logic (null checks, status parsing, level computation) that belongs in a service class.

**Fix:** Introduce a `@Service` class per aggregate (e.g., `OrgAdminService`, `SetupService`). Move all business logic there. Controllers become thin: parse request, call service, return response. All `@Transactional` annotations go on service methods.

---

#### ORG-10 — `GET /api/setup/progress` issues multiple `findAll()` and `count()` queries in a single request without a transaction

**File:** `SetupController.java:130-176`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// SetupController.java:131-161
CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElse(null);
int departments = (int) departmentRepository.count();
int employees   = (int) employeeRepository.count();
int managers    = (int) orgNodeRepository.findAll().stream()
                        .filter(n -> n.getManagerId() != null).count(); // loads ALL nodes into memory
int locations   = (int) locationRepository.count();
int designations = (int) designationRepository.count();
boolean policiesDone = policyRepository.findAll().stream()
        .anyMatch(policy -> policy.getStatus() == PolicyStatus.CONFIGURED); // loads ALL policies
boolean activated = setupConfigRepository.findAll().stream().findFirst()
        .map(SetupConfig::isActivate).orElse(false);
```

Issues:
1. **`orgNodeRepository.findAll()` at line 140:** Loads every org node into heap just to count how many have `managerId != null`. This should be a `countByManagerIdIsNotNull()` Spring Data method (one SQL `COUNT(...)` query).
2. **`policyRepository.findAll()` at line 149:** Loads every policy to find the first with `CONFIGURED` status. Should be `policyRepository.existsByStatus(PolicyStatus.CONFIGURED)`.
3. **Nine separate database round-trips** in one request with no shared transaction, meaning reads are not consistent with each other.

**Fix:**
```java
// In PolicyRepository:
boolean existsByStatus(PolicyStatus status);
// In OrgNodeRepository:
long countByManagerIdIsNotNull();
```
Wrap the method in `@Transactional(readOnly = true)` on a service class.

---

#### ORG-11 — `findAll().stream().findFirst()` pattern for singleton-pattern tables is used six times

**File:** `SetupController.java:76, 89, 131, 149, 160, 181`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
companyRepository.findAll().stream().findFirst().orElse(null);           // line 76
companyRepository.findAll().stream().findFirst().orElseGet(...)          // line 89
companyRepository.findAll().stream().findFirst().orElse(null);           // line 131
policyRepository.findAll().stream().anyMatch(...)                        // line 149
setupConfigRepository.findAll().stream().findFirst().map(...).orElse(...) // line 160
setupConfigRepository.findAll().stream().findFirst().orElseGet(...)      // line 181
```

`findAll()` loads every row in the table. For `company_profile` and `setup_config` this may be only 1-2 rows today, but it is semantically wrong and will silently degrade as rows accumulate (e.g., due to the race condition in ORG-03). The correct approach is `findFirst()` as a Spring Data method using `findFirstBy()` or a fixed-ID pattern, or `findById(KNOWN_ID)` with a singleton constraint.

**Fix:** Add a `Optional<CompanyProfile> findFirstBy()` or use `findTopBy()` so SQL uses `LIMIT 1` rather than returning all rows.

---

#### ORG-12 — Hierarchy level hardcoded to `0` or `1` regardless of actual depth

**File:** `OrgAdminController.java:178`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
node.setLevel(managerId == null ? 0 : 1);
```

Setting `level = 1` whenever any manager is assigned is wrong. A node two levels deep (an employee who reports to a manager who reports to a VP) will get `level = 1` instead of `level = 2`. The `level` field becomes meaningless for any real org tree deeper than one. The `org_nodes` table has no FK constraint on `manager_id` referencing `org_nodes.id`, so there is also no referential integrity.

**Fix:** Remove the client-managed `level` field entirely and derive depth on read via a recursive CTE in PostgreSQL, or traverse the parent chain at write time:
```sql
WITH RECURSIVE hierarchy AS (...)
SELECT depth FROM hierarchy WHERE id = ?
```
Alternatively, use adjacency-list libraries (e.g., Hibernate's `@OneToMany(mappedBy="parent")`) and compute depth lazily.

---

#### ORG-13 — No email format validation or uniqueness check on `POST /api/setup/employees`

**File:** `SetupController.java:104-116`, `V1__create_org_schema.sql:78-86`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// SetupController.java:105-107
if (request.getName() == null || request.getName().isBlank()
    || request.getEmail() == null || request.getEmail().isBlank()) {
    return ResponseEntity.badRequest().body("Name and email are required");
}
```

The email is only checked for non-blank. Any string (e.g., `"notanemail"`) is persisted. The `setup_employees` table has no `UNIQUE` constraint on `email`, so the same employee can be added multiple times. The `spring-boot-starter-validation` dependency is included in `pom.xml` but unused.

**Fix:** Add `@Email @NotBlank` on `SetupEmployeeRequest.email` and `@Valid` on the `@RequestBody` parameter. Add a unique index:
```sql
ALTER TABLE setup_employees ADD CONSTRAINT uq_setup_employees_email UNIQUE (email);
```

---

#### ORG-14 — Silent swallowing of JWT parse exceptions loses security audit trail

**File:** `JwtAuthenticationFilter.java:55`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
```

Catching `Exception` and naming it `ignored` with no logging means: invalid signatures, expired tokens, malformed JWTs, and unexpected errors are all silently discarded. There is no way to distinguish a brute-force attack from a legitimate clock skew without any logging. The `ignored` variable name is the variable convention for intentional suppression, but here it hides security events.

**Fix:**
```java
} catch (Exception ex) {
    log.warn("JWT authentication failed: {} — {}", ex.getClass().getSimpleName(), ex.getMessage());
    SecurityContextHolder.clearContext();
}
```

---

#### ORG-15 — JWT token is parsed twice per request (redundant `extractClaims` calls)

**File:** `JwtService.java:23-38`, `JwtAuthenticationFilter.java:44-45`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// JwtAuthenticationFilter.java:44-45
AppUserDetails userDetails = jwtService.toUserDetails(token);  // calls extractClaims()
if (jwtService.isTokenValid(token)) {                          // calls extractClaims() again
```

`toUserDetails` and `isTokenValid` each call `extractClaims(token)` independently, meaning the JWT is cryptographically verified twice per request. On high-traffic endpoints this doubles the HMAC computation cost unnecessarily.

**Fix:** Refactor `JwtService` to parse claims once and return a combined result:
```java
public Optional<AppUserDetails> extractValidUserDetails(String token) {
    try {
        Claims claims = extractClaims(token);
        if (claims.getExpiration().toInstant().isAfter(Instant.now())) {
            return Optional.of(buildUserDetails(claims));
        }
    } catch (Exception ex) { /* log */ }
    return Optional.empty();
}
```

---

#### ORG-16 — No `@Valid` / Bean Validation used despite `spring-boot-starter-validation` being on the classpath

**File:** All controller request body parameters; `pom.xml:29-31`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

`spring-boot-starter-validation` is declared as a dependency but `@Valid` is never used on any `@RequestBody` parameter. All validation is hand-rolled in every endpoint handler with `if (x == null || x.isBlank())` checks. This is inconsistent, incomplete (email format, headcount range, timezone validity are never checked), and will diverge as new fields are added.

**Fix:** Annotate DTOs with `@NotBlank`, `@Email`, `@Min`/`@Max` etc., add `@Valid` to `@RequestBody` parameters, and add a `@RestControllerAdvice` `GlobalExceptionHandler` to convert `MethodArgumentNotValidException` to a structured 400 response (see also ORG-17).

---

### P3 — Low Severity / Code Quality and Hygiene

---

#### ORG-17 — Missing `GlobalExceptionHandler`: unhandled exceptions return Spring's default whitelabel error

**File:** (absent — no exception handler class in the package)  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

Six of the sixteen sibling services (`identity-service`, `crm-service`, `task-service`, `inventory-service`, `procurement-service`, `sales-service`) have a `GlobalExceptionHandler`. `org-service` has none. Unhandled `RuntimeException` (e.g., DB constraint violation, Feign timeout not caught by the `safeXxx()` wrappers) will return Spring Boot's default HTML/JSON error page, which leaks stack traces in non-prod profiles and is inconsistent with the structured error JSON returned by the security handlers.

**Fix:** Add:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException ex) { ... }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, Object> handleGeneric(Exception ex) { ... }
}
```

---

#### ORG-18 — `com.hirepath` groupId in `pom.xml` conflicts with parent `com.fawnix` namespace

**File:** `pom.xml:5-11`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```xml
<parent>
  <groupId>com.fawnix</groupId>          <!-- parent is com.fawnix -->
  ...
</parent>
<groupId>com.hirepath</groupId>          <!-- this module is com.hirepath -->
<artifactId>org-service</artifactId>
```

The monorepo's parent POM (`com.fawnix:verse-backend`) was rebranded to `com.fawnix`, but the org-service (and several sibling services introduced in the HRMS integration commit) still declare `com.hirepath` as their own `groupId` and use `com.hirepath.org` as their Java package root. This naming inconsistency complicates dependency management, internal library extraction, and CI artifact publication. Newer services (`crm-service`, `identity-service`) correctly use `com.fawnix`.

**Fix:** Rename the `groupId` to `com.fawnix` and migrate the Java package root from `com.hirepath.org` to `com.fawnix.org` in a coordinated rename.

---

#### ORG-19 — Timezone string is stored without validation

**File:** `SetupController.java:85-93`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// SetupController.java:85
|| request.getTimezone() == null || request.getTimezone().isBlank()) {
// ...
profile.setTimezone(request.getTimezone());   // line 93
```

Any string is accepted as a timezone identifier (e.g., `"potato"`, `"UTC+5:30"`, `"IST"`). When this string is later used in application logic (e.g., scheduling, leave calculations, payroll) to create a `ZoneId`, it will throw `DateTimeException` at runtime.

**Fix:**
```java
try {
    ZoneId.of(request.getTimezone());
} catch (DateTimeException e) {
    return ResponseEntity.badRequest().body("Invalid timezone identifier");
}
```

---

#### ORG-20 — `ObjectMapper` instantiated as a field on each handler instance

**File:** `RestAuthenticationEntryPoint.java:19`, `RestAccessDeniedHandler.java:19`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// RestAuthenticationEntryPoint.java:19
private final ObjectMapper objectMapper = new ObjectMapper();
// RestAccessDeniedHandler.java:19
private final ObjectMapper objectMapper = new ObjectMapper();
```

`ObjectMapper` is thread-safe after construction and is heavyweight (it loads reflection metadata). Creating one per bean class is wasteful; not injecting the shared Spring-managed `ObjectMapper` bean means custom configuration (date formats, modules like JavaTimeModule) from the Spring Boot auto-configuration is not applied. Dates serialized by these handlers may not match the format used elsewhere in the API.

**Fix:** Inject `ObjectMapper` via constructor:
```java
private final ObjectMapper objectMapper;
public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
}
```

---

#### ORG-21 — `SeedDataConfig` mixes business logic with configuration and commits hardcoded personal names

**File:** `SeedDataConfig.java:48-190`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS [migrated]

The 192-line `CommandLineRunner` populates twelve tables with hardcoded individual names (`"Nisha Kapoor"`, `"Aarav Mehta"`, `"Meera Rao"`, `"Rohan Sen"`), hardcoded company name `"HirePath Technologies"`, and hardcoded email domains. These names appear to be placeholder data that has never been replaced. If this service is ever deployed to a real customer environment, the customer's org data will contain these names.

Additionally, `SeedDataConfig` both acts as application configuration (`@Configuration`) and as a data migration layer, a responsibility that belongs in Flyway scripts (for repeatable seed data) or a separate `@Profile("dev")` component.

**Fix:** Move seed data to a `data.sql` loaded by `@Sql` under `@Profile("dev")` or to a Flyway `R__` (repeatable) migration. Remove hardcoded names.

---

#### ORG-22 — No `@Column(unique = true)` or SQL UNIQUE constraint on department/designation/location names

**File:** `V1__create_org_schema.sql:18-35`, domain entities  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

Tables `departments`, `designations`, `locations`, `org_units` have no unique constraint on `name`. A user can create `"Engineering"` department five times. The application code does not check for duplicates before saving. This corrupts master data that other modules reference by name (e.g., `Team.department` is a plain `String` field, not a FK).

**Fix:**
```sql
ALTER TABLE departments  ADD CONSTRAINT uq_departments_name  UNIQUE (name);
ALTER TABLE designations ADD CONSTRAINT uq_designations_name UNIQUE (name);
ALTER TABLE locations    ADD CONSTRAINT uq_locations_name    UNIQUE (name);
ALTER TABLE org_units    ADD CONSTRAINT uq_org_units_name    UNIQUE (name);
```

---

#### ORG-23 — `department` field in `Team`, `OrgNode`, `RoleMapping`, `Vacancy` is a plain `String` with no FK

**File:** `Team.java:27`, `OrgNode.java:31`, `RoleMapping.java:25`, `Vacancy.java:29`; `V1__create_org_schema.sql`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
// Team.java:27
@Column(nullable = false)
private String department;
```

Every entity that references a department stores its name as a free-text string rather than as a FK to `departments.id`. If a department is renamed or deleted (no delete endpoint exists yet, but could be added), all referencing records become stale silently. There is no referential integrity anywhere in the schema for this relationship.

**Fix:** Replace `String department` with a `@ManyToOne @JoinColumn(name = "department_id")` reference to `Department`, and add the corresponding FK columns and constraints in a new Flyway migration.

---

## Redundancy

The following pairs are near-identical copies with only the package name changed. Any bug fix or enhancement must be applied to all copies manually.

| Clone A (org-service) | Clone B (other service) | Notes |
|---|---|---|
| `org-service/.../security/jwt/JwtService.java` | `approval-service/.../security/jwt/JwtService.java` | Identical except `package` line. Logic diff: zero. 14 copies total across the monorepo. |
| `org-service/.../security/service/AppUserDetails.java` | `approval-service/.../security/service/AppUserDetails.java` | Identical except `package` line. 14 copies. |
| `org-service/.../security/filter/JwtAuthenticationFilter.java` | `approval-service/.../security/filter/JwtAuthenticationFilter.java` | Identical except `package` line. ~8 copies. |
| `org-service/.../security/filter/InternalServiceAuthFilter.java` | `approval-service/.../security/filter/InternalServiceAuthFilter.java` | Identical except `package` line. 8 copies. |
| `org-service/.../security/jwt/JwtProperties.java` | (all services that have it) | Same 45-line class. |
| `org-service/.../security/config/SecurityConfig.java` | `approval-service/.../security/config/SecurityConfig.java` | Functionally identical. |
| `org-service/.../security/handler/RestAuthenticationEntryPoint.java` | Duplicated in all hirepath-namespaced services | Same body. |
| `org-service/.../security/handler/RestAccessDeniedHandler.java` | Duplicated in all hirepath-namespaced services | Same body. |
| `org-service/.../client/dto/UserSummaryResponse.java` | `identity-service/.../users/dto/UserSummaryResponse.java` | Same fields but org-service uses a JavaBean, identity-service uses a Java record. Field names compatible; the identity-service is the source of truth. |

**Concrete file:line pairs:**

- `org-service/.../security/jwt/JwtService.java:68-72` ↔ `approval-service/.../security/jwt/JwtService.java:68-72` — `getSigningKey()` is character-for-character identical logic.  
- `org-service/.../security/config/SecurityConfig.java:36-53` ↔ `approval-service/.../security/config/SecurityConfig.java` — Both use identical `securityFilterChain` bean, same filter order.

**Recommendation:** Extract a `fawnix-security-starter` shared library module containing `JwtService`, `JwtProperties`, `AppUserDetails`, `JwtAuthenticationFilter`, `InternalServiceAuthFilter`, `RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`, and `SecurityConfig`. Each service declares it as a dependency. This would eliminate ~400 lines of copied code per service and allow a single fix point for ORG-05 and ORG-15.

---

## Tests & Gaps

**Test coverage: zero.** The directory `src/test/` does not exist. `spring-boot-starter-test` is in `pom.xml` as a test-scope dependency but no test classes have ever been written.

There is no test for:
- The NullPointerException in `getCompany()` when no profile exists (ORG-01).
- The stub import endpoint (ORG-02).
- The race condition in `updateCompany` / `activate` (ORG-03).
- JWT validation logic.
- The progress computation endpoint (8 DB calls, two Feign calls).
- Seeding idempotence.

**Recommended test additions (priority order):**
1. `SetupControllerTest` — unit test `getCompany()` with empty repository returns a safe response (catches ORG-01).
2. `JwtServiceTest` — verify `isTokenValid()` rejects expired tokens and tokens with wrong issuer.
3. `SetupControllerIntegrationTest` — verify `GET /api/setup/progress` with no seed data does not throw.
4. `OrgAdminControllerTest` — verify `PATCH /api/org/nodes/{id}/manager` with invalid UUID returns 400.

---

## Coverage Note

**Fully inspected:**
- All 3 controllers (every endpoint, every line of handler logic).
- All 12 entity classes.
- Single Flyway migration `V1__create_org_schema.sql`.
- Both Feign clients and their DTOs.
- Entire security stack (SecurityConfig, JwtService, JwtProperties, JwtAuthenticationFilter, InternalServiceAuthFilter, RestAuthenticationEntryPoint, RestAccessDeniedHandler, AppUserDetails).
- `SeedDataConfig` and `InternalServiceConfig`.
- `application.yml` and `pom.xml`.
- `Dockerfile`.

**Skimmed / not deeply inspected:**
- Repository interfaces (all are empty extends of `JpaRepository` — nothing to inspect).
- DTO classes (straightforward JavaBeans; reviewed field names for semantic issues only).
- `OrgServiceApplication.java` (4-line bootstrapper, no logic).

**Cross-service comparisons performed:**
- Confirmed security stack duplication across 14 services.
- Confirmed `UserSummaryResponse` DTO mismatch (org-service JavaBean vs identity-service record).
- Confirmed absence of `GlobalExceptionHandler` vs its presence in 6 other services.

**Confidence overall:** High for all findings. No Low-confidence guesses were included; every finding is backed by reading the actual source lines cited.

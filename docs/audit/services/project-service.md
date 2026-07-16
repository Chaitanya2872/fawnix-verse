# project-service — Service Audit

**Audited:** 2026-07-14
**Root:** `backend/services/project-service`
**Auditor:** Claude Code (automated, exhaustive)

---

## Summary

`project-service` is a Spring Boot microservice that manages Projects and Project Meetings (two independent bounded contexts in one service). The codebase is clean and well-structured with package-by-feature layout and no `com.hirepath` namespace leakage. The headline risks are: (1) **no `GlobalExceptionHandler`** — Bean Validation errors return Spring's white-label JSON with stack traces; (2) a **redundant JWT parse per request** (two full token verifications per call instead of one); (3) `String.valueOf(claims.get("name"))` stores the literal string `"null"` in `created_by_name` when the JWT `name` claim is absent; and (4) `getSummary()` loads every project row including multi-kilobyte JSON payload columns just to count by status — a preventable full-table scan that gets worse over time.

---

## Surface Map

### Endpoints

| Method | Path | Controller | Service Method |
|--------|------|------------|----------------|
| GET | `/api/v1/projects` | `ProjectController` | `listProjects()` |
| GET | `/api/v1/projects/summary` | `ProjectController` | `getSummary()` |
| GET | `/api/v1/projects/{id}` | `ProjectController` | `getProject(id)` |
| POST | `/api/v1/projects` | `ProjectController` | `createProject(request, user)` |
| PUT | `/api/v1/projects/{id}` | `ProjectController` | `updateProject(id, request)` |
| GET | `/api/v1/project-meetings` | `ProjectMeetingController` | `listMeetings(projectId?)` |
| GET | `/api/v1/project-meetings/{id}` | `ProjectMeetingController` | `getMeeting(id)` |
| POST | `/api/v1/project-meetings` | `ProjectMeetingController` | `createMeeting(request, user)` |
| PUT | `/api/v1/project-meetings/{id}` | `ProjectMeetingController` | `updateMeeting(id, request)` |
| PATCH | `/api/v1/project-meetings/{id}/status` | `ProjectMeetingController` | `updateStatus(id, request)` |
| DELETE | `/api/v1/project-meetings/{id}` | `ProjectMeetingController` | `deleteMeeting(id)` |

Note: There is no `DELETE /api/v1/projects/{id}` and no `PATCH /api/v1/projects/{id}/status` endpoint. Project status transitions are implicitly set only at creation (`PENDING_CREATION_APPROVAL`); there is no status-machine mechanism for projects exposed via this service.

### Entities / Tables

| Entity Class | Table | Primary Key Strategy | Notable Columns |
|---|---|---|---|
| `ProjectEntity` | `projects` | UUID string via `@PrePersist` | `team_members_payload text`, `team_payload text`, `details_payload text` (JSON stored as raw text) |
| `ProjectMeetingEntity` | `project_meetings` | UUID string via `@PrePersist` | FK `project_id` → `projects(id)` ON DELETE SET NULL; 5 JSON text columns |

### Flyway Migrations

| Version | File | Summary |
|---------|------|---------|
| V1 | `V1__create_projects.sql` | Creates `projects` table with base columns; index on `updated_at desc` |
| V2 | `V2__expand_project_fields.sql` | Adds `project_code`, `department`, `manager_name`, `priority_level`, `progress_percent`, `team_size` |
| V3 | `V3__persist_team_data.sql` | Adds `team_lead_name`, `team_members_payload`, `team_payload` |
| V4 | `V4__persist_project_details_payload.sql` | Adds `details_payload` |
| V5 | `V5__create_project_meetings.sql` | Creates `project_meetings` table with FK to `projects`; 3 indexes |

### Outbound HTTP Calls

None. No Feign client, `RestTemplate`, or `WebClient` is present. The service is self-contained.

### Security Wiring

- `SecurityConfig`: CSRF disabled, stateless sessions, `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`
- All paths require authentication except `/actuator/health` and `/actuator/info`
- `@EnableMethodSecurity` is declared but **no `@PreAuthorize` annotations exist anywhere** — method-level security is enabled but unused
- JWT is validated in `JwtAuthenticationFilter` using `JwtService` backed by `JwtProperties` (`@ConfigurationProperties(prefix="app.security.jwt")`)

---

## Findings

### P1 — High Severity

---

**PRO-01** — Missing `GlobalExceptionHandler`: Bean Validation errors expose Spring internals
- **File:** Service-wide (no file exists for this)
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending pattern:**
```java
// In ProjectController.java (line 46-50):
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public ProjectDtos.ProjectResponse createProject(
    @Valid @RequestBody ProjectDtos.ProjectRequest request, ...
```

**Why it is wrong:**
When `@Valid` fails (e.g., `name` is blank, `startDate` is null), Spring throws `MethodArgumentNotValidException`. Without a `@ControllerAdvice` / `GlobalExceptionHandler`, Spring Boot returns its default error response which either includes a raw stack trace (in non-production profiles) or an unhelpfully terse JSON. The client cannot distinguish which field failed validation or act on the response programmatically. Six other services in this monorepo (`procurement-service`, `inventory-service`, `identity-service`, `sales-service`, `crm-service`, `task-service`) already have a `GlobalExceptionHandler` — this service is the outlier.

**Proper fix:**
Create `com/fawnix/project/common/exception/GlobalExceptionHandler.java`:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .toList();
        return Map.of("status", 400, "errors", errors);
    }
    // Also handle HttpMessageNotReadableException, ResponseStatusException, etc.
}
```

---

**PRO-02** — `getSummary()` loads entire `projects` table into memory to count rows
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:68-88`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// ProjectService.java lines 68-88
public ProjectDtos.ProjectSummaryResponse getSummary() {
    List<ProjectEntity> projects = projectRepository.findAll();  // loads ALL columns including JSON blobs
    LocalDate today = LocalDate.now();

    long active = projects.stream()
        .filter(project -> project.getStatus() == ProjectStatus.IN_PROGRESS || ...)
        .count();
    // ... 4 more stream passes over same list
}
```

**Why it is wrong:**
`findAll()` loads the entire `projects` table including the three `text` JSON columns (`team_members_payload`, `team_payload`, `details_payload`), which can be multiple kilobytes per row. Only `status` and `target_end_date` are actually used. On a table with hundreds or thousands of projects this becomes a significant memory and I/O bottleneck. All five counts can be done by the database in a single query.

**Proper fix:**
Add a JPQL projection query to `ProjectRepository`:
```java
@Query("""
    SELECT p.status, COUNT(p), SUM(CASE WHEN p.targetEndDate < CURRENT_DATE THEN 1 ELSE 0 END)
    FROM ProjectEntity p GROUP BY p.status
""")
List<Object[]> countByStatus();
```
Or use five individual `@Query` count methods and call them in parallel. Do not use `findAll()` for aggregate operations.

---

**PRO-03** — `String.valueOf(claims.get(...))` stores literal `"null"` string in `created_by_name`
- **File:** `src/main/java/com/fawnix/project/security/jwt/JwtService.java:27-28`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtService.java lines 26-29
return new AppUserDetails(
    claims.getSubject(),
    String.valueOf(claims.get("email")),  // if "email" absent → "null"
    String.valueOf(claims.get("name")),   // if "name" absent  → "null"
    extractRoles(claims),
    extractPermissions(claims)
);
```

**Why it is wrong:**
`String.valueOf(null)` returns the four-character string `"null"`, not `null`. If a JWT is issued without a `name` or `email` claim (e.g., a service-to-service token, a malformed token that passes signature validation), `AppUserDetails.getFullName()` returns `"null"`. In `ProjectService.createProject` (line 52), `trimToNull(user.getFullName())` is called — but `trimToNull` only null-ifies blank strings; `"null"` is not blank, so the string `"null"` gets written to `created_by_name` in the database. The same path exists for `created_by_id` in `ProjectMeetingService` (lines 62-65). The exact same bug exists in `procurement-service`'s `JwtService` (line 27-28) indicating copy-paste propagation.

**Proper fix:**
```java
// In JwtService.toUserDetails:
String email = claims.get("email") instanceof String s ? s : null;
String name  = claims.get("name")  instanceof String s ? s : null;
return new AppUserDetails(claims.getSubject(), email, name, extractRoles(claims), extractPermissions(claims));
```

---

### P2 — Medium Severity

---

**PRO-04** — JWT token is parsed twice per authenticated request (redundant `isTokenValid` call)
- **File:** `src/main/java/com/fawnix/project/security/filter/JwtAuthenticationFilter.java:44-45`
  and `src/main/java/com/fawnix/project/security/jwt/JwtService.java:34-38`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtAuthenticationFilter.java lines 44-45
AppUserDetails userDetails = jwtService.toUserDetails(token);   // parses + verifies JWT #1
if (jwtService.isTokenValid(token)) {                           // parses + verifies JWT #2
```

**Why it is wrong:**
`toUserDetails(token)` calls `extractClaims(token)`, which calls `Jwts.parser().verifyWith(...).build().parseSignedClaims(token)`. This performs full HMAC signature verification and expiry checks. JJWT 0.12.x (used here) throws `ExpiredJwtException` automatically inside `parseSignedClaims` if the token is expired — so if `toUserDetails` completes without throwing, the token is already proven valid. The subsequent `isTokenValid(token)` call parses and verifies the token a second time, returning a value that is always `true` at that point. This is wasted CPU on every authenticated request and is a copy-paste artefact visible in `procurement-service`'s filter as well.

**Proper fix:**
```java
// JwtAuthenticationFilter.java - remove the redundant check:
try {
    AppUserDetails userDetails = jwtService.toUserDetails(token); // validates & parses in one shot
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
        userDetails, null, userDetails.getAuthorities());
    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
    SecurityContextHolder.getContext().setAuthentication(auth);
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);
```

---

**PRO-05** — `getSigningKey()` double-encodes the JWT secret without charset specification
- **File:** `src/main/java/com/fawnix/project/security/jwt/JwtService.java:68-72`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtService.java lines 68-72
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()  // platform default charset!
    )));
}
```

**Why it is wrong:**
The operation `Decoders.BASE64.decode(Base64.encode(secret.getBytes()))` is semantically equivalent to `secret.getBytes()` — the base64 encode and decode cancel each other out. This means the key is derived directly from the UTF-8 (or platform-default) bytes of the raw secret string, not from a properly base64-decoded secret. Two specific problems arise:
1. `getBytes()` without `StandardCharsets.UTF_8` uses the JVM's default platform charset, which can differ between development (macOS/Linux UTF-8) and a container (potentially a different locale), producing different keys and silently breaking JWT verification.
2. The conventional and documented JJWT pattern is to store the secret as a Base64-encoded string in config and call `Decoders.BASE64.decode(secret)` directly — not to double-encode a raw string. If `identity-service` ever issues tokens with a properly base64-encoded secret while `project-service` applies this double-encode, tokens will fail to verify.

The same bug exists in `procurement-service/JwtService.java:69-71` and `crm-service/JwtService.java:134-136`, confirming copy-paste spread.

**Proper fix:**
```java
private Key getSigningKey() {
    // Store secret as base64 string in config; decode it once here
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
}
// In application.yml, set: secret: ${JWT_SECRET:<base64-of-your-key>}
```

---

**PRO-06** — `@EnableMethodSecurity` declared but zero `@PreAuthorize` annotations exist
- **File:** `src/main/java/com/fawnix/project/SecurityConfig.java:15`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SecurityConfig.java line 15
@EnableMethodSecurity
public class SecurityConfig {
```

**Why it is wrong:**
`@EnableMethodSecurity` is a no-op unless combined with `@PreAuthorize`, `@PostAuthorize`, or `@Secured` on individual methods. No such annotations exist anywhere in this service. Any authenticated user — regardless of role — can create, update, or list all projects and meetings. There is no distinction between a read-only viewer role and an admin role. If future developers add `@PreAuthorize` annotations expecting method security to work they will not notice it was already enabled; if they need to turn it off they may be confused by an annotation whose effects they cannot observe.

**Proper fix:**
Either add role-based guards (`@PreAuthorize("hasAuthority('PROJECT_WRITE')")`) on mutating endpoints, or remove `@EnableMethodSecurity` until the team is ready to implement role guards. At minimum document the decision.

---

**PRO-07** — No `unique` constraint on `project_code` column
- **File:** `src/main/resources/db/migration/V2__expand_project_fields.sql`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```sql
-- V2__expand_project_fields.sql lines 1-7
alter table projects
  add column if not exists project_code varchar(40),
  ...
```

**Why it is wrong:**
`project_code` is semantically a business identifier (e.g., "PROJ-001"). It is surfaced to users in the API response and used as a display key in the meeting entity (`project_code` is denormalized into `project_meetings`). Without a unique constraint, duplicate project codes can be inserted by concurrent requests or by client error, silently corrupting the dataset. There is also no application-level uniqueness check.

**Proper fix:**
```sql
-- V6__add_project_code_unique.sql
ALTER TABLE projects ADD CONSTRAINT uq_projects_project_code UNIQUE (project_code);
```
Add a null-safe check in `ProjectService.createProject` / `updateProject` using `projectRepository.existsByProjectCodeAndIdNot(code, id)` or catch `DataIntegrityViolationException` in a `GlobalExceptionHandler`.

---

**PRO-08** — Denormalized `project_name`/`project_code` in `project_meetings` becomes stale on project rename
- **File:** `src/main/java/com/fawnix/project/meetings/service/ProjectMeetingService.java:104-106`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Vaishnavi Nerella

**Offending code:**
```java
// ProjectMeetingService.java lines 104-106
entity.setProjectId(project == null ? trimToNull(request.projectId()) : project.getId());
entity.setProjectName(project == null ? trimToNull(request.projectName()) : project.getName());
entity.setProjectCode(project == null ? trimToNull(request.projectCode()) : project.getProjectCode());
```

**Why it is wrong:**
When a meeting is created or updated with a valid `projectId`, the project's `name` and `code` are copied into the meeting row at that instant. If the project is subsequently renamed or its code is changed via `PUT /api/v1/projects/{id}`, all existing meetings retain the stale name and code. There is no cascading update mechanism. For audit and display purposes this produces silently incorrect data.

**Proper fix:**
Two options:
1. **Preferred (normalized):** Remove `project_name` and `project_code` from `project_meetings`. When fetching meetings, JOIN with the `projects` table. This requires a migration to drop those columns.
2. **Acceptable (event-driven):** If denormalization is intentional for performance, add a service method in `ProjectMeetingService` that is called whenever a project is updated: `meetingRepository.updateProjectNameAndCode(projectId, newName, newCode)` with a `@Modifying @Query`.

---

**PRO-09** — `getSummary()` uses `LocalDate.now()` without timezone — server-timezone-dependent
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:70`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// ProjectService.java line 70
LocalDate today = LocalDate.now();
```

**Why it is wrong:**
`LocalDate.now()` uses the JVM's default timezone (`ZoneId.systemDefault()`). In a Dockerized deployment on UTC and a business operating in IST (+5:30), `today` at 23:30 UTC is already "tomorrow" IST. A project due today IST would not yet be flagged as overdue at 23:30 UTC, but would appear overdue at 00:01 IST. The correct practice is to use `LocalDate.now(ZoneId.of("Asia/Kolkata"))` or, better, pass the desired timezone from the caller via a request parameter.

**Proper fix:**
```java
// Option A: explicit UTC if all dates are stored and compared in UTC:
LocalDate today = LocalDate.now(ZoneOffset.UTC);

// Option B: caller-specified zone (adds a @RequestParam to the endpoint):
LocalDate today = LocalDate.now(ZoneId.of(requestedZoneId));
```

---

### P3 — Low Severity / Code Quality

---

**PRO-10** — `trimToNull` private method duplicated verbatim in both service classes
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:142-147`
  vs `src/main/java/com/fawnix/project/meetings/service/ProjectMeetingService.java:179-184`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// Identical in both files
private String trimToNull(String value) {
    if (value == null || value.isBlank()) {
        return null;
    }
    return value.trim();
}
```

**Why it is wrong:**
Pure duplication. Any change (e.g., adding `"null"` string handling to fix PRO-03) must be made in both places.

**Proper fix:**
Extract to a package-accessible utility: `com/fawnix/project/common/StringUtils.java` with a static method. Apache Commons Lang `StringUtils.trimToNull` also provides this.

---

**PRO-11** — `writeJson` private method duplicated verbatim in both service classes
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:163-169`
  vs `src/main/java/com/fawnix/project/meetings/service/ProjectMeetingService.java:186-192`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

**Offending code:**
```java
// ProjectService.java lines 163-169
private String writeJson(Object value) {
    try {
        return objectMapper.writeValueAsString(value == null ? Collections.emptyList() : value);
    } catch (JsonProcessingException exception) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to store team data.", exception);
    }
}
// ProjectMeetingService.java lines 186-192 — identical except error message text
```

**Proper fix:**
Extract to a `JsonUtils` helper or a shared `AbstractJsonService` base class. Alternatively, inject a shared `@Component JsonHelper` that both services depend on.

---

**PRO-12** — `catch (Exception ignored)` in JWT filter silently swallows all token errors
- **File:** `src/main/java/com/fawnix/project/security/filter/JwtAuthenticationFilter.java:54-56`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtAuthenticationFilter.java lines 54-56
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);  // request continues unauthenticated!
```

**Why it is wrong:**
Any exception during JWT processing — including `SignatureException`, `MalformedJwtException`, `ExpiredJwtException`, and even `OutOfMemoryError` sub-classes — is swallowed. The request continues down the filter chain as unauthenticated and will be rejected by Spring Security with a 401, but no log entry is produced. This makes it impossible to detect replay attacks, token tampering, or misconfigured keys in production without enabling full debug-level security logging. The variable name `ignored` is honest but the absence of any logging is not acceptable for a security filter.

**Proper fix:**
```java
} catch (ExpiredJwtException e) {
    log.debug("Rejected expired JWT: {}", e.getMessage());
    SecurityContextHolder.clearContext();
} catch (JwtException e) {
    log.warn("Invalid JWT token: {}", e.getMessage());
    SecurityContextHolder.clearContext();
}
// Let request proceed; Spring Security will 401 it.
```

---

**PRO-13** — `JwtProperties` fields use `long` but `JwtProperties` in sibling services use `int`
- **File:** `src/main/java/com/fawnix/project/security/jwt/JwtProperties.java:8-9`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtProperties.java lines 8-9 (project-service)
private long accessTokenExpirationMinutes;
private long refreshTokenExpirationDays;

// procurement-service JwtProperties.java lines 8-9
private int accessTokenExpirationMinutes;
private int refreshTokenExpirationDays;
```

**Why it is wrong:**
The same config class exists with different numeric types across services. While `long` is more correct (wider type, no overflow risk), the inconsistency indicates copy-paste divergence. If configuration-property binding behaves differently between services (e.g., one truncates, one overflows), debugging will be subtle. All services should agree on a type — `long` is preferable.

**Proper fix:**
Standardize across all services to `long` and align the `JwtProperties` class in `procurement-service`, `crm-service`, `sales-service`, and others that use `int`.

---

**PRO-14** — `listProjects()` fetches all projects with full JSON payload for every `GET /api/v1/projects`
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:33-37`
- **Severity:** P3 | **Confidence:** Med

**Offending code:**
```java
// ProjectService.java lines 33-37
public List<ProjectDtos.ProjectResponse> listProjects() {
    return projectRepository.findAllByOrderByUpdatedAtDescCreatedAtDesc().stream()
        .map(this::toResponse)
        .toList();
}
```

**Why it is wrong:**
There is no pagination, filtering, or projection. Every call returns every project row in full including JSON blobs. As the number of projects grows this becomes a progressively slower unbounded read. The `ProjectResponse` record itself contains `JsonNode details` (arbitrary blob), `List<String> teamMembers`, and `List<TeamMemberPayload> team` — all deserialized per row per call.

**Proper fix:**
Add `Pageable` support:
```java
@GetMapping
public Page<ProjectDtos.ProjectSummary> listProjects(Pageable pageable) {
    return projectService.listProjects(pageable);
}
```
Introduce a lightweight `ProjectSummary` DTO that omits the JSON payload fields for the list view.

---

**PRO-15** — Missing FK relationship annotation between `ProjectMeetingEntity` and `ProjectEntity`
- **File:** `src/main/java/com/fawnix/project/meetings/domain/ProjectMeetingEntity.java:22-23`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Vaishnavi Nerella

**Offending code:**
```java
// ProjectMeetingEntity.java lines 22-23
@Column(name = "project_id", length = 36)
private String projectId;  // raw String FK, not @ManyToOne
```

**Why it is wrong:**
The database enforces a FK from `project_meetings.project_id` to `projects.id` (V5 migration, line 29-31). The JPA entity does not model this relationship with `@ManyToOne` / `@JoinColumn`. This means JPA is unaware of the relationship: it cannot validate referential integrity at the ORM level, cannot lazy-load the related project, and a `ddl-auto: validate` run may produce warnings. The `ProjectMeetingService` manually resolves the project via a separate `projectRepository.findById()` call outside the entity graph.

**Proper fix:**
Add the JPA relationship:
```java
@ManyToOne(fetch = FetchType.LAZY, optional = true)
@JoinColumn(name = "project_id", foreignKey = @ForeignKey(name = "fk_project_meetings_project"))
private ProjectEntity project;
```
Then remove `projectName` and `projectCode` columns from the entity (fix for PRO-08 combined).

---

**PRO-16** — `start_date`/`target_end_date` equal dates are accepted as valid
- **File:** `src/main/java/com/fawnix/project/projects/service/ProjectService.java:136-140`
- **Severity:** P3 | **Confidence:** Med

**Offending code:**
```java
// ProjectService.java lines 136-140
private void validateDates(ProjectDtos.ProjectRequest request) {
    if (request.targetEndDate().isBefore(request.startDate())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target end date cannot be before start date.");
    }
}
```

**Why it is wrong:**
`isBefore` permits `startDate == targetEndDate`, creating a project with zero duration. Whether this is intentional (a single-day project) or an oversight depends on business requirements, but it is not validated or documented.

**Proper fix (if single-day is invalid):**
```java
if (!request.targetEndDate().isAfter(request.startDate())) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target end date must be after start date.");
}
```

---

## Redundancy

The following are verbatim duplications between files within this service and between this service and sibling services:

### Within project-service

| Clone A | Clone B | Notes |
|---------|---------|-------|
| `ProjectService.java:142-147` (`trimToNull`) | `ProjectMeetingService.java:179-184` (`trimToNull`) | Byte-for-byte identical |
| `ProjectService.java:163-169` (`writeJson`) | `ProjectMeetingService.java:186-192` (`writeJson`) | Identical logic, only error message string differs |

### Cross-service security stack copies

The entire `security/` package (`JwtService`, `JwtAuthenticationFilter`, `JwtProperties`, `AppUserDetails`, `RestAccessDeniedHandler`, `RestAuthenticationEntryPoint`, `SecurityConfig`) is copied and individually maintained across at least 10 services. Confirmed copies of `AppUserDetails`:

- `project-service`: `com/fawnix/project/security/service/AppUserDetails.java`
- `procurement-service`: `com/fawnix/procurement/security/service/AppUserDetails.java`
- `inventory-service`: `com/fawnix/inventory/security/service/AppUserDetails.java`
- `sales-service`: `com/fawnix/sales/security/service/AppUserDetails.java`
- `crm-service`: (presumed same pattern)
- + 5 more under `com.hirepath` namespace

This copy-paste security stack is the root cause of PRO-03, PRO-04, PRO-05, and PRO-13. A shared `fawnix-security-starter` library should house this code and be declared as a Maven dependency by each service.

---

## Tests & Gaps

**Test coverage: zero.**

There is no `src/test` directory in `project-service`. The entire service — two controllers, two services, a JWT filter, date validation, JSON serialization, and project-to-meeting resolution logic — has no unit tests, no integration tests, and no slice tests (`@WebMvcTest`, `@DataJpaTest`).

Immediate gaps that should be covered first:

1. `JwtAuthenticationFilter` — test that a tampered signature is rejected, that an expired token produces 401, and that a missing token is rejected (not silently passed).
2. `ProjectService.getSummary()` — test each counter (active, overdue, completed) independently against a known dataset.
3. `ProjectService.validateDates()` — test rejection of reversed dates, acceptance of same-day (documents intended behavior).
4. `ProjectMeetingService.applyRequest()` — test the three branches: no `projectId` + no `projectName` → 400; valid `projectId` → name/code from DB; no `projectId` + `projectName` → name from request.
5. `JwtService.toUserDetails()` — test that missing `name` claim does not produce `"null"` string (this test would catch PRO-03).

---

## Coverage Note

**Fully inspected:**
- All 21 Java source files read line-by-line
- All 5 Flyway migrations read in full
- `application.yml` read in full
- `pom.xml` read in full
- Cross-service comparisons made for `JwtService`, `JwtProperties`, `AppUserDetails`, `RestAccessDeniedHandler`, `GlobalExceptionHandler` presence

**Partially inspected / skimmed:**
- Sibling service source files: only targeted `grep`s were run, not full reads. The cross-service redundancy count may be an undercount.
- The `com.hirepath` services (`analytics-service`, `approval-service`, etc.) were checked for presence of security copies but not audited for content differences.

**Not inspected:**
- Gateway/API gateway routing configuration — it is unknown whether the gateway strips or re-validates JWT before forwarding to this service (if it does, the double-parse in PRO-04 is even more redundant since the gateway already validated).
- Docker/CI configuration files for this service.

**Overall audit confidence: High** for all findings listed. Severity assessments assume a production-grade system with real user data; adjust P2→P3 if the service is purely internal-dev-only.

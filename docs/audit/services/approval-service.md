# approval-service — Service Audit

**Audit date:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated deep-read)  
**Root:** `backend/services/approval-service`  
**Package namespace:** `com.hirepath.approval` (groupId: `com.hirepath`, parent groupId: `com.fawnix` — namespace mismatch)

---

## Summary

The approval-service implements a multi-stage, role-based approval workflow engine with inbox/outbox queues, SLA tracking, and automatic overdue notifications. The core business logic is well-structured with clear separation of concerns across `ApprovalRequestService`, `ApprovalQueryService`, and `ApprovalAccessService`. However, the service carries **two P1 scalability bombs** (unbounded `findAll()` for admin history and full in-memory pagination for inbox/outbox), **one P0 security gap** (hardcoded default internal secret committed in source), and **complete absence of tests**. A secondary concern is that HTTP Feign calls to external services are made inside `@Transactional` method boundaries, holding DB connections open during network I/O.

---

## Surface Map

### Endpoints

| Controller | Method | Path | Auth |
|---|---|---|---|
| `ApprovalRequestController` | POST | `/api/approvals/requests` | JWT |
| `ApprovalRequestController` | GET | `/api/approvals/requests/{id}` | JWT |
| `ApprovalRequestController` | POST | `/api/approvals/requests/{id}/actions` | JWT |
| `ApprovalRequestController` | GET | `/api/approvals/inbox` | JWT |
| `ApprovalRequestController` | GET | `/api/approvals/outbox` | JWT |
| `ApprovalRequestController` | GET | `/api/approvals/history` | JWT |
| `ApprovalRequestController` | GET | `/api/approvals/kpis` | JWT |
| `ApprovalFlowController` | GET | `/api/approval-flows` | JWT (no role) |
| `ApprovalFlowController` | GET | `/api/approval-flows/{id}` | JWT (no role) |
| `ApprovalFlowController` | POST | `/api/approval-flows` | ROLE_ADMIN, ROLE_REPORTING_MANAGER, ROLE_HR_MANAGER |
| `ApprovalFlowController` | PATCH | `/api/approval-flows/{id}` | ROLE_ADMIN, ROLE_REPORTING_MANAGER, ROLE_HR_MANAGER |
| `ApprovalFlowController` | POST | `/api/approval-flows/{id}/deactivate` | ROLE_ADMIN, ROLE_REPORTING_MANAGER, ROLE_HR_MANAGER |
| `InternalApprovalController` | GET | `/internal/approval-flows/summary` | X-Internal-Service-Secret |
| `InternalApprovalController` | GET | `/internal/approval-flows/{id}` | X-Internal-Service-Secret |
| `InternalApprovalsController` | POST | `/internal/approvals/requests` | X-Internal-Service-Secret |
| `InternalApprovalsController` | POST | `/internal/approvals/requests/{id}/actions` | X-Internal-Service-Secret |
| `InternalApprovalsController` | GET | `/internal/approvals/status` | X-Internal-Service-Secret |
| `InternalApprovalsController` | GET | `/internal/approvals/requests` | X-Internal-Service-Secret |

**Note:** Two separate internal controllers exist (`InternalApprovalController` for flows, `InternalApprovalsController` for requests). The naming is confusing and inconsistent (singular vs plural).

### Entities / Tables

| Entity | Table |
|---|---|
| `ApprovalFlow` | `approval_flows` |
| `ApprovalFlowStage` | `approval_flow_stages` |
| `ApprovalRequest` | `approval_requests` |
| `ApprovalRequestStage` | `approval_request_stages` |
| `ApprovalRequestAssignment` | `approval_request_assignments` |
| `ApprovalAction` | `approval_actions` |

### Flyway Migrations

| Migration | Description |
|---|---|
| `V1__create_approval_schema.sql` | Creates `approval_flows` and `approval_flow_stages` (no FK, no `version`/`status`/`requires_all`/`sla_days` columns) |
| `V2__approval_requests.sql` | Creates all other tables; adds missing columns to V1 tables via `ALTER TABLE`; adds all FKs and indexes |
| `V3__approval_overdue_notifications.sql` | Adds `overdue_notified_at` to `approval_request_stages` |

### Feign Clients (Outbound)

| Client | Service | Endpoint |
|---|---|---|
| `NotificationsClient` | `notifications-service` | POST `/internal/notifications/events` |
| `RecruitmentApprovalClient` | `recruitment-service` | POST `/internal/recruitment/approvals/status` |

---

## Findings

### P0 — Critical

---

#### APP-01: Hardcoded Default Internal Service Secret Committed in Source

**File:** `src/main/resources/application.yml:41`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```yaml
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Why it is wrong:** The fallback value `fawnix-internal-secret` is a well-known string now committed in version control. Any attacker or insider who reads this repo can call any `/internal/**` endpoint without having deployed infrastructure. The same default is replicated across at least 6 other services in this monorepo (`analytics-service`, `org-service`, `task-service`, `integration-service`, `notifications-service`, and `approval-service`), meaning a single leaked value compromises the entire internal API surface across all services.

**Proper fix:** Remove the fallback default entirely so the application fails fast if the environment variable is not injected. The filter already falls back gracefully to `""` (empty string) via its own `@Value` fallback — but that means if the YAML key is evaluated with an empty result, any request with an empty header value would be accepted. Force a startup failure instead:

```yaml
internal-service-secret: ${INTERNAL_SERVICE_SECRET}   # no fallback — fail at startup if not set
```

And in `InternalServiceAuthFilter.java`, validate the secret is not blank on construction:
```java
public InternalServiceAuthFilter(@Value("${app.security.internal-service-secret}") String secret) {
    if (secret == null || secret.isBlank()) {
        throw new IllegalStateException("app.security.internal-service-secret must be set");
    }
    this.internalServiceSecret = secret;
}
```

---

### P1 — High

---

#### APP-02: Unbounded `findAll()` for Admin History Loads Entire Table Into JVM Heap

**File:** `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:83`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
if (accessService.isAdminOrHr(user)) {
    return requestRepository.findAll().stream()
        .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
        .toList();
}
```

**Why it is wrong:** Any `ROLE_ADMIN` or `ROLE_HR_MANAGER` user hitting `GET /api/approvals/history` causes a full table scan of `approval_requests` with all cascade-loaded stages and actions loaded into memory. With 10,000 requests in production, this query will fetch all of them, sort them in Java, then discard most during the subsequent `paginate()` call. The total pages loaded equals O(n) regardless of the requested page size.

**Proper fix:** Push filtering, sorting, and pagination to the database using Spring Data's `Pageable` + `JpaSpecificationExecutor` (already on the repository). Move the admin branch to a database-side query with filters applied as `Specification` predicates.

```java
// In repository
Page<ApprovalRequest> findAll(Specification<ApprovalRequest> spec, Pageable pageable);

// In service
Specification<ApprovalRequest> spec = buildSpec(status, module, entityType, entityId, priority);
Page<ApprovalRequest> page = requestRepository.findAll(spec, PageRequest.of(skip / limit, limit, Sort.by("createdAt").descending()));
```

---

#### APP-03: In-Memory Pagination of Entire Inbox/Outbox — Full Dataset Loaded Per Request

**File:** `src/main/java/com/hirepath/approval/controller/ApprovalRequestController.java:106-111`, `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:45-75`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
List<ApprovalRequest> requests = queryService.applyFilters(
    queryService.inbox(user), status, module, entityType, entityId, priority, overdue, query);
int total = requests.size();
List<ApprovalRequestSummaryResponse> data = queryService.paginate(requests, skip, limit).stream()...
```

**Why it is wrong:** `inbox(user)` fetches every assignment for the user from the database, then navigates the object graph to collect parent requests. All filtering, sorting, and pagination then happen in Java. For a user with 500 pending approvals, the controller loads all 500 objects into memory on every page request. Combined with the `outbox()` method hardcoding `PageRequest.of(0, 1000)`, the effective ceiling is 1,000 outbox items per user before silent truncation occurs.

**Proper fix:** Rewrite `inbox()`, `outbox()`, and `history()` to accept filter and `Pageable` parameters, and execute a single JPQL or Specification query that pushes WHERE clauses and `LIMIT/OFFSET` to PostgreSQL. The `applyFilters()` and `paginate()` utility methods should be deleted.

---

#### APP-04: HTTP Feign Calls Inside `@Transactional` Boundaries Hold DB Connections Open During Network I/O

**File:** `src/main/java/com/hirepath/approval/service/ApprovalRequestService.java:61, 130-132, 159, 190-191, 277`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
@Transactional                               // line 61 — createRequest
public ApprovalRequest createRequest(...) {
    ...
    ApprovalRequest saved = requestRepository.save(entity);  // line 130
    if (submit && firstStage != null) {
        notificationService.notifyAssignments(saved, firstStage);  // line 132 — Feign HTTP call INSIDE tx
    }
    return saved;
}

@Transactional                               // line 159 — handleAction
public ApprovalRequest handleAction(...) {
    ...
    ApprovalRequest saved = requestRepository.save(request);  // line 276
    moduleSyncService.syncFinalStatus(saved);                // line 277 — Feign HTTP call INSIDE tx
    return saved;
}
```

**Why it is wrong:** The DB connection and transaction remain open while the JVM waits for the HTTP response from `notifications-service` and `recruitment-service`. Under any load, this delays connection pool return and increases connection wait time for concurrent requests. If the downstream service times out (default Feign timeout is no timeout), the DB connection is held for the full duration. The same pattern appears in `advanceToNextStage()` (line 454) which is called from within `handleAction`.

**Proper fix:** Publish an application event after the `save()` and commit, then send notifications/syncs in a `@TransactionalEventListener(phase = AFTER_COMMIT)`:

```java
// After save
requestRepository.save(entity);
applicationEventPublisher.publishEvent(new ApprovalCreatedEvent(saved, firstStage));

// In listener (separate Spring bean)
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onApprovalCreated(ApprovalCreatedEvent event) {
    notificationService.notifyAssignments(event.getRequest(), event.getStage());
}
```

---

#### APP-05: `ApprovalRequestAssignmentRepository.findByAssignee` Triggers N+1 Queries in `inbox()`

**File:** `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:52-59`, `src/main/java/com/hirepath/approval/repository/ApprovalRequestAssignmentRepository.java:15-16`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// ApprovalQueryService.java lines 52-59
List<ApprovalRequestAssignment> assignments = assignmentRepository.findByAssignee(AssigneeType.USER, user.getUserId());
collectInbox(assignments, requestIds, results);
if (user.getRoleNames() != null) {
    for (String role : user.getRoleNames()) {
        for (String roleKey : roleKeys(role)) {     // up to 3 variants per role
            assignments = assignmentRepository.findByAssignee(AssigneeType.ROLE, roleKey);
```

```java
// ApprovalRequestAssignmentRepository.java line 15
@Query("select a from ApprovalRequestAssignment a where a.assigneeType = :type and a.assigneeValue = :value")
List<ApprovalRequestAssignment> findByAssignee(...)
```

**Why it is wrong:** For a user with 2 roles, `inbox()` fires `1 + (2 roles × 3 role-key variants) = 7` separate database queries. The JPQL query has no `JOIN FETCH`, so each `ApprovalRequestAssignment` returned then eagerly loads its `@ManyToOne ApprovalRequestStage`, which in turn eagerly loads its `@ManyToOne ApprovalRequest` — each as a separate SELECT. For a user with 50 active assignments, this balloons to 7 initial queries + up to 100 additional lazy/eager selects.

**Proper fix:** Rewrite as a single JPQL with JOIN FETCH, or use a native SQL that joins all four tables. Also consolidate role-key normalization so only one variant is stored/queried:

```java
@EntityGraph(attributePaths = {"stage", "stage.request", "stage.request.currentStage"})
@Query("""
    select a from ApprovalRequestAssignment a
    where (a.assigneeType = 'USER' and a.assigneeValue = :userId)
       or (a.assigneeType = 'ROLE' and a.assigneeValue in :roleKeys)
""")
List<ApprovalRequestAssignment> findByUserOrRoles(
    @Param("userId") String userId,
    @Param("roleKeys") List<String> roleKeys
);
```

---

### P2 — Medium

---

#### APP-06: Repository Injected Directly Into Controller, Bypassing Service Layer

**File:** `src/main/java/com/hirepath/approval/controller/InternalApprovalsController.java:31, 37-42, 92`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private final ApprovalRequestRepository requestRepository;

public InternalApprovalsController(
    ...
    ApprovalRequestRepository requestRepository   // repository in controller constructor
) {

// line 92
requestRepository.findAll()                       // direct DB call in controller
```

**Why it is wrong:** Controllers should never depend directly on repositories. This bypasses any transactional semantics, caching, or future validation logic that belongs in the service layer. `requestRepository.findAll()` here also has no `@EntityGraph`, which means `ApprovalRequest.stages` and `.actions` are LAZY and will throw `LazyInitializationException` when the mapper tries to access them outside a session (or trigger N+1 if still in-session).

**Proper fix:** Move the `findAll()` + filter logic to `ApprovalQueryService.listAll(module, entityType, entityId)` and call the service from the controller.

---

#### APP-07: `computeKpis` Sets Both `"total"` and `"sent"` to the Same Value — One Is Wrong

**File:** `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:163-165`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
counts.put("total", requests.size());
counts.put("sent", requests.size());   // always equals "total" — meaningless
```

**Why it is wrong:** `sent` is always identical to `total` because both come from `requests.size()`. When `scope=inbox`, `sent` should likely represent requests where the caller is the assignee, not the requester. This means every dashboard client reading `kpis` gets a misleading `sent` number.

**Proper fix:** Remove `"sent"` or compute it meaningfully (e.g., the count of requests where the current user is the requester, derived separately from the current `scope`).

---

#### APP-08: `ApprovalFlow` Entity Has Redundant / Desyncable `status` String Field Alongside `active` Boolean

**File:** `src/main/java/com/hirepath/approval/domain/ApprovalFlow.java:34-41`, `80-82`, `95-98`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
@Column(name = "is_active", nullable = false)
private boolean active = true;

@Column(name = "status")
private String status = "active";

public void setActive(boolean active) {
    this.active = active;
    this.status = active ? "active" : "inactive";  // tied together here
}

public void setStatus(String status) {
    this.status = status;   // but can be set independently — breaking the invariant
}
```

**Why it is wrong:** `setStatus(String)` is public and does not update `active`. Any caller using `setStatus("inactive")` will leave `active = true`, making `isActive()` and `getStatus()` return contradictory values. `ApprovalFlowService.deactivate()` correctly calls both, but the public `setStatus` is a footgun. Additionally, `ApprovalFlowService.update()` (line 82) calls `flow.setStatus(request.getStatus())` directly without updating `active`.

**Proper fix:** Remove `setStatus(String)` and the `status` column. Derive the status string dynamically: `public String getStatus() { return active ? "active" : "inactive"; }`. If the column must exist for queries, synchronize it only through `setActive()`.

---

#### APP-09: `parseDueAt` and `serializePayload` Silently Swallow Exceptions

**File:** `src/main/java/com/hirepath/approval/service/ApprovalRequestService.java:339-348`, `350-359`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private OffsetDateTime parseDueAt(String dueAt) {
    ...
    try {
        return OffsetDateTime.parse(dueAt);
    } catch (Exception ex) {
        return null;    // silently drops malformed input, stores null
    }
}

private String serializePayload(Map<String, Object> payload) {
    ...
    try {
        return objectMapper.writeValueAsString(payload);
    } catch (JsonProcessingException ex) {
        return null;    // silently loses payload data
    }
}
```

**Why it is wrong:** A requester submitting `due_at: "not-a-date"` gets a 201 Created with the due date silently ignored. The payload snapshot being silently null means audit trail data is lost without any indication. Both errors should be surfaced as 400 Bad Request.

**Proper fix:**
```java
private OffsetDateTime parseDueAt(String dueAt) {
    try {
        return OffsetDateTime.parse(dueAt);
    } catch (DateTimeParseException ex) {
        throw new IllegalArgumentException("Invalid due_at format, expected ISO-8601 offset date-time");
    }
}
```

---

#### APP-10: No `GlobalExceptionHandler` — Unhandled Exceptions Return Raw Spring Error Payloads

**File:** (entire service — no `@RestControllerAdvice` exists)  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

**Why it is wrong:** Exceptions other than `IllegalArgumentException` (e.g., `DataIntegrityViolationException` from a duplicate `entity_id` insert, `NumberFormatException` from a bad UUID path variable, any unchecked JPA exception) propagate through Spring's default `BasicErrorController` and return a response body containing Java stack traces or Spring's default `{timestamp, status, error, path}` shape — inconsistent with the `{message: ...}` and `{data: ...}` shapes used by the service. At least 6 sibling services (`identity-service`, `procurement-service`, `crm-service`, `task-service`, `sales-service`, `inventory-service`) already have a `GlobalExceptionHandler`. This service is missing one entirely.

**Proper fix:** Add a `@RestControllerAdvice` class mirroring the pattern in sibling services:
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadRequest(IllegalArgumentException ex) {
        return Map.of("message", ex.getMessage());
    }
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, String> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return Map.of("message", "Internal server error");
    }
}
```

---

#### APP-11: `normalizeRole` Duplicated Across Three Classes

**File:** `src/main/java/com/hirepath/approval/service/ApprovalAccessService.java:98-106`, `ApprovalRequestService.java:555-563`, `ApprovalQueryService.java:242-251`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// Identical private method in all three classes:
private String normalizeRole(String role) {
    if (role == null) { return ""; }
    String normalized = role.trim().toLowerCase(Locale.ROOT);  // ApprovalQueryService uses toLowerCase() without Locale
    if (normalized.startsWith("role_")) { normalized = normalized.substring(5); }
    return normalized;
}
```

Note: `ApprovalAccessService.java:102` uses `.toLowerCase()` (no Locale argument), while the other two use `.toLowerCase(Locale.ROOT)` — a subtle locale inconsistency.

**Why it is wrong:** Three identical copies of the same logic with a diverged locale arg. Any future change (e.g., supporting `ROLE_` suffix) must be made in three places.

**Proper fix:** Extract to a shared utility class, e.g., `RoleNormalizer.normalize(String role)`, and reference it from all three classes.

---

#### APP-12: `JWT_SECRET` Default Value Committed in Source

**File:** `src/main/resources/application.yml:40`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
```

**Why it is wrong:** The fallback value `change-this-local-dev-secret-change-this-local-dev-secret` is a well-known string in source. If `JWT_SECRET` is not set in a deployment (e.g., a staging environment where secrets are not yet injected), all JWT tokens signed with this known key can be forged by anyone who reads the repository. The same default appears identically across multiple other services, compounding the exposure.

**Proper fix:** Remove the fallback so the application fails at startup if `JWT_SECRET` is not provided. Additionally, validate secret strength in `JwtProperties` setter.

---

#### APP-13: Double Base64-Encoding in JWT Signing Key Construction

**File:** `src/main/java/com/hirepath/approval/security/jwt/JwtService.java:68-71`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
}
```

**Why it is wrong:** `getSecret()` returns a plain-text string from YAML. The code Base64-encodes it (`Base64.getEncoder().encodeToString()`), then immediately Base64-decodes it (`Decoders.BASE64.decode()`), which perfectly cancels out — making the roundtrip a no-op. The net result is `Keys.hmacShaKeyFor(secret.getBytes())`, which is fine. However, the double-encoding strongly implies the developer intended `JWT_SECRET` to be a Base64-encoded string (which would be the correct pattern), but since it is stored as plain text in application.yml, the Base64 decode operates on what is actually a Base64-of-plain-text string. If someone ever stores the secret as a raw Base64 value (e.g., from `openssl rand -base64 32`), the decoding will strip the Base64 wrapper, and the actual key bytes will differ from what they intend. The pattern is cargo-culted from identity-service without adaptation.

**Proper fix:** Decide whether `JWT_SECRET` is plain text or Base64-encoded and commit to one approach:
```java
// If the secret is stored as-is (plain text):
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
}
// If the secret is stored as a Base64 value (recommended for production):
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
}
```
Document the chosen format in the secret's environment variable description.

---

#### APP-14: Docker `EXPOSE` Port Mismatches `application.yml` Default

**File:** `Dockerfile:9` vs `src/main/resources/application.yml:21`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```dockerfile
EXPOSE 8085    # Dockerfile
```
```yaml
port: ${SERVER_PORT:8088}   # application.yml default
```

**Why it is wrong:** The `EXPOSE` directive is documentation-only in Docker, but it signals to container orchestration tools (Kubernetes, Compose) what port to expect. A mismatch means automated healthchecks and service mesh configuration will point at the wrong port if they read `EXPOSE`. Developers configuring port forwarding will get silent misses.

**Proper fix:** Change `EXPOSE` to `8088` to match the application default. Alternatively, use a build argument:
```dockerfile
ARG SERVER_PORT=8088
ENV SERVER_PORT=${SERVER_PORT}
EXPOSE ${SERVER_PORT}
```

---

#### APP-15: Dockerfile Disables TLS/SSL Verification During Maven Build

**File:** `Dockerfile:4`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```dockerfile
RUN mvn -q -DskipTests \
    -Dmaven.wagon.http.ssl.insecure=true \
    -Dmaven.wagon.http.ssl.allowall=true \
    ...
    -Dcom.sun.net.ssl.checkRevocation=false \
    ...
    package
```

**Why it is wrong:** This disables certificate validation on all HTTP connections Maven makes during the build (dependency downloads, plugin downloads). A man-in-the-middle attack on the build environment's network can inject malicious JARs. This pattern appeared in 7 other service Dockerfiles in the monorepo, indicating it was blindly copy-pasted to resolve a local TLS connectivity issue rather than fixing the root certificate trust problem.

**Proper fix:** Fix the root cause — configure a trusted CA certificate bundle in the Docker base image or configure an internal Nexus/Artifactory mirror with a valid certificate. Remove all SSL bypass flags.

---

### P3 — Low / Informational

---

#### APP-16: `com.hirepath` Package Namespace with `com.fawnix` Parent groupId

**File:** `pom.xml:5-11`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```xml
<parent>
    <groupId>com.fawnix</groupId>    <!-- platform namespace -->
</parent>
<groupId>com.hirepath</groupId>     <!-- different namespace for this service -->
<artifactId>approval-service</artifactId>
```

**Why it is wrong:** The platform's parent POM uses `com.fawnix`. Eight services use `com.hirepath` as their root package (the HirePath product name that was integrated into fawnix-verse). This creates an inconsistent namespace within the same monorepo. IDE navigation, grep patterns, and Spring Boot's component scanning conventions all assume a consistent base package.

**Proper fix:** Migrate to `com.fawnix.approval` incrementally (rename packages, update pom.xml groupId). The migration should be done in one committed step per service to keep history clean.

---

#### APP-17: Inline Fully-Qualified Class Reference in `outbox()` Method

**File:** `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:72`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
return requestRepository.findByRequesterId(
    user.getUserId(),
    org.springframework.data.domain.PageRequest.of(0, 1000)   // inline fully-qualified name
).getContent()
```

**Why it is wrong:** Inline fully-qualified type names indicate the import was forgotten. It makes the code harder to read and breaks code formatting tools. The hardcoded `1000` limit is also a silent truncation ceiling — a requester with more than 1,000 outbox items will silently lose visibility of older ones.

**Proper fix:** Add the import and make the limit configurable or truly unbounded:
```java
import org.springframework.data.domain.PageRequest;
// Use Pageable parameter threading for real DB pagination instead.
```

---

#### APP-18: `ApprovalOverdueScheduler` Configuration Key Missing from `application.yml`

**File:** `src/main/java/com/hirepath/approval/scheduler/ApprovalOverdueScheduler.java:17`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
@Scheduled(fixedDelayString = "${approvals.overdue.scan-ms:600000}")
```

**Why it is wrong:** The `approvals.overdue.scan-ms` property is used but not declared in `application.yml`. Any operator wanting to tune the overdue scan interval has no discoverable configuration key — they must read the Java code. The default of 10 minutes (600,000 ms) is also not documented.

**Proper fix:** Add to `application.yml`:
```yaml
approvals:
  overdue:
    scan-ms: 600000   # 10 minutes; tune per environment
```

---

#### APP-19: Missing Unique Constraint on `(module, entity_type, entity_id)` in `approval_requests`

**File:** `src/main/resources/db/migration/V2__approval_requests.sql:1-19`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```sql
create table if not exists approval_requests (
  ...
  module varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id varchar(255) not null,
  ...
  -- no unique constraint on (module, entity_type, entity_id)
);
```

**Why it is wrong:** The `GET /internal/approvals/status` endpoint and `findByEntity()` method use `LIMIT 1` semantics (returns a single `ApprovalRequest` from a JPQL query that could return multiple rows). Nothing prevents two concurrent callers from creating duplicate active approval requests for the same entity. This can cause inconsistent status reporting across services.

**Proper fix:** Add a partial unique index for active requests:
```sql
create unique index idx_approval_requests_active_entity
  on approval_requests(module, entity_type, entity_id)
  where status not in ('approved','rejected','cancelled');
```

---

#### APP-20: GET `/api/approval-flows` Has No Role Restriction — All Authenticated Users Can List Flows

**File:** `src/main/java/com/hirepath/approval/controller/ApprovalFlowController.java:37-47`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```java
@GetMapping
public Map<String, List<ApprovalFlowResponse>> list(...)  // no @PreAuthorize
```

**Why it is wrong:** Any authenticated employee can enumerate all approval flows, including their stage configurations, approver user IDs, and role requirements. This exposes internal organizational structure (who approves what) to all users. Write endpoints (POST, PATCH, deactivate) are gated behind manager/admin roles, but the read endpoint is not.

**Proper fix:** Add `@PreAuthorize("isAuthenticated()")` minimally, or restrict to the same roles as mutation endpoints if flow structure is considered sensitive.

---

#### APP-21: `JwtAuthenticationFilter` Silently Swallows All JWT Exceptions

**File:** `src/main/java/com/hirepath/approval/security/filter/JwtAuthenticationFilter.java:55-57`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
```

**Why it is wrong:** A malformed token, an expired token, and a tampered token all produce the same silent outcome: request proceeds unauthenticated. This means `anyRequest().authenticated()` is the only backstop — protected endpoints will return 401, but there is no log entry distinguishing a valid anonymous request from a replay attack using a known-expired token.

**Proper fix:** Log at WARN level with the exception message (not the full stack trace):
```java
} catch (ExpiredJwtException ex) {
    log.warn("Expired JWT token for path {}: {}", request.getRequestURI(), ex.getMessage());
    SecurityContextHolder.clearContext();
} catch (Exception ex) {
    log.warn("Invalid JWT token for path {}: {}", request.getRequestURI(), ex.getMessage());
    SecurityContextHolder.clearContext();
}
```

---

#### APP-22: `isOverdue` Logic Duplicated in Two Service Classes

**File:** `src/main/java/com/hirepath/approval/service/ApprovalQueryService.java:217-228` vs `src/main/java/com/hirepath/approval/service/ApprovalMapper.java:158-175`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

Two separate `private boolean isOverdue(ApprovalRequest request)` methods with slightly different null-check logic (the Mapper checks `request.getStatus() == null`; the QueryService does not). If the overdue definition changes (e.g., adding a DRAFT exclusion), it must be updated in two places and the diverged null-check path may cause subtle bugs.

**Proper fix:** Move to a package-level helper or `ApprovalAccessService` and call it from both consumers.

---

## Redundancy

### Cross-Service Security Stack Duplication

The following files are near-identical copies pasted across multiple services. Diff confirms 0 meaningful line differences except for package names:

| File | Approval-Service Path | Counterpart (same logic) |
|---|---|---|
| `InternalServiceAuthFilter` | `.../approval/security/filter/InternalServiceAuthFilter.java:1-45` | `.../org/security/filter/InternalServiceAuthFilter.java`, `.../analytics/security/filter/InternalServiceAuthFilter.java`, `.../recruitment/security/filter/InternalServiceAuthFilter.java`, and 4 more |
| `JwtAuthenticationFilter` | `.../approval/security/filter/JwtAuthenticationFilter.java:1-61` | `.../org/security/filter/JwtAuthenticationFilter.java`, `.../recruitment/security/filter/JwtAuthenticationFilter.java`, and 7 more |
| `InternalServiceConfig` | `.../approval/config/InternalServiceConfig.java:1-17` | `.../org/config/InternalServiceConfig.java`, `.../task/config/InternalServiceConfig.java`, and 3 more |

**Impact:** Any security bug (e.g., the silent bypass if `internalServiceSecret` is empty) must be fixed in 8+ places. This is the primary source of the APP-01 and APP-21 risks.

**Fix:** Extract into a shared `security-common` library module under `backend/libs/` and declare it as a dependency in each service's pom.xml.

---

### Internal `normalizeRole` Duplication Within This Service

| Instance A | Instance B | Instance C |
|---|---|---|
| `ApprovalAccessService.java:98-106` | `ApprovalRequestService.java:555-563` | `ApprovalQueryService.java:242-251` |

See APP-11.

---

### Duplicate `isOverdue` Within This Service

| Instance A | Instance B |
|---|---|
| `ApprovalQueryService.java:217-228` | `ApprovalMapper.java:158-175` |

See APP-22.

---

### Two Internal Controllers With Confusing Naming

`InternalApprovalController` (singular, for flows) and `InternalApprovalsController` (plural, for requests) serve different entities but reside in the same package. The one-letter naming difference (`Approval` vs `Approvals`) is easy to miss and creates editor confusion when navigating by class name.

---

## Tests & Gaps

**No `src/test` directory exists.** The `pom.xml` includes `spring-boot-starter-test` as a test dependency, but there are zero test classes anywhere under `approval-service`.

### Untested Critical Paths

The following are highest risk given zero test coverage:

1. **Multi-stage advancement (`advanceToNextStage`)** — the branching logic for `requiresAll` vs single-approver, admin force-approve, and resubmit all mutate complex state with no test coverage.
2. **Role normalization in access checks** — `canAct` uses `normalizeRole` three times with different callers; mismatches between role storage format and assignment values would silently fail access checks.
3. **`handleAction` state machine** — 7 action types (APPROVED, REJECTED, CHANGES_REQUESTED, CANCELLED, RESUBMITTED, CREATED, DELEGATED) with branching on `requiresAll` and assignment existence.
4. **Overdue scheduler** — `notifyOverdueStages` modifies `overdueNotifiedAt` in a transaction; any bug means either repeated notifications or missed notifications.
5. **Inbox deduplication** — `collectInbox` uses a `requestIds` set to prevent duplicates from appearing multiple times; edge cases (user both a direct assignee AND has the matching role) are untested.

### Recommended Test Additions (Priority Order)

1. `ApprovalRequestServiceTest` — unit test `handleAction` state transitions with mocked repositories.
2. `ApprovalQueryServiceTest` — unit test `inbox()` deduplication, role normalization paths, and `applyFilters()` behavior.
3. `ApprovalFlowServiceTest` — test `deactivate()` does not protect against pending requests, `update()` stage replacement.
4. Integration test for the full create-→-approve-→-advance-→-approve-→-approved pipeline.
5. Security filter tests: `InternalServiceAuthFilter` with correct/incorrect/empty secret.

---

## Coverage Note

**Fully inspected (every line read):**
- All 4 controllers
- All 6 entity classes
- All 5 repository interfaces
- All 7 service classes
- All 3 Flyway migrations
- `SecurityConfig`, `JwtAuthenticationFilter`, `InternalServiceAuthFilter`, `JwtService`, `JwtProperties`, `AppUserDetails`
- `application.yml`, `pom.xml`, `Dockerfile`
- All DTOs in `dto/` and `client/dto/`
- `InternalServiceConfig`, `ApprovalOverdueScheduler`

**Skimmed / spot-checked:**
- Cross-service comparison (checked package names, key method signatures, `normalizeRole` body) for redundancy identification
- Did not read the `ApprovalActionRepository` implementation (it is empty — extends `JpaRepository<ApprovalAction, UUID>` with no custom methods)

**Overall confidence:** High for correctness bugs and security findings. Medium for the uniqueness constraint gap (APP-19) — the code assumes single active requests per entity but the constraint enforcement in concurrent scenarios was not load-tested.

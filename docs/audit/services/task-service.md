# task-service — Service Audit

## Summary

`task-service` manages hierarchical tasks, task spaces, time logging, approval flows, and AI-assisted task import. The service is structurally sound and uses Flyway migrations correctly; it contains a proper `GlobalExceptionHandler`, real bean-validation on DTOs, and a working JWT security stack. However, `TaskService.java` (2,190 lines) is a severe god-class, every query that lists tasks calls `taskRepository.findAll()` loading every row in the database into the JVM for in-process filtering, permission checks per task each issue further individual SELECT queries, and the JWT signing-key derivation contains a double-encoding bug that will fail with any secret whose Base64 decode produces the key the team actually intends. The namespace is still `com.hirepath` (legacy HRMS namespace), conflicting with the parent groupId of `com.fawnix`, and there are zero automated tests.

---

## Surface Map

### Endpoints — `TaskController` (base path `/api/tasks`)

| Method | Path | Service Method |
|--------|------|---------------|
| POST | `/api/tasks` | `createTask` |
| POST | `/api/tasks/import-notes` | `importTasksFromNotes` |
| GET | `/api/tasks` | `listTasks` |
| GET | `/api/tasks/tree` | `treeTasks` |
| GET | `/api/tasks/{id}` | `getTask` |
| GET | `/api/tasks/{id}/subtasks` | `getSubtasks` |
| PUT | `/api/tasks/{id}` | `updateTask` |
| PUT | `/api/tasks/{id}/status` | `updateTaskStatus` |
| PUT | `/api/tasks/{id}/hierarchy` | `reorderHierarchy` |
| DELETE | `/api/tasks/{id}` | `deleteTask` |
| POST | `/api/tasks/{id}/comments` | `addComment` |
| GET | `/api/tasks/{id}/comments` | `listComments` |
| POST | `/api/tasks/{id}/checklist` | `addChecklistItem` |
| POST | `/api/tasks/{id}/subtasks` | `addSubtask` |
| PUT | `/api/tasks/{id}/checklist/{itemId}` | `updateChecklistItem` |
| POST | `/api/tasks/{id}/assign` | `assignTask` (reassign=false) |
| POST | `/api/tasks/{id}/reassign` | `assignTask` (reassign=true) |
| POST | `/api/tasks/{id}/approve` | `approveTask` (approved=true) |
| POST | `/api/tasks/{id}/reject` | `approveTask` (approved=false) |
| POST | `/api/tasks/{id}/start-timer` | `startTimer` |
| POST | `/api/tasks/{id}/stop-timer` | `stopTimer` |
| GET | `/api/tasks/dashboard` | `dashboard` |
| GET | `/api/tasks/reports/completion` | `completionReport` |
| GET | `/api/tasks/spaces` | `listSpaces` |
| POST | `/api/tasks/spaces` | `createSpace` |
| GET | `/api/tasks/spaces/{spaceId}` | `getSpace` |
| PUT | `/api/tasks/spaces/{spaceId}` | `updateSpace` |
| DELETE | `/api/tasks/spaces/{spaceId}` | `deleteSpace` |
| POST | `/api/tasks/spaces/{spaceId}/invitations` | `inviteToSpace` |
| GET | `/api/tasks/spaces/invitations` | `listMyInvitations` |
| PUT | `/api/tasks/spaces/invitations/{invitationId}` | `respondToInvitation` |
| PUT | `/api/tasks/spaces/{spaceId}/members/{memberId}` | `updateSpaceMember` |
| DELETE | `/api/tasks/spaces/{spaceId}/members/{memberId}` | `removeSpaceMember` |
| GET | `/api/tasks/stream` (text/event-stream) | `subscribe` |

### Entities

| Entity class | Table |
|---|---|
| `TaskEntity` | `tasks` |
| `TaskAssignmentEntity` | `task_assignments` |
| `TaskCommentEntity` | `task_comments` |
| `TaskAttachmentEntity` | `task_attachments` |
| `TaskChecklistItemEntity` | `task_checklists` |
| `TaskActivityLogEntity` | `task_activity_logs` |
| `TaskTimeLogEntity` | `task_time_logs` |
| `TaskDependencyEntity` | `task_dependencies` |
| `TaskTagEntity` | `task_tags` |
| `TaskSpaceEntity` | `task_spaces` |
| `TaskSpaceMemberEntity` | `task_space_members` |
| `TaskSpaceInvitationEntity` | `task_space_invitations` |

### Flyway Migrations

| Version | Description |
|---|---|
| V1 | Base schema: tasks + 8 child tables + indexes |
| V2 | Hierarchy columns (`parent_task_id`, `hierarchy_level`, `task_path`, `order_index`), `relationship_type` on dependencies |
| V3 | Task spaces, space members, space invitations, `space_id` on tasks |
| V4 | `permissions TEXT` column added to space members and invitations |
| V5 | `completed_at TIMESTAMPTZ` on tasks + indexes |

### Outbound Calls (Feign)

| Client | Service | Endpoint |
|---|---|---|
| `NotificationsClient` | `notifications-service` (Eureka) | `POST /internal/notifications/events` |

---

## Findings

### P0 — Critical

---

#### TAS-01: `taskRepository.findAll()` on Every Read — Full Table Scan Every Request
**Severity:** P0 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:**
- `TaskService.java:1089` (`visibleTasks`)
- `TaskService.java:1720` (`toSpaceSummary`)
- `TaskService.java:2023` (`refreshHierarchyMetadata`)
- `TaskService.java:906` (`deleteSpace`)

**Offending code:**
```java
// TaskService.java:1089
private List<TaskEntity> visibleTasks(AppUserDetails user) {
    return taskRepository.findAll().stream()
        .filter(task -> canView(user, task))
        .toList();
}

// TaskService.java:1720 — called once per space in listSpaces()
List<TaskEntity> spaceTasks = taskRepository.findAll().stream()
    .filter(task -> space.getId().equals(task.getSpaceId())).toList();

// TaskService.java:2023 — called after every create/update
Map<String, TaskEntity> allTasks = taskRepository.findAll().stream()
    .collect(Collectors.toMap(TaskEntity::getId, task -> task));
```

**Why it is wrong:**
`findAll()` hydrates the entire `tasks` table into JVM heap. With 10,000 tasks this loads every row on every `GET /api/tasks`, `GET /api/tasks/dashboard`, `GET /api/tasks/reports/completion`, every task create/update (via `refreshHierarchyMetadata`), and once per space returned by `listSpaces`. In `listSpaces`, if there are N spaces, `findAll()` is called N+1 times (once per `toSpaceSummary` call). After every write `refreshHierarchyMetadata` calls `findAll()` again to traverse descendants — an O(N) full scan per write. This is a production-blocking scalability bug.

**Fix:**
Replace `visibleTasks` with a repository query that filters by creator/assignee/space membership using a JPA `Specification` or `@Query`. Use `taskRepository.findBySpaceId(spaceId)` for space-scoped queries. Use a recursive CTE or `task_path` LIKE query for hierarchy refresh:
```java
// Repository
@Query("SELECT t FROM TaskEntity t WHERE t.taskPath LIKE :prefix")
List<TaskEntity> findByTaskPathStartingWith(@Param("prefix") String prefix);

// Service — replace refreshHierarchyMetadata
private void refreshHierarchyMetadata(TaskEntity root) {
    String prefix = root.getTaskPath() + "/";
    List<TaskEntity> descendants = taskRepository.findByTaskPathStartingWith(prefix);
    // ... update only descendants
}
```

---

#### TAS-02: N+1 DB Queries per Task in Permission Checks
**Severity:** P0 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:**
- `TaskService.java:1612` — `isAssignedUser` → `assignmentRepository.existsByTask_IdAndAssignedToIdAndActiveTrue`
- `TaskService.java:1614` — `isTaskManager` → `requireSpace` (SELECT) → `findActiveSpaceMember` (SELECT)
- `TaskService.java:1615` — `isActiveSpaceMember` → `existsBySpace_IdAndUserIdAndActiveTrue` (SELECT)
- `TaskService.java:1854` — same in `isAssignedUser`
- `TaskService.java:1864` — same in `isTaskManager`

**Offending code:**
```java
// Called for EVERY task in visibleTasks() loop
private boolean canView(AppUserDetails user, TaskEntity task) {
    boolean assigned = isAssignedUser(user, task);   // 1 SELECT per task
    boolean manager  = isTaskManager(user, task);     // 1-2 SELECTs per task
    boolean activeSpaceMember = isActiveSpaceMember(task.getSpaceId(), user.getUserId()); // 1 SELECT per task
    ...
}
```

**Why it is wrong:**
Given `findAll()` returns N tasks, `canView` is called N times. Each call can fire 3-4 individual `EXISTS`/`SELECT` queries against the DB. For 1,000 visible tasks, `GET /api/tasks` issues 3,000–4,000 queries before returning. `buildTreeContext` (line 1153) partially mitigates this for assignments and spaces, but `canView` is called outside that context in `visibleTasks`.

**Fix:**
Pre-load user's memberships and active assignment task IDs before filtering. Pass them into `canView` as a small context struct:
```java
record PermissionContext(
    Set<String> activeAssignedTaskIds,
    Set<String> spaceMemberSpaceIds
) {}

PermissionContext pctx = loadPermissionContext(user);
return taskRepository.findAll().stream()
    .filter(task -> canView(user, task, pctx))
    .toList();
```

---

#### TAS-03: Race Condition in Task Code Generation
**Severity:** P0 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:2071–2073`

**Offending code:**
```java
private String nextTaskCode() {
    long number = taskRepository.count() + 1;
    return "TSK-" + String.format("%05d", number);
}
```

**Why it is wrong:**
`taskRepository.count()` returns the table row count at a point in time. Under concurrent task creation: two requests both read count = 100, both compute number = 101, both produce `TSK-00101`. The `task_code` column has a `UNIQUE` constraint (V1 migration), so one of the two inserts fails with a `DataIntegrityViolationException`. The `GlobalExceptionHandler` maps this to HTTP 400, but the user's task is silently rejected. After any task deletion count drops, so duplicate codes can recur even without concurrency.

**Fix:**
Use a database sequence:
```sql
-- V6 migration
CREATE SEQUENCE task_code_seq START 1;
-- Update existing rows: nextval calls for each
```
```java
@Query(value = "SELECT nextval('task_code_seq')", nativeQuery = true)
Long nextTaskCodeSequence();

private String nextTaskCode() {
    return "TSK-" + String.format("%05d", taskRepository.nextTaskCodeSequence());
}
```

---

#### TAS-04: JWT Signing Key Double-Encoding Bug
**Severity:** P0 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `JwtService.java:68–72`

**Offending code:**
```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(
        Base64.getEncoder().encodeToString(
            jwtProperties.getSecret().getBytes()  // platform-default charset
        )
    ));
}
```

**Why it is wrong:**
The code Base64-encodes the raw secret string, then immediately Base64-decodes the result back. The net effect is `Keys.hmacShaKeyFor(secret.getBytes())`. `Decoders.BASE64.decode` is a no-op here relative to the encode, but this only works by accident when the secret is plain ASCII. More critically, `getBytes()` uses the JVM platform default charset (not UTF-8), which is non-deterministic across environments. The identity-service and other services use the same pattern, meaning they are implicitly agreeing to this double-encode bug — if either side changes the secret encoding, tokens will stop validating. The shared-secret approach also means every service can forge tokens for any other service.

**Fix:**
```java
private Key getSigningKey() {
    // Secret in application.yml should already be stored as Base64
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
}
```
Store `JWT_SECRET` as a proper Base64-encoded 256-bit key generated once: `openssl rand -base64 32`.

---

### P1 — High

---

#### TAS-05: `@Transactional` from `jakarta.transaction` (Wrong Import) — Rollback Will Not Work as Expected
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:70–73`

**Offending code:**
```java
import jakarta.transaction.Transactional;  // line 70 — JTA, not Spring

@Service
@Transactional                              // line 73
public class TaskService {
```

**Why it is wrong:**
`jakarta.transaction.Transactional` is the JTA annotation. Spring's transaction management recognises it, but its `rollbackOn` default differs from Spring's `org.springframework.transaction.annotation.Transactional`: JTA rolls back on any `Throwable`; Spring rolls back only on `RuntimeException`/`Error`. More critically, the default `propagation`, `isolation`, and `readOnly` semantics are JTA's (container-managed), not Spring Data's. In a Spring Boot non-JTA environment the JTA annotation works because Spring's `TransactionInterceptor` will process it, but using the wrong annotation creates hidden coupling and will cause issues if a JTA provider is ever added. It also signals the entire class is writing — preventing any read optimisation with `readOnly=true` on query methods.

**Fix:**
```java
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)   // default for reads
public class TaskService {
    // Annotate individual write methods:
    @Transactional
    public TaskDetailResponse createTask(...) { ... }
}
```

---

#### TAS-06: Silent Swallow of Notification Failure — Feign Call Inside Transaction
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:**
- `TaskSpaceNotificationService.java:47–50`
- `TaskService.java:943` — called from `inviteToSpace` which is inside the class-level `@Transactional`

**Offending code:**
```java
// TaskSpaceNotificationService.java:47-50
try {
    notificationsClient.sendEvent(request);
} catch (Exception ignored) {
}
```

**Why it is wrong:**
Two problems. First, a Feign HTTP call is made inside an open transaction (`inviteToSpace` is on a `@Transactional` class). If the notification call is slow, it holds the DB connection/transaction open during the HTTP round-trip to `notifications-service`. Second, the exception is completely swallowed without logging — if `notifications-service` is down or returns an error, the caller has no way to know an invitation was created but no notification was sent, and operators have no observability into the failure rate.

**Fix:**
```java
// Move notification call AFTER transaction commits using @TransactionalEventListener
// or at minimum log the failure:
try {
    notificationsClient.sendEvent(request);
} catch (Exception ex) {
    log.warn("Failed to send space invitation notification for invitation={}: {}",
        invitation.getId(), ex.getMessage());
}
```
Better: extract the Feign call to an `@Async` method or `@TransactionalEventListener(phase = AFTER_COMMIT)`.

---

#### TAS-07: Race Condition — Duplicate Space Member on Concurrent Invitation Accept
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:954–989`

**Offending code:**
```java
// Check:
if (invitation.getStatus() != TaskSpaceInvitationStatus.PENDING) {
    throw new BadRequestException("Invitation has already been processed.");
}
invitation.setStatus(request.status());
// ... save invitation ...
if (request.status() == TaskSpaceInvitationStatus.ACCEPTED) {
    // No check for existing active member here
    taskSpaceMemberRepository.save(member);   // line 981
}
```

**Why it is wrong:**
Two concurrent requests for the same `invitationId` can both pass the `PENDING` check before either commits. Both then insert a new `TaskSpaceMemberEntity` for the same `(space_id, user_id)`. V3 migration creates a unique index `ux_task_space_members_space_user_active` on `(space_id, user_id, active)`, so the second insert fails with `DataIntegrityViolationException` → HTTP 400, but the first insert succeeded. This also occurs if a user clicks "Accept" twice in quick succession. There is no `existsBySpace_IdAndUserIdAndActiveTrue` guard before creating the member record in this path (contrast with `inviteToSpace` at line 917 which does check).

**Fix:**
Add an idempotency guard before member creation, and consider a database-level `SELECT FOR UPDATE` on the invitation:
```java
if (taskSpaceMemberRepository.existsBySpace_IdAndUserIdAndActiveTrue(
        invitation.getSpace().getId(), invitation.getInviteeUserId())) {
    return toInvitation(invitation); // already a member, idempotent
}
taskSpaceMemberRepository.save(member);
```

---

#### TAS-08: `deleteTask` Does Not Cascade Subtasks — Silent Orphan References
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:439–443`

**Offending code:**
```java
public void deleteTask(String id, AppUserDetails user) {
    TaskEntity task = requireTask(id);
    ensureEditAccess(user, task);
    taskRepository.delete(task);
}
```

**Why it is wrong:**
`parent_task_id` in V2 migration has no `ON DELETE CASCADE` or `ON DELETE SET NULL` constraint — it is a plain nullable column with no foreign key constraint at the DB level (the column was added with `alter table tasks add column if not exists parent_task_id varchar(64)` without a `REFERENCES` clause). Deleting a parent task leaves subtasks with a dangling `parent_task_id` pointing to a non-existent task ID. The `visibleTasks` → `buildTreeContext` logic silently promotes these orphans to top-level by checking `byId.containsKey(task.getParentTaskId())` (line 1172), so data becomes inconsistent without errors.

**Fix:**
Either add `ON DELETE CASCADE` or `ON DELETE SET NULL` via a migration, or handle it in code:
```sql
-- V6 migration
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
```
Or in service:
```java
taskRepository.findByParentTaskId(id).forEach(child -> child.setParentTaskId(null));
taskRepository.delete(task);
```

---

#### TAS-09: `parsePermissions` Throws Uncaught `IllegalArgumentException` on Corrupted Data
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:1884–1893`

**Offending code:**
```java
private List<TaskSpacePermission> parsePermissions(String rawPermissions, TaskSpaceMemberRole role) {
    if (!StringUtils.hasText(rawPermissions)) {
        return new ArrayList<>(defaultPermissionsForRole(role));
    }
    return java.util.Arrays.stream(rawPermissions.split(","))
        .map(String::trim)
        .filter(StringUtils::hasText)
        .map(value -> TaskSpacePermission.valueOf(value.toUpperCase(Locale.ROOT)))  // throws IllegalArgumentException
        .distinct()
        .toList();
}
```

**Why it is wrong:**
`TaskSpacePermission.valueOf(...)` throws `IllegalArgumentException` if the stored string does not match any enum constant. The `permissions` column is a free-form `TEXT` field (V4 migration). If a value is manually edited in the DB, stored with a typo from a previous version, or migrated from another format, this unguarded `valueOf` will throw inside a permission check, propagating up through `canView` → `visibleTasks` → `GET /api/tasks`. The `GlobalExceptionHandler` maps `IllegalArgumentException` to HTTP 400, causing the entire task list to fail for the affected user.

**Fix:**
```java
.map(value -> {
    try {
        return TaskSpacePermission.valueOf(value.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ignored) {
        log.warn("Unknown permission value '{}', skipping", value);
        return null;
    }
})
.filter(Objects::nonNull)
```

---

#### TAS-10: `ZoneId.systemDefault()` for Completion Date Conversion
**Severity:** P1 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:786`

**Offending code:**
```java
private LocalDate resolveCompletionDate(TaskEntity task) {
    if (task.getCompletionDate() != null) {
        return task.getCompletionDate();
    }
    if (task.getCompletedAt() != null) {
        return task.getCompletedAt().atZone(ZoneId.systemDefault()).toLocalDate();
    }
    return null;
}
```

**Why it is wrong:**
`ZoneId.systemDefault()` returns the JVM's OS timezone, which can differ between developer machines, CI, and production containers. A task completed at 23:30 UTC will appear as completed on different dates depending on the server's timezone. This affects completion reports (the `completionReport` method groups tasks by `resolveCompletionDate`), producing wrong data that varies by deployment environment. Docker containers default to UTC; a developer machine set to IST (+5:30) will see different report groupings.

**Fix:**
Use a fixed timezone from configuration (or UTC if no business requirement demands otherwise):
```java
private static final ZoneId REPORT_ZONE = ZoneId.of("UTC");

return task.getCompletedAt().atZone(REPORT_ZONE).toLocalDate();
```

---

### P2 — Medium

---

#### TAS-11: Dashboard `findTop20ByOrderByCreatedAtDesc` Is a Global Activity Table Scan
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:583–587`

**Offending code:**
```java
List<TaskDtos.ActivityResponse> recentActivity = activityRepository.findTop20ByOrderByCreatedAtDesc().stream()
    .filter(activity -> canView(user, activity.getTask()))
    .limit(10)
    .map(this::toActivity)
    .toList();
```

**Why it is wrong:**
`findTop20ByOrderByCreatedAtDesc()` fetches the 20 most recent activity log entries globally, regardless of the user's visibility. Then `canView` is called for each, which can issue up to 3-4 DB queries per entry (see TAS-02). The `filter` then discards entries the user cannot see, so the caller may get fewer than 10 results even though 20 were fetched. The correct pattern is to pass the user's accessible task IDs into the query.

**Fix:**
```java
// Repository
@Query("SELECT a FROM TaskActivityLogEntity a WHERE a.task.id IN :taskIds ORDER BY a.createdAt DESC LIMIT 10")
List<TaskActivityLogEntity> findTop10ForTasks(@Param("taskIds") List<String> taskIds);
```

---

#### TAS-12: `toSpaceSummary` Calls `taskRepository.findAll()` — N×Full-Table Scans in `listSpaces`
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:1716–1748` (specifically line 1720)

**Offending code:**
```java
// Called once per space in the list
private TaskDtos.SpaceSummaryResponse toSpaceSummary(TaskSpaceEntity space, AppUserDetails user) {
    List<TaskEntity> spaceTasks = taskRepository.findAll().stream()
        .filter(task -> space.getId().equals(task.getSpaceId())).toList();
    // ... also: taskSpaceMemberRepository.findBySpace_IdAndActiveTrueOrderByRoleAscUserNameAsc (line 1725)
    // ... also: taskSpaceInvitationRepository.findBySpace_IdOrderByCreatedAtDesc (line 1726)
```

**Why it is wrong:**
`listSpaces` calls `toSpaceSummary` for each space. Each invocation calls `findAll()` on the tasks table, then `findBySpace_Id...` on members, then `findBySpace_Id...` on invitations. With 20 spaces, that is 60+ queries just to compute list-level stats, with `findAll()` running 20 times. This is quadratic in (spaces × tasks).

**Fix:**
Pre-aggregate stats in a single GROUP BY query before mapping:
```java
@Query("SELECT t.spaceId, t.status, COUNT(t) FROM TaskEntity t WHERE t.spaceId IN :spaceIds GROUP BY t.spaceId, t.status")
List<Object[]> countBySpaceIdAndStatus(@Param("spaceIds") List<String> spaceIds);
```

---

#### TAS-13: `matchesAssignee` Issues DB Query per Task in `completionReport`
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:738–741`

**Offending code:**
```java
private boolean matchesAssignee(TaskEntity task, String assigneeId) {
    return equalsNullable(task.getAssignedToId(), assigneeId)
        || assignmentRepository.existsByTask_IdAndAssignedToIdAndActiveTrue(task.getId(), assigneeId);
}
```

**Why it is wrong:**
Called inside a `.filter()` at line 661 over every task in `scopedTasks`. For tasks that do not have the primary assignee match, this fires an `EXISTS` query against `task_assignments` for each task. With 500 tasks filtered by assignee, up to 500 individual SQL queries are issued.

**Fix:**
Pre-fetch the set of task IDs assigned to the target user via a single query:
```java
Set<String> taskIdsAssignedToUser = assignmentRepository
    .findTaskIdsByAssignedToIdAndActiveTrue(assigneeId);
// Then use taskIdsAssignedToUser.contains(task.getId()) in the filter
```

---

#### TAS-14: `refreshHierarchyMetadata` Calls `findAll()` and Saves Every Descendant Individually
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:2022–2037`

**Offending code:**
```java
private void refreshHierarchyMetadata(TaskEntity rootTask) {
    Map<String, TaskEntity> allTasks = taskRepository.findAll().stream()
        .collect(Collectors.toMap(TaskEntity::getId, task -> task));  // full scan
    updateDescendantPaths(rootTask, allTasks);
}

private void updateDescendantPaths(TaskEntity task, Map<String, TaskEntity> allTasks) {
    List<TaskEntity> children = allTasks.values().stream()
        .filter(candidate -> Objects.equals(task.getId(), candidate.getParentTaskId()))
        ...
    for (TaskEntity child : children) {
        taskRepository.save(child);  // 1 UPDATE per descendant
        updateDescendantPaths(child, allTasks);
    }
}
```

**Why it is wrong:**
Called after every task create, update, and reorder. For a flat workspace with 1,000 tasks, this loads all 1,000 rows on every write. For a task with 50 descendants, 50 individual `UPDATE` statements are issued. With high write throughput, this is severely degrading.

**Fix:**
Use the `task_path` column for scoped descendant queries (see TAS-01). Use a batch update:
```java
@Modifying
@Query("UPDATE TaskEntity t SET t.taskPath = REPLACE(t.taskPath, :oldPrefix, :newPrefix), t.hierarchyLevel = (LENGTH(t.taskPath) - LENGTH(REPLACE(t.taskPath, '/', ''))) WHERE t.taskPath LIKE :likePattern")
int updateDescendantPaths(@Param("oldPrefix") String old, @Param("newPrefix") String newPrefix, @Param("likePattern") String pattern);
```

---

#### TAS-15: Default Secrets in `application.yml` Committed to VCS
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `application.yml:40–41`

**Offending code:**
```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Why it is wrong:**
The fallback values are committed to version control. Any developer without the environment variables set will run with the default secret, and those defaults are now in git history forever. If the environment variable is accidentally not set in production, the production service uses the known public secret. An attacker with the default secret can forge valid JWT tokens. The `fawnix-internal-secret` is the shared secret for internal service-to-service calls — if compromised, any service can impersonate any other.

**Fix:**
Remove defaults from `application.yml`. Require explicit environment variables with no fallback, and fail fast on startup if missing:
```yaml
secret: ${JWT_SECRET}
internal-service-secret: ${INTERNAL_SERVICE_SECRET}
```
Add a `@PostConstruct` validation or use `@ConfigurationProperties` with `@NotBlank`.

---

#### TAS-16: `SecurityConfig` in Root Package — Violates Package Structure
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `SecurityConfig.java:1` — package `com.hirepath.task`

**Offending code:**
```java
package com.hirepath.task;  // root package — no sub-package
```

**Why it is wrong:**
`SecurityConfig` is placed in the root application package while all other infrastructure is under `com.hirepath.task.config`, `com.hirepath.task.security`, etc. This is inconsistent. The root package is scanned by `@SpringBootApplication` and mixing infrastructure config here makes discovery harder. All other services in the monorepo place security config under `.security` or `.config`.

**Fix:**
Move to `com.hirepath.task.config.SecurityConfig` or `com.hirepath.task.security.SecurityConfig`.

---

#### TAS-17: `getBytes()` Without Charset in JWT Key Derivation
**Severity:** P2 | **Confidence:** High | **Owner:** Chaitanya2872 (linked to TAS-04)

**File:Line:** `JwtService.java:70`

**Offending code:**
```java
jwtProperties.getSecret().getBytes()  // platform-default charset
```

**Why it is wrong:**
`String.getBytes()` without a charset argument uses the JVM default charset (`file.encoding`), which varies by OS and JVM flags. On Windows this may be `Cp1252`; on Linux containers it is usually `UTF-8`. If the secret contains non-ASCII characters, the byte sequence differs between environments, producing different signing keys and causing all tokens to be rejected on one environment.

**Fix:**
```java
jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8)
```
(This is a sub-issue of TAS-04; both should be fixed together.)

---

#### TAS-18: `scope=team` Filter Misinterprets "Team" — Shows Tasks Where User Is Approver or Assigner, Not Team Members
**Severity:** P2 | **Confidence:** Med | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:1988–1990`

**Offending code:**
```java
} else if ("team".equalsIgnoreCase(scope)) {
    predicates.add(task -> equalsNullable(user.getUserId(), task.getAssignedById())
        || equalsNullable(user.getUserId(), task.getApproverId()));
}
```

**Why it is wrong:**
The `scope=team` filter returns tasks where the logged-in user is the _assigner_ (`assignedById`) or the _approver_. This is not what "team" typically means in task management (tasks assigned to the user's teammates). More critically, checking `assignedById` vs `assignedToId` is likely a copy-paste error — the API documentation or frontend likely expects `scope=team` to show tasks related to the user's team members, not tasks the user handed out. The `scope=my` filter at line 1986 correctly checks `assignedToId`.

**Fix:**
Clarify the intended semantics with the product owner and correct accordingly. If "team" means tasks the user created or is managing:
```java
predicates.add(task -> equalsNullable(user.getUserId(), task.getCreatedById())
    || equalsNullable(user.getUserId(), task.getAssignedById()));
```

---

### P3 — Low

---

#### TAS-19: God-Class — `TaskService.java` is 2,190 Lines
**Severity:** P3 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:1–2190`

**Why it is wrong:**
A single class handling task CRUD, space management, timer logic, permissions, AI import, SSE streaming coordination, approval flows, reporting, and dashboard aggregation is untenable. It has 12 injected dependencies. Finding and testing individual features is difficult. Every PR touching any feature touches this file, causing merge conflicts on a junior team.

**Fix:**
Extract into cohesive service classes:
- `TaskCrudService` — create/update/delete
- `TaskQueryService` — list/tree/dashboard
- `TaskPermissionService` — all `canView`/`canEdit` etc. logic
- `TaskSpaceService` — space CRUD, invitations, membership
- `TaskTimerService` — start/stop timer
- `TaskReportService` — completion report

---

#### TAS-20: Notification Exception Swallowed Without Logging
**Severity:** P3 | **Confidence:** High | **Owner:** Chaitanya2872 (linked to TAS-06)

**File:Line:** `TaskSpaceNotificationService.java:47–50`

**Offending code:**
```java
} catch (Exception ignored) {
}
```

**Why it is wrong:**
`ignored` is declared but never logged. If `notifications-service` is down, no one knows. This is a silent failure that eliminates all observability.

**Fix:**
```java
} catch (Exception ex) {
    log.warn("Failed to send space invitation notification [invitationId={}]: {}",
        invitation.getId(), ex.getMessage());
}
```

---

#### TAS-21: `deleteSpace` Does Not Persist the `spaceId = null` Changes
**Severity:** P3 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `TaskService.java:906–910`

**Offending code:**
```java
taskRepository.findAll().stream()
    .filter(task -> spaceId.equals(task.getSpaceId()))
    .forEach(task -> task.setSpaceId(null));
taskSpaceRepository.delete(space);
```

**Why it is wrong:**
The `forEach` mutates in-memory entity objects. While the class-level `@Transactional` will flush these dirty entities before the transaction commits (JPA dirty checking), this is fragile — it relies on Hibernate's dirty-checking pass-through and is not obvious. The DB also has `ON DELETE SET NULL` on `tasks.space_id` (V3 migration), making the in-code nullification doubly redundant. The redundancy means if the FK does its job, the code loop is dead work; if the FK is missing, the code loop's changes may or may not be flushed depending on flush mode.

**Fix:**
Remove the loop — rely solely on the `ON DELETE SET NULL` constraint in V3:
```java
public void deleteSpace(String spaceId, AppUserDetails user) {
    TaskSpaceEntity space = requireSpace(spaceId);
    ensureSpaceOwner(user, space);
    taskSpaceRepository.delete(space);  // FK ON DELETE SET NULL handles tasks
    taskSpaceStreamService.publishSpaceUpdate(user.getUserId(), "SPACE_DELETED", spaceId);
}
```

---

#### TAS-22: `parent_task_id` Has No Foreign Key Constraint in Migration
**Severity:** P3 | **Confidence:** High | **Owner:** Chaitanya2872 (linked to TAS-08)

**File:Line:** `V2__add_task_hierarchy_support.sql:1`

**Offending code:**
```sql
alter table tasks add column if not exists parent_task_id varchar(64);
-- No REFERENCES tasks(id) constraint
```

**Why it is wrong:**
Without a FK constraint, the DB allows any string value in `parent_task_id`. When a parent task is deleted, no DB-level protection prevents dangling references. The application code in `buildTreeContext` works around this (line 1172), but it is defensive coding masking a schema defect.

**Fix:**
```sql
-- V6 migration
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
```

---

#### TAS-23: Wrong Namespace — `com.hirepath` vs `com.fawnix` Parent groupId
**Severity:** P3 | **Confidence:** High | **Owner:** Chaitanya2872

**File:Line:** `pom.xml:13`, entire `src/main/java/com/hirepath/task/` tree

**Offending code:**
```xml
<groupId>com.hirepath</groupId>  <!-- pom.xml:13 -->
<artifactId>task-service</artifactId>
```
All Java source files use package `com.hirepath.task.*`.

**Why it is wrong:**
The parent POM uses `com.fawnix`. Most other services (`crm-service`, `sales-service`, `inventory-service`, etc.) use `com.fawnix.*` package names. `task-service`, `analytics-service`, `org-service`, `forms-service`, and `integration-service` still use the legacy `com.hirepath` namespace. This inconsistency makes cross-service tooling harder and indicates these are migrated services that were never fully renamed.

**Fix:**
Rename all packages to `com.fawnix.task.*` and update `pom.xml` groupId to `com.fawnix`. This is a bulk rename (low risk with IDE refactoring tools).

---

#### TAS-24: `SpaceInvitationActionRequest` Allows Setting Status to `PENDING` via API
**Severity:** P3 | **Confidence:** Med | **Owner:** Chaitanya2872

**File:Line:** `TaskDtos.java:161–165`, `TaskService.java:960`

**Offending code:**
```java
public record SpaceInvitationActionRequest(
    @NotNull(message = "Invitation action is required.")
    TaskSpaceInvitationStatus status    // enum: PENDING, ACCEPTED, REJECTED
) { }
// ...
invitation.setStatus(request.status());  // no validation that status != PENDING
```

**Why it is wrong:**
The API accepts `status: "PENDING"` in the `PUT /api/tasks/spaces/invitations/{id}` body, allowing a user to reset an already-accepted or rejected invitation back to `PENDING`. This would allow re-accepting an already-accepted invitation and potentially creating a second `TaskSpaceMemberEntity` (see TAS-07).

**Fix:**
Validate that the request status is either `ACCEPTED` or `REJECTED`:
```java
if (request.status() == TaskSpaceInvitationStatus.PENDING) {
    throw new BadRequestException("Invalid invitation action.");
}
```
Or use a dedicated enum: `InvitationAction { ACCEPT, REJECT }` instead of reusing the status enum.

---

#### TAS-25: `task_path` Limited to 500 Characters — Silently Truncated for Deep Hierarchies
**Severity:** P3 | **Confidence:** Med | **Owner:** Chaitanya2872

**File:Line:**
- `V2__add_task_hierarchy_support.sql:3` — `task_path varchar(500)`
- `TaskEntity.java:73` — `@Column(name = "task_path", nullable = false, length = 500)`

**Why it is wrong:**
Task IDs are UUID strings (36 chars each). A task path is `id/id/id/...`. At depth 13, the path is `13×36 + 12 = 480` chars — near the limit. Depth 14 exceeds 500 chars. There is no validation to prevent creating tasks deeper than ~13 levels, and no error is thrown — Hibernate silently truncates or the DB raises an error. The `buildTreeContext` ancestor-climbing loop (line 1130–1135) would then fail to match the truncated path.

**Fix:**
Add a maximum depth validation in `createTaskInternal`:
```java
if (parent != null && parent.getHierarchyLevel() >= 10) {
    throw new BadRequestException("Tasks cannot be nested more than 10 levels deep.");
}
```

---

## Redundancy

The following code is copy-pasted across multiple services with no shared library:

| This service | Other service | What is duplicated |
|---|---|---|
| `JwtService.java:1–73` | `analytics-service/.../JwtService.java` (identical) | Entire JWT validation implementation including the double-encode bug (TAS-04) |
| `JwtService.java:1–73` | `integration-service/.../JwtService.java` (identical) | Same |
| `JwtService.java:1–73` | `org-service/.../JwtService.java` (identical) | Same |
| `SecurityConfig.java` | All other services have an equivalent | Identical Spring Security stateless filter chain setup |
| `GlobalExceptionHandler.java` | `crm-service/.../GlobalExceptionHandler.java` | Same handler structure and exception types |
| `GlobalExceptionHandler.java` | `inventory-service/.../GlobalExceptionHandler.java` | Same |
| `GlobalExceptionHandler.java` | `sales-service/.../GlobalExceptionHandler.java` | Same |
| `AppUserDetails.java` | Every service has one | Identical structure — userId, email, name, roles, permissions |
| `JwtProperties.java` | Every service has one | Identical `@ConfigurationProperties` class |

**Recommendation:** Extract a `fawnix-security-starter` Spring Boot autoconfigure module containing `JwtService`, `JwtAuthenticationFilter`, `AppUserDetails`, `JwtProperties`, `SecurityConfig`, and `GlobalExceptionHandler`. All services depend on it. Fix TAS-04 once; it is fixed everywhere.

---

## Tests & Gaps

**Test coverage: Zero.** There is no `src/test` directory in this service.

The following are high-priority untested scenarios that have known bugs or complex logic:

| Scenario | Risk |
|---|---|
| Concurrent `createTask` — duplicate task code | TAS-03 confirmed race condition |
| `deleteTask` with children — orphan check | TAS-08 |
| `respondToInvitation` concurrent accept | TAS-07 |
| `parsePermissions` with unknown enum value | TAS-09 |
| `visibleTasks` with large task set — performance | TAS-01 |
| JWT validation with non-ASCII secret | TAS-04, TAS-17 |
| Completion report timezone correctness | TAS-10 |
| `nextSpaceKey` uniqueness under concurrent space creation | Medium-risk loop at line 1710 |

**Recommendation:** Add `@DataJpaTest` slice tests for all repository methods and `@SpringBootTest` integration tests for the critical paths above. At minimum, add unit tests for `TaskService.nextTaskCode`, `TaskService.parsePermissions`, and `JwtService.isTokenValid`.

---

## Coverage Note

**Fully inspected:** `TaskController.java`, `TaskService.java` (all 2,190 lines), `TaskEntity.java`, `TaskDtos.java`, `GlobalExceptionHandler.java`, `SecurityConfig.java`, `JwtAuthenticationFilter.java`, `JwtService.java`, `JwtProperties.java`, `AppUserDetails.java`, `InternalServiceConfig.java`, `NotificationsClient.java`, `TaskSpaceNotificationService.java`, `TaskSpaceStreamService.java`, `TaskNotesImportAiService.java`, all 5 Flyway migrations, `application.yml`, `pom.xml`, `TaskRepository.java`, `TaskActivityLogRepository.java`, all domain enums.

**Skimmed (structure only):** Remaining repository interfaces (`TaskAssignmentRepository`, `TaskChecklistRepository`, `TaskCommentRepository`, `TaskSpaceInvitationRepository`, `TaskSpaceMemberRepository`, `TaskSpaceRepository`, `TaskTimeLogRepository`) — verified method signatures exist but not checked for missing indexed queries. Remaining domain entity classes (`TaskSpaceEntity`, `TaskSpaceMemberEntity`, `TaskSpaceInvitationEntity`, etc.) — verified fields match migrations but not checked for missing `@Index` annotations. Client DTOs (`NotificationContentRequest`, `RecipientTargetRequest`, `SendNotificationRequest`) — verified structure only.

**Could not verify:** Runtime behavior of the SSE stream under connection drops (race condition between `remove()` and iteration in `sendToUser`). Actual AI model behavior in `TaskNotesImportAiService`. Cross-service JWT token interchange — whether the double-encode bug is consistently present in all services (which would mean it accidentally works).

**Overall confidence: High** for all P0/P1 findings; Medium for TAS-18, TAS-24, TAS-25.

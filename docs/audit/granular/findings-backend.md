# Backend Findings (performance / structure)

Granular, owner-tagged. Transaction/correctness **bugs** are in [real-bugs.md](./real-bugs.md);
duplication is in [redundancy.md](./redundancy.md). This file covers performance (N+1) and structure.
All service-logic findings below are Owner: **Chaitanya2872** unless noted.

---

## Performance — full-table scans & N+1

### K1. `TaskService.visibleTasks()` scans the whole table on every read · P2
- `TaskService.java:1088-1092`. `taskRepository.findAll().stream().filter(canView)` is called from
  **every** major read path (`listTasks`, `treeTasks`, `getSubtasks`, `getTask`, `dashboard`,
  `completionReport`, `listSpaces`).
- **Proper fix**: push visibility into SQL with a `Specification` + `Pageable`
  (`findByAssigneeOrSpaceMember(userId, spaceIds, pageable)`).

### K2. `canView` runs 2 queries per task inside that filter · P2
- `TaskService.java:1607-1630` (`existsBy…` at `:1615`, `:1854`). For N tasks = 2N queries per request
  (10k tasks → 20k queries).
- **Proper fix**: preload the user's assignment + membership sets **once** before the loop, check
  in-memory (the pattern already exists in `buildTreeContext:1157-1164` — extend it to `canView`).

### K3. `listSpaces` → `toSpaceSummary` does a full `findAll()` per space · P2
- `TaskService.java:1716-1749` (called `:792`). Per-space full task scan + a member query + an
  invitation query. The worst N+1 in the repo.
- **Proper fix**: bulk-load tasks/members/invitations by `spaceIdIn`, group into maps, pass in.

### K4. `refreshHierarchyMetadata` saves each descendant individually · P2
- `TaskService.java:2022-2038` (called from create/update/status/reorder). `findAll()` + a `save()`
  per descendant on every mutation.
- **Proper fix**: one bulk `@Modifying @Query` UPDATE by task-path prefix.

### K5. `LeadService.getLeads` runs a second unbounded `findAll` for the summary · P2
- `LeadService.java:120-127`. After the paged query, a full `findAll(spec, Sort)` loads all matches to
  compute a summary.
- **Proper fix**: a `@Query` aggregate projection (`COUNT`/`SUM`) instead of loading entities.

### K6. `getPurchaseRequisitions` unpaginated + N+1 on items · P2
- `PurchaseRequisitionService.java:147-151`. `findAll()` then `getItems(id)` per PR.
- **Proper fix**: `Pageable` + `@EntityGraph(attributePaths = "items")` (or `@BatchSize`).

### K7. `LeadService.getNotifications` loads rows to count them · P2
- `LeadService.java:156-163`. `findBy…` returns a full list, then filters/counts in Java.
- **Proper fix**: a `countBy…` query.

---

## Structure

### K8. `TaskService` god-class — 2,190 lines, 12 deps, 6 domains · P3
- Task CRUD + hierarchy + assignments + spaces + invitations + time-logging + all DTO mapping in one
  class. Untestable without mocking 12 collaborators.
- **Proper fix**: extract `TaskSpaceService`, `TaskTimeTrackingService`; replace manual
  `toDetail/toSummary/toComment` with a MapStruct mapper.

### K9. File bytes stored as a DB BLOB · P3 (bug-adjacent, see [B-note])
- `PurchaseRequisitionService.java:194` — `document.setFileData(file.getBytes())`. Bloats tables and
  backups, no CDN, full array in heap per download. (MinIO is already used by crm-service.)
- **Proper fix**: upload to MinIO/S3, persist only the object key; serve via pre-signed URL.

### K10. `MinioClient` constructed in a service constructor, not a bean · P3
- `crm-service ObjectStorageService` (`storage/service/ObjectStorageService.java`). Untestable, tightly
  coupled; also two `broad_catch` here per the metrics.
- **Proper fix**: expose `MinioClient` as a `@Bean` from a `@Configuration` using
  `ObjectStorageProperties`; inject it.

### K11. Money as non-`BigDecimal` and `ZoneId.systemDefault()` · P3
- `TaskService.java:787,1984` use `ZoneId.systemDefault()` → completion date shifts with container TZ.
  Monetary math across sales/procurement should be `BigDecimal` end-to-end.
- **Proper fix**: an app-wide `ZoneId` constant; `BigDecimal` with explicit scale for money.

### K12. Empty / broad catches swallow errors · P2/P3
- Metrics flag `empty_catch=3` in `crm MetaLeadClient.java:225`; `broad_catch` in `JwtService.java`
  (also `suppress=2`) and `ObjectStorageService`. The 8 HirePath services additionally lack a
  `GlobalExceptionHandler` (main audit) and `catch (Exception)` broadly in controllers
  (`RecruitmentController:704,715`, `CandidateController:421,430`, `org SetupController:191,200`) —
  Owner Ravi **[migrated]**.
- **Proper fix**: catch specific exceptions, log with context, rethrow typed; add the shared
  `GlobalExceptionHandler` (see [redundancy.md](./redundancy.md)).

---

## Config / correctness (also see main [backend audit](../backend.md))
- `sales → inventory` hardcoded `http://localhost:8083` (bypasses Eureka) — `SalesOrderService` path
  via `InventoryReservationClient`. Fails in containers.
- No Spring profiles; `open-in-view` missing in hrms/org; `SPRING_MAIN_ALLOW_CIRCULAR_REFERENCES:true`
  masks a CRM bean cycle.

---

## Top systemic (backend)
1. **HTTP calls inside `@Transactional`** ([B3](./real-bugs.md)) — commit first, call after commit.
2. **`findAll()`-then-filter-in-Java** (K1–K3, K5–K7) — predicate + paginate in SQL; preload sets.
3. **Broken/missing transaction boundaries** ([B2](./real-bugs.md), [B5](./real-bugs.md), K…).
4. **Non-atomic ID generation** ([B4](./real-bugs.md)) — DB sequences.
5. **`TaskService` god-class** (K8) — decompose + MapStruct; it hides several of the above.

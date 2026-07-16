# notifications-service — Service Audit

**Date:** 2026-07-14  
**Auditor:** Claude (claude-sonnet-4-6)  
**Root:** `backend/services/notifications-service`  
**Package namespace:** `com.hirepath.notifications`  
**Primary author (git log):** Ravi-Shankar-ACS

---

## Summary

`notifications-service` is a moderately complex Spring Boot service implementing multi-channel notification dispatch (in-app SSE, email via SMTP, web push stub) backed by a transactional outbox pattern with Redis Streams. The core domain model and Flyway migration are coherent, but the service has three P0-severity defects: Redis enqueue inside a database transaction, SSE push before transaction commit, and a security bypass when `INTERNAL_SERVICE_SECRET` is set to an empty string. The authorization model has a critical P1 gap: any authenticated user can enqueue notifications to arbitrary recipients and manage templates. The service is copy-pasting the full security stack (JwtService, AppUserDetails, SecurityConfig, filter pair, and exception handlers) verbatim from at least 10 other services in the monorepo, indicating a shared-library extraction is long overdue. There are zero tests.

---

## Surface Map

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/notifications/send` | JWT (any authenticated user) | Send a single notification |
| POST | `/api/notifications/batch` | JWT (any authenticated user) | Send batch notifications |
| GET | `/api/notifications/inbox` | JWT (own userId) | Retrieve user's in-app inbox |
| PATCH | `/api/notifications/{id}/read` | JWT (own userId) | Mark one notification read |
| PATCH | `/api/notifications/read-all` | JWT (own userId) | Mark all notifications read |
| POST | `/api/notifications/preferences` | JWT (own userId) | Update channel preferences |
| POST | `/api/notifications/templates` | JWT (any authenticated user) | Create/version a template |
| GET | `/api/notifications/templates/{key}` | JWT (any authenticated user) | Retrieve a template |
| POST | `/api/notifications/subscriptions/webpush` | JWT (own userId) | Register web-push subscription |
| GET | `/api/notifications/stream` | JWT (own userId) | SSE stream for live events |
| POST | `/internal/notifications/events` | `X-Internal-Service-Secret` header | Internal service trigger |

### Entities and Tables

| Entity | Table | Notes |
|--------|-------|-------|
| `Notification` | `notifications` | Core event record |
| `NotificationRecipient` | `notification_recipients` | Per-user delivery target |
| `NotificationOutbox` | `notification_outbox` | Delivery work queue (outbox pattern) |
| `NotificationAttempt` | `notification_attempts` | Delivery attempt audit log |
| `NotificationDeadLetter` | `notification_dead_letter` | Failed-exhausted deliveries |
| `NotificationPreference` | `notification_preferences` | Per-user per-channel opt-in + quiet hours |
| `NotificationTemplate` | `notification_templates` | Versioned Thymeleaf template store |
| `NotificationSubscription` | `notification_subscriptions` | Web Push endpoint registrations |

### Flyway Migrations

| File | Contents |
|------|----------|
| `V1__create_notifications_schema.sql` | All 8 tables + 10 indexes. No FK constraints declared. |

### Outbound Calls / Infrastructure Dependencies

| Target | Mechanism |
|--------|-----------|
| PostgreSQL | Spring Data JPA / Hibernate |
| Redis Streams | `StringRedisTemplate.opsForStream()` |
| SMTP | `JavaMailSender` (Spring Mail) |
| Eureka | `spring-cloud-starter-netflix-eureka-client` |
| Web Push | **Stub only** — logs payload, sends nothing |

---

## Findings

### P0 — Critical

---

#### NOT-01 — Redis enqueue fires inside `@Transactional` boundary

**File:** `service/NotificationService.java:168` (call site), `service/NotificationService.java:521–527` (impl)  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// NotificationService.java:87
@Transactional
public SendResult send(SendNotificationRequest request) {
    ...
    NotificationOutbox savedOutbox = outboxRepository.save(outbox);
    enqueueOutbox(savedOutbox);          // line 168 — Redis write while DB tx is still open
    ...
}

// line 521–527
private void enqueueOutbox(NotificationOutbox outbox) {
    try {
        redisTemplate.opsForStream().add(properties.getStream().getName(),
            Map.of("outboxId", outbox.getId().toString()));
    } catch (Exception ex) {
        log.warn("Unable to enqueue outbox {}: {}", outbox.getId(), ex.getMessage());
    }
}
```

**Why it is wrong:** The Redis `XADD` succeeds and the stream consumer (`OutboxStreamListener`) can pick up the outbox ID before the PostgreSQL transaction commits. `OutboxProcessor.process()` then calls `outboxRepository.findById(outboxId)` and gets `null` (row not yet visible), silently dropping the delivery. Under rollback scenarios the Redis message is also orphaned permanently.

**Fix:** Publish to Redis only after the DB transaction commits. Use a `@TransactionalEventListener(phase = AFTER_COMMIT)` or move the enqueue call to the controller after `notificationService.send()` returns.

```java
// Service: remove enqueueOutbox() call from send(), return outbox IDs in SendResult
// Controller: after send() returns, enqueue each outbox ID
SendResult result = notificationService.send(request);
result.getOutboxIds().forEach(id ->
    redisTemplate.opsForStream().add(streamName, Map.of("outboxId", id.toString())));
```

---

#### NOT-02 — SSE push fires inside `@Transactional` before DB commit

**File:** `service/NotificationService.java:171–179`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// line 171-179 (inside @Transactional send())
if (recipient.getUserId() != null && eligibleChannels.contains(NotificationChannel.IN_APP)) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("recipient_id", stored.getId());
    payload.put("notification_id", saved.getId());
    ...
    sseHub.emit(recipient.getUserId(), payload);   // pushed before tx commits
}
```

**Why it is wrong:** The browser receives an SSE event and immediately calls `GET /api/notifications/inbox`. At that instant the transaction may not yet be committed, so the inbox returns stale data or omits the notification entirely. This causes a visible race condition in the UI.

**Fix:** Same pattern as NOT-01 — move `sseHub.emit()` to a `@TransactionalEventListener(phase = AFTER_COMMIT)` or a dedicated post-commit callback.

---

#### NOT-03 — Internal service auth bypassed when secret is set to empty string

**File:** `security/filter/InternalServiceAuthFilter.java:21–23`, `resources/application.yml:56`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// InternalServiceAuthFilter.java:21-23
public InternalServiceAuthFilter(
    @Value("${app.security.internal-service-secret:}")   // empty-string fallback
    String internalServiceSecret
) {
```

```java
// line 39
if (!Objects.equals(internalServiceSecret, provided)) {
```

**Why it is wrong:** `Objects.equals("", "")` evaluates to `true`. If the deployment sets `INTERNAL_SERVICE_SECRET=""` (common in misconfigured Kubernetes secrets or `docker-compose` with an empty env var), `provided` is `null` (absent header) — but if the caller also sends `X-Internal-Service-Secret:` as an empty header, the check passes and anyone can call `/internal/notifications/events` without a real secret. The `SecurityConfig` also declares `/internal/**` as `permitAll()`, so Spring Security does not stop this even if the filter is bypassed.

Additionally, the `application.yml` default `fawnix-internal-secret` is a plaintext known-default that must not ship to production.

**Fix:**

```java
@PostConstruct
public void validate() {
    if (internalServiceSecret == null || internalServiceSecret.isBlank()) {
        throw new IllegalStateException(
            "app.security.internal-service-secret must be set to a non-empty value");
    }
}
```

---

### P1 — High

---

#### NOT-04 — `OutboxProcessor.process()` is not `@Transactional`

**File:** `service/OutboxProcessor.java:63–126`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// OutboxProcessor.java:63 — no @Transactional
public void process(UUID outboxId) {
    ...
    outbox.setStatus(NotificationOutboxStatus.PROCESSING);
    outboxRepository.save(outbox);            // save 1

    ...result = sender.send(...);...

    attemptRepository.save(attempt);          // save 2
    outboxRepository.save(outbox);            // save 3
    updateRecipientStatus(outbox.getRecipient()); // save 4
}
```

**Why it is wrong:** If the JVM crashes between any two saves, the outbox can be left in `PROCESSING` status permanently — it will never be retried (the `processDue` scheduler filters on `PENDING` and `FAILED`). The delivery attempt log may be missing or the recipient status stale.

**Fix:** Add `@Transactional` to `process()`. The `sender.send()` call (SMTP, HTTP) must be moved outside the transaction or wrapped in a try-finally that rolls back the status to `FAILED` before commit.

---

#### NOT-05 — N+1 queries in `inbox()`

**File:** `service/NotificationService.java:185–216`, `repository/NotificationRecipientRepository.java:11`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// NotificationRecipientRepository.java:11 — plain derived query, no JOIN FETCH
List<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(UUID userId);

// NotificationService.java:186-213
List<NotificationRecipient> recipients = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId);
for (NotificationRecipient recipient : recipients) {
    Notification notification = recipient.getNotification();  // EAGER @ManyToOne fires N extra SELECTs
```

**Why it is wrong:** Spring Data JPA derived queries never produce a `JOIN FETCH`. Even with `@ManyToOne` defaulting to `FetchType.EAGER`, Hibernate generates `N` additional `SELECT notifications WHERE id = ?` statements — one per recipient row. A user with 500 inbox items triggers 501 DB round trips on every page load.

**Fix:** Add a `@Query` with `JOIN FETCH`:

```java
@Query("select r from NotificationRecipient r join fetch r.notification "
     + "where r.userId = :userId order by r.createdAt desc")
List<NotificationRecipient> findByUserIdWithNotification(@Param("userId") UUID userId);
```

Or add `Pageable` support at the same time (see NOT-14).

---

#### NOT-06 — Module filter and unread filter done in Java on full data load

**File:** `service/NotificationService.java:186–216`, `controller/NotificationController.java:83–95`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// NotificationService.java:190-198 — module filter in Java
if (module != null && !module.isBlank()) {
    if (!module.equalsIgnoreCase(notification.getModule())) {
        continue;
    }
}

// NotificationController.java:93 — unread count computed client-side from already-returned data
long unreadCount = data.stream().filter(item -> !"read".equals(item.get("status"))).count();
```

**Why it is wrong:** Every `GET /inbox` loads every notification the user has ever received, then discards non-matching rows in Java. For a module-specific inbox call (e.g. "show only crm notifications") this is O(total_user_notifications) work even if zero results are needed. The unread count is then re-computed from the already-filtered `data` list rather than from the full set, so when `unread=true` filter is active the count is wrong (it always equals `data.size()`).

**Fix:** Push filtering to the repository:

```java
@Query("select r from NotificationRecipient r join fetch r.notification n "
     + "where r.userId = :userId "
     + "and (:module is null or n.module = :module) "
     + "and (:unreadOnly = false or r.status != 'READ') "
     + "order by r.createdAt desc")
Page<NotificationRecipient> findInbox(..., Pageable page);
```

---

#### NOT-07 — `markRead` and `markReadAll` are not `@Transactional`

**File:** `service/NotificationService.java:219–241`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// line 219 — no @Transactional
public boolean markRead(UUID userId, UUID recipientId) {
    ...
    recipient.setStatus(NotificationRecipientStatus.READ);
    recipient.setReadAt(OffsetDateTime.now());
    recipientRepository.save(recipient);         // single save — acceptable but not atomic with read
    return true;
}

// line 230 — no @Transactional
public int markReadAll(UUID userId) {
    List<NotificationRecipient> recipients = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId);
    for (NotificationRecipient recipient : recipients) { ... }
    recipientRepository.saveAll(recipients);     // saveAll of potentially thousands of rows
    return count;
}
```

**Why it is wrong:** `markReadAll` reads the list, modifies it in Java, then calls `saveAll`. Without a transaction, a concurrent write between the `findBy...` and `saveAll` can be silently overwritten. The user could mark-read-all and a new notification arriving in that window appears as "read" immediately because its recipient row was included in the original load.

**Fix:** Add `@Transactional` to both methods.

---

#### NOT-08 — Any authenticated user can send notifications and manage templates

**File:** `controller/NotificationController.java:44–145`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// NotificationController.java:44-46 — no role check
@PostMapping("/send")
public ResponseEntity<?> send(@RequestBody SendNotificationRequest request) {
    SendResult result = notificationService.send(request);
```

```java
// line 133-135 — any authenticated user can create templates
@PostMapping("/templates")
public ResponseEntity<?> upsertTemplate(@RequestBody TemplateUpsertRequest request) {
    var template = notificationService.upsertTemplate(request);
```

**Why it is wrong:** Any employee who can obtain a JWT can craft a `POST /api/notifications/send` with arbitrary recipients and content, impersonating system notifications (e.g. password reset, approval required). Template creation is equally unguarded — any user can inject Thymeleaf templates into the database.

**Fix:** Restrict both `POST /send`, `POST /batch`, and `POST /templates` to a `ROLE_SYSTEM` or `ROLE_ADMIN` authority:

```java
@PreAuthorize("hasAuthority('ROLE_SYSTEM') or hasAuthority('ROLE_ADMIN')")
@PostMapping("/send")
public ResponseEntity<?> send(...) { ... }
```

---

#### NOT-09 — `upsertTemplate` always inserts; never updates existing template

**File:** `service/NotificationService.java:265–283`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// line 265-283 — new NotificationTemplate() every time
public NotificationTemplate upsertTemplate(TemplateUpsertRequest request) {
    ...
    NotificationTemplate template = new NotificationTemplate();   // always new
    ...
    return templateRepository.save(template);    // always INSERT
}
```

**Why it is wrong:** The method is named `upsertTemplate` but it always creates a new row. When a caller passes the same `key + channel + locale + version` combination twice, the DB `UNIQUE` constraint on `(template_key, channel, locale)` causes a `DataIntegrityViolationException` that propagates as a 500 error. The versioning increment via `nextVersion()` only prevents collision if `version` is omitted — passing an explicit `version` that already exists will blow up.

**Fix:** Look up the existing row first and update if found:

```java
NotificationTemplate template = templateRepository
    .findTopByKeyAndChannelAndLocaleOrderByVersionDesc(request.getKey(), channel, locale)
    .orElseGet(NotificationTemplate::new);
// then set fields and save
```

---

#### NOT-10 — `processDue()` scheduler has no distributed lock

**File:** `service/OutboxProcessor.java:128–141`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
@Scheduled(fixedDelayString = "${notifications.outbox.scan-ms:10000}")
public void processDue() {
    List<NotificationOutbox> due = outboxRepository.findDueOutbox(...);
    for (NotificationOutbox outbox : due) {
        process(outbox.getId());
    }
}
```

**Why it is wrong:** With multiple replicas (standard in a cloud environment), every instance fires `processDue()` simultaneously. Each instance retrieves the same `due` list and calls `process()` on the same outbox IDs concurrently. This causes duplicate email sends, duplicate SSE events, and attempt count increments racing toward the dead-letter threshold faster than intended. The Redis stream consumer group (`ReadOffset.lastConsumed()`) does deduplicate stream-triggered calls, but the `@Scheduled` poller bypasses the stream entirely.

**Fix:** Either disable the scheduler in multi-instance mode and rely solely on Redis Streams, or add a distributed lock via Redisson or ShedLock before the `findDueOutbox` call.

---

### P2 — Medium

---

#### NOT-11 — `LocalTime.now()` uses JVM system timezone for quiet hours

**File:** `service/NotificationService.java:500–515`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// line 500
LocalTime now = LocalTime.now();   // uses JVM default zone — not user's timezone
```

**Why it is wrong:** Quiet hours are a user preference stored as `HH:mm` strings. The comparison uses `LocalTime.now()` which reads the JVM's default timezone. If the server runs in UTC and the user is in UTC+5:30, their quiet hours (e.g. 22:00–08:00 local) are compared against UTC time — notifications may break through quiet hours or be delayed incorrectly.

**Fix:** Store user timezone in `NotificationPreference` and use `LocalTime.now(ZoneId.of(preference.getTimezone()))`.

---

#### NOT-12 — Thymeleaf `TemplateRenderer` disables caching

**File:** `service/TemplateRenderer.java:26`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
StringTemplateResolver resolver = new StringTemplateResolver();
resolver.setCacheable(false);     // forces parse on every call
```

**Why it is wrong:** Every notification delivery re-parses the Thymeleaf HTML and text templates from scratch. For high-volume notifications with large HTML templates this adds measurable CPU and GC pressure. Thymeleaf's default cache is LRU-bounded and is specifically designed for repeated rendering of the same template string.

**Fix:** Leave `cacheable` at the default (`true`) or set an appropriate cache size. Thymeleaf caches by template identity (the string content), so template updates will still take effect because the content changes.

---

#### NOT-13 — Linear retry delay instead of exponential backoff

**File:** `service/OutboxProcessor.java:143–147`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private OffsetDateTime nextRetry(int attempts) {
    int base = properties.getRetries().getBaseDelaySeconds();
    int delay = base * Math.max(1, attempts);   // linear: 30s, 60s, 90s, 120s, 150s
    return OffsetDateTime.now().plusSeconds(delay);
}
```

**Why it is wrong:** Linear backoff does not protect a degraded SMTP server from thundering herd on recovery. The standard pattern is exponential with jitter.

**Fix:**

```java
long delay = (long) (base * Math.pow(2, attempts - 1));          // 30, 60, 120, 240, 480
long jitter = ThreadLocalRandom.current().nextLong(0, delay / 4 + 1);
return OffsetDateTime.now().plusSeconds(delay + jitter);
```

---

#### NOT-14 — No pagination on inbox endpoint

**File:** `controller/NotificationController.java:82–95`, `repository/NotificationRecipientRepository.java:11`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// controller line 92 — no page/limit params
List<Map<String, Object>> data = notificationService.inbox(userId, module, unread);
```

**Why it is wrong:** A user with a long notification history causes the service to deserialize all their rows into Java heap on every inbox request. A user with 10,000 notifications would return a 10,000-item list in a single HTTP response.

**Fix:** Add `@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size` and pass a `PageRequest` to the repository.

---

#### NOT-15 — `groupId` mismatch: module uses `com.hirepath`, parent uses `com.fawnix`

**File:** `pom.xml:5–11`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```xml
<parent>
    <groupId>com.fawnix</groupId>       <!-- parent -->
    ...
</parent>
<groupId>com.hirepath</groupId>         <!-- this module -->
<artifactId>notifications-service</artifactId>
```

**Why it is wrong:** This is a brand/namespace migration artifact. The service is published as `com.hirepath:notifications-service` but lives under a `com.fawnix` parent. This creates confusion for Maven dependency resolution, artifact repos, and any tooling that scans the namespace. All source packages also use `com.hirepath.notifications`.

**Fix:** Align `groupId` in `pom.xml` to `com.fawnix` and rename the Java package to `com.fawnix.notifications` across all source files.

---

#### NOT-16 — No foreign key constraints in the schema migration

**File:** `db/migration/V1__create_notifications_schema.sql:21–127`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```sql
-- notification_recipients references notifications but no FK declared
CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,   -- no REFERENCES notifications(id)
  ...
);
```

**Why it is wrong:** All eight tables reference each other (recipients → notifications, outbox → notifications/recipients, attempts → recipients, dead_letter → outbox) but none declare `FOREIGN KEY` constraints or `ON DELETE` rules. A partial delete or a bug in cleanup logic will leave orphan rows. There is no protection at the DB level if application code skips the cascade.

**Fix:** Add FK constraints:

```sql
ALTER TABLE notification_recipients
    ADD CONSTRAINT fk_recipients_notification
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;
-- ...repeat for all cross-table references
```

---

#### NOT-17 — WebPush delivery is an unimplemented stub

**File:** `service/WebPushNotificationSender.java:44`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
log.info("Web push (stub) to {} endpoint {} payload {}", recipient.getUserId(), subscription.getEndpoint(), payload);
return DeliveryResult.ok();
```

**Why it is wrong:** The web push sender always returns success without actually delivering anything. Callers requesting `WEB_PUSH` channel get a `SENT` status in the outbox and no delivery failure, so the stub silently swallows all web push notifications. The `notification_subscriptions` table accepts endpoint registrations but they are never used in a real push.

**Fix:** Integrate a Web Push library (e.g. `dev.blanke.webpush4j` or `com.zerodeplibs:webpush-crypt`) with VAPID keys configured via `NotificationProperties`, or throw `UnsupportedOperationException` to make the stub's status explicit and surface failures in metrics.

---

### P3 — Low

---

#### NOT-18 — JWT filter calls `toUserDetails()` before `isTokenValid()`

**File:** `security/filter/JwtAuthenticationFilter.java:44–46`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
AppUserDetails userDetails = jwtService.toUserDetails(token);  // parses — may throw ExpiredJwtException
if (jwtService.isTokenValid(token)) {                          // second parse
```

**Why it is wrong:** Two JWT parse calls for every authenticated request (double CPU). If `toUserDetails()` throws on an expired token, the `catch (Exception ignored)` silences it, which is correct but unintentional. The idiomatic approach is to parse once and check validity from the returned claims.

**Fix:** Merge the two calls:

```java
try {
    Claims claims = jwtService.extractAndValidateClaims(token); // single parse, throws on expired
    AppUserDetails userDetails = jwtService.toUserDetails(claims);
    ...
} catch (JwtException ignored) {
    SecurityContextHolder.clearContext();
}
```

---

#### NOT-19 — Default secrets committed in `application.yml`

**File:** `resources/application.yml:55–56`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Why it is wrong:** `fawnix-internal-secret` is a known plaintext default committed to version control. If a developer accidentally deploys without setting the env vars, production uses a publicly known secret. The same JWT secret string appears in multiple services.

**Fix:** Remove all default values from secret properties. Use `@PostConstruct` validation (per NOT-03) to fail fast at startup if secrets are absent.

---

#### NOT-20 — `RestAccessDeniedHandler` and `RestAuthenticationEntryPoint` instantiate their own `ObjectMapper`

**File:** `security/handler/RestAccessDeniedHandler.java:19`, `security/handler/RestAuthenticationEntryPoint.java:19`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private final ObjectMapper objectMapper = new ObjectMapper();  // bypasses Spring config
```

**Why it is wrong:** The Spring-managed `ObjectMapper` bean may have custom modules registered (e.g. `JavaTimeModule`, `Jdk8Module`). Using `new ObjectMapper()` bypasses this, meaning if someone adds a custom serializer to the app context it won't apply to error responses. It also creates an extra unshared instance per handler class.

**Fix:** Inject the Spring `ObjectMapper` bean via constructor injection.

---

#### NOT-21 — Dockerfile `EXPOSE` declares wrong port

**File:** `Dockerfile:12`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```dockerfile
EXPOSE 8088    # wrong — application.yml: server.port: ${SERVER_PORT:8092}
```

**Why it is wrong:** `EXPOSE` is documentation for operators and Kubernetes port mappings. The mismatch causes confusion in deployment configuration and can break health checks if `EXPOSE` is used to derive the container port.

**Fix:** Change to `EXPOSE 8092`.

---

#### NOT-22 — `javax.crypto.SecretKey` import in `JwtService` (legacy namespace)

**File:** `security/jwt/JwtService.java:62`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
.verifyWith((javax.crypto.SecretKey) getSigningKey())
```

**Why it is wrong:** The project targets Jakarta EE (Spring Boot 3.x). The `javax.crypto` package still ships in the JDK so this compiles, but the inline cast is unnecessary since `Keys.hmacShaKeyFor()` already returns a `javax.crypto.SecretKey` subtype compatible with the JJWT `verifyWith()` method. The cast is both redundant and uses the legacy namespace prefix inconsistently with the rest of the codebase.

**Fix:** Remove the cast: `.verifyWith(getSigningKey())` and change return type of `getSigningKey()` to `javax.crypto.SecretKey` explicitly, or use `SecretKey` imported at the top of the file.

---

#### NOT-23 — Security stack copy-pasted verbatim across 10+ services

**File (notifications):** `security/jwt/JwtService.java`, `security/service/AppUserDetails.java`, `security/config/SecurityConfig.java`, `security/filter/JwtAuthenticationFilter.java`, `security/filter/InternalServiceAuthFilter.java`  
**Cross-service duplicates (identity-only diff is package name):**

| File in notifications-service | Identical copy in |
|-------------------------------|-------------------|
| `security/jwt/JwtService.java` | `recruitment-service/security/jwt/JwtService.java` (diff: package only) |
| `security/service/AppUserDetails.java` | `recruitment-service/security/service/AppUserDetails.java` (diff: package only) |
| `security/config/SecurityConfig.java` | `approval-service/security/config/SecurityConfig.java` (diff: package only) |

**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

**Why it is wrong:** A bug in `JwtService.getSigningKey()` (NOT-22) or a security vulnerability in the filter logic must be patched in 10+ separate places. Historical evidence shows divergence has already begun (`identity-service` extracted `toBase64Secret()` into its own method while `notifications-service` inlines it). Any one copy drifting (e.g. relaxing `isTokenValid`) creates a service-specific vulnerability.

**Fix:** Extract a `security-common` library module (`com.fawnix:security-common`) containing `JwtService`, `AppUserDetails`, `InternalServiceAuthFilter`, `JwtAuthenticationFilter`, `JwtProperties`, `RestAccessDeniedHandler`, and `RestAuthenticationEntryPoint`. Each service adds it as a Maven dependency.

---

#### NOT-24 — No `@ControllerAdvice` / `GlobalExceptionHandler`

**File:** (entire `notifications-service` source tree)  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

**Why it is wrong:** Six other services in the monorepo (`sales-service`, `crm-service`, `task-service`, `identity-service`, `inventory-service`, `procurement-service`) have a `GlobalExceptionHandler`. `notifications-service` handles errors inline in each controller method with `try/catch` blocks that return inconsistent formats (`ResponseEntity.badRequest().body(ex.getMessage())` as raw string, vs `Map.of(...)` elsewhere). Spring's default error handling for uncaught exceptions returns a Whitelabel error page JSON that does not match the service's error contract.

**Fix:** Add a `@RestControllerAdvice GlobalExceptionHandler` handling at minimum `IllegalArgumentException` (→ 400), `DataIntegrityViolationException` (→ 409), and `Exception` (→ 500) with a consistent JSON body.

---

#### NOT-25 — `channels` stored as a comma-separated string; matched with `String.contains()`

**File:** `domain/NotificationRecipient.java:36–37`, `service/NotificationService.java:195`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```java
// domain
@Column(name = "channels", nullable = false)
private String channels;   // e.g. "in_app,email"

// service — fragile substring match
if (recipient.getChannels() == null || !recipient.getChannels().contains("in_app")) {
```

**Why it is wrong:** `String.contains("in_app")` is not a proper CSV membership check. A hypothetical channel named `"in_app_extended"` would also match. The pattern also makes database-level filtering on channel impossible without string function calls.

**Fix:** Store as a proper array column (`TEXT[] channels` in PostgreSQL) and use `@Column(columnDefinition = "text[]")` or a JSON array. Alternatively, normalize to a `notification_recipient_channels` join table. At minimum, use `Arrays.asList(channels.split(",")).contains("in_app")` instead of `String.contains`.

---

## Redundancy

### Cross-service copy-paste clones

All diffs were verified; the only differences in the matched files are the Java `package` declaration and the corresponding `import` for `AppUserDetails`.

| Clone A | Clone B | Diff |
|---------|---------|------|
| `notifications-service/.../security/jwt/JwtService.java` | `recruitment-service/.../security/jwt/JwtService.java` | package line only |
| `notifications-service/.../security/jwt/JwtService.java` | `forms-service/.../security/jwt/JwtService.java` | package + import lines only |
| `notifications-service/.../security/service/AppUserDetails.java` | `recruitment-service/.../security/service/AppUserDetails.java` | package line only |
| `notifications-service/.../security/config/SecurityConfig.java` | `approval-service/.../security/config/SecurityConfig.java` | package + import lines only |
| `notifications-service/.../security/handler/RestAccessDeniedHandler.java` | (analogous files in approval, forms, recruitment) | package + import lines only |

At minimum 10 services carry the full security filter stack. See NOT-23 for the remediation plan.

### Intra-service redundancy

| Pattern | Location A | Location B | Notes |
|---------|-----------|-----------|-------|
| `OffsetDateTime.now()` for `readAt` | `NotificationService.java:225` | `NotificationService.java:236` | Not a code clone, but `OffsetDateTime.now()` without explicit UTC zone appears 4 times across the service (lines 98, 117, 225, 236, 510) |
| Null-safe UUID parse | `NotificationService.java:411–419` (`parseUserId`) | `NotificationController.java:201–205` (`getUserId`) | Near-identical defensive UUID.fromString wrap — could be one utility method |

---

## Tests and Gaps

**Test coverage: zero.**

`src/test` directory does not exist. `pom.xml` declares `spring-boot-starter-test` in test scope but no test class has been written.

Critical untested paths:

| Path | Risk |
|------|------|
| `send()` with Redis down | Does DB commit succeed? Are outbox IDs lost? |
| `processDue()` concurrent duplicate processing | Duplicate emails? |
| `computeQuietHourDelay()` midnight-spanning windows | Off-by-one in overnight quiet hours |
| `validateRequest()` all edge cases | Missing validation bypasses |
| `markRead()` with wrong userId | Authorization bypass |
| Redis stream consumer group recovery after restart | `ReadOffset.lastConsumed()` vs `ReadOffset.from(...)` |

Minimum recommended test additions:
1. Unit tests for `NotificationService.send()` using a mock `NotificationRepository` and `StringRedisTemplate`.
2. Unit tests for `computeQuietHourDelay()` covering midnight-crossing windows.
3. Integration test for `OutboxProcessor.process()` using an embedded H2 or Testcontainers.
4. `@WebMvcTest` on `NotificationController` verifying auth enforcement on `/send` and `/templates`.

---

## Coverage Note

**Fully inspected:**
- All controller endpoints and their HTTP status codes
- All service methods in `NotificationService`, `OutboxProcessor`, `OutboxStreamListener`
- All eight `@Entity` classes and the Flyway migration SQL
- Security filter chain (`SecurityConfig`, `JwtAuthenticationFilter`, `InternalServiceAuthFilter`)
- `JwtService` signing key logic
- `application.yml` (all properties)
- `Dockerfile`
- `pom.xml`
- `TemplateResolver`, `TemplateRenderer`
- All eight repository interfaces
- Cross-service duplication via `find` + `md5sum` + `diff`

**Not inspected / low confidence areas:**
- Runtime behavior of Redis Stream consumer group restart (static analysis only; no integration test run)
- Thymeleaf template rendering correctness for edge-case variable substitutions (no templates in test fixtures)
- Eureka discovery integration (config accepted at face value)
- Whether the `NOTIFICATIONS_DB_PASSWORD:postgres` default propagates to any deployed environment

**Overall confidence: High** for all P0/P1 findings (code paths are unambiguous). Medium for NOT-25 (channel name collision is hypothetical with current enum values but the pattern is fragile). Low for any runtime behavior that requires a live Redis or SMTP dependency.

# forms-service — Service Audit

**Audited:** 2026-07-14  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Root:** `backend/services/forms-service`  
**Primary author across files:** Ravi-Shankar-ACS  
**Namespace note:** `groupId = com.hirepath` inside a `com.fawnix` monorepo parent (all source packages are `com.hirepath.forms.*`). The service was introduced via the "integrate HRMS modules" bulk commit (096c301) and later expanded in f4f8d74. Marked [migrated] where the hirepath namespace is the core issue.

---

## Summary

forms-service manages application form lifecycle (create / publish / archive), form templates, shared collections, shareable per-candidate links, and submission ingestion via an internal API. The codebase is **functional but structurally fragile**: all business logic lives inside a single 799-line controller class with no service layer, no `@Transactional` boundaries anywhere, no `@Valid` bean validation, no GlobalExceptionHandler, and zero tests. The two most urgent risks are (1) non-atomic multi-step writes that can leave the database in a corrupt half-written state, and (2) a unique-constraint crash that fires every time a published form is re-published with the same user-supplied version string.

---

## Surface Map

### Endpoints

| Method | Path | Auth | Controller |
|--------|------|------|------------|
| GET | `/api/recruitment/forms` | authenticated | FormsController |
| POST | `/api/recruitment/forms` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| GET | `/api/recruitment/forms/{id}` | authenticated | FormsController |
| PATCH | `/api/recruitment/forms/{id}` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| POST | `/api/recruitment/forms/{id}/publish` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| POST | `/api/recruitment/forms/{id}/archive` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| GET | `/api/recruitment/forms/analytics` | authenticated | FormsController |
| GET | `/api/recruitment/forms/{id}/submissions` | authenticated | FormsController |
| GET | `/api/recruitment/forms/templates` | authenticated | FormsController |
| POST | `/api/recruitment/forms/templates` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| POST | `/api/recruitment/forms/templates/{id}/favorite` | authenticated | FormsController |
| GET | `/api/recruitment/forms/collections` | authenticated | FormsController |
| POST | `/api/recruitment/forms/collections` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| GET | `/api/recruitment/forms/links` | authenticated | FormsController |
| POST | `/api/recruitment/forms/links` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| POST | `/api/recruitment/forms/links/{id}/resend` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| POST | `/api/recruitment/forms/links/{id}/expire` | ROLE_ADMIN / HR_MANAGER / RECRUITER / REPORTING_MANAGER | FormsController |
| GET | `/internal/forms/{slug}` | internal-secret | InternalFormsController |
| POST | `/internal/forms/submissions` | internal-secret | InternalFormSubmissionsController |

### Entities / Tables

| Entity | Table | PK |
|--------|-------|----|
| ApplicationForm | `application_forms` | UUID |
| ApplicationFormField | `application_form_fields` | UUID |
| ApplicationFormTemplate | `application_form_templates` | UUID |
| ApplicationFormCollection | `application_form_collections` | UUID |
| ApplicationFormFavorite | `application_form_favorites` | UUID |
| ApplicationFormLink | `application_form_links` | UUID |
| ApplicationFormVersion | `application_form_versions` | UUID |
| ApplicationFormSubmission | `application_form_submissions` | UUID |
| ApplicationFormSubmissionResponse | `application_form_submission_responses` | UUID |

### Flyway Migrations

| File | Contents |
|------|----------|
| `V1__create_forms_schema.sql` | Creates 6 tables: forms, fields, templates, collections, favorites, links |
| `V2__forms_submissions_and_versions.sql` | Creates versions, submissions, submission_responses tables; ALTERs links to add slug/is_active/max_submissions/current_submissions/access_type |

### Outbound Feign Calls

| Client | Target | Endpoint |
|--------|--------|----------|
| `NotificationsClient` | `notifications-service` (Eureka) | POST `/internal/notifications/events` |

---

## Findings

### P0 — Critical

---

#### FOR-01 — Non-atomic form creation: form saved before field validation, orphan form on failure
**File:** `FormsController.java:206-213`  
**Severity:** P0  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
ApplicationForm saved = formRepository.save(form);   // ← persisted
int idx = 0;
for (FormFieldDto fieldDto : request.getFields()) {
    ApplicationFormField field = toField(saved, fieldDto, idx++);  // ← throws if type invalid
    fieldRepository.save(field);                                    // ← N individual INSERTs
}
```

**Why it is wrong:** `formRepository.save(form)` commits before the field loop begins. If `toField()` throws (invalid `type` string causes `IllegalArgumentException` from `ApplicationFieldType.valueOf()`), or any `fieldRepository.save()` fails, the form row is already committed with zero fields. There is no `@Transactional` on the method or class, so no rollback occurs. The form exists in the DB in a permanently empty state and cannot be found/edited normally.

**Proper fix:** Annotate `createForm` (and move field-saving logic to a `@Service`) with `@Transactional`. Also use `fieldRepository.saveAll(fields)` instead of one INSERT per field:

```java
// In a new FormService
@Transactional
public ApplicationForm createForm(FormCreateRequest request, String userId) {
    ApplicationForm saved = formRepository.save(form);
    List<ApplicationFormField> fields = buildFields(saved, request.getFields());
    fieldRepository.saveAll(fields);
    return saved;
}
```

---

#### FOR-02 — `publish` endpoint crashes with DataIntegrityViolationException when re-publishing the same version
**File:** `FormsController.java:326` and `V2__forms_submissions_and_versions.sql:10`  
**Severity:** P0  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// FormsController.java:326
form.setStatus(ApplicationFormStatus.PUBLISHED);
formRepository.save(form);
createVersionSnapshot(form);   // ← blindly INSERT with same (form_id, version)
```

```sql
-- V2 migration line 10
create unique index if not exists ux_application_form_versions_form_version
    on application_form_versions(form_id, version);
```

**Why it is wrong:** The `version` column (`"v1.0"` by default) is a free-text user string. Every call to `publish` unconditionally INSERTs a new row into `application_form_versions` with the same `(form_id, version)`. On second publish, PostgreSQL throws a `DataIntegrityViolationException` which bubbles up as an unhandled 500. This is a completely normal workflow (draft → publish → minor edit → publish again without bumping the version).

**Proper fix:** Either (a) auto-increment the version on each publish (e.g., `v1`, `v2`, …) and ignore the user-supplied string for internal versioning, or (b) upsert / skip snapshot creation if the schema has not changed:

```java
private void createVersionSnapshot(ApplicationForm form) {
    String effectiveVersion = "v" + (versionRepository.countByFormId(form.getId()) + 1);
    ApplicationFormVersion version = new ApplicationFormVersion();
    version.setVersion(effectiveVersion);
    ...
}
```

---

#### FOR-03 — `updateForm` saves the form before validating new fields, leaving partial state on validation failure
**File:** `FormsController.java:286-299`  
**Severity:** P0  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
formRepository.save(form);               // ← saved: name/module/owner already committed

if (request.getFields() != null) {
    try {
        validateFields(request.getFields()); // ← if this throws …
    } catch (IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
        // … we return 400, but form metadata is already updated
    }
    fieldRepository.deleteByForm_Id(id);
    for (FormFieldDto fieldDto : request.getFields()) {
        fieldRepository.save(toField(form, fieldDto, idx++)); // ← each is a separate INSERT
    }
}
```

**Why it is wrong:** The form record (name, module, description, owner) is committed **before** field validation runs. A caller who sends an invalid field key (duplicate) gets a 400 response, but the form's metadata is already mutated in the DB. If `parseFieldType` throws during the field-save loop, fields may be partially deleted and only some new ones written. No transaction wraps any of this.

**Proper fix:** Move all mutation and validation into a single `@Transactional` service method. Validate fields **before** saving anything:

```java
@Transactional
public void updateForm(UUID id, FormUpdateRequest request) {
    // 1. validate all inputs
    if (request.getFields() != null) validateFields(request.getFields());
    // 2. mutate
    ApplicationForm form = formRepository.findById(id).orElseThrow(...);
    // ... apply changes
    formRepository.save(form);
    if (request.getFields() != null) {
        fieldRepository.deleteByForm_Id(id);
        fieldRepository.saveAll(buildFields(form, request.getFields()));
    }
}
```

---

### P1 — High

---

#### FOR-04 — `listForms()` and `analytics()` load the entire table into memory; no pagination
**File:** `FormsController.java:99, 139, 576`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// listForms – line 99
List<ApplicationForm> forms = formRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
// ... then filter in Java (lines 102-137)

// analytics – line 576
long published = formRepository.findAll().stream()
    .filter(f -> f.getStatus() == ApplicationFormStatus.PUBLISHED)
    .count();
```

**Why it is wrong:** All rows from `application_forms` are loaded into the JVM heap on every request. As forms accumulate this becomes a slow query, large GC pressure, and eventual OOM. The `analytics()` method also fetches all forms a second time in a separate `findAll()` call (already holding the count from `formRepository.count()` on line 575) to count published ones — a pure waste.

**Proper fix:** Push filters into the database using derived queries or Specifications. For analytics, use a single aggregate query:

```java
// Repository
long countByStatus(ApplicationFormStatus status);
// Analytics method
long total = formRepository.count();
long published = formRepository.countByStatus(ApplicationFormStatus.PUBLISHED);
```

For listForms, add `Pageable` support and database-side predicates.

---

#### FOR-05 — `listCollections()` is an N+1 query: one SELECT per collection
**File:** `FormsController.java:417-438`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
List<ApplicationFormCollection> collections = collectionRepository.findAll(...);
for (ApplicationFormCollection collection : collections) {
    List<String> formIds = formRepository.findByCollectionId(collection.getId().toString())
        .stream().map(...).toList();
    formIdsByCollection.put(..., formIds);
}
```

**Why it is wrong:** One `SELECT` is issued against `application_forms` for every collection. With 50 collections that is 51 queries (1 + 50). The `collection_id` column on `application_forms` is a string (not a FK join), so a JOIN query is the correct fix.

**Proper fix:**

```java
// Repository method
@Query("SELECT f.collectionId, f.id FROM ApplicationForm f WHERE f.collectionId IS NOT NULL")
List<Object[]> findAllCollectionIdAndFormId();
// Controller: one query, build the map in Java
```

---

#### FOR-06 — `analytics()` calls `findBySubmittedAtAfter` returning a full `List` just to call `.size()`
**File:** `FormsController.java:579-580` and `FormsController.java:714-717`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
long submissionsLast7 = submissionRepository.findBySubmittedAtAfter(since).size();
```

**Why it is wrong:** This loads every submission record from the last 7 days into the heap just to count them. On a busy system this can materialize tens of thousands of rows. The same pattern repeats in `buildTrend()` (line 714) which loads all submissions for the last 14 days in full.

**Proper fix:**

```java
// Repository
long countBySubmittedAtAfter(OffsetDateTime after);

// Controller
long submissionsLast7 = submissionRepository.countBySubmittedAtAfter(since);
```

For `buildTrend()`, use a `@Query` that groups by date at the database level.

---

#### FOR-07 — `listLinks()` GET endpoint has write side-effects (mutates and saves link status on read)
**File:** `FormsController.java:487, 702-708`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
links.stream().map(link -> {
    refreshLinkStatus(link);  // ← calls linkRepository.save(link) if expired
    ...
});

private void refreshLinkStatus(ApplicationFormLink link) {
    if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(OffsetDateTime.now())) {
        link.setStatus(FormLinkStatus.EXPIRED);
        link.setActive(false);
        linkRepository.save(link);  // ← DB write inside GET handler
    }
}
```

**Why it is wrong:** A GET request should be idempotent and side-effect-free. This fires one `UPDATE` per expired link found — 10 expired links = 10 DB writes on every list request. It also breaks HTTP caching semantics. The same logic is duplicated in `FormSubmissionService.validateLink()` (line 137-142).

**Proper fix:** Use a scheduled job (e.g., `@Scheduled`) to expire links in bulk, or compute the effective status in the DTO mapping layer without persisting it. Do not write to the DB from a GET handler.

---

#### FOR-08 — `parseFieldType` throws unchecked `IllegalArgumentException` from inside the field-save loop with no handler
**File:** `FormsController.java:731-736`, called from `toField()` at line 639, invoked from the field-save loop at lines 209 and 297
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private ApplicationFieldType parseFieldType(String value) {
    if (value == null) {
        return ApplicationFieldType.TEXT;
    }
    return ApplicationFieldType.valueOf(value.toUpperCase());  // throws if invalid
}
```

**Why it is wrong:** `validateFields()` only checks field-key uniqueness. It does not validate the `type` field. If a client sends `"type": "INVALID_TYPE"`, `ApplicationFieldType.valueOf("INVALID_TYPE")` throws `IllegalArgumentException`, which is uncaught in the field-save loop. Because there is no `GlobalExceptionHandler`, Spring MVC returns a 500 with a stack trace. The form is already persisted (FOR-01). The client cannot distinguish a bug from a bad request.

**Proper fix:** Add type validation inside `validateFields()` and catch within the same try-block already guarding the controller:

```java
try {
    ApplicationFieldType.valueOf(dto.getType().toUpperCase());
} catch (IllegalArgumentException e) {
    throw new IllegalArgumentException("Unknown field type: " + dto.getType());
}
```

---

#### FOR-09 — Unique constraint on `(form_id, version)` in `application_form_versions` will silently clash in `FormSubmissionService.createVersionSnapshot`
**File:** `FormSubmissionService.java:198-216`, `V2__forms_submissions_and_versions.sql:10`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
private ApplicationFormVersion createVersionSnapshot(UUID formId) {
    ...
    ApplicationFormVersion version = new ApplicationFormVersion();
    version.setVersion(form.getVersion() != null ? form.getVersion() : "v1.0");
    return versionRepository.save(version);  // INSERT — crashes if (formId, "v1.0") exists
}
```

**Why it is wrong:** This path is triggered when a submission arrives but no version record exists yet. If the form has already been published once (creating a version row), and this code runs again (e.g., a retry), it tries to INSERT another row with the same `(form_id, version)` key. The result is a `DataIntegrityViolationException` propagating as 500 to the caller.

**Proper fix:** Use `findTopByFormIdOrderByCreatedAtDesc` (already available) as a read-only lookup; only create a new version row if one genuinely doesn't exist, and use a sequence or timestamp-based version label rather than the user-supplied string.

---

#### FOR-10 — JWT token decoded twice per request (`toUserDetails` then `isTokenValid` both call `extractClaims`)
**File:** `JwtAuthenticationFilter.java:44-45`, `JwtService.java:23-37`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// JwtAuthenticationFilter.java
AppUserDetails userDetails = jwtService.toUserDetails(token);   // extracts + verifies JWT
if (jwtService.isTokenValid(token)) {                            // extracts + verifies JWT again
```

**Why it is wrong:** `toUserDetails` calls `extractClaims(token)` which fully parses and signature-verifies the JWT. Then `isTokenValid` calls `extractClaims` a second time. On every authenticated request the JWT is parsed, verified, and all claims decoded twice. More seriously, if the first call succeeds but the token expires in the ~1 ms gap between calls (extremely rare but theoretically possible), userDetails and auth state diverge.

**Proper fix:** Parse once, check expiry from the returned `Claims`:

```java
try {
    AppUserDetails userDetails = jwtService.toUserDetails(token);  // includes expiry inside
    // Set authentication directly — toUserDetails already throws if expired
    SecurityContextHolder.getContext().setAuthentication(...);
} catch (JwtException | IllegalArgumentException ignored) {
    SecurityContextHolder.clearContext();
}
```

Or merge `isTokenValid` into `toUserDetails` so the expiry is checked on the same `Claims` object.

---

#### FOR-11 — `InternalServiceAuthFilter` allows empty string as valid secret when env var is unset
**File:** `InternalServiceAuthFilter.java:39`, `application.yml:41`  
**Severity:** P1  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```yaml
# application.yml:41
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

```java
// InternalServiceAuthFilter.java:39
if (!Objects.equals(internalServiceSecret, provided)) {
    response.setStatus(HttpStatus.FORBIDDEN.value());
    return;
}
```

**Why it is wrong:** The `@Value` annotation uses an empty-string default (`:}` in `InternalServiceConfig.java:14` where the binding is `${app.security.internal-service-secret:}`). If `INTERNAL_SERVICE_SECRET` is unset, the bound value in `InternalServiceAuthFilter` comes from `application.yml` and is `"fawnix-internal-secret"` — a static, committed default. Any attacker who reads this file can call `/internal/**` without further credentials in non-production environments where the env var is not set. Separately, `InternalServiceConfig.java` injects the same property with an empty-string fallback; if the value resolves to empty string, a caller with an empty `X-Internal-Service-Secret` header would be admitted.

**Proper fix:** Remove the fallback value in `application.yml`; require the secret to be non-blank at startup; validate at bean init:

```java
public InternalServiceAuthFilter(@Value("${app.security.internal-service-secret}") String secret) {
    Assert.hasText(secret, "internal-service-secret must be configured");
    this.internalServiceSecret = secret;
}
```

---

### P2 — Medium

---

#### FOR-12 — `FormsController` is a 799-line god-class with direct repository injection (no service layer)
**File:** `FormsController.java:1-799`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
public class FormsController {
    private final ApplicationFormRepository formRepository;
    private final ApplicationFormFieldRepository fieldRepository;
    private final ApplicationFormTemplateRepository templateRepository;
    private final ApplicationFormCollectionRepository collectionRepository;
    private final ApplicationFormLinkRepository linkRepository;
    private final ApplicationFormFavoriteRepository favoriteRepository;
    private final ApplicationFormVersionRepository versionRepository;
    private final ApplicationFormSubmissionRepository submissionRepository;
    ...
}
```

**Why it is wrong:** 8 repository dependencies, 799 lines, 17 endpoints, all business logic, all DTO mapping — in one class. This is untestable, unsearchable, and impossible to maintain. Controller methods call `fieldRepository.save()` directly inside loops. Because there is no service layer, there is nowhere sensible to put `@Transactional`.

**Proper fix:** Extract `FormService`, `FormSubmissionService` (partially exists), `FormLinkService`, `FormTemplateService`. The controller becomes thin routing. All DB writes go through services annotated with `@Transactional`.

---

#### FOR-13 — `createForm` saves each field individually in a loop instead of batching
**File:** `FormsController.java:207-212`; same pattern in `updateForm:296-298`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
for (FormFieldDto fieldDto : request.getFields()) {
    ApplicationFormField field = toField(saved, fieldDto, idx++);
    fieldRepository.save(field);  // one INSERT per field
}
```

**Why it is wrong:** A form with 20 fields issues 21 INSERTs (1 for the form + 20 for fields). `fieldRepository.saveAll()` with JDBC batching collapses this to far fewer round-trips.

**Proper fix:** `fieldRepository.saveAll(buildFields(saved, request.getFields()));`

---

#### FOR-14 — Dockerfile EXPOSE port does not match `application.yml` server port
**File:** `Dockerfile:10`, `application.yml:21`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```dockerfile
# Dockerfile line 10
EXPOSE 8084
```

```yaml
# application.yml line 21
server:
  port: ${SERVER_PORT:8087}
```

**Why it is wrong:** `EXPOSE 8084` is the wrong port. The service listens on 8087 by default. Any Docker-based port mapping or service mesh rule configured from the Dockerfile metadata will point to the wrong port.

**Proper fix:** `EXPOSE 8087` in the Dockerfile, or better use `EXPOSE ${SERVER_PORT}` and document the default.

---

#### FOR-15 — No `GlobalExceptionHandler` — unhandled exceptions return raw Spring error responses
**File:** `FormsController.java` (entire file), `InternalFormSubmissionsController.java`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

**Why it is wrong:** There is no `@ControllerAdvice` / `@RestControllerAdvice` in this service. Uncaught `IllegalArgumentException` from `ApplicationFieldType.valueOf()`, `DataIntegrityViolationException` on slug collision or version duplicate, or any other runtime exception will produce a raw Spring error JSON or stack trace response with status 500. Half the other services in this monorepo (crm-service, identity-service, inventory-service, procurement-service) have a `GlobalExceptionHandler`; this one does not.

**Proper fix:** Add a `@RestControllerAdvice` that catches `IllegalArgumentException` → 400, `DataIntegrityViolationException` → 409, `EntityNotFoundException` → 404, and any unhandled `Exception` → 500 with a sanitized error body.

---

#### FOR-16 — Missing `@Valid` on all `@RequestBody` parameters; no Bean Validation annotations in DTOs
**File:** `FormsController.java:169, 248, 372, 442, 512`; all DTOs in `dto/`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// FormsController.java:168-170
public ResponseEntity<?> createForm(
    @RequestBody FormCreateRequest request,   // no @Valid
```

```java
// FormCreateRequest.java:10 — no @NotBlank, @NotNull, @Size annotations
private String name;
```

**Why it is wrong:** `spring-boot-starter-validation` is in `pom.xml` but is never used. Callers can create a form with a null `name` (which will cause a DB constraint violation with `column "name" violates not-null constraint`), or POST garbage fields. All validation is done manually in the controller body with ad-hoc `if` checks and hand-rolled error messages, inconsistently.

**Proper fix:** Add `@NotBlank`, `@NotNull`, `@Size` etc. to DTO fields; add `@Valid` to every `@RequestBody`; let a `@ControllerAdvice` catch `MethodArgumentNotValidException` and return structured 400 responses.

---

#### FOR-17 — `InternalFormsController.findPublishedBySlug` hardcodes `"recruitment"` module — non-recruitment forms are permanently invisible
**File:** `InternalFormsController.java:38-40`, `ApplicationFormRepository.java:29-37`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// InternalFormsController.java:38-40
ApplicationForm form = formRepository
    .findPublishedBySlug(slug, ApplicationFormStatus.PUBLISHED, "recruitment")
    .orElse(null);
```

```sql
-- ApplicationFormRepository JPQL, line 29-30
and (f.module = :module or f.module is null)
```

**Why it is wrong:** The service explicitly supports modules `"preboarding"`, `"internal"`, and `"general"` (see `ALLOWED_MODULES` in `FormsController:61`). Published forms in those modules can never be retrieved via `/internal/forms/{slug}` because the module parameter is always passed as `"recruitment"`. A preboarding form that the recruitment-service tries to load will always get 404.

**Proper fix:** Either pass the module as a query parameter from the caller, or remove the module filter from this lookup (a slug is globally unique).

---

#### FOR-18 — `ApplicationFormLink.formId` is a `String`, not a `UUID`, mismatching `ApplicationForm.id`
**File:** `ApplicationFormLink.java:25-26`; used at `FormsController.java:479-483`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// ApplicationFormLink.java
@Column(name = "form_id", nullable = false)
private String formId;   // should be UUID
```

**Why it is wrong:** `ApplicationForm.id` is `UUID`. `ApplicationFormLink.formId` stores the same UUID but as a `String`. This forces repeated `UUID::fromString` conversions (`FormsController:481`) and string-based comparisons, and prevents JPA from enforcing a type-safe FK relationship. It is also inconsistent with `ApplicationFormSubmission.formId` which is correctly typed as `UUID`.

**Proper fix:** Change `ApplicationFormLink.formId` to `UUID` and create a Flyway migration to cast the column type (PostgreSQL supports `ALTER COLUMN ... TYPE uuid USING formId::uuid`).

---

#### FOR-19 — `ServiceJwtProvider.getToken()` has a check-then-act race condition on token refresh
**File:** `ServiceJwtProvider.java:26-44`  
**Severity:** P2  **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```java
private volatile String cachedToken;
private volatile Instant cachedExpiry;

public String getToken() {
    Instant now = Instant.now();
    if (cachedToken != null && cachedExpiry != null && cachedExpiry.isAfter(now.plusSeconds(30))) {
        return cachedToken;
    }
    // ... generate new token
    cachedToken = token;    // ← non-atomic: two writes visible to other threads
    cachedExpiry = expiry;
```

**Why it is wrong:** `volatile` makes individual reads/writes atomic but does not make the read-check-then-write compound operation atomic. Two threads can both see a stale token simultaneously, both generate a new token, and write their respective `cachedToken` and `cachedExpiry` values interleaved. This is harmless most of the time (both tokens are valid), but the `cachedToken` and `cachedExpiry` could transiently belong to different tokens.

**Proper fix:** Use `synchronized` on the refresh path or an `AtomicReference<TokenAndExpiry>` record:

```java
private static record TokenAndExpiry(String token, Instant expiry) {}
private volatile TokenAndExpiry cached;
```

---

#### FOR-20 — `application_form_favorites` has no unique constraint on `(user_id, template_id)`
**File:** `V1__create_forms_schema.sql:56-62`  
**Severity:** P2  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```sql
create table if not exists application_form_favorites (
  id uuid primary key,
  user_id varchar(255) not null,
  template_id varchar(255) not null,
  created_at timestamptz
);
-- no unique index
```

**Why it is wrong:** `toggleFavorite` in `FormsController` uses `findByUserIdAndTemplateId` to check before inserting, but there is no DB-level unique constraint. Under concurrent requests (double-click), two inserts can both pass the check before either commits, resulting in duplicate favorite rows for the same user+template. The UI would then show confusing state.

**Proper fix:** Add a Flyway migration: `create unique index ux_favorites_user_template on application_form_favorites(user_id, template_id);`

---

### P3 — Low / Informational

---

#### FOR-21 — `buildTrend()` uses `OffsetDateTime.now()` with implicit JVM timezone
**File:** `FormsController.java:711`  
**Severity:** P3  **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```java
OffsetDateTime start = OffsetDateTime.now().minusDays(13).withHour(0)...
```

**Why it is wrong:** `OffsetDateTime.now()` uses the JVM's default timezone offset. In a Docker container this is usually UTC, but if the JVM is started without `-Duser.timezone=UTC` the day boundary calculation will be server-timezone-dependent. Trend data day labels would shift relative to client timezone.

**Proper fix:** `OffsetDateTime.now(ZoneOffset.UTC)` or `ZonedDateTime.now(ZoneId.of("UTC"))`.

---

#### FOR-22 — `listSubmissions` has a hardcoded `limit = 50` with no API surface for pagination
**File:** `FormsController.java:594-598`  
**Severity:** P3  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
int limit = 50;
List<Map<String, Object>> rows = submissionRepository
    .findByFormIdOrderBySubmittedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, limit))
```

**Why it is wrong:** Callers cannot page through more than 50 submissions. The `PageRequest` is hardcoded to page 0. The repository method signature accepts `Pageable`, so the infrastructure is already there. The hardcoded inline class reference (`org.springframework.data.domain.PageRequest`) is also bad style and should be a static import.

**Proper fix:** Accept `page` and `size` query parameters, validate `size <= 100`, and pass them to `PageRequest.of(page, size)`.

---

#### FOR-23 — `FormUpdateRequest` and `FormCreateRequest` are structurally identical — duplicated DTO
**File:** `dto/FormCreateRequest.java`, `dto/FormUpdateRequest.java`  
**Severity:** P3  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

Both DTOs have identical fields: `name`, `description`, `positionId`, `module`, `owner`, `visibility`, `tags`, `version`, `collectionId`, `fields`. The only behavioral difference is that create requires all mandatory fields while update allows partial updates. This structural duplication means any new field must be added in two places.

**Proper fix:** Use a single `FormRequest` DTO and document which fields are required on POST vs PATCH via `@NotBlank`/`@Nullable` annotations, or use an inheritance approach: `FormCreateRequest extends FormBaseRequest`.

---

#### FOR-24 — `groupId` namespace mismatch: `com.hirepath` in a `com.fawnix` monorepo
**File:** `pom.xml:10`, all Java sources  
**Severity:** P3  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS [migrated]

```xml
<!-- pom.xml:10 -->
<groupId>com.hirepath</groupId>
```

**Why it is wrong:** The parent POM uses `com.fawnix`. All other new services (crm-service, inventory-service, sales-service) use `com.fawnix.*` as their base package. This service (and analytics, approval, integration, notifications, org, recruitment) still carry the `com.hirepath` namespace from the HRMS migration. This makes monorepo tooling, build scripts, and search inconsistent.

**Fix:** Rename packages to `com.fawnix.forms.*` in a single batch commit; update `groupId` in `pom.xml`.

---

#### FOR-25 — `ApplicationFormSubmission.schemaSnapshot` typed as `Object` instead of `List<Map<String,Object>>`
**File:** `ApplicationFormSubmission.java:53`, `ApplicationFormVersion.java:35`  
**Severity:** P3  **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```java
// ApplicationFormSubmission.java:53
private Object schemaSnapshot;

// ApplicationFormVersion.java:35
private List<Map<String, Object>> schemaSnapshot;
```

**Why it is wrong:** The types are inconsistent. `FormSubmissionService.persistResponses()` receives `schemaSnapshot` as `Object` and has to type-check with `instanceof List<?>` at runtime (line 168). This should be strongly typed for compile-time safety.

**Fix:** Change `ApplicationFormSubmission.schemaSnapshot` to `List<Map<String, Object>>` to match the version entity. Hibernate will serialize it identically to JSONB.

---

## Redundancy

The security stack (JWT filter, JWT service, internal-auth filter, AppUserDetails) is copy-pasted across **14 services** with only the package name changed. This represents approximately 200 lines × 14 = 2,800 lines of near-identical code maintained in 14 separate places.

| Clone pair | File A | File B |
|-----------|--------|--------|
| JwtService | `forms-service/.../security/jwt/JwtService.java` | `analytics-service/.../security/jwt/JwtService.java` (diff: package only) |
| JwtAuthenticationFilter | `forms-service/.../security/filter/JwtAuthenticationFilter.java` | `analytics-service/.../security/filter/JwtAuthenticationFilter.java` (diff: package only) |
| InternalServiceAuthFilter | `forms-service/.../security/filter/InternalServiceAuthFilter.java` | `analytics-service/.../security/filter/InternalServiceAuthFilter.java` (diff: package only) |
| AppUserDetails | `forms-service/.../security/service/AppUserDetails.java` | 13 other services — identical logic |
| RestAccessDeniedHandler | `forms-service/.../security/handler/RestAccessDeniedHandler.java` | repeated in approval, analytics, org, integration (pattern identical) |

**Resolution:** Extract a `security-common` library module (`com.fawnix:security-common`) containing `JwtService`, `JwtAuthenticationFilter`, `InternalServiceAuthFilter`, `AppUserDetails`, `ServiceJwtProvider`, `JwtProperties`. Each service POM depends on it. This is a one-time refactor that eliminates the most consequential class of copy-paste bugs (e.g., if a JWT signing bug is found it must be fixed in 14 places today).

---

Additional intra-service redundancy:

| Pair | Location A | Location B |
|------|-----------|-----------|
| `fieldToMap()` helper | `FormsController.java:677-688` | `FormSubmissionService.java:218-228` — identical structure, different return path |
| `createVersionSnapshot()` | `FormsController.java:690-700` | `FormSubmissionService.java:198-216` — nearly identical logic, duplicated |
| Link expiry check | `FormsController.refreshLinkStatus():702-708` | `FormSubmissionService.validateLink():137-142` — same expiry check, same save call |

---

## Tests & Gaps

**Zero tests exist.** There is no `src/test` directory.

Critical paths with no coverage:
- `createForm` — non-atomic field save (FOR-01), `parseFieldType` exception (FOR-08)
- `publish` — unique-constraint crash on re-publish (FOR-02)
- `updateForm` — partial state after failed field validation (FOR-03)
- `FormSubmissionService.createSubmission` — deduplication race condition, version snapshot collision (FOR-09)
- `validateLink` — concurrent submission past `maxSubmissions` limit (race condition: two submissions can both pass the `currentSubmissions >= maxSubmissions` check before either increments it)
- All security filter logic

Immediate priority: integration tests for `createForm`, `publish`, and `createSubmission` that exercise the failure paths. Unit tests for `FormSubmissionService`.

---

## Coverage Note

**Fully inspected:** All 46 Java source files, both SQL migrations, `pom.xml`, `application.yml`, `Dockerfile`. Every endpoint, entity, repository, and filter was read line by line.

**Partially inspected (structural only):**
- Compared `JwtService` and security filters against analytics-service to confirm copy-paste identity — did not inspect all 13 other service copies.
- Did not audit the notifications-service endpoint (`/internal/notifications/events`) that `NotificationsClient` calls; assumed the DTO contract matches.

**Self-gaps:**
- Did not run the service; cannot confirm which Spring Boot validation errors actually surface at runtime vs which are caught by the manual `if`-checks.
- Did not check whether Flyway history is clean in any deployed environment; the `ALTER TABLE application_form_links ADD COLUMN` statements in V2 would fail if the columns already existed without `IF NOT EXISTS` guards (they do use `IF NOT EXISTS`, so this is likely safe, but not verified against a live DB).
- Could not measure actual query latency for the N+1 and full-table-load issues — severity ratings assume non-trivial data volumes.

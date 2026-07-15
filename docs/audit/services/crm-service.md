# crm-service — Service Audit

_Audited: 2026-07-14 | Auditor: Claude Sonnet 4.6_

---

## Summary

`crm-service` is the central lead-management service for the Fawnix platform. It handles the full lead lifecycle (creation, assignment, status transitions, scheduling, contact recordings, WhatsApp questionnaires, and Meta/Facebook lead ingestion). The domain logic is substantive and generally well-structured, but the service has several production-impacting correctness bugs: external HTTP calls inside open transactions (both WhatsApp and identity-service calls), a double query on every paginated list endpoint, an unbounded `findAll()` that will OOM on a real dataset, a JWT signing key that is double-Base64-encoded making it silently weaker, and missing database indexes on columns used for deduplication lookups. There are also security-hygiene concerns (default credentials in config, silent exception swallowing in the auth filter) and total absence of tests. The `com.hirepath` namespace contamination present in sibling services does not appear in this service; the package is cleanly `com.fawnix.crm`.

---

## Surface Map

### REST Endpoints

| Controller | Method | Path | Auth |
|---|---|---|---|
| LeadController | GET | /api/leads | `isAuthenticated()` |
| LeadController | GET | /api/leads/notifications | `isAuthenticated()` |
| LeadController | GET | /api/leads/notifications/stream (SSE) | `isAuthenticated()` |
| LeadController | GET | /api/leads/{id} | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | GET | /api/leads/{id}/questionnaire | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | POST | /api/leads | ADMIN/SALES_MANAGER |
| LeadController | POST | /api/leads/import | ADMIN/SALES_MANAGER |
| LeadController | PATCH | /api/leads/{id} | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | DELETE | /api/leads/{id} | ADMIN/SALES_MANAGER |
| LeadController | PATCH | /api/leads/{id}/status | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | POST | /api/leads/{id}/contact-recordings | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | PATCH | /api/leads/{id}/assign | ADMIN/SALES_MANAGER or `@leadSecurityService.canAssignLead` |
| LeadController | PATCH | /api/leads/{id}/priority | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | POST | /api/leads/{id}/remarks | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadController | PATCH | /api/leads/{id}/remarks/{remarkId} | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadScheduleController | GET | /api/leads/{leadId}/schedules | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadScheduleController | POST | /api/leads/{leadId}/schedules | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| LeadScheduleController | PATCH | /api/leads/{leadId}/schedules/{scheduleId} | ADMIN/SALES_MANAGER or `@leadSecurityService` |
| MetaLeadWebhookController | GET | /api/integrations/meta/webhook | Public (webhook verify) |
| MetaLeadWebhookController | POST | /api/integrations/meta/webhook | Public (webhook receive) |
| MetaLeadWebhookController | POST | /api/integrations/meta/fetch-latest | ADMIN/SALES_MANAGER |
| MetaIntegrationSettingsController | GET | /api/integrations/meta/settings | ADMIN/SALES_MANAGER |
| MetaIntegrationSettingsController | PUT | /api/integrations/meta/settings | ADMIN/SALES_MANAGER |
| MetaIntegrationSettingsController | POST | /api/integrations/meta/settings/test | ADMIN/SALES_MANAGER |
| WhatsappWebhookController | GET | /api/integrations/whatsapp/webhook | Public (webhook verify) |
| WhatsappWebhookController | POST | /api/integrations/whatsapp/webhook | Public (webhook receive) |
| WhatsappIntegrationSettingsController | GET | /api/integrations/whatsapp/settings | ADMIN/SALES_MANAGER |
| WhatsappIntegrationSettingsController | PUT | /api/integrations/whatsapp/settings | ADMIN/SALES_MANAGER |
| WhatsappIntegrationSettingsController | POST | /api/integrations/whatsapp/settings/test | ADMIN/SALES_MANAGER |
| AccountController | GET | /api/accounts | `isAuthenticated()` |
| AccountController | GET | /api/accounts/{id} | `isAuthenticated()` |
| AccountController | POST | /api/accounts | ADMIN/SALES_MANAGER/SALES_REP |
| AccountController | PATCH | /api/accounts/{id} | ADMIN/SALES_MANAGER/SALES_REP |
| AccountController | DELETE | /api/accounts/{id} | ADMIN/SALES_MANAGER |
| ContactController | GET | /api/contacts | `isAuthenticated()` |
| ContactController | GET | /api/contacts/{id} | `isAuthenticated()` |
| ContactController | POST | /api/contacts | ADMIN/SALES_MANAGER/SALES_REP |
| ContactController | PATCH | /api/contacts/{id} | ADMIN/SALES_MANAGER/SALES_REP |
| ContactController | DELETE | /api/contacts/{id} | ADMIN/SALES_MANAGER |
| DealController | GET | /api/deals | `isAuthenticated()` |
| DealController | GET | /api/deals/{id} | `isAuthenticated()` |
| DealController | POST | /api/deals | ADMIN/SALES_MANAGER/SALES_REP |
| DealController | PATCH | /api/deals/{id} | ADMIN/SALES_MANAGER/SALES_REP |
| DealController | DELETE | /api/deals/{id} | ADMIN/SALES_MANAGER |
| ReportsController | GET | /api/reports/overview | ADMIN/SALES_MANAGER |
| ReportsController | GET | /api/reports/presales | `isAuthenticated()` |

### Entities and Tables

| Entity | Table | Notable |
|---|---|---|
| LeadEntity | `leads` | V1 migration. Many child collections (EAGER via cascade). |
| LeadTagEntity | `lead_tags` | Unique constraint `(lead_id, tag_value)`. |
| LeadRemarkEntity | `lead_remarks` | Contains versioning child. |
| LeadRemarkVersionEntity | `lead_remark_versions` | Append-only version history. |
| LeadActivityEntity | `lead_activities` | Audit log. |
| LeadContactRecordingEntity | `lead_contact_recordings` | Binary file path stored; file in MinIO. |
| LeadStatusHistoryEntity | `lead_status_history` | V3. Status transition audit. |
| LeadScheduleEntity | `lead_schedules` | V11/V16. |
| MetaLeadIngestionEntity | `meta_lead_ingestions` | V5. `leadgen_id` has unique constraint. |
| LeadWhatsappQuestionnaireEntity | `lead_whatsapp_questionnaires` | V7. |
| WhatsappIntegrationSettingsEntity | `whatsapp_integration_settings` | V10/V13. |
| MetaIntegrationSettingsEntity | `meta_integration_settings` | V8/V9. |
| AccountEntity | `accounts` | V14. Timestamps use `TIMESTAMP` (no tz). |
| ContactEntity | `contacts` | V14. Timestamps use `TIMESTAMP` (no tz). |
| DealEntity | `deals` | V14. Reuses `LeadStatus` for its `stage` field. |

### Flyway Migrations

V1 through V16, covering all tables. V14 introduces accounts/contacts/deals with `TIMESTAMP` instead of `TIMESTAMPTZ`.

### Outbound Calls

| Client | Target | When |
|---|---|---|
| `IdentityUserClient` (RestTemplate, load-balanced) | `IDENTITY-SERVICE /internal/users/*` | On lead create/update/assign (inside `@Transactional`) |
| `WhatsappClient` (RestTemplate, external) | WhatsApp Cloud API | On lead create/assign (inside `@Transactional`) |
| `MetaLeadClient` (RestTemplate, external) | Meta Graph API | On webhook processing, fetch-latest |
| `SpeechToTextClient` (RestTemplate) | Configurable STT endpoint | On contact recording upload |
| `ContactRecordingStorageService` | MinIO (via Minio SDK) | On contact recording upload/delete |

---

## Findings

### P0 — Critical / Production-Breaking

---

#### CRM-01 — External HTTP calls inside open `@Transactional` methods (transaction pollution)

**File:lines:** `LeadService.java:167–249` (`createLead`), `252–407` (`updateLead`), `464–510` (`assignLead`)

**Severity:** P0 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
// createLead - annotated @Transactional (line 167)
applyAssignee(lead, resolveAssignee(request.assignedToUserId(), request.assignedTo(), false));
// resolveAssignee calls identityUserClient.getAssignableUserById() -> HTTP call

// Still inside same transaction:
LeadEntity saved = leadRepository.save(lead);
leadStatusHistoryService.recordInitial(saved, ...);
whatsappQuestionnaireService.sendIntro(saved); // WhatsApp HTTP call (line 247)
```

**Why it is wrong:** A DB transaction is held open across two external HTTP calls (identity-service lookup and WhatsApp API call). This holds a connection pool slot for the full HTTP round-trip duration — which can be 500ms–5s. Under load this exhausts the pool and causes cascading failures. Worse, if the WhatsApp call hangs, the transaction never commits, and subsequent rollback orphans already-flushed activity/remark entities, leaving the DB in an inconsistent state.

**Proper fix:** Move the external HTTP calls to before the transaction boundary. Fetch the assignee first (outside `@Transactional`), then enter the transactional method. For WhatsApp, publish an event (Spring `ApplicationEvent` or an outbox record) and dispatch from a listener after the transaction commits.

```java
// Controller or a facade:
IdentityUser assignee = identityUserClient.getAssignableUserById(userId);
LeadResponse response = leadService.createLead(request, assignee, currentUser); // @Transactional
eventPublisher.publishEvent(new LeadCreatedEvent(response.id())); // dispatches WhatsApp after commit
```

---

#### CRM-02 — Double `findAll` query on every paginated leads request

**File:lines:** `LeadService.java:120–136`

**Severity:** P0 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
Page<LeadEntity> leadPage = leadRepository.findAll(
    specification,
    PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(...))
);
List<LeadEntity> filteredLeads = leadRepository.findAll(  // SECOND full query, no page limit
    specification,
    Sort.by(Sort.Direction.DESC, "updatedAt")
);
return new LeadDtos.PaginatedLeadResponse(
    leadPage.getContent().stream().map(leadMapper::toResponse).toList(),
    leadPage.getTotalElements(),
    ...
    leadMapper.toSummary(filteredLeads)  // summary computed from ALL matching leads
);
```

**Why it is wrong:** Every call to `GET /api/leads` executes two database queries. The second query returns the full unbounded result set of all matching leads (ignoring page size) to compute a summary. With 10,000 leads, this loads all 10,000 records into the JVM every time the page is loaded. This doubles database load and creates GC pressure proportional to dataset size.

**Proper fix:** Compute the summary using a projection/aggregation query in SQL, or derive it from the already-fetched page content. If the summary must cover the full set, implement a dedicated aggregation query:
```java
// Option 1: SQL aggregation - no entity load
SummaryDto summary = leadRepository.computeSummary(specification);
// Option 2: Accept that summary covers page only (simplest, often sufficient)
leadMapper.toSummary(leadPage.getContent())
```

---

#### CRM-03 — `ReportsService.getPreSalesOverview` loads the entire `leads` table into memory

**File:lines:** `ReportsService.java:110`

**Severity:** P0 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
public ReportDtos.PreSalesOverviewResponse getPreSalesOverview(AppUserDetails actor) {
    List<LeadEntity> leads = leadRepository.findAll();  // No filter, no limit
```

**Why it is wrong:** `leadRepository.findAll()` with no specification or limit performs a `SELECT * FROM leads` returning every lead in the system. All child collections (remarks, tags, activities, contact recordings) will be lazily fetched later when the stream filters iterate, producing hundreds of additional queries (N+1). This endpoint is called from the pre-sales dashboard — with a 50K lead dataset it will cause an OOM or a 30-second timeout.

**Proper fix:** Replace with targeted queries using `JPQL` or `@Query` that select only the IDs and columns needed for each sub-list, or use `JpaSpecificationExecutor` with a `Pageable`.

```java
// Each "quick view" list should be its own bounded query
List<LeadQuickView> myQueue = leadRepository.findMyQueue(actor.getUserId(), PageRequest.of(0, 8));
long newCount = leadRepository.countByStatus(LeadStatus.NEW);
// etc.
```

---

### P1 — High / Data Integrity or Security Risk

---

#### CRM-04 — JWT signing key is double-Base64-encoded, silently weakening all tokens

**File:lines:** `JwtService.java:133–136`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        secret.getBytes()
    )));
}
```

**Why it is wrong:** The raw secret string is first Base64-encoded with `Base64.getEncoder().encodeToString()`, producing a Base64 string, which is then immediately Base64-decoded by `Decoders.BASE64.decode()`. The net result is that `secret.getBytes()` is used as the raw HMAC key — but the intermediate encode/decode also corrupts any secret that is already Base64 (which is typical for a JWT secret). Worse, it means the code works only because the two operations cancel each other out partially; any secret containing non-ASCII or padding characters will cause an `IllegalArgumentException` at runtime. The correct pattern is to either store the secret as Base64 and decode it once, or pass the raw bytes directly.

**Proper fix:**
```java
// If JWT_SECRET is stored as a raw string (not pre-encoded):
private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
}
// If JWT_SECRET is stored as a Base64-encoded string (recommended):
private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
}
```

---

#### CRM-05 — Hardcoded fallback credentials in `application.yml`

**File:lines:** `application.yml:7`, `85`, `89`, `95–96`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```yaml
password: ${CRM_DB_PASSWORD:postgres}            # line 7
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret} # line 85
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}      # line 89
access-key: ${CRM_OBJECT_STORAGE_ACCESS_KEY:minioadmin}  # line 95
secret-key: ${CRM_OBJECT_STORAGE_SECRET_KEY:minioadmin}  # line 96
```

**Why it is wrong:** If the corresponding environment variables are not set (e.g. in a misconfigured deployment, a local Docker Compose that skips the `.env` file, or a developer's accidental production deploy), the service starts with well-known public default credentials for PostgreSQL, MinIO, and JWT signing. The JWT secret in particular — `change-this-local-dev-secret-change-this-local-dev-secret` — is guessable and would allow an attacker to forge admin JWTs. `fawnix-internal-secret` as the internal service secret would allow any caller to impersonate internal service calls.

**Proper fix:** Remove all credential fallbacks. Replace with no-default references that fail at startup if unset:
```yaml
password: ${CRM_DB_PASSWORD}  # fail-fast: no default
secret: ${JWT_SECRET}
```
Alternatively, use Spring Cloud Config or Vault and remove credentials from the file entirely.

---

#### CRM-06 — Webhook deduplication has a TOCTOU race condition

**File:lines:** `MetaLeadService.java:102–113`, `150–160`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
if (ingestionRepository.existsByLeadgenId(leadgenId)) {  // check
    LOGGER.info("Meta lead {} already processed, skipping.", leadgenId);
    continue;
}
try {
    processLeadgen(leadgenId, ...);  // use (creates lead and saves ingestion)
```

**Why it is wrong:** `handleWebhook` has no `@Transactional` annotation. The check `existsByLeadgenId` and the subsequent `processLeadgen` (which saves to `meta_lead_ingestions`) are in separate transactions. If Meta delivers the same webhook twice concurrently (their documented retry behavior), both threads can pass the existence check before either commits the ingestion record, resulting in duplicate lead creation. The `unique` constraint on `leadgen_id` provides a last-resort guard but the application will throw an unhandled `DataIntegrityViolationException` to the webhook caller.

**Proper fix:** Wrap `processLeadgen` in a `@Transactional` method that inserts the ingestion record first (as a reservation), then calls `leadService.createLead`. Handle `DataIntegrityViolationException` from the unique constraint as a graceful skip:
```java
@Transactional
private void processLeadgenSafe(String leadgenId, ...) {
    // Insert ingestion stub first — unique constraint is the authoritative guard
    MetaLeadIngestionEntity stub = new MetaLeadIngestionEntity();
    stub.setLeadgenId(leadgenId);
    try {
        ingestionRepository.saveAndFlush(stub);
    } catch (DataIntegrityViolationException dup) {
        return; // already processed
    }
    // then fetch details and create lead
}
```

---

#### CRM-07 — `@Transactional(protected)` on `handleInboundMessage` is a no-op

**File:lines:** `WhatsappQuestionnaireService.java:231–232`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
@Transactional
protected void handleInboundMessage(JsonNode value, JsonNode message) {
```

**Why it is wrong:** Spring's AOP-based `@Transactional` proxy intercepts calls only when they come through the proxy (i.e., called on the Spring bean reference from outside the class). `handleInboundMessage` is `protected` and is called internally from `handleWebhook` (same class, line 224: `handleInboundMessage(value, message)`). This is a self-invocation — it bypasses the proxy entirely. The `@Transactional` annotation has zero effect. The method saves to `questionnaireRepository` multiple times during `advanceConversation`, but each save runs in its own auto-committed query. If a second WhatsApp message or network problem interrupts mid-way, the questionnaire will be left in an inconsistent intermediate state.

**Proper fix:** Extract `handleInboundMessage` into a separate Spring `@Service` and inject it, so the call goes through a proxy. Or refactor to accumulate all state changes and do a single save at the end (already partially done at line 267, but intermediate saves in `advanceConversation` are not guarded).

---

#### CRM-08 — Missing database indexes on deduplication lookup columns

**File:lines:** `LeadRepository.java:50–56`, `LeadImportService.java:248–258`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
// LeadImportService.findDuplicate:
return leadRepository.findFirstByEmailIgnoreCase(email.trim());
// or
return leadRepository.findFirstByPhone(phone.trim());
// or
return leadRepository.findFirstByExternalLeadId(externalLeadId.trim());
```

**Why it is wrong:** The `leads` table has no index on `email`, `phone`, or `external_lead_id` columns (verified across all V1–V16 migrations). Every import row triggers a sequential scan of the entire `leads` table. An import of 1,000 rows with 10,000 existing leads triggers 3,000 full-table scans. `findFirstByEmailIgnoreCase` additionally prevents index use on most databases even if an index were added, because `LOWER(email)` requires a functional index.

**Proper fix:** Add a Flyway migration:
```sql
-- V17__add_lead_dedup_indexes.sql
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_external_lead_id ON leads(external_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_meta_lead_id ON leads(meta_lead_id);
```
Change `findFirstByEmailIgnoreCase` to use a `@Query` with `lower()` so the functional index is used.

---

#### CRM-09 — `processLeadDetails` saves ingestion record outside the lead-creation transaction

**File:lines:** `MetaLeadService.java:199–222`

**Severity:** P1 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
private void processLeadDetails(...) {
    LeadDtos.CreateLeadRequest request = buildLeadRequest(details);
    var created = leadService.createLead(request, SYSTEM_ACTOR); // transaction #1
    // ...
    ingestionRepository.save(ingestion); // transaction #2 (auto-committed separately)
}
```

**Why it is wrong:** `leadService.createLead` runs in its own `@Transactional` method (transaction #1). After it returns, `ingestionRepository.save` runs in a second independent transaction (transaction #2). If the application crashes or the JVM is killed after createLead commits but before ingestionRepository.save commits, a lead is created but never recorded as ingested. On the next webhook delivery or `fetch-latest` call, `existsByLeadgenId` returns false and the lead is created again — a duplicate that is impossible to detect without inspecting `meta_lead_id`.

**Proper fix:** Both the lead creation and the ingestion record must be atomic. Pass an `EntityManager` or restructure so `processLeadDetails` is itself `@Transactional` and calls a non-transactional version of `createLead` (or uses `REQUIRES_NEW` carefully):
```java
@Transactional
private void processLeadDetails(...) {
    LeadEntity lead = leadEntityBuilder.build(request); // no outer @Transactional call
    ingestionRepository.save(buildIngestion(lead, details));
    leadRepository.save(lead);
}
```

---

### P2 — Medium / Maintainability / Correctness Risk

---

#### CRM-10 — `ZoneId.systemDefault()` in CSV/XLSX date parsing makes data TZ-dependent

**File:lines:** `LeadImportService.java:407`, `414`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
LocalDateTime dateTime = LocalDateTime.parse(value, formatter);
return dateTime.atZone(ZoneId.systemDefault()).toInstant();  // line 407
// and:
return date.atStartOfDay(ZoneId.systemDefault()).toInstant(); // line 414
```

**Why it is wrong:** When a user uploads a CSV with a date like `2024-06-01 10:00`, the service converts it to an `Instant` using the JVM's default time zone. If the server is in UTC and the user's local timezone is IST (+5:30), the stored `follow_up_at` will be 5.5 hours off. The bug is silent — no error is thrown — and affects all imported follow-up dates.

**Proper fix:** Require an explicit timezone in the import file or document that dates are UTC, and always convert using `ZoneOffset.UTC`:
```java
return dateTime.atOffset(ZoneOffset.UTC).toInstant();
```

---

#### CRM-11 — `DealEntity.stage` reuses `LeadStatus` enum — wrong domain model

**File:lines:** `DealEntity.java:5`, `41–42`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
import com.fawnix.crm.leads.entity.LeadStatus;
// ...
@Enumerated(EnumType.STRING)
@Column(name = "stage", nullable = false, length = 40)
private LeadStatus stage;
```

**Why it is wrong:** A `Deal` entity reuses `LeadStatus` (which includes `NEW`, `CONTACTED`, `FOLLOW_UP`, `QUALIFIED`, `UNQUALIFIED`, `ASSIGNED_TO_SALESPERSON`, `PROPOSAL_SENT`, `CONVERTED`, `LOST`) as its pipeline stage enum. Deal stages in a CRM are a different concept (e.g. `DISCOVERY`, `PROPOSAL`, `NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST`). This tightly couples the deal pipeline to the lead funnel, means every lead status value is a valid deal stage (including `NEW`, `FOLLOW_UP`, `CONTACTED` which make no sense for a deal), and will break if `LeadStatus` is ever modified.

**Proper fix:** Create a `DealStage` enum in the `deals` package with appropriate values and add a Flyway migration to rename if needed.

---

#### CRM-12 — `V14` migration uses `TIMESTAMP` (no timezone) for new tables

**File:lines:** `V14__create_accounts_contacts_deals.sql:8–9`, `20–21`, `34`, `36–37`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```sql
created_at TIMESTAMP NOT NULL,    -- should be TIMESTAMPTZ
updated_at TIMESTAMP NOT NULL,
-- and in deals:
expected_close_at TIMESTAMP,
```

**Why it is wrong:** All other tables in this service use `TIMESTAMPTZ` (with timezone), which stores UTC and handles DST correctly. V14 introduced `accounts`, `contacts`, and `deals` using bare `TIMESTAMP`, which PostgreSQL stores as a local timestamp without timezone information. When the database server is not in UTC, queries comparing timestamps across tables (e.g., sorting deals by `updated_at` alongside leads by `updated_at`) will produce incorrect ordering. This is especially problematic for `expected_close_at` in `DealEntity`, which maps to `Instant` in Java — Hibernate will silently discard timezone offset on read.

**Proper fix:** Add a migration to alter the columns:
```sql
-- V17__fix_accounts_contacts_deals_timestamp_tz.sql
ALTER TABLE accounts ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE accounts ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE contacts ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE contacts ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE deals ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE deals ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE deals ALTER COLUMN expected_close_at TYPE TIMESTAMPTZ;
```

---

#### CRM-13 — `WhatsappQuestionnaireService.sendIntro` performs multiple HTTP calls and saves within `@Transactional`

**File:lines:** `WhatsappQuestionnaireService.java:72–143`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
@Transactional
public void sendIntro(LeadEntity lead) {
    // ...
    String messageId = whatsappClient.sendTemplate(phone, templateName, ...); // HTTP call #1
    // ...
    questionnaireRepository.save(questionnaire);       // DB write
    leadRepository.save(lead);                         // DB write
    // ...
    questionnaire.setStep(STEP_ASK_LANGUAGE);
    questionnaireRepository.save(questionnaire);       // DB write #2
```

**Why it is wrong:** This `@Transactional` method is called from inside `LeadService.createLead` (which is also `@Transactional`). It participates in the caller's transaction. It makes a WhatsApp HTTP call in the middle of the transaction, holding the database connection for the HTTP round-trip. If WhatsApp returns an error or times out, the Spring transaction manager rolls back all changes including the lead creation itself — meaning a successfully saved lead is silently deleted because WhatsApp was down.

**Proper fix:** Remove `@Transactional` from `sendIntro`. Publish a Spring `ApplicationEvent` from `createLead` after commit, and have `sendIntro` respond to it outside any transaction:
```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onLeadCreated(LeadCreatedEvent event) {
    sendIntro(event.leadId());
}
```

---

#### CRM-14 — Silent exception swallowing in `JwtAuthenticationFilter`

**File:lines:** `JwtAuthenticationFilter.java:55–57`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
```

**Why it is wrong:** Any exception during JWT parsing or user-details resolution — including `NullPointerException` from a malformed claim, `ClassCastException`, `IllegalStateException` from `identityUserClient` being down — is silently discarded. The request continues as unauthenticated, which means a valid token that fails due to a downstream service outage will silently degrade to a 401/403 instead of a 503. Debugging JWT failures in production requires log analysis rather than observable error responses. The `Exception ignored` variable name also signals the developer intended to ignore it.

**Proper fix:** Log the exception at `WARN` level so it is visible in logs:
```java
} catch (Exception ex) {
    LOGGER.warn("JWT authentication failed: {}", ex.getMessage());
    SecurityContextHolder.clearContext();
}
```

---

#### CRM-15 — `ReportsService.getPreSalesOverview` hits the schedule repository 4 times with overlapping queries

**File:lines:** `ReportsService.java:148–179`

**Severity:** P2 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
// Query 1:
leadScheduleRepository.findByStatusInAndScheduledAtBetweenOrderByScheduledAtAsc(...)
    .stream().filter(s -> s.getType() == LeadScheduleType.FOLLOW_UP_CALL)...
// Query 2:
leadScheduleRepository.findByStatusInAndScheduledAtBetweenOrderByScheduledAtAsc(...) // SAME query!
    .stream().filter(s -> s.getType() == LeadScheduleType.DEMO_VISIT || ...)...
// Query 3:
leadScheduleRepository.findByStatusInAndScheduledAtBeforeOrderByScheduledAtAsc(...)
// Query 4:
leadScheduleRepository.findByStatusInAndScheduledAtAfterOrderByScheduledAtAsc(...)
```

**Why it is wrong:** Queries 1 and 2 are identical — the same `findByStatusInAndScheduledAtBetween...` call with the same parameters. The result is fetched twice from the database and then filtered in Java by type. Both results are limited to 8 items in Java after fetching potentially all matching rows. This is wasteful and the filtering should be done in SQL.

**Proper fix:** Fetch once into a list, then partition by type in Java, or use distinct repository methods that include the type filter:
```java
List<LeadScheduleEntity> todaySchedules = leadScheduleRepository
    .findByStatusInAndScheduledAtBetween(...); // once
List<ReminderQuickView> todaysFollowUps = todaySchedules.stream()
    .filter(s -> s.getType() == LeadScheduleType.FOLLOW_UP_CALL)...
List<ReminderQuickView> todaysDemos = todaySchedules.stream()
    .filter(s -> s.getType() == LeadScheduleType.DEMO_VISIT || ...)...
```

---

#### CRM-16 — `getNotifications` fetches all future follow-up schedules to count in Java

**File:lines:** `LeadService.java:156–163`

**Severity:** P2 | **Confidence:** Med

**Owner:** Chaitanya2872

**Offending code:**
```java
long followUpDueCount = leadScheduleRepository
    .findByStatusInAndScheduledAtBeforeOrderByScheduledAtAsc(List.of(LeadScheduleStatus.SCHEDULED), Instant.now())
    .stream()
    .filter(schedule -> schedule.getType() == LeadScheduleType.FOLLOW_UP_CALL)
    .filter(schedule -> normalized == null || ...)
    .count();
```

**Why it is wrong:** This loads all overdue `SCHEDULED` records into memory, then filters by type and assignee in Java. There is already a `countFollowUpsDue` query defined in `LeadRepository` (line 35) that would do this in SQL — but it is not used here. Additionally, `LeadRepository` has `countByStatusAndAssignee` used on line 155, but the equivalent query for follow-ups hits the schedule repository unnecessarily.

**Proper fix:** Add a count query to `LeadScheduleRepository`:
```java
@Query("select count(s) from LeadScheduleEntity s where s.status = 'SCHEDULED' and s.type = 'FOLLOW_UP_CALL' and s.scheduledAt < :now and (:assignee is null or s.assignedToUserId = :assignee)")
long countFollowUpCallsDue(@Param("now") Instant now, @Param("assignee") String assignee);
```

---

### P3 — Low / Code Quality / Maintainability

---

#### CRM-17 — `trimToNull` helper method is copy-pasted into 6 classes

**File:lines (all occurrences):**
- `LeadService.java:790`
- `LeadImportService.java:430`
- `LeadScheduleService.java:297`
- `AccountService.java:104`
- `ContactService.java:128`
- `DealService.java:182`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Why it is wrong:** Identical private utility method duplicated across 6 service classes. Any fix or edge case handling must be applied in 6 places.

**Proper fix:** Extract into a `StringUtils` or `TextUtils` class in `com.fawnix.crm.common.util` and statically import it.

---

#### CRM-18 — `verifySignature(payload, signatureHeader)` is duplicated between Meta and WhatsApp services

**File:lines:**
- `MetaLeadService.java:337–360`
- `WhatsappQuestionnaireService.java:641–664`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Why it is wrong:** Identical HMAC-SHA256 verification logic is copy-pasted in both services. If a timing-safe comparison (`MessageDigest.isEqual`) should be used (it should, to prevent timing attacks), the fix must be made in two places.

**Proper fix:** Extract to `com.fawnix.crm.common.security.HmacSha256Verifier` utility class. Also: neither implementation uses a constant-time comparison; replace `expected.equals(actual.toString())` with `MessageDigest.isEqual(expected.getBytes(), actual.toString().getBytes())`.

---

#### CRM-19 — `CorsProperties` class is defined but never registered or used

**File:lines:** `CorsProperties.java:1–19`, `CrmServiceApplication.java:16–22`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
// CorsProperties.java: @ConfigurationProperties(prefix = "app.cors")
// CrmServiceApplication.java @EnableConfigurationProperties does NOT include CorsProperties
// SecurityConfig.java: no CORS configuration
```

**Why it is wrong:** `CorsProperties` has a `@ConfigurationProperties` annotation but is absent from `@EnableConfigurationProperties` in `CrmServiceApplication`. There is no `CorsConfigurationSource` or `cors()` call in `SecurityConfig`. The class is dead code — it was likely intended to configure CORS but was never wired up. CORS handling is either handled at the API gateway level (undocumented) or entirely absent, which could cause browser-based clients to fail.

**Proper fix:** Either wire `CorsProperties` into `@EnableConfigurationProperties` and use it in `SecurityConfig`, or delete the class if CORS is handled upstream.

---

#### CRM-20 — `DataSeeder` sets `notes` to `null` on some seed leads, violating the non-null DB column

**File:lines:** `DataSeeder.java:103`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
lead.setNotes(notes);  // notes parameter can be null
// but LeadEntity.notes has default = "" and @Column nullable=false
```

**Why it is wrong:** Several `buildLead` calls pass `null` for `notes` (e.g., line 67: `...new BigDecimal("11000"), List.of("early", "analytics"), "Business card from SaaStr..."` — actually that one has notes, but the signature's `notes` parameter accepts null). If `setNotes(null)` is called, Hibernate will attempt `INSERT INTO leads ... notes = NULL` which violates `notes text not null default ''`. This only affects the seeder (disabled by default) but will fail noisily at startup when seed is enabled.

**Proper fix:**
```java
lead.setNotes(notes != null ? notes : "");
```

---

#### CRM-21 — `LeadNotificationStreamService` SSE emitter list is mutated during iteration

**File:lines:** `LeadNotificationStreamService.java:48–56`

**Severity:** P3 | **Confidence:** Med

**Offending code:**
```java
for (SseEmitter emitter : emitters) {
    try {
        emitter.send(...);
    } catch (Exception ex) {
        emitters.remove(emitter); // CopyOnWriteArrayList - safe but creates a copy per removal
    }
}
```

**Why it is wrong:** `CopyOnWriteArrayList` makes this thread-safe for iteration, but `remove` during iteration on COWAL creates a new underlying array for each removal. Under high fan-out (many SSE subscribers with intermittent failures), this creates heavy GC pressure. The more idiomatic pattern is to collect failed emitters and bulk-remove after iteration.

**Proper fix:**
```java
List<SseEmitter> failed = new ArrayList<>();
for (SseEmitter emitter : emitters) {
    try { emitter.send(...); } catch (Exception ex) { failed.add(emitter); }
}
emitters.removeAll(failed);
```

---

#### CRM-22 — `LeadImportService` uses broad `catch (Exception ex)` hiding parse errors

**File:lines:** `LeadImportService.java:86–88`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Offending code:**
```java
} catch (Exception ex) {
    throw new BadRequestException("Failed to read import file.");
}
```

**Why it is wrong:** The original exception (which may be an `InvalidFormatException`, `IllegalStateException`, or `OutOfMemoryError` from a maliciously large XLSX) is swallowed and replaced with a generic message. The root cause is lost and the user gets no actionable feedback on what was wrong with their file.

**Proper fix:** Log the original exception, and distinguish between malformed-file and system errors:
```java
} catch (IOException ex) {
    LOGGER.warn("Failed to parse import file", ex);
    throw new BadRequestException("Failed to read import file: " + ex.getMessage());
} catch (Exception ex) {
    LOGGER.error("Unexpected error parsing import file", ex);
    throw new BadRequestException("Import file format is not supported or is corrupted.");
}
```

---

#### CRM-23 — `WhatsappQuestionnaireService` is a 823-line god class

**File:lines:** `WhatsappQuestionnaireService.java:1–823`

**Severity:** P3 | **Confidence:** High

**Owner:** Chaitanya2872

**Why it is wrong:** A single service class handles: intro template dispatch, assignment notification, inbound webhook parsing, conversation state machine (8 steps), per-step question senders, per-step re-prompt senders, phone normalization, remark/location resolution helpers, and signature verification. This creates a 823-line class with 30+ methods where adding a new questionnaire step or a new notification type requires understanding all of the other concerns. It violates the single-responsibility principle.

**Proper fix:** Decompose into: `WhatsappSignatureVerifier`, `WhatsappTemplateDispatchService`, `WhatsappConversationStateMachine` (or a strategy per step), and `WhatsappWebhookParser`. Each would be 50–150 lines.

---

#### CRM-24 — Security stack (JwtService, SecurityConfig, GlobalExceptionHandler) is duplicated across services with subtle divergence

**File:lines (cross-service):**
- CRM: `crm-service/.../security/jwt/JwtService.java`
- Sales: `sales-service/.../security/jwt/JwtService.java`
- 8+ other services: similar pattern

**Severity:** P3 | **Confidence:** High

**Why it is wrong:** Every service owns a copy of JWT validation, security filter, and exception handler. These diverge: the CRM's `JwtService` has dual-secret support and identity-service fallback; the sales service does not. When a security fix is needed, it must be applied to 8+ places. This is confirmed cross-service duplication, not a finding within `crm-service` alone, but the CRM service participates in the problem. A shared `security-lib` module should centralize this.

---

## Redundancy

| Pair | Type | Location A | Location B |
|---|---|---|---|
| `trimToNull` | Identical method | `LeadService.java:790` | `AccountService.java:104` |
| `trimToNull` | Identical method | `LeadService.java:790` | `ContactService.java:128` |
| `trimToNull` | Identical method | `LeadService.java:790` | `DealService.java:182` |
| `trimToNull` | Identical method | `LeadService.java:790` | `LeadScheduleService.java:297` |
| `trimToNull` | Identical method | `LeadService.java:790` | `LeadImportService.java:430` |
| `verifySignature(payload, header)` | Near-identical HMAC logic | `MetaLeadService.java:337–360` | `WhatsappQuestionnaireService.java:641–664` |
| `getLeads` double query | Same `Specification` queried twice | `LeadService.java:120–127` | — (internal) |
| `JwtService.java` (security) | Near-duplicate across monorepo | `crm-service/.../JwtService.java` | `sales-service/.../JwtService.java` (+6 others) |
| `GlobalExceptionHandler.java` | Duplicate across services | `crm-service/.../GlobalExceptionHandler.java` | `sales-service/.../GlobalExceptionHandler.java` |
| `AppUserDetails SYSTEM_ACTOR` constant | Copy-paste | `MetaLeadService.java:31–37` | `LeadFollowUpReminderScheduler.java:22–28` |

---

## Tests & Gaps

**Test coverage: ZERO.**

There is no `src/test` directory under `crm-service`. Not a single unit test, integration test, or slice test exists for this service. Given the complexity — status machine with 9 states and transition validation, webhook signature verification, duplicate deduplication in imports, JWT dual-secret logic — this is the highest-risk gap in the codebase.

**Minimum test targets that should exist before this service goes to production:**

1. `LeadService` — status transition graph: valid transitions pass, invalid throw `BadRequestException`.
2. `LeadService` — `isSalesRepOnly` role logic: admin sees all leads; SALES_REP sees only assigned.
3. `MetaLeadService.verifySignature` — correct HMAC passes; missing/wrong signature rejected.
4. `JwtService.toUserDetails` — verse token and fawnix-token paths; expired token rejected.
5. `LeadImportService` — CSV happy path; duplicate detection; invalid date format; missing required fields.
6. `WhatsappQuestionnaireService.advanceConversation` — state machine steps: language → interest → demo → callback → ownership → completed.
7. `LeadFollowUpReminderScheduler` — only fires for leads with `followUpAt <= cutoff` and null `followUpReminderSentAt`.

---

## Coverage Note

**Fully read:**
- All controllers (AccountController, ContactController, DealController, LeadController, LeadScheduleController, MetaLeadWebhookController, MetaIntegrationSettingsController, WhatsappWebhookController, WhatsappIntegrationSettingsController, ReportsController)
- All entities (12 entities confirmed)
- All Flyway migrations V1–V16
- All service classes (LeadService, LeadImportService, LeadStatusHistoryService, LeadActivityService, LeadScheduleService, LeadNotificationStreamService, AccountService, ContactService, DealService, ReportsService, MetaLeadService, WhatsappQuestionnaireService, LeadContactRecordingService, SpeechToTextClient, IdentityUserClient)
- Security stack (JwtService, JwtAuthenticationFilter, SecurityConfig, LeadSecurityService)
- application.yml

**Skimmed (structure confirmed, not line-by-line):**
- `LeadMapper`, `AccountMapper`, `ContactMapper`, `DealMapper` — manual mapping pattern confirmed, no notable bugs spotted
- `LeadRequestValidator` — validation delegate, appears straightforward
- `ContactRecordingStorageService`, `ObjectStorageService` — MinIO integration, not deeply audited for MinIO-specific error handling
- `LeadSpecifications`, `AccountSpecifications`, `ContactSpecifications`, `DealSpecifications` — JPA Criteria API specs, logic appears correct

**Could not inspect:**
- Runtime behavior of the SSE stream under concurrent load (static analysis only)
- Actual Meta/WhatsApp webhook delivery behavior in a running environment
- Whether the `@Lazy` on `JwtAuthenticationFilter` in `SecurityConfig` is hiding a real circular dependency or is a harmless workaround

**Overall confidence: HIGH** for the correctness bugs (CRM-01 through CRM-09) and structural findings. **MED** for the CRM-16 and CRM-21 which require load profiling to confirm severity in practice.

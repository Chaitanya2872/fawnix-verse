# recruitment-service — Service Audit

**Audit date:** 2026-07-14  
**Auditor model:** claude-sonnet-4-6  
**Root:** `backend/services/recruitment-service`  
**Namespace:** `com.hirepath.recruitment`

---

## Summary

`recruitment-service` is a mid-sized Spring Boot 3 service (≈ 3 000 lines of hand-written Java) that owns the full ATS lifecycle: hiring requests, job positions, job postings, candidate intake (public form submission), the ATS pipeline (Kanban stages), interviews, offers, and hiring decisions. The overall architecture is functional but carries serious correctness and performance risks. The three headline issues are: (1) **Feign HTTP calls are made inside `@Transactional` methods** across multiple controllers, holding a DB connection open while waiting for external services; (2) **unbounded findAll() + in-memory filtering** is used for every list endpoint — the entire `candidate_applications`, `candidates`, and `analytics` tables are loaded into the JVM on every request; and (3) a **double-Base64 encoding bug** in `JwtService` and `ServiceJwtProvider` means the signing key differs from what `identity-service` generates, causing JWT validation to silently succeed (or fail) with an incorrect key across all services that share this copy-pasted pattern.

---

## Surface Map

### Controllers / Endpoints

| Controller | Method | Path | Auth |
|---|---|---|---|
| `RecruitmentController` | GET | `/api/recruitment/hiring-requests` | JWT (ADMIN, HR_MANAGER, HIRING_MANAGER, EMPLOYEE) |
| `RecruitmentController` | POST | `/api/recruitment/hiring-requests` | JWT |
| `RecruitmentController` | GET | `/api/recruitment/hiring-requests/{id}` | JWT |
| `RecruitmentController` | POST | `/api/recruitment/hiring-requests/{id}/approve` | JWT (ADMIN, HR_MANAGER, HIRING_MANAGER) |
| `RecruitmentController` | GET | `/api/recruitment/positions` | JWT (ADMIN, HR_MANAGER, RECRUITER, HIRING_MANAGER) |
| `RecruitmentController` | GET | `/api/recruitment/positions/{id}` | JWT |
| `RecruitmentController` | POST | `/api/recruitment/positions` | JWT |
| `RecruitmentController` | PATCH | `/api/recruitment/positions/{id}` | JWT |
| `RecruitmentController` | GET | `/api/recruitment/postings` | JWT |
| `RecruitmentController` | GET | `/api/recruitment/postings/{id}` | JWT |
| `RecruitmentController` | POST | `/api/recruitment/postings` | JWT |
| `RecruitmentController` | PATCH | `/api/recruitment/postings/{id}` | JWT |
| `RecruitmentController` | POST | `/api/recruitment/postings/{id}/publish` | JWT |
| `RecruitmentController` | POST | `/api/recruitment/postings/{id}/close` | JWT |
| `CandidateController` | GET | `/api/candidates` | JWT (ADMIN, HR_MANAGER, RECRUITER) |
| `CandidateController` | POST | `/api/candidates` | JWT |
| `CandidateController` | GET | `/api/candidates/{id}` | JWT |
| `CandidateController` | GET | `/api/candidates/pipeline/all` | JWT |
| `CandidateController` | POST | `/api/candidates/applications` | JWT |
| `CandidateController` | GET | `/api/candidates/applications` | JWT |
| `CandidateController` | PATCH | `/api/candidates/applications/{id}/status` | JWT |
| `InterviewController` | GET | `/api/interviews` | JWT (ADMIN, HR_MANAGER, INTERVIEWER) |
| `InterviewController` | GET | `/api/interviews/{id}` | JWT |
| `InterviewController` | POST | `/api/interviews` | JWT (ADMIN, HR_MANAGER, RECRUITER) |
| `InterviewController` | PATCH | `/api/interviews/{id}` | JWT |
| `InterviewController` | POST | `/api/interviews/{id}/feedback` | JWT (ADMIN, HR_MANAGER, INTERVIEWER) |
| `OfferController` | GET | `/api/offers` | JWT (ADMIN, HR_MANAGER) |
| `OfferController` | GET | `/api/offers/{id}` | JWT |
| `OfferController` | POST | `/api/offers` | JWT |
| `OfferController` | POST | `/api/offers/{id}/send-for-approval` | JWT |
| `OfferController` | POST | `/api/offers/{id}/approve` | JWT |
| `OfferController` | POST | `/api/offers/{id}/status` | JWT |
| `IntakeController` | GET | `/api/recruitment/intake` | JWT (ADMIN, HR_MANAGER, RECRUITER) |
| `IntakeController` | PATCH | `/api/recruitment/intake/{id}` | JWT |
| `IntakeController` | POST | `/api/recruitment/intake/{id}/shortlist` | JWT |
| `PipelineController` | GET | `/api/recruitment/pipeline/{vacancyId}` | JWT |
| `PipelineController` | POST | `/api/recruitment/pipeline/move` | JWT |
| `PipelineController` | GET | `/api/recruitment/pipeline/history/{applicationId}` | JWT |
| `DecisionController` | POST | `/api/recruitment/decisions` | JWT (ADMIN, HR_MANAGER, HIRING_MANAGER) |
| `DecisionController` | GET | `/api/recruitment/decisions/{applicationId}` | JWT |
| `VacancyConfigController` | GET | `/api/recruitment/vacancies/{id}/pipeline-config` | JWT |
| `VacancyConfigController` | PATCH | `/api/recruitment/vacancies/{id}/pipeline-config` | JWT |
| `VacancyConfigController` | GET | `/api/recruitment/vacancies/{id}/interview-rounds` | JWT |
| `VacancyConfigController` | PATCH | `/api/recruitment/vacancies/{id}/interview-rounds` | JWT |
| `RecruitmentAnalyticsController` | GET | `/api/recruitment/analytics` | JWT |
| `PublicApplyController` | GET | `/api/public/forms/{slug}` | None (public) |
| `PublicApplyController` | POST | `/api/public/forms/{slug}/submit` | None (public) |
| `InternalApprovalSyncController` | POST | `/internal/recruitment/approvals/status` | Internal secret |
| `InternalIntakeController` | POST | `/internal/recruitment/intake/from-submission` | Internal secret |

### Entities / Tables

| Entity | Table |
|---|---|
| `HiringRequest` | `hiring_requests` |
| `Approval` | `approvals` |
| `JobPosition` | `job_positions` |
| `JobPosting` | `job_postings` |
| `PostingPlatform` | `posting_platforms` |
| `Candidate` | `candidates` |
| `CandidateApplication` | `candidate_applications` |
| `HRScreening` | `hr_screenings` |
| `Interview` | `interviews` |
| `InterviewPanel` | `interview_panels` |
| `InterviewFeedback` | `interview_feedback` |
| `Offer` | `offers` |
| `OfferApproval` | `offer_approvals` |
| `ApplicationFormSubmission` | `application_form_submissions` |
| `CandidateIntake` | `candidate_intake` |
| `PipelineStage` | `pipeline_stages` |
| `PipelineHistory` | `pipeline_history` |
| `InterviewRoundConfigEntity` | `interview_rounds_config` |
| `EvaluationScore` | `evaluation_scores` |
| `ApplicationDecision` | `application_decisions` |
| `RecruitmentAuditLog` | `recruitment_audit_logs` |

### Flyway Migrations

| Version | File | Description |
|---|---|---|
| V1 | `V1__create_recruitment_schema.sql` | Full initial schema |
| V2 | `V2__approval_request_link.sql` | `approval_request_id` columns + indexes |
| V3 | `V3__ats_intake_pipeline.sql` | Intake, pipeline, rounds, scoring, decision, audit tables; adds columns to `candidate_applications` and `job_positions` |

### Outbound Feign Clients

| Client | Target service |
|---|---|
| `ApprovalClient` | approval-service |
| `IntegrationClient` | integration-service (calendar, job-board publishing) |
| `IdentityClient` | identity-service (user lookup) |
| `FormsClient` | forms-service |
| `NotificationsClient` | notifications-service |

---

## Findings

### P0 — Critical

---

#### REC-01 — Feign HTTP calls inside `@Transactional` methods hold the DB connection open

- **File:line:** `RecruitmentController.java:160–234` (createHiringRequest), `RecruitmentController.java:582–683` (publishPosting), `OfferController.java:170–218` (sendForApproval), `DecisionController.java:63–133` (create), `InterviewController.java:173–243` (create), `InterviewController.java:247–312` (update), `PublicApplyController.java:117–247` (submit)
- **Severity / Confidence:** P0 / High
- **Offending code (createHiringRequest as representative):**
  ```java
  @PostMapping("/hiring-requests")
  @Transactional
  public ResponseEntity<?> createHiringRequest(...) {
      ...
      HiringRequest saved = hiringRequestRepository.save(hiringRequest);
      // DB connection held open from here
      if (!isDraft) {
          try {
              ApprovalRequestCreateResponse created = approvalClient.createApprovalRequest(approvalRequest);
              // network I/O while transaction is open
          } catch (FeignException ex) {
              saved.setStatus(RequestStatus.DRAFT);
              hiringRequestRepository.save(saved);
              return ResponseEntity.status(ex.status()).body("Approval service error");
          }
      }
  }
  ```
- **Why wrong:** Every `@Transactional` call acquires a JDBC connection from the pool for its entire duration. Calling remote HTTP services (Feign) inside that scope means the connection is held for however long the approval-service, integration-service, or forms-service takes to respond (including timeouts, retries, or unavailability). Under load this exhausts the connection pool, starving all other database operations. In `publishPosting` a loop over platforms iterates calls to `integrationClient` while the transaction is open. `PublicApplyController.submit` additionally calls `formsClient.createSubmission` inside the transaction, then calls `intakeRepository.save`, creating a window where a Feign timeout leaves a partially-committed intake record.
- **Fix:** Push the outbound Feign call **outside** the transaction. Save the entity first (with `DRAFT` or `PENDING` status), commit, then call the remote service in a separate method (no `@Transactional`), and if the call succeeds, open a new transaction to update the status.
  ```java
  // Step 1: save in a @Transactional service method
  HiringRequest saved = hiringRequestService.createDraft(request, userId);
  // Step 2: call approval service (outside transaction)
  String approvalId = approvalClient.createApprovalRequest(approvalRequest).getId();
  // Step 3: update status in a new @Transactional call
  hiringRequestService.markPending(saved.getId(), approvalId);
  ```
- **Owner:** `git log` → Ravi-Shankar-ACS

---

#### REC-02 — JWT signing key is double-Base64-encoded, creating a mismatched signing key

- **File:line:** `JwtService.java:68–71`, `ServiceJwtProvider.java:47–50`
- **Severity / Confidence:** P0 / High
- **Offending code:**
  ```java
  // JwtService.java:68-71
  private Key getSigningKey() {
      return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
          jwtProperties.getSecret().getBytes()
      )));
  }
  ```
- **Why wrong:** `Decoders.BASE64.decode` expects a Base64-encoded string. `Base64.getEncoder().encodeToString(secret.getBytes())` encodes the raw secret, which is correct. However, `Decoders.BASE64.decode` then decodes that back to the original bytes, so the effective key is `secret.getBytes()` — the same as if the secret were used directly. This _happens_ to produce the same result as the identity-service implementation (`toBase64Secret` also double-encodes and then decodes), so tokens generated by identity-service _can_ be validated here at runtime **only because all services share the same double-encode pattern**. The real risk: (a) if any future service uses the correct single-encode pattern, tokens will be rejected cross-service; (b) it signals the team does not understand what the signing key bytes actually are, making rotation dangerous. Additionally, `isTokenValid` is called _after_ `toUserDetails` — a token that fails structural parsing throws from `toUserDetails` but the exception is swallowed (`catch (Exception ignored)`), so an attacker who crafts a structurally valid but expired token has `toUserDetails` succeed and `isTokenValid` return false, leaving `userDetails` populated but authentication not set — this is currently safe but fragile.
- **Fix:** Use the correct single-encode pattern (as `identity-service` helper `toBase64Secret` does):
  ```java
  private Key getSigningKey() {
      // secret is a plain-text string; encode to Base64 ONCE then decode to bytes for HMAC
      String b64 = Base64.getEncoder().encodeToString(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
      return Keys.hmacShaKeyFor(Decoders.BASE64.decode(b64));
  }
  ```
  Validate the token **before** extracting claims:
  ```java
  try {
      if (jwtService.isTokenValid(token)) {
          AppUserDetails userDetails = jwtService.toUserDetails(token);
          // set authentication
      }
  } catch (Exception ignored) { ... }
  ```
- **Owner:** Ravi-Shankar-ACS

---

### P1 — High

---

#### REC-03 — `findAll()` on large tables with all filtering done in Java (unbounded memory, no pagination at DB level)

- **File:line:** `CandidateController.java:258` (listApplications), `CandidateController.java:177` (pipeline), `RecruitmentAnalyticsController.java:46–47` (dashboard), `RecruitmentAnalyticsController.java:54`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  // CandidateController.java:258
  List<CandidateApplication> applications = candidateApplicationRepository.findAll();
  // then: 7 separate stream().filter() passes over the entire list
  
  // RecruitmentAnalyticsController.java:46-54
  List<CandidateIntake> intakes = intakeRepository.findAll();
  List<CandidateApplication> applications = applicationRepository.findAll();
  long decisionCount = decisionRepository.findAll().size();
  ```
- **Why wrong:** As candidate volume grows, each call to `listApplications` loads the entire `candidate_applications` table plus lazily-triggered loads of related `Candidate`, `JobPosition`, and `CandidateIntake` rows per application (N+1 inside the stream). The analytics endpoint loads three full tables on every dashboard hit with no caching. At 10 000 applications, a single analytics request can easily produce hundreds of SQL queries and consume hundreds of MBs of heap.
- **Fix:** Push all filtering to the repository using Spring Data JPA derived queries or `@Query` JPQL with `Page<T>` and `Pageable`. For analytics, use aggregate `@Query` with `COUNT(*)` and `GROUP BY` at the database level.
  ```java
  // CandidateApplicationRepository
  Page<CandidateApplication> findByPosition_IdAndStatus(UUID positionId, CandidateStatus status, Pageable pageable);
  
  @Query("SELECT COUNT(a) FROM CandidateApplication a WHERE a.status = :status")
  long countByStatus(@Param("status") CandidateStatus status);
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-04 — N+1 Feign HTTP calls per row in `listHiringRequests` and `list` (offers)

- **File:line:** `RecruitmentController.java:149` (inside the `.stream().map()` at line 137), `OfferController.java:88` (inside the `.stream().map()` at line 65)
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  // RecruitmentController.java:137-154 — listHiringRequests
  List<Map<String, Object>> data = page.stream().map(req -> {
      ...
      row.put("approval_status", fetchApprovalStatus("hiring_request", req.getId().toString()));
      // ^ One HTTP call to approval-service per hiring request in the page
      ...
  }).toList();
  
  // OfferController.java:65-91 — list()
  List<Map<String, Object>> data = offers.stream().map(offer -> {
      ...
      row.put("approval_status", fetchApprovalStatus("offer", offer.getId().toString()));
      // ^ One HTTP call to approval-service per offer
      ...
  }).toList();
  ```
  Additionally, `listPositions` (line 341–342) calls `candidateApplicationRepository.countByPosition_Id()` and `latestPostingStatus()` for every position in the page — two additional DB queries per row.
- **Why wrong:** A page of 20 hiring requests triggers 20 HTTP round-trips to approval-service before the response is returned. Any latency or error from approval-service directly multiplies. For positions, 20 rows = 40 extra DB queries.
- **Fix:** Batch-fetch all approval statuses in a single request (if approval-service supports it), or cache in Redis with a short TTL. For the position count and latest posting status, use JPA projections with `GROUP BY` in a single query.
  ```java
  // Bulk fetch example
  Map<String, String> statusMap = approvalClient.getBulkStatuses("recruitment", "hiring_request", ids);
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-05 — `DecisionController.create` sends approval request with potentially null `flowId`

- **File:line:** `DecisionController.java:100`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  approvalRequest.setFlowId(application.getPosition().getApprovalFlowId());
  // application.getPosition().getApprovalFlowId() can be null — no check
  approvalClient.createApprovalRequest(approvalRequest);
  ```
- **Why wrong:** `JobPosition.approvalFlowId` is an optional field — it is not `nullable = false` in the schema and is not checked before use. Submitting a null flow ID to approval-service will cause a 400 or 500 error from that service. The `catch (FeignException ex)` block then returns that error to the caller, but the `ApplicationDecision` has already been saved and the `application.decisionStatus` has been updated — the DB is partially modified on failure with no rollback.
- **Fix:** Validate `approvalFlowId` before saving the decision, and move the approval call outside the transaction (see REC-01):
  ```java
  if (application.getPosition().getApprovalFlowId() == null) {
      return ResponseEntity.badRequest().body("Position has no approval_flow_id configured");
  }
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-06 — `InternalIntakeController` builds dedupe hash incorrectly (plain string concatenation instead of SHA-256)

- **File:line:** `InternalIntakeController.java:46`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  // InternalIntakeController.java:46
  intake.setDedupeHash(intake.getVacancyId() + ":" + request.getEmail().trim().toLowerCase());
  ```
  vs. the correct implementation in `PublicApplyController.java:269–284`:
  ```java
  MessageDigest digest = MessageDigest.getInstance("SHA-256");
  String raw = vacancyId + ":" + email.trim().toLowerCase();
  byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
  ```
- **Why wrong:** The dedupe hash stored by the internal endpoint is a raw `UUID:email` string (up to 255+ chars) while the public form endpoint stores a 64-char SHA-256 hex digest. Any deduplication query that joins on `dedupe_hash` between records created by the two paths will never match — a candidate submitting via both the public form and an internal sync will bypass the duplicate check entirely.
- **Fix:** Extract `buildDedupeHash(UUID, String)` from `PublicApplyController` into a shared `DedupeUtil` class and call it from both controllers.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-07 — Resume upload: no file type or content-type validation

- **File:line:** `StorageService.java:29–45`, `PublicApplyController.java:169–176`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  // StorageService.java:29-45
  public String upload(String folder, MultipartFile file) {
      String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
      String key = folder + "/" + UUID.randomUUID();
      // No validation of extension or contentType
      PutObjectRequest request = PutObjectRequest.builder()
          .bucket(properties.getBucket())
          .key(key)
          .contentType(file.getContentType()) // trusts client-supplied Content-Type
          .build();
      s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
  }
  ```
- **Why wrong:** The client controls both the file extension (via `getOriginalFilename()`) and the `Content-Type` header. An attacker can upload a `.html` or `.js` file with `contentType=application/pdf`, store it in the S3 bucket, and if the bucket has public-read or pre-signed URLs, serve it as a resume. The `getOriginalFilename()` value is user-supplied and can contain path traversal sequences (`../../etc/passwd`).
- **Fix:** Whitelist allowed extensions (`pdf`, `doc`, `docx`) and detect actual content type via file-magic-bytes (e.g., Apache Tika), not the client-supplied header. Sanitize the filename before any use.
  ```java
  private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx");
  if (!ALLOWED_EXTENSIONS.contains(extension != null ? extension.toLowerCase() : "")) {
      throw new IllegalArgumentException("Unsupported file type");
  }
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-08 — `X-Forwarded-For` header is trusted without validation — rate limiter is trivially bypassed

- **File:line:** `PublicApplyController.java:302–308`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  private String resolveClientIp(MultipartHttpServletRequest request) {
      String forwarded = request.getHeader("X-Forwarded-For");
      if (forwarded != null && !forwarded.isBlank()) {
          return forwarded.split(",")[0].trim(); // attacker-controlled
      }
      return request.getRemoteAddr();
  }
  ```
- **Why wrong:** Any client can set `X-Forwarded-For: 1.2.3.4` to a different IP on every request, bypassing the per-IP rate limit entirely. The rate limiter is the only protection on the public apply endpoint.
- **Fix:** Only trust `X-Forwarded-For` if the request comes from a known reverse-proxy IP, or configure the actual proxy to set `X-Real-IP` instead. The correct approach is to configure Spring Boot's `server.forward-headers-strategy=native` or use a `ForwardedHeaderFilter` with a trusted-proxy list.
- **Owner:** Ravi-Shankar-ACS

---

### P2 — Medium

---

#### REC-09 — `PublicFormRateLimiter` in-memory bucket map is never evicted (memory leak)

- **File:line:** `PublicFormRateLimiter.java:15–26`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```java
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
  
  public RateLimitResult allow(String key) {
      Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, Instant.now().toEpochMilli()));
      // Bucket is added but NEVER removed
  ```
- **Why wrong:** Every unique IP (or slug+IP combination) that hits the public form endpoint adds a permanent entry to `buckets`. Under an IP-rotating bot attack or normal production traffic over months, this map can grow without bound, consuming heap memory indefinitely. There is no scheduled cleanup, TTL, or maximum size.
- **Fix:** Replace with a `Caffeine` cache with expiry:
  ```java
  private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
      .expireAfterAccess(Duration.ofSeconds(windowSeconds * 2))
      .maximumSize(100_000)
      .build();
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-10 — No `GlobalExceptionHandler` / `@ControllerAdvice` — raw stack traces and inconsistent error shapes

- **File:line:** (service-wide; no `*ExceptionHandler.java` file exists anywhere under `src/main`)
- **Severity / Confidence:** P2 / High
- **Offending code:** N/A — the problem is the absence of a handler. Uncaught `MethodArgumentTypeMismatchException`, `HttpMessageNotReadableException`, `IllegalArgumentException` from UUID parsing, `DataIntegrityViolationException` from duplicate keys, and Spring Security exceptions all produce default Spring error responses that leak package names and stack traces.
- **Why wrong:** A malformed UUID in a path variable (`/api/candidates/not-a-uuid`) throws `IllegalArgumentException` from `UUID.fromString()` that propagates to the dispatcher, producing a 500 with a full stack trace. Without a handler, the response shape varies per error type, breaking the API contract for frontend consumers.
- **Fix:** Add a `@RestControllerAdvice` class:
  ```java
  @RestControllerAdvice
  public class GlobalExceptionHandler {
      @ExceptionHandler(IllegalArgumentException.class)
      public ResponseEntity<Map<String,String>> handleIllegalArg(IllegalArgumentException ex) {
          return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
      }
      @ExceptionHandler(MethodArgumentTypeMismatchException.class)
      public ResponseEntity<?> handleTypeMismatch(...) { ... }
  }
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-11 — `VacancyConfigController.updatePipelineConfig` and `updateInterviewRounds` save entities in a loop (no `saveAll`)

- **File:line:** `VacancyConfigController.java:86–93` (pipeline), `VacancyConfigController.java:136–147` (rounds)
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```java
  // VacancyConfigController.java:84-93
  for (PipelineConfigRequest.StageRequest stageReq : request.getStages()) {
      PipelineStage stage = new PipelineStage();
      // ... populate
      pipelineStageRepository.save(stage); // one INSERT per stage
  }
  ```
- **Why wrong:** Each `save()` inside a `@Transactional` method flushes individually if auto-flush is triggered. For a pipeline with 10 stages this is 10 separate INSERT statements. `saveAll()` with a list allows Spring Data JPA (and the underlying JDBC batch) to batch them into a single round-trip.
- **Fix:** Collect stages into a list and call `saveAll`:
  ```java
  List<PipelineStage> stages = new ArrayList<>();
  for (StageRequest r : request.getStages()) { stages.add(buildStage(r, vacancy.getId())); }
  pipelineStageRepository.saveAll(stages);
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-12 — `InterviewController` lazy Feign call is inside `@Transactional` — calendar events created even if the DB save fails

- **File:line:** `InterviewController.java:173`, `InterviewController.java:226–239`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```java
  @PostMapping @Transactional
  public ResponseEntity<?> create(...) {
      Interview saved = interviewRepository.save(interview);
      // ...
      if (shouldSyncCalendar(saved, ...)) {
          CalendarEventResponse eventResponse = integrationClient.createCalendarEvent(...);
          saved.setCalendarEventId(eventResponse.getEventId());
          interviewRepository.save(saved);
      }
      return ResponseEntity.status(HttpStatus.CREATED)...;
  }
  ```
- **Why wrong:** If `integrationClient.createCalendarEvent` succeeds but a subsequent `interviewRepository.save(saved)` throws a constraint violation, the transaction rolls back — but the calendar event was already created externally and is not rolled back. The reverse is also true if the Feign call fails (see REC-01). Calendar event IDs are then out of sync with the database.
- **Fix:** Follow the same pattern as REC-01: save the interview first (commit), then call the calendar API in a non-transactional step, then update `calendarEventId` in a second transaction.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-13 — `pom.xml` `groupId` mismatch: service declares `com.hirepath` but parent declares `com.fawnix`

- **File:line:** `pom.xml:5–11`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```xml
  <parent>
      <groupId>com.fawnix</groupId>  <!-- parent groupId -->
      ...
  </parent>
  <groupId>com.hirepath</groupId>  <!-- this artifact's groupId -->
  <artifactId>recruitment-service</artifactId>
  ```
  All Java source files use `package com.hirepath.recruitment.*` (not `com.fawnix`).
- **Why wrong:** The `groupId` mismatch violates Maven inheritance conventions and signals that this service is from a separate product (`hirepath`) merged into the `fawnix` monorepo without renaming. It means the artifact cannot be depended on as `com.fawnix:recruitment-service` and creates confusion about which organisation owns this service. Approval-service, forms-service, org-service, and notifications-service have the same `com.hirepath` groupId, suggesting a bulk migration that was never completed.
- **Fix:** Decide on the canonical groupId (`com.fawnix` or `com.hirepath`) and migrate all affected services consistently. Rename Java packages to match.
- **Owner:** Ravi-Shankar-ACS [migrated]

---

#### REC-14 — `RecruitmentController` is a 780-line god-class containing 14 endpoints, 8 injected repositories, 2 Feign clients, and manual JSON serialization

- **File:line:** `RecruitmentController.java:1–780`
- **Severity / Confidence:** P2 / High
- **Offending code:** The class holds all of: hiring request CRUD, position CRUD, posting CRUD, posting publish logic, approval orchestration, `ObjectMapper` for interview round serialization, per-request DB queries, and Feign orchestration.
- **Why wrong:** The class has too many reasons to change (single-responsibility violation). `@Transactional` methods in a `@RestController` work only because the controller itself is proxied by Spring — this is an antipattern that makes the transaction boundary invisible and makes business logic untestable without an HTTP layer. When a junior developer adds another method, it will inevitably copy the existing patterns (repositories injected into controller, manual map building) rather than going to a service.
- **Fix:** Extract into `HiringRequestService`, `PositionService`, `PostingService`, each with its own `@Transactional` service method. Controllers should call service methods and return `ResponseEntity`. Manual `Map<String, Object>` building should be replaced by proper response DTO classes.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-15 — `HRScreening` entity and `hr_screenings` table have no controller — dead code

- **File:line:** `HRScreening.java`, `HiringRequestRepository.java` does not reference it; only `CandidateApplication.java:98` has a `@OneToOne mapping`
- **Severity / Confidence:** P2 / Med
- **Offending code:** `HRScreening` is defined as an `@Entity` and mapped as `@OneToOne` in `CandidateApplication`, but no controller, service, or repository method creates or reads it. The table `hr_screenings` exists in V1 migration.
- **Why wrong:** Dead code that creates false expectations. Any developer reading `CandidateApplication` will assume HR screening is functional. The table occupies schema space and needs to be maintained through future migrations.
- **Fix:** Either implement the HR screening flow, or remove the entity, migration-revert the table, and remove the association from `CandidateApplication`. If the feature is planned, add a `// TODO:` comment.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-16 — `ApplicationFormSubmission` entity is never written to by any controller or service

- **File:line:** `ApplicationFormSubmission.java`, `ApplicationFormSubmissionRepository.java`
- **Severity / Confidence:** P2 / Med
- **Offending code:** The table `application_form_submissions` has NOT NULL constraints on `candidate_id` and `application_id`. No controller writes to this entity; the public form flow writes to `CandidateIntake` instead. The repository only declares `findAll()`.
- **Why wrong:** Dead code and misleading schema. The table's NOT NULL constraints mean it cannot be populated without a candidate + application, but no code performs this two-step creation.
- **Fix:** Remove the entity and repository (and table via migration) if the forms-service now owns submission storage. If local submission storage is needed, wire up the creation logic in `PublicApplyController.submit`.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-17 — Shared hardcoded default secrets: `fawnix-internal-secret` and `postgres`

- **File:line:** `application.yml:44–45`, `application.yml:7`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```yaml
  password: ${RECRUITMENT_DB_PASSWORD:postgres}
  secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
  internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
  ```
- **Why wrong:** The same `fawnix-internal-secret` default appears verbatim in `approval-service/application.yml`. If a container is deployed without setting `INTERNAL_SERVICE_SECRET`, any process that knows this value (e.g., a developer's laptop) can call any `/internal/**` endpoint on any service in the cluster. The default `postgres` password is similarly dangerous in a misconfigured deployment.
- **Fix:** Remove all default values from secrets and credentials. The application should **fail to start** if the secret is not provided:
  ```yaml
  internal-service-secret: ${INTERNAL_SERVICE_SECRET}  # no default — fail fast
  ```
  Use a secret manager (Vault, AWS Secrets Manager) for production values.
- **Owner:** Ravi-Shankar-ACS

---

### P3 — Low

---

#### REC-18 — `parseDate` method in `CandidateController` silently ignores malformed date parameters

- **File:line:** `CandidateController.java:411–433`
- **Severity / Confidence:** P3 / High
- **Offending code:**
  ```java
  private OffsetDateTime parseDate(String value, boolean end) {
      ...
      } catch (Exception ex) {
          return null; // silently swallowed
      }
  }
  ```
- **Why wrong:** A caller passing `date_from=not-a-date` gets `null` back, and the filter is silently skipped. The API returns 200 with data instead of 400. The developer who added the `end` parameter for inclusive end-of-day handling never actually differentiates between start and end paths — the `OffsetDateTime.parse(value)` branch returns `parsed` in both branches identically.
- **Fix:** Return 400 if the date cannot be parsed. Fix the `end` branch:
  ```java
  if (end) return parsed.plusDays(1).withHour(0).withMinute(0).toOffsetDateTime();
  return parsed;
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-19 — `OfferController.sendForApproval` calls `approvalClient.getFlow` outside a try-catch

- **File:line:** `OfferController.java:180`
- **Severity / Confidence:** P3 / High
- **Offending code:**
  ```java
  ApprovalFlowResponse flow = approvalClient.getFlow(offer.getApprovalFlowId());
  // No try-catch here — FeignException propagates as 500
  ```
  Compare with `RecruitmentController.createHiringRequest:172` which wraps the same call in a `try/catch (FeignException)`.
- **Why wrong:** If approval-service is unavailable, the call throws an uncaught `FeignException`, which produces a 500 response with a stack trace instead of a meaningful error message.
- **Fix:** Wrap in `try/catch (FeignException)` matching the pattern used in `createHiringRequest`.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-20 — `RecruitmentAnalyticsController` uses `double` arithmetic for conversion ratios — floating-point imprecision

- **File:line:** `RecruitmentAnalyticsController.java:58–61`, `113–116`
- **Severity / Confidence:** P3 / Med
- **Offending code:**
  ```java
  double intakeToShortlist = ratio(shortlisted, intakeTotal);
  // ratio() returns (double)n/(double)d
  ```
- **Why wrong:** While `double` is acceptable for ratios displayed on a dashboard, the `averageDays` computation at line 104–111 uses `total += duration.toHours() / 24d` which loses fractional precision. For monetary or time metrics visible to management, `BigDecimal` is more appropriate. This is low severity but will bite if the metrics feed into financial reporting.
- **Fix:** Use `BigDecimal` for averages, or at minimum document that dashboard figures are approximate.
- **Owner:** Ravi-Shankar-ACS

---

#### REC-21 — `IntakeController.list` loads full table then filters in Java when `status` filter is provided

- **File:line:** `IntakeController.java:81–91`
- **Severity / Confidence:** P3 / High
- **Offending code:**
  ```java
  List<CandidateIntake> intakes = vacancyId != null && !vacancyId.isBlank()
      ? intakeRepository.findByVacancyId(UUID.fromString(vacancyId))
      : intakeRepository.findAll(); // loads all when vacancyId is absent
  if (status != null && !status.isBlank()) {
      intakes = intakes.stream().filter(i -> i.getStatus() == statusFilter).toList();
  }
  ```
- **Why wrong:** When `vacancyId` is omitted, all intake records are loaded before status filtering. Add a repository method to filter at the DB level.
- **Fix:**
  ```java
  Page<CandidateIntake> findByVacancyIdAndStatus(UUID vacancyId, IntakeStatus status, Pageable p);
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-22 — `InterviewController.resolveAttendees` swallows all exceptions from identity-client lookup

- **File:line:** `InterviewController.java:501`
- **Severity / Confidence:** P3 / Med
- **Offending code:**
  ```java
  } catch (Exception ex) {
      // Ignore lookup failures; calendar can be created without extra attendees.
  }
  ```
- **Why wrong:** While the intent (graceful degradation) is documented, swallowing `Exception` means network issues, authentication failures, and programming errors (NPE, ClassCastException) are all silently ignored. Interviewers may not receive calendar invites without the caller being informed. At minimum, log the failure with the exception type.
- **Fix:**
  ```java
  } catch (Exception ex) {
      log.warn("User lookup failed for calendar attendees, proceeding without interviewer emails: {}", ex.getMessage());
  }
  ```
- **Owner:** Ravi-Shankar-ACS

---

#### REC-23 — No input validation annotations on any DTO — all validation is ad-hoc manual checks

- **File:line:** `HiringRequestCreateRequest.java` (representative), all DTOs under `dto/`
- **Severity / Confidence:** P3 / High
- **Offending code (representative):**
  ```java
  public class HiringRequestCreateRequest {
      private String jobTitle;  // no @NotBlank
      private Integer headcount; // no @Min(1)
      private BigDecimal salaryMin; // no @DecimalMin
  ```
  `spring-boot-starter-validation` is a declared dependency but is never used with `@Valid` on any controller method.
- **Why wrong:** Validation is duplicated, inconsistent, and easy to miss when adding new endpoints. `jobTitle` has no null check in `createHiringRequest` — `hiringRequest.setJobTitle(null)` would pass, then fail at the `nullable = false` DB column with a 500 rather than a 400.
- **Fix:** Add JSR-380 annotations to DTOs and `@Valid` to controller parameters:
  ```java
  public class HiringRequestCreateRequest {
      @NotBlank private String jobTitle;
      @Min(1) private Integer headcount = 1;
  }
  // controller:
  public ResponseEntity<?> createHiringRequest(@Valid @RequestBody HiringRequestCreateRequest request, ...)
  ```
- **Owner:** Ravi-Shankar-ACS

---

## Redundancy

The following are concrete copy-paste duplicates between files in this service and other services in the monorepo. Each pair should be extracted to a shared library module.

| # | File A | Lines | File B | Lines | Pattern |
|---|---|---|---|---|---|
| 1 | `recruitment-service/.../JwtService.java:60–73` | `extractClaims`, `getSigningKey` | `approval-service/.../JwtService.java:60–72` | Identical implementations | JWT parsing |
| 2 | `recruitment-service/.../JwtService.java:23–57` | `toUserDetails`, `isTokenValid`, `extractRoles`, `extractPermissions` | `approval-service/.../JwtService.java:23–57` | Identical method bodies | JWT user extraction |
| 3 | `recruitment-service/.../JwtAuthenticationFilter.java:17–61` | Full class | `approval-service/.../JwtAuthenticationFilter.java:17–60` | Identical (different package) | JWT filter |
| 4 | `recruitment-service/.../SecurityConfig.java:37–53` | `securityFilterChain` body | `approval-service/.../security/config/SecurityConfig.java` (same pattern) | Identical security chain config | Security config |
| 5 | `recruitment-service/.../ServiceJwtProvider.java:25–51` | `getToken`, `getSigningKey` | Not found verbatim in approval-service (approval doesn't need to issue tokens), but `JwtProperties.java` is a character-for-character copy across: approval, forms, org, analytics, task, integration, notifications, recruitment | JWT config properties |
| 6 | `recruitment-service/.../InternalServiceAuthFilter.java` | Full class | `approval-service/...` (same pattern, confirmed by `grep -rn "InternalServiceAuthFilter"`) | Internal auth filter |
| 7 | `RecruitmentController.java:726–735` (`fetchApprovalStatus`) | | `OfferController.java:282–291` (`fetchApprovalStatus`) | Same method, same signature, within the same service | Duplicated private method |
| 8 | `RecruitmentController.java:332–358` (position row mapping) | | `RecruitmentController.java:360–390` (getPosition) | ~30 identical `row.put(...)` lines | Position-to-map serialization |

**Recommendation:** Items 1–6 should be extracted into a `verse-security-common` library module under `backend/libs/`. Item 7 (`fetchApprovalStatus`) should be moved to a shared `ApprovalStatusHelper` bean injected into both controllers. Item 8 should be extracted into a `PositionMapper` class.

---

## Tests & Gaps

**Test directory does not exist.** The directory `src/test/` is absent from `recruitment-service`. There are zero unit tests, integration tests, or slice tests.

This means:
- No test coverage for the JWT signing key encoding path (REC-02) — the double-encode bug is undetected.
- No test coverage for the deduplication hash mismatch (REC-06).
- No regression tests for the pipeline gate logic in `PipelineController.enforceStrictGates`.
- No test for the rate limiter bucket calculation.
- The `@Transactional`-with-Feign pattern (REC-01) has never been exercised in a test that simulates a Feign timeout.

**Minimum recommended test coverage:**
1. Unit test for `JwtService.isTokenValid` with an expired token.
2. Unit test for `PublicFormRateLimiter` token bucket refill math.
3. `@WebMvcTest` for `PublicApplyController` with a mocked `FormsClient` — tests rate limiting and dedupe.
4. `@DataJpaTest` for `CandidateApplicationRepository` — verifies the `findTopByDedupeKey` query.
5. Integration test for `DecisionController.create` that asserts the approval request is not called when `approvalFlowId` is null.

---

## Coverage Note

**Fully inspected:** All 11 controllers (every endpoint), all domain entities, all 3 Flyway migrations, `SecurityConfig`, `JwtAuthenticationFilter`, `InternalServiceAuthFilter`, `JwtService`, `ServiceJwtProvider`, `JwtProperties`, `InternalServiceConfig`, `FeignConfig`, `StorageService`, `StorageProperties`, `PublicFormRateLimiter`, `RecruitmentEventService`, `UserContext`, `application.yml`, `pom.xml`.

**Skimmed (representative samples only):** All 19 repository interfaces (no custom `@Query` methods were found beyond the ones referenced in controller logic), all Feign client interfaces (`ApprovalClient`, `FormsClient`, `IdentityClient`, `IntegrationClient`, `NotificationsClient`) and their `client/dto/` classes — these are thin DTOs with no logic.

**Not inspected:** The `Dockerfile` was not audited (out of scope for this code audit). The `graphify-out/` directory was not used as input.

**Overall confidence: High.** All correctness-critical paths (JWT validation, Feign-in-transaction, N+1 queries, public form security) were read line-by-line. Performance and security findings are supported by concrete file:line evidence, not inference.

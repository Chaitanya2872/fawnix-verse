# integration-service — Service Audit

**Date:** 2026-07-14
**Auditor:** Claude Sonnet 4.6 (automated granular review)
**Scope:** `backend/services/integration-service` — full read of all 38 source files + pom.xml + Dockerfile

---

## Summary

`integration-service` is a Spring Boot 3 / JDK 21 microservice that does three things: (1) manages per-user OAuth connections to Google Calendar and Microsoft Graph, (2) proxies calendar-event CRUD to those providers, and (3) stores job-portal credentials (LinkedIn/Naukri/Indeed) and exposes a job-posting publish endpoint. The service is **under-tested** (no `src/test` directory exists), has **critical security weaknesses** in its OAuth CSRF/state validation and internal-service secret defaults, and contains **a fully-stubbed publish flow** that emits fake `*.example.com` URLs without any real API calls. Several correctness bugs (missing `@Transactional` on a derived-delete, race condition in token refresh, NPE risk on null platform) and the absence of a `GlobalExceptionHandler` (meaning `IllegalArgumentException` from `CalendarProvider.fromValue` surfaces as HTTP 500 instead of 400) compound the risk.

---

## Surface Map

### Endpoints

| Method | Path | Controller | Auth |
|--------|------|------------|------|
| GET | `/api/calendar/connections` | `CalendarConnectionController` | JWT required |
| DELETE | `/api/calendar/connections/{provider}` | `CalendarConnectionController` | JWT required |
| POST | `/api/calendar/oauth/{provider}/authorize` | `CalendarOAuthController` | JWT required |
| GET | `/api/calendar/oauth/{provider}/callback` | `CalendarOAuthController` | **permitAll** |
| GET | `/api/settings/portal-credentials` | `PortalCredentialController` | JWT required |
| POST | `/api/settings/portal-credentials` | `PortalCredentialController` | JWT required |
| POST | `/internal/calendar/events` | `CalendarEventController` | InternalServiceAuthFilter |
| PATCH | `/internal/calendar/events/{provider}/{eventId}` | `CalendarEventController` | InternalServiceAuthFilter |
| DELETE | `/internal/calendar/events/{provider}/{eventId}` | `CalendarEventController` | InternalServiceAuthFilter |
| POST | `/internal/postings/publish` | `InternalPostingController` | InternalServiceAuthFilter |

### JPA Entities / Tables

| Entity | Table | Key Notes |
|--------|-------|-----------|
| `CalendarConnection` | `calendar_connections` | UUID PK, unique on (user_id, provider) |
| `CalendarOAuthState` | `calendar_oauth_states` | String PK (state token, 64 chars), no TTL column, no scheduled cleanup |
| `PortalCredential` | `portal_credentials` | UUID PK, UNIQUE on platform (global, not per-tenant) |

### Flyway Migrations

| File | Tables Created |
|------|---------------|
| `V1__create_integration_schema.sql` | `calendar_connections`, `calendar_oauth_states`, `portal_credentials` |

### Outbound HTTP Calls (via `CalendarHttpClient`)

| Destination | Called From | Purpose |
|-------------|------------|---------|
| `https://accounts.google.com/o/oauth2/v2/auth` (URL build) | `CalendarOAuthService` | Build Google auth URL |
| `https://oauth2.googleapis.com/token` | `CalendarOAuthService`, `CalendarTokenService` | Exchange/refresh Google token |
| `https://openidconnect.googleapis.com/v1/userinfo` | `CalendarOAuthService` | Fetch Google account email |
| `https://login.microsoftonline.com/…/oauth2/v2.0/authorize` (URL build) | `CalendarOAuthService` | Build Microsoft auth URL |
| `https://login.microsoftonline.com/…/oauth2/v2.0/token` | `CalendarOAuthService`, `CalendarTokenService` | Exchange/refresh Microsoft token |
| `https://graph.microsoft.com/v1.0/me` | `CalendarOAuthService` | Fetch Microsoft account email |
| `https://www.googleapis.com/calendar/v3/calendars/primary/events` | `CalendarEventService` | Create/update/delete Google calendar events |
| `https://graph.microsoft.com/v1.0/me/events` | `CalendarEventService` | Create/update/delete Microsoft calendar events |

### Configuration Properties (`application.yml`)

| Key | Default | Concern |
|-----|---------|---------|
| `app.security.jwt.secret` | `change-this-local-dev-secret-change-this-local-dev-secret` | Weak well-known default |
| `app.security.internal-service-secret` | `fawnix-internal-secret` | Hardcoded default; filter accepts it as valid |
| `calendar.oauth-success-redirect` | `http://localhost:5173/…` | Hardcoded in `CalendarOAuthProperties` class as Java field default too |

---

## Findings

### P0 — Critical

---

#### INT-01 — OAuth state token is consumed before token exchange; retry is impossible and TOCTOU exists
**File:** `CalendarOAuthService.java:86-88`
**Severity:** P0 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
CalendarOAuthState stored = stateRepository.findById(state)
    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid state"));
stateRepository.delete(stored);   // ← deleted here

// ...then external HTTP call (lines 105-112)
Map<String, Object> tokenResponse = httpClient.postForm(tokenUrl, params);
```

**Why it is wrong:**
The state record is deleted _before_ the token exchange HTTP call. If the provider returns an error or the network times out, the state is permanently gone. The user cannot retry by hitting Back — their `state` is already consumed. More critically, `handleCallback` has no `@Transactional` annotation, so if the subsequent `connectionRepository.save(connection)` (line 131) fails (e.g., DB constraint violation), the delete is already committed: the system has burned the CSRF token but stored no connection. The correct pattern is delete-after-success inside a transaction.

**Fix:**
```java
@Transactional
public String handleCallback(CalendarProvider provider, String code, String state) {
    CalendarOAuthState stored = stateRepository.findById(state)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid state"));
    // validate stored.getProvider() == provider (see INT-02)
    // ... do the HTTP exchange ...
    connectionRepository.save(connection);
    stateRepository.delete(stored);  // delete last, inside the same transaction
    return ...;
}
```
Note: the HTTP call inside a transaction is acceptable here because it is a deliberate "mark-as-used" pattern as long as the state delete is the last DB write, not the first.

---

#### INT-02 — OAuth callback does not validate that URL provider matches state-stored provider (CSRF/token-injection)
**File:** `CalendarOAuthService.java:79-133` / `CalendarOAuthController.java:48-61`
**Severity:** P0 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// CalendarOAuthController line 58 — provider comes from path variable
CalendarProvider calendarProvider = CalendarProvider.fromValue(provider);
String redirect = oauthService.handleCallback(calendarProvider, code, state);

// CalendarOAuthService.handleCallback — stored.getProvider() is NEVER compared to calendarProvider
CalendarOAuthState stored = stateRepository.findById(state).orElseThrow(...);
// ... uses `provider` (URL) not `stored.getProvider()` (DB) to call token URL and save
```

**Why it is wrong:**
An attacker who intercepts a Google OAuth code from another flow can craft a callback URL like `/api/calendar/oauth/microsoft/callback?code=<google_code>&state=<valid_state>`, causing the service to call Microsoft's token endpoint with a Google authorization code, receive an error/unexpected token, and then (if it happens to succeed) store a Microsoft token for the wrong user-provider pair. At minimum, a MITM on the state token can swap the stored provider. The state table explicitly records the intended provider — it is never checked.

**Fix:**
```java
if (!calendarProvider.equals(stored.getProvider())) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider mismatch in OAuth callback");
}
```
Add this immediately after the `stored` is retrieved, before any token exchange.

---

#### INT-03 — `InternalServiceAuthFilter` uses a well-known default secret with no guard against empty string
**File:** `InternalServiceAuthFilter.java:20-23` / `application.yml:41`
**Severity:** P0 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// Filter constructor
@Value("${app.security.internal-service-secret:}")   // ← empty string if property missing
String internalServiceSecret
// ...
if (!Objects.equals(internalServiceSecret, provided)) {  // Objects.equals("", "") → true!
```

```yaml
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Why it is wrong:**
Two problems: (1) The `@Value` fallback in the filter is `""` (empty string), whereas the yml fallback is `fawnix-internal-secret`. If someone removes the yml key entirely (e.g., wrong profile), the filter's `internalServiceSecret` becomes `""`, and any request with header `X-Internal-Service-Secret:` (empty value) will be accepted — bypassing auth on all `/internal/**` endpoints entirely. (2) The well-known default `fawnix-internal-secret` is in the git-tracked yml, meaning any developer who clones the repo can call production `/internal/**` endpoints if the env var is not overridden.

**Fix:**
1. Remove the `:` fallback in the `@Value` so a missing env var causes a startup failure: `@Value("${app.security.internal-service-secret}")`.
2. Add an explicit blank-check at startup: throw `IllegalStateException` if the secret is blank.
3. Never commit a usable default for security secrets in yml.

---

#### INT-04 — `InternalPostingController.publish()` is a stub — it never calls any real job portal API
**File:** `InternalPostingController.java:54-65`
**Severity:** P0 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
String externalUrl = postingId != null
    ? "https://" + platform.name().toLowerCase() + ".example.com/postings/" + postingId
    : null;
results.add(new PublishPostingResponse.PublishPostingResult(
    platform.name().toLowerCase(),
    "published",    // always "published"
    externalUrl,
    null            // never any error
));
```

**Why it is wrong:**
The endpoint always returns HTTP 200 with status `"published"` and a fake `*.example.com` URL, regardless of whether credentials are valid, expired, or whether the posting was actually sent to LinkedIn/Naukri/Indeed. Callers (e.g., `recruitment-service`) will believe postings are live when they are not. This is dead placeholder code that is production-deployed and silently misleads the business.

**Fix:**
Either: (a) implement actual API calls to each platform's publish API using the stored `accessToken` from `PortalCredential`, or (b) mark the endpoint as HTTP 501 Not Implemented and add a `TODO` comment until real integration is built. Never return `"published"` for operations that were not performed.

---

### P1 — High

---

#### INT-05 — `CalendarConnectionRepository.deleteByProviderAndUserId` is a derived-delete query with no `@Transactional`
**File:** `CalendarConnectionController.java:53` / `CalendarConnectionRepository.java:15`
**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// CalendarConnectionRepository.java:15
void deleteByProviderAndUserId(CalendarProvider provider, String userId);

// CalendarConnectionController.java:53 — called from a @RestController with no @Transactional
repository.deleteByProviderAndUserId(calendarProvider, userId);
```

**Why it is wrong:**
Spring Data JPA derived-delete queries (`deleteBy…`) require an active transaction — they first do a `SELECT` to load the entity, then call `entityManager.remove()`. Without `@Transactional`, the first call (`findBy`) will open a transaction but the `remove()` will fail at the JDBC level with "No EntityManager with actual transaction available." In practice this throws `javax.persistence.TransactionRequiredException` at runtime, meaning disconnect operations silently fail or throw a 500.

**Fix:**
Add `@Transactional` to the repository method or use a `@Query("DELETE FROM CalendarConnection c WHERE …")` with `@Modifying @Transactional`. A service layer wrapping this operation (see INT-09) is the cleaner long-term fix.

---

#### INT-06 — `CalendarTokenService.getValidAccessToken` has a race condition on concurrent refresh
**File:** `CalendarTokenService.java:39-45`
**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
public String getValidAccessToken(CalendarProvider provider, String userId) {
    CalendarConnection connection = requireConnection(provider, userId);
    if (connection.getExpiresAt() != null && connection.getExpiresAt().isBefore(OffsetDateTime.now().plusMinutes(2))) {
        refreshToken(provider, connection);  // not transactional, no locking
    }
    return connection.getAccessToken();
}
```

**Why it is wrong:**
If two calendar-event requests arrive simultaneously for the same user/provider when the token is about to expire (within 2 minutes), both threads read `connection.getExpiresAt()` as "needs refresh" at the same time. Both call `refreshToken()`. Each fires an HTTP request to the provider's token endpoint. Google and Microsoft issue a new access token per call, and for Microsoft, the old refresh token is invalidated after first use — so the second concurrent refresh call will fail with "invalid_grant", leaving the system with a stale or null refresh token and locking the user out.

**Fix:**
Use pessimistic locking on the entity:
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<CalendarConnection> findByProviderAndUserId(CalendarProvider provider, String userId);
```
Or use an `@Version` column for optimistic locking and handle `OptimisticLockException` by re-fetching the now-refreshed token.

---

#### INT-07 — JWT key derivation double-encodes the secret (interoperability breakage with identity-service)
**File:** `JwtService.java:68-72`
**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
}
```

**Why it is wrong:**
The code takes the raw secret string, encodes it to Base64 with `Base64.getEncoder().encodeToString(...)`, and then immediately decodes it back with `Decoders.BASE64.decode(...)`. The net result is that it derives the HMAC key from the **raw bytes** of the original string — but only if the identity-service uses the same roundabout path. If the identity-service's `JwtService` does the same thing (it does — identical copy, see Redundancy section), then signing and verification are consistent but entirely redundant. The danger is: any future fix to one service's key derivation without fixing the others will make all existing tokens unverifiable system-wide.

The idiomatic and intended usage with jjwt for a plain-text configured secret is:
```java
private Key getSigningKey() {
    byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getSecret());
    return Keys.hmacShaKeyFor(keyBytes);
}
```
This requires the secret in yml to be **already Base64-encoded**, which is the correct deployment practice.

**Fix:**
Standardize the secret as a Base64-encoded value in the env var across all services, and use `Decoders.BASE64.decode(jwtProperties.getSecret())` directly. Remove the double-encode roundtrip. Coordinate the fix across all 10+ copies (see INT-13).

---

#### INT-08 — `PortalCredentialController.upsert()` will throw NPE if `platform` field is null in request body
**File:** `PortalCredentialController.java:41`
**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
platform = PortalCredential.Platform.valueOf(request.getPlatform().toUpperCase());
```

**Why it is wrong:**
`PortalCredentialRequest.platform` has no `@NotNull` and the controller has no `@Valid` on `@RequestBody`. If a caller omits the `platform` field (or sends `null`), `request.getPlatform()` returns `null` and `.toUpperCase()` throws `NullPointerException`. Spring will wrap this in a 500, leaking a stack trace to the caller. There is no `GlobalExceptionHandler` to catch it (see INT-10).

**Fix:**
```java
// In PortalCredentialRequest:
@NotBlank
private String platform;

// In PortalCredentialController:
public ResponseEntity<?> upsert(@Valid @RequestBody PortalCredentialRequest request) {
```

---

#### INT-09 — Controllers inject repositories directly, bypassing the service layer
**Files:**
- `CalendarConnectionController.java:23-26` (repository only, no service)
- `PortalCredentialController.java:23-26` (repository only, no service)
- `InternalPostingController.java:24-27` (repository only, no service)

**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// CalendarConnectionController.java:23-26
private final CalendarConnectionRepository repository;
public CalendarConnectionController(CalendarConnectionRepository repository) {
    this.repository = repository;
}
```

**Why it is wrong:**
Three of five controllers bypass the service layer and call JPA repositories directly. This means: (1) transaction management must be handled in the controller (it isn't — see INT-05), (2) business logic is scattered across controller methods making it untestable without a full Spring context, (3) future cross-cutting concerns (audit logging, caching, metrics) cannot be added in one place, and (4) the `CalendarConnectionController` maps domain entities to DTOs inline rather than delegating to a mapper.

**Fix:**
Extract `CalendarConnectionService`, `PortalCredentialService`, and `InternalPostingService` classes. Move repository interactions and DTO mapping into service classes. Controllers should only deal with HTTP concerns.

---

#### INT-10 — Missing `GlobalExceptionHandler`: `IllegalArgumentException` from `CalendarProvider.fromValue` returns HTTP 500
**File:** `CalendarProvider.java:19,27` — caught nowhere
**Severity:** P1 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// CalendarProvider.java:27
throw new IllegalArgumentException("Unsupported provider");
```

**Why it is wrong:**
`CalendarProvider.fromValue(provider)` is called in `CalendarConnectionController`, `CalendarEventController`, `CalendarOAuthController`, and `CalendarOAuthService`. When an invalid provider string is supplied (e.g., `"zoom"`), `IllegalArgumentException` is thrown and propagates up to Spring's default error handler, which returns HTTP 500. The caller should receive HTTP 400. There is no `@ControllerAdvice` / `GlobalExceptionHandler` in this service, unlike `procurement-service`, `crm-service`, `identity-service`, `task-service`, `sales-service`, and `inventory-service` which all have one.

**Fix:**
Add a `@ControllerAdvice` class:
```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
}
```
Or convert `CalendarProvider.fromValue` to throw `ResponseStatusException(HttpStatus.BAD_REQUEST, …)` directly.

---

### P2 — Medium

---

#### INT-11 — `CalendarHttpClient` has no connect or request timeout configured
**File:** `CalendarHttpClient.java:26-29`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
public CalendarHttpClient(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder().build();  // no timeout
}
```

**Why it is wrong:**
`java.net.http.HttpClient.newBuilder().build()` has no connect timeout and no per-request timeout by default. If Google or Microsoft APIs are slow or unresponsive, the calling thread will block indefinitely. Since `CalendarEventService` is called from `/internal/calendar/events` (which itself is called from `recruitment-service` or `project-service` during meeting creation), a hung Google API call will tie up Tomcat request threads, eventually causing thread pool exhaustion and cascading timeouts across the caller.

**Fix:**
```java
this.httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
// Also set per-request timeout on each HttpRequest.Builder:
.timeout(Duration.ofSeconds(15))
```

---

#### INT-12 — Open redirect: `returnUrl` in `CalendarAuthorizeRequest` is user-controlled and used as a 302 target without validation
**File:** `CalendarOAuthService.java:50-52` / `CalendarOAuthController.java:43-45`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// CalendarOAuthService.java:50-52
String resolvedReturn = (returnUrl != null && !returnUrl.isBlank())
    ? returnUrl        // ← raw user-supplied value stored in DB
    : properties.getOauthSuccessRedirect();

// CalendarOAuthController.java:60 — later used as a 302 Location header
return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirect)).build();
```

**Why it is wrong:**
An authenticated user can pass any `returnUrl` (e.g., `https://evil.com/capture?token=`) in the `POST /api/calendar/oauth/{provider}/authorize` body. This value is persisted to `calendar_oauth_states.return_url` and used as the 302 Location header in the callback. After completing the OAuth flow, the user's browser is redirected to the attacker-controlled URL. Because this is a post-authentication redirect, it can be used for phishing (user sees a legitimate OAuth flow ending at a malicious page), or to exfiltrate the state token if the attacker can observe referrer headers.

**Fix:**
Validate `returnUrl` against an allowlist of known origins:
```java
private static final Set<String> ALLOWED_ORIGINS = Set.of(
    "http://localhost:5173",
    "https://app.fawnix.com"
);
private String validateReturnUrl(String url) {
    if (url == null) return null;
    URI uri = URI.create(url);
    String origin = uri.getScheme() + "://" + uri.getHost();
    if (!ALLOWED_ORIGINS.contains(origin)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid return URL");
    }
    return url;
}
```

---

#### INT-13 — `CalendarOAuthState` has no TTL or expiry: stale states accumulate in the DB indefinitely
**File:** `CalendarOAuthState.java` / `V1__create_integration_schema.sql:18-24`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```sql
CREATE TABLE calendar_oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  ...
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- no expiry column, no deletion index
);
```

**Why it is wrong:**
Every `buildAuthorizationUrl` call inserts a row into `calendar_oauth_states`. If the user abandons the OAuth flow (closes the browser, navigates away), the state row is never deleted (the delete only happens on successful callback). Over time this table grows unboundedly. There is no scheduled cleanup (`@Scheduled`), no DB TTL policy, and no expiry check before consuming a state (a 10-minute-old state is treated identically to a 1-year-old state). A stale state could be replayed years later if an attacker obtains it.

**Fix:**
1. Add an `expires_at TIMESTAMPTZ NOT NULL` column in a `V2__add_oauth_state_expiry.sql` migration.
2. Check expiry in `handleCallback`: `if (stored.getExpiresAt().isBefore(OffsetDateTime.now())) throw ...`.
3. Add a `@Scheduled(cron = "0 0 * * * *")` job to delete expired rows.

---

#### INT-14 — `CalendarConnection` entity missing `@Transactional` on `CalendarOAuthService.handleCallback` — partial-write possible
**File:** `CalendarOAuthService.java:115-132`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
// No @Transactional annotation on handleCallback()
connection.setUserId(stored.getUserId());
connection.setProvider(provider);
connection.setAccessToken(accessToken);
// ...
connectionRepository.save(connection);   // line 131
```

**Why it is wrong:**
`handleCallback` performs multiple DB writes (`stateRepository.delete` + `connectionRepository.save`) without a transaction boundary. If the `connectionRepository.save` fails (e.g., unique constraint violation — unlikely but possible in race conditions between two tabs), the state has already been deleted but the connection was not persisted. The user is left with a burned CSRF token and no stored calendar connection. They must restart the entire OAuth flow.

**Fix:**
Annotate `handleCallback` with `@Transactional` (and move `stateRepository.delete` to after the save, per INT-01).

---

#### INT-15 — `@EnableFeignClients` declared but no `@FeignClient` interfaces exist in the service
**File:** `IntegrationServiceApplication.java:9,12`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
import org.springframework.cloud.openfeign.EnableFeignClients;
@EnableFeignClients  // triggers classpath scan for @FeignClient; none exist
```

**Why it is wrong:**
`@EnableFeignClients` on the application class causes Spring to perform a full classpath scan for `@FeignClient`-annotated interfaces at startup. No such interfaces exist in this service — all outbound HTTP is handled by `CalendarHttpClient` using `java.net.http.HttpClient`. This is dead annotation overhead. It also indicates the code was copied from another service without cleanup, adding unnecessary startup time and misleading future developers.

**Fix:**
Remove `@EnableFeignClients` from `IntegrationServiceApplication.java` and remove `spring-cloud-starter-openfeign` from `pom.xml` if Feign is not planned. If future inter-service Feign calls are intended, document the intent.

---

#### INT-16 — Hardcoded well-known JWT dev secret is the default in `application.yml`
**File:** `application.yml:40`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
```

**Why it is wrong:**
The fallback `change-this-local-dev-secret-change-this-local-dev-secret` is committed in source control. If `JWT_SECRET` is not set in production (misconfigured deployment), the service starts normally with a known, trivially-guessable secret. Any developer or attacker who reads the repository can forge valid JWTs for any user ID, bypassing all authentication. This is a **secret in source control** that enables auth bypass in misconfigured deployments.

**Fix:**
Remove the default value so the service fails to start if `JWT_SECRET` is not set:
```yaml
secret: ${JWT_SECRET}
```
Use Spring Boot's fail-fast: `@ConfigurationProperties` without a default + no fallback in yml.

---

#### INT-17 — `CalendarEventController` internal endpoints have no `@Valid` / input validation on request body
**File:** `CalendarEventController.java:32-33` / `CalendarEventRequest.java`
**Severity:** P2 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
@PostMapping
public CalendarEventResponse create(@RequestBody CalendarEventRequest request) {
    // No @Valid; summary, startTime, endTime can be null
    return eventService.createEvent(request);
}
```

**Why it is wrong:**
`CalendarEventRequest` has no `@NotNull`/`@NotBlank` annotations and `create()` has no `@Valid`. `CalendarEventService.createEvent` checks `organizerUserId` manually but never validates `summary`, `startTime`, or `endTime`. A call with null `startTime` will construct a Google Calendar API request with `"dateTime": null` and receive a cryptic 400 from Google's API, which `CalendarHttpClient.executeJson` will then re-throw as a `ResponseStatusException` with Google's raw error body — leaking internal API details to the caller.

**Fix:**
Add `@NotBlank` to `provider`, `organizerUserId`, `summary`, `startTime`, `endTime` in `CalendarEventRequest`, and use `@Valid @RequestBody` in the controller.

---

#### INT-18 — `PortalCredential` is global (per-platform, not per-tenant/org) — single row per platform for all organizations
**File:** `V1__create_integration_schema.sql:27-38` / `PortalCredential.java:31`
**Severity:** P2 | **Confidence:** Med
**Owner:** Ravi-Shankar-ACS

```sql
platform VARCHAR(50) NOT NULL UNIQUE,  -- one row per platform across ALL tenants
```

```java
@Column(nullable = false, unique = true)
private Platform platform;
```

**Why it is wrong:**
`portal_credentials` has a `UNIQUE` constraint on `platform` alone, meaning only one LinkedIn credential can ever be stored — regardless of how many organizations use the system. If this is a multi-tenant SaaS product (which the broader monorepo appears to be), each organization needs its own credentials. Storing a single global LinkedIn credential means all job postings from all organizations would post to the same LinkedIn company account.

**Fix:**
Add an `org_id` column (or `tenant_id`), change the unique constraint to `UNIQUE(platform, org_id)`, and propagate `orgId` from the caller context. This requires a new Flyway migration and changes to `PortalCredentialController` / `InternalPostingController`.

---

### P3 — Low / Informational

---

#### INT-19 — `CalendarConnection` entity is missing `@UpdateTimestamp` triggering on actual field changes; `updated_at` may not reflect token refresh
**File:** `CalendarConnection.java:54-57`
**Severity:** P3 | **Confidence:** Med
**Owner:** Ravi-Shankar-ACS

`@UpdateTimestamp` is present on `CalendarConnection.updatedAt` (line 55-56). However, when `CalendarTokenService.refreshToken` saves the connection after updating only `accessToken`/`expiresAt`, Hibernate's `@UpdateTimestamp` will correctly trigger. This is actually safe — flagged here to note that `updated_at` in this entity doubles as "last token refresh time," which may confuse future developers looking at the field expecting "last user edit."

Consider adding a dedicated `last_token_refresh_at` column for observability.

---

#### INT-20 — `CalendarOAuthProperties` has a hardcoded Java field default for `oauthSuccessRedirect`
**File:** `CalendarOAuthProperties.java:8`
**Severity:** P3 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
private String oauthSuccessRedirect = "http://localhost:5173/settings/calendar-integrations";
```

**Why it is wrong:**
A hardcoded `localhost` URL as a Java field default means that if `INTEGRATION_OAUTH_SUCCESS_REDIRECT` is not set in production, the OAuth callback will redirect users to `localhost:5173` — silently, without any error or startup warning. This is a misconfiguration-silent failure.

**Fix:**
Remove the Java default and require the value via environment variable:
```java
private String oauthSuccessRedirect;  // no default
```
Add a `@PostConstruct` validation or use `@ConfigurationProperties` with `@Validated` + `@NotBlank`.

---

#### INT-21 — `pom.xml` declares `com.hirepath` groupId but parent is `com.fawnix` — namespace inconsistency
**File:** `pom.xml:10`
**Severity:** P3 | **Confidence:** High
**Owner:** Vaishnavi Nerella

```xml
<parent>
  <groupId>com.fawnix</groupId>
  <artifactId>verse-backend</artifactId>
</parent>
<groupId>com.hirepath</groupId>   <!-- ← hirepath, not fawnix -->
<artifactId>integration-service</artifactId>
```

**Why it is wrong:**
All Java source packages are under `com.hirepath.integration`, while the parent POM uses `com.fawnix`. This indicates the service was migrated from a previous product (`HirePath`) to `fawnix-verse` but the groupId was not updated. This creates ambiguity in artifact resolution, builds artifacts under the wrong groupId in the local Maven repo, and signals incomplete migration.

**Fix:**
Change `<groupId>com.hirepath</groupId>` to `<groupId>com.fawnix</groupId>` and rename all Java packages from `com.hirepath.integration` to `com.fawnix.integration` (coordinate with any inter-service imports).

---

#### INT-22 — Dockerfile builds Maven with SSL verification disabled and TLS revocation disabled
**File:** `Dockerfile:5`
**Severity:** P3 | **Confidence:** High
**Owner:** Vaishnavi Nerella

```dockerfile
RUN mvn -q -DskipTests \
    -Dmaven.wagon.http.ssl.insecure=true \
    -Dmaven.wagon.http.ssl.allowall=true \
    ...
    -Dcom.sun.net.ssl.checkRevocation=false
```

**Why it is wrong:**
SSL verification is disabled during Maven build, meaning the build could silently download tampered dependencies from a MITM or compromised mirror without any warning. This is a supply-chain risk. It also indicates a network or certificate problem in the build environment that was "fixed" with a flag rather than properly diagnosed and resolved.

**Fix:**
Fix the underlying certificate trust issue (add the corporate CA cert to the JDK truststore) and remove all `ssl.insecure=true`, `ssl.allowall=true`, and `checkRevocation=false` flags.

---

#### INT-23 — `CalendarConnection` entity has no `@Version` column; token refresh can silently clobber concurrent edits
**File:** `CalendarConnection.java`
**Severity:** P3 | **Confidence:** Med
**Owner:** Ravi-Shankar-ACS

No `@Version` field on `CalendarConnection`. Combined with the race condition in INT-06, two concurrent token refreshes will do a last-write-wins save with no conflict detection. This also affects the OAuth callback save (INT-14).

**Fix:**
```java
@Version
@Column(name = "version")
private Long version;
```
Add `version BIGINT NOT NULL DEFAULT 0` to the SQL migration.

---

#### INT-24 — `JwtAuthenticationFilter` silently swallows all JWT parse exceptions
**File:** `JwtAuthenticationFilter.java:55-56`
**Severity:** P3 | **Confidence:** High
**Owner:** Ravi-Shankar-ACS

```java
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
```

**Why it is wrong:**
All exceptions from JWT parsing — including `SignatureException` (tampered token), `MalformedJwtException`, and `ExpiredJwtException` — are silently caught and discarded. The request continues as unauthenticated. While this is generally correct behavior for a filter, it means security events (attempted signature forgery) produce zero log output, making them completely invisible in observability/SIEM tooling.

**Fix:**
```java
} catch (Exception e) {
    log.warn("JWT validation failed for request {}: {}", request.getRequestURI(), e.getMessage());
    SecurityContextHolder.clearContext();
}
```

---

## Redundancy

The following code is duplicated verbatim (or near-verbatim) across multiple services. Each instance is a maintenance liability: a bug fix or algorithm change must be applied to every copy.

### RD-01 — `JwtService.java` — identical copy in 10+ services

`integration-service/src/main/java/com/hirepath/integration/security/jwt/JwtService.java` is line-for-line identical (modulo package name) to:
- `approval-service/.../security/jwt/JwtService.java`
- `recruitment-service/.../security/jwt/JwtService.java`
- `task-service/.../security/jwt/JwtService.java`
- `org-service/.../security/jwt/JwtService.java`
- `analytics-service/.../security/jwt/JwtService.java`
- `sales-service/.../security/jwt/JwtService.java`
- `procurement-service/.../security/jwt/JwtService.java`
- `project-service/.../security/jwt/JwtService.java`
- `identity-service/.../security/jwt/JwtService.java`

The double-encode key-derivation bug (INT-07) is therefore present in all 10 copies.

**Action:** Extract a `common-security` Spring Boot autoconfiguration module and publish it as `com.fawnix:common-security`. All services depend on it. Fix the bug once.

---

### RD-02 — `SecurityConfig.java` — identical filter chain in 10+ services

`integration-service/.../security/config/SecurityConfig.java` (lines 37-53) is structurally identical to `approval-service/.../security/config/SecurityConfig.java` (lines 37-51). The only difference between services is which paths are `permitAll()`. This is not a trivial config diff — it is copy-pasted boilerplate including all four constructor fields.

Same files affected as RD-01 + `notifications-service`, `forms-service`, `inventory-service`, `hrms-service`.

---

### RD-03 — `AppUserDetails.java` — identical in 10+ services

`integration-service/.../security/service/AppUserDetails.java` is duplicated in at least 10 services (confirmed: `approval-service`, `recruitment-service`, `forms-service`, `project-service`, `sales-service`, `inventory-service`, `procurement-service`, `org-service`, `crm-service`, `identity-service`).

---

### RD-04 — `InternalServiceAuthFilter.java` — identical in 8 services

`integration-service/.../security/filter/InternalServiceAuthFilter.java` is duplicated in:
- `analytics-service`, `org-service`, `inventory-service`, `approval-service`, `recruitment-service`, `notifications-service`, `forms-service`

The empty-string bypass vulnerability (INT-03) is therefore present in all 8 copies.

---

### RD-05 — `valueAsString` / `valueAsInteger` helpers duplicated within this service

Within the integration-service itself:

- `CalendarOAuthService.java:163-178` — `valueAsString`, `valueAsInteger`
- `CalendarTokenService.java:99-115` — identical `valueAsString`, `valueAsInteger`
- `CalendarEventService.java:297-299` — `valueAsString`

And `defaultScopes(CalendarProvider, CalendarOAuthProperties.Provider)`:
- `CalendarOAuthService.java:153-161`
- `CalendarTokenService.java:89-97` — identical

**Action:** Extract these into a package-private `CalendarApiUtils` utility class within the `service` package.

---

### RD-06 — `getProviderConfig` helper duplicated within this service

- `CalendarOAuthService.java:149-151`
- `CalendarTokenService.java:85-87`

Same one-liner:
```java
return provider == CalendarProvider.GOOGLE ? properties.getGoogle() : properties.getMicrosoft();
```

**Action:** Move to `CalendarOAuthProperties.getProvider(CalendarProvider)` as an instance method.

---

## Tests & Gaps

- **No `src/test` directory exists.** Zero unit tests and zero integration tests for any class in this service.
- **Highest-risk untested paths:**
  - `CalendarOAuthService.handleCallback` — the OAuth CSRF state logic (INT-01, INT-02, INT-14) has no test coverage.
  - `CalendarTokenService.getValidAccessToken` — token refresh race condition (INT-06) has no test.
  - `CalendarEventService` create/update/delete paths — no mock of `CalendarHttpClient`.
  - `InternalPostingController.publish` — the stub nature (INT-04) would be immediately obvious in a test.
  - `JwtService` key derivation — the double-encode behavior (INT-07) has no test.

**Recommended minimum test coverage:**
1. `CalendarOAuthServiceTest` — mock `CalendarHttpClient` and `stateRepository`; verify state is not deleted on token-exchange failure.
2. `CalendarTokenServiceTest` — verify refresh is called when `expiresAt` is within 2 minutes.
3. `InternalPostingControllerTest` — assert that `publish` actually invokes an API call (will immediately expose INT-04).
4. `SecurityConfigTest` — verify `/internal/**` returns 403 without correct header.

---

## Coverage Note

**Fully inspected:** All 38 `.java` source files, `application.yml`, `V1__create_integration_schema.sql`, `pom.xml`, `Dockerfile`. Every controller endpoint, every entity field, every service method, the security filter chain, and JWT key derivation were read line-by-line.

**Compared against:** `approval-service` (SecurityConfig, JwtService, InternalServiceAuthFilter, AppUserDetails for redundancy), plus filename-presence check across all 15 backend services for duplication.

**Skimmed / not fully verified:**
- The actual runtime behavior of `CalendarHttpClient.executeJson` when the provider returns a non-JSON body (e.g., plain-text error) — this path could cause a `JsonParseException` that propagates as 500 rather than the provider's original status.
- Whether `spring.jpa.open-in-view: false` (correctly set) eliminates lazy-load issues — no LAZY/EAGER fetch analysis was performed since there are no `@OneToMany`/`@ManyToOne` relations.
- Any frontend code that calls these endpoints was not reviewed.

**Overall confidence:** High on all P0/P1 findings. Medium on P2-INT-18 (multi-tenancy may be intentionally single-tenant). Low on P3-INT-19 (informational only).

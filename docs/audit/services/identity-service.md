# identity-service — Service Audit

**Audit date:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated static review)  
**Root:** `backend/services/identity-service`  
**Namespace:** `com.fawnix.identity` — correct; no `com.hirepath` leakage  

---

## Summary

`identity-service` is the authentication and authorization backbone of the Fawnix platform. It owns user lifecycle, JWT issuance and validation, refresh-token rotation, RBAC (roles + direct permissions), an access-request workflow, and OTP/SSO integration with an external "Fawnix" HR portal. The service is structurally sound and better organized than sibling services, but it carries **four security issues that are exploitable in production**: an unprotected admin registration endpoint, a committed default database password, a committed default JWT secret, and a leaked internal-service secret that is identical across the entire monorepo. It also has two correctness bugs (dirty-token collection not flushed, double DB query on OTP upsert), and one silent performance defect (all users loaded in-memory instead of using an already-written repository method). There are zero tests.

---

## Surface Map

### Controllers / Endpoints

| Class | Method | Path | Auth |
|---|---|---|---|
| `AuthController` | POST | `/api/auth/login` | Public |
| `AuthController` | POST | `/api/auth/register` | **Public** (any user self-register) |
| `AuthController` | POST | `/api/auth/register-admin` | **Public — no protection** |
| `AuthController` | POST | `/api/auth/register-master` | `page.admin.users` |
| `AuthController` | POST | `/api/auth/refresh` | Public |
| `AuthController` | POST | `/api/auth/logout` | Public (token-based) |
| `AuthController` | GET | `/api/auth/me` | Authenticated |
| `FawnixOtpAuthController` | POST | `/api/auth/request-otp` | Public |
| `FawnixOtpAuthController` | POST | `/api/auth/verify-otp` | Public |
| `FawnixOtpAuthController` | POST | `/api/auth/fawnix/exchange` | Public |
| `FawnixOtpAuthController` | POST | `/api/auth/sso/fawnix` | Public |
| `InternalAdminAuthController` | POST | `/internal/auth/register-admin` | `X-Internal-Service-Secret` header |
| `InternalAdminAuthController` | POST | `/internal/auth/register-master` | `X-Internal-Service-Secret` header |
| `UserController` | GET | `/api/users/assignees` | Authenticated |
| `UserController` | GET | `/api/users/directory` | Authenticated |
| `UserController` | GET | `/api/users` | `page.admin.users` |
| `UserController` | GET | `/api/users/roles` | `page.admin.users` |
| `UserController` | GET | `/api/users/access-control/catalog` | `page.admin.users` |
| `UserController` | GET | `/api/users/{id}` | `page.admin.users` |
| `UserController` | POST | `/api/users` | `page.admin.users` |
| `UserController` | PATCH | `/api/users/{id}` | `page.admin.users` |
| `UserController` | PATCH | `/api/users/{id}/role` | `page.admin.users` |
| `UserController` | PATCH | `/api/users/{id}/access` | `page.admin.users` |
| `UserController` | PATCH | `/api/users/{id}/status` | `page.admin.users` |
| `UserController` | DELETE | `/api/users/{id}` | `page.admin.users` |
| `InternalUserController` | GET | `/internal/users/{id}` | `X-Internal-Service-Secret` |
| `InternalUserController` | GET | `/internal/users/lookup` | `X-Internal-Service-Secret` |
| `InternalUserController` | GET | `/internal/users/lookup-by-email` | `X-Internal-Service-Secret` |
| `InternalUserController` | GET | `/internal/users/assignees` | `X-Internal-Service-Secret` |
| `InternalUserController` | GET | `/internal/users/summary` | `X-Internal-Service-Secret` |
| `AccessRequestController` | GET | `/api/access-requests/me` | Authenticated (implicit) |
| `AccessRequestController` | POST | `/api/access-requests` | Authenticated (implicit) |
| `AccessRequestController` | GET | `/api/access-requests/{id}` | Authenticated (implicit) |
| `AccessRequestController` | PATCH | `/api/access-requests/{id}` | Authenticated (implicit) |
| `AccessRequestController` | DELETE | `/api/access-requests/{id}` | Authenticated (implicit) |
| `AccessRequestController` | GET | `/api/access-requests` | `page.access.requests` |
| `AccessRequestController` | PATCH | `/api/access-requests/{id}/review` | `page.access.requests` |
| `RoleController` | GET | `/api/roles` | `page.admin.users` |
| `RoleController` | POST | `/api/roles` | `page.admin.users` |
| `RoleController` | PATCH | `/api/roles/{id}` | `page.admin.users` |
| `RoleController` | POST | `/api/roles/{id}/clone` | `page.admin.users` |
| `RoleController` | PATCH | `/api/roles/{id}/status` | `page.admin.users` |
| `RoleController` | DELETE | `/api/roles/{id}` | `page.admin.users` |
| `PermissionController` | GET | `/api/permissions` | `page.admin.users` |
| `PermissionController` | POST | `/api/permissions` | `page.admin.users` |
| `PermissionController` | PATCH | `/api/permissions/{key}` | `page.admin.users` |
| `PermissionController` | DELETE | `/api/permissions/{key}` | `page.admin.users` |

### JPA Entities / Tables

| Entity | Table |
|---|---|
| `UserEntity` | `users` |
| `RoleEntity` | `roles` |
| `PermissionEntity` | `permissions` |
| `RefreshTokenEntity` | `auth_refresh_tokens` |
| `AccessRequestEntity` | `access_requests` |
| `(ElementCollection)` | `user_roles` |
| `(ElementCollection)` | `user_permissions` |
| `(ElementCollection)` | `role_permissions` |
| `(ElementCollection)` | `access_request_permissions` |

### Flyway Migrations

| Version | File | Purpose |
|---|---|---|
| V1 | `V1__create_identity_schema.sql` | Core schema: `roles`, `users`, `user_roles`, `auth_refresh_tokens` |
| V2 | `V2__add_user_phone_number.sql` | Adds `phone_number` to `users` |
| V3 | `V3__add_user_language.sql` | Adds `language` to `users` |
| V4 | `V4__create_user_permissions.sql` | Adds `user_permissions` table |
| V5 | `V5__seed_roles.sql` | Seeds base roles |
| V6 | `V6__seed_hirepath_roles.sql` | Seeds HRMS roles (hirepath origin) |
| V7 | `V7__seed_reporting_manager_role.sql` | Seeds ROLE_REPORTING_MANAGER |
| V8 | `V8__seed_master_role.sql` | Seeds ROLE_MASTER |
| V9 | `V9__create_access_requests.sql` | Adds `access_requests` + `access_request_permissions` |
| V10 | `V10__backfill_master_permissions.sql` | Backfill master permissions (legacy `user_permissions` rows) |
| V11 | `V11__add_feature_level_permissions.sql` | Adds feature-level permissions for master users |
| V12 | `V12__dynamic_access_control.sql` | Adds `permissions` + `role_permissions` tables, bulk seeds |
| V13 | `V13__add_project_permissions.sql` | Adds `module.projects` + `page.projects` |
| V14 | `V14__add_inventory_warehouse_permission.sql` | Adds `page.inventory.warehouses` |

### Outbound HTTP

| Class | Destination | Calls |
|---|---|---|
| `FawnixOtpClient` | `${FAWNIX_OTP_BASE_URL}/auth/request-otp` | POST |
| `FawnixOtpClient` | `${FAWNIX_OTP_BASE_URL}/auth/verify-otp` | POST |
| `FawnixOtpClient` | `${FAWNIX_OTP_BASE_URL}/auth/me` | GET |

---

## Findings

### P0 — Critical / Exploit Now

---

#### IDE-01 — Unauthenticated admin registration endpoint
- **File:** `src/main/java/com/fawnix/identity/auth/controller/AuthController.java:36-39` and `src/main/java/com/fawnix/identity/security/config/SecurityConfig.java:63`
- **Severity / Confidence:** P0 / High
- **Offending code:**
  ```java
  // AuthController.java:36-39
  @PostMapping("/register-admin")
  public AuthDtos.TokenResponse registerAdmin(@Valid @RequestBody AuthDtos.RegisterRequest request) {
      return authService.registerAdmin(request);
  }

  // SecurityConfig.java:61-63
  .requestMatchers(
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/register-admin",   // ← publicly permitAll
  ```
- **Why it is wrong:** Any anonymous caller on the internet can POST to `/api/auth/register-admin` and create an account with `ROLE_ADMIN`. This grants full access to user administration, role and permission management, and review of access requests. There is no rate-limit, no invite token, and no check that the requestor is already an admin. The `/internal/auth/register-admin` variant is correctly secret-gated but the public variant is not.
- **Proper fix:** Either remove the public endpoint entirely (rely only on `/internal/auth/register-admin`) or guard it with an authorization check that requires an existing admin session:
  ```java
  @PostMapping("/register-admin")
  @PreAuthorize("@authz.hasAuthority(authentication, 'page.admin.users')")
  public AuthDtos.TokenResponse registerAdmin(...)
  ```
  Also remove it from `SecurityConfig.permitAll()`.
- **Owner:** Chaitanya2872

---

#### IDE-02 — Committed default credentials expose the database and shared secrets
- **File:** `src/main/resources/application.yml:7,57,59,60`
- **Severity / Confidence:** P0 / High
- **Offending code:**
  ```yaml
  password: ${IDENTITY_DB_PASSWORD:praveen123}
  secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
  dev-admin-password: ${DEV_ADMIN_PASSWORD:Admin@123}
  internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
  ```
- **Why it is wrong:** All four fallback values are committed to source control. The DB password (`praveen123`) and admin password (`Admin@123`) are production-quality credentials, not placeholder strings. The JWT secret fallback is a weak, predictable value that allows any attacker who has read the source to forge arbitrary JWTs offline. The `fawnix-internal-secret` default is identical across every service in the monorepo (verified: approval-service, analytics-service, crm-service, org-service, forms-service, notifications-service, task-service, procurement-service, recruitment-service all share the same default), meaning a single compromised service secret allows impersonating all internal callers.
- **Proper fix:** Replace all fallback values with placeholders that make the service refuse to start without explicit configuration:
  ```yaml
  password: ${IDENTITY_DB_PASSWORD}          # no default – fail fast
  secret: ${JWT_SECRET}
  dev-admin-password: ${DEV_ADMIN_PASSWORD}
  internal-service-secret: ${INTERNAL_SERVICE_SECRET}
  ```
  Rotate all four secrets immediately. For local dev, use `.env.local` (gitignored). Consider a unique `INTERNAL_SERVICE_SECRET` per service and per environment.
- **Owner:** Chaitanya2872

---

### P1 — High / Fix Before Next Release

---

#### IDE-03 — `FawnixOtpAuthService.upsertUser` queries the database twice for the same user
- **File:** `src/main/java/com/fawnix/identity/auth/service/FawnixOtpAuthService.java:87-89`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  UserEntity existingUser = userRepository.findByEmailIgnoreCase(email).orElse(null);

  UserEntity user = existingUser != null ? existingUser : userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
  ```
- **Why it is wrong:** When `existingUser` is `null` (new OTP user), the code re-executes the identical `findByEmailIgnoreCase` query. This is a copy-paste artifact that fires an unnecessary SQL round-trip on every new SSO login. When `existingUser` is non-null, the second call inside `orElseGet` is never reached but the lambda captures a reference to the repo anyway. The logic is also confusing and error-prone.
- **Proper fix:**
  ```java
  UserEntity user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
      Instant now = Instant.now();
      UserEntity created = new UserEntity(...);
      // ... set role, permissions ...
      return userRepository.save(created);
  });
  ```
- **Owner:** Chaitanya2872

---

#### IDE-04 — External HTTP calls inside `@Transactional` hold a DB connection while waiting on network I/O
- **File:** `src/main/java/com/fawnix/identity/auth/service/FawnixOtpAuthService.java:50-64` and `:66-79`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  @Transactional
  public AuthDtos.TokenResponse verifyOtp(String empCode, String otp) {
      FawnixOtpDtos.VerifyOtpResponse verifyResponse = otpClient.verifyOtp(empCode, otp);  // HTTP call
      FawnixOtpDtos.FawnixMeResponse meResponse = otpClient.fetchProfile(verifyResponse.accessToken()); // HTTP call
      UserEntity user = upsertUser(meResponse.data());   // DB work starts here
      return authService.issueTokensForUser(user);
  }
  ```
- **Why it is wrong:** A JDBC connection is acquired at the start of the `@Transactional` method and held open across two outbound HTTP calls (each with a 10-second timeout configured in `FawnixOtpClient`). Under load (or if the external OTP service is slow), the connection pool exhausts quickly, causing cascading failures for all DB-backed requests. The HTTP calls do not need a transaction — only `upsertUser` and `issueTokensForUser` do.
- **Proper fix:** Split the method: call the OTP service outside the transaction boundary, then open a transaction only for the DB writes.
  ```java
  // No @Transactional here
  public AuthDtos.TokenResponse verifyOtp(String empCode, String otp) {
      VerifyOtpResponse verifyResponse = otpClient.verifyOtp(empCode, otp);
      if (Boolean.FALSE.equals(verifyResponse.success()) || ...) throw ...;
      FawnixMeResponse meResponse = otpClient.fetchProfile(verifyResponse.accessToken());
      if (...) throw ...;
      return persistAndIssueTokens(meResponse.data()); // @Transactional here
  }

  @Transactional
  private AuthDtos.TokenResponse persistAndIssueTokens(FawnixUser profile) {
      UserEntity user = upsertUser(profile);
      return authService.issueTokensForUser(user);
  }
  ```
  Note: since `persistAndIssueTokens` would be a private self-call from the same bean, use a separate `@Service` or inject the bean reference to avoid Spring AOP bypass. Same fix applies to `exchangeFawnixAccessToken` (lines 66-79).
- **Owner:** Chaitanya2872

---

#### IDE-05 — `revokeActiveTokens` mutates entities but never calls `save()` — relies silently on dirty-check
- **File:** `src/main/java/com/fawnix/identity/auth/service/AuthService.java:162-164`
- **Severity / Confidence:** P1 / Med
- **Offending code:**
  ```java
  private void revokeActiveTokens(UserEntity user) {
      refreshTokenRepository.findAllByUserAndRevokedFalse(user).forEach(token -> token.setRevoked(true));
  }
  ```
- **Why it is wrong:** The method sets `revoked = true` on each `RefreshTokenEntity` but never calls `save()` or `saveAll()`. The updates are only persisted if Hibernate's dirty-checking runs within an open transaction. This works today because all callers (`login`, `issueTokensForUser`) are `@Transactional`, but it is a brittle implicit contract. If someone calls `revokeActiveTokens` from a non-transactional context (e.g., a future async job), old refresh tokens silently stay active. The sibling `revokeRefreshTokens` in `UserService` (lines 355-362) explicitly calls `saveAll()`, making this inconsistency harder to spot. The divergence is caused by copy-paste divergence.
- **Proper fix:**
  ```java
  private void revokeActiveTokens(UserEntity user) {
      List<RefreshTokenEntity> active = refreshTokenRepository.findAllByUserAndRevokedFalse(user);
      active.forEach(token -> token.setRevoked(true));
      refreshTokenRepository.saveAll(active);  // explicit flush
  }
  ```
- **Owner:** Chaitanya2872

---

#### IDE-06 — JWT token issuer is set on generation but NOT validated on parse — any HMAC-signed JWT accepted
- **File:** `src/main/java/com/fawnix/identity/security/jwt/JwtService.java:68-74`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  private Claims extractClaims(String token) {
      return Jwts.parser()
          .verifyWith((javax.crypto.SecretKey) getSigningKey())
          .build()
          .parseSignedClaims(token)
          .getPayload();
  }
  ```
- **Why it is wrong:** The parser verifies the signature but does not call `.requireIssuer(...)`. A JWT signed with the same secret but issued by another service (or a test tool) will be accepted as valid. The `issuer` field is written at line 30 (`generateAccessToken`) but never enforced at parse time. If the HMAC secret ever leaks (or is left at its weak default — see IDE-02), an attacker can craft tokens with arbitrary subjects.
- **Proper fix:**
  ```java
  return Jwts.parser()
      .verifyWith((javax.crypto.SecretKey) getSigningKey())
      .requireIssuer(jwtProperties.getIssuer())
      .build()
      .parseSignedClaims(token)
      .getPayload();
  ```
- **Owner:** Chaitanya2872

---

#### IDE-07 — `JwtService.toBase64Secret` double-encodes the secret, weakening effective key entropy
- **File:** `src/main/java/com/fawnix/identity/security/jwt/JwtService.java:76-82`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```java
  private Key getSigningKey() {
      return Keys.hmacShaKeyFor(Decoders.BASE64.decode(toBase64Secret(jwtProperties.getSecret())));
  }

  private String toBase64Secret(String secret) {
      return java.util.Base64.getEncoder().encodeToString(secret.getBytes());
  }
  ```
- **Why it is wrong:** The raw secret string (e.g., `change-this-local-dev-secret-change-this-local-dev-secret`) is first Base64-encoded, then Base64-decoded by `Decoders.BASE64.decode()`. This round-trip is a no-op in terms of bytes and adds no security — it just re-encodes a UTF-8 string unnecessarily. More critically, `secret.getBytes()` uses the JVM default charset, which is not guaranteed to be UTF-8 in all environments; this can cause silent divergence between deployments. If the secret configured in the environment happens to be raw Base64 bytes (the intended pattern), the double-encode corrupts the key. The JJWT convention is that the config value is already a Base64-encoded random byte sequence; double-encoding it shrinks the effective keyspace because Base64 output is a constrained alphabet.
- **Proper fix:** Configure the secret as a standard Base64-encoded random string and decode it directly without the extra round-trip:
  ```java
  private Key getSigningKey() {
      return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
  }
  ```
  Remove `toBase64Secret`. Regenerate the JWT secret as a proper 256-bit Base64 string.
- **Owner:** Chaitanya2872

---

#### IDE-08 — Logout does not verify the refresh token belongs to the authenticated caller
- **File:** `src/main/java/com/fawnix/identity/auth/service/AuthService.java:135-140`
- **Severity / Confidence:** P1 / Med
- **Offending code:**
  ```java
  @Transactional
  public void logout(AuthDtos.LogoutRequest request) {
      refreshTokenRepository.findByToken(request.refreshToken()).ifPresent(token -> {
          token.setRevoked(true);
          refreshTokenRepository.save(token);
      });
  }
  ```
- **Why it is wrong:** Any authenticated user can revoke any other user's refresh token by supplying it in the request body. The `logout` endpoint at `POST /api/auth/logout` does not cross-check that `token.getUser().getId()` equals the caller's user ID. An attacker who obtains another user's refresh token value (e.g., via logs, traffic sniffing, or another vulnerability) can force-logout that user at will. The endpoint itself requires no auth header (though the filter may be present for other callers).
- **Proper fix:** Pass the authenticated `AppUserDetails` to the service and verify ownership:
  ```java
  public void logout(AuthDtos.LogoutRequest request, String callerId) {
      refreshTokenRepository.findByToken(request.refreshToken()).ifPresent(token -> {
          if (!token.getUser().getId().equals(callerId)) return; // silently ignore
          token.setRevoked(true);
          refreshTokenRepository.save(token);
      });
  }
  ```
- **Owner:** Chaitanya2872

---

#### IDE-09 — Hardcoded server IP addresses in `application.yml` CORS list leak infrastructure topology
- **File:** `src/main/resources/application.yml:46-51`
- **Severity / Confidence:** P1 / High
- **Offending code:**
  ```yaml
  - http://54.76.187.129
  - http://54.76.187.129:5173
  - https://54.76.187.129
  - http://108.131.209.156
  - http://108.131.209.156:5173
  - https://108.131.209.156
  ```
- **Why it is wrong:** Raw EC2/cloud IP addresses are committed to source. This leaks infrastructure topology to anyone with repository access or who reads decompiled JARs. Additionally, `http://` (not `https://`) entries are present for both IPs, meaning a browser will send the JWT access token in plain text over unencrypted HTTP to these endpoints — defeating the purpose of the `Authorization` header.
- **Proper fix:** Replace IPs with DNS names and enforce HTTPS. Move all allowed origins to environment variables:
  ```yaml
  cors:
    allowed-origins:
      - ${FRONTEND_ORIGIN}
      - ${FRONTEND_ORIGIN_ALT:}
  ```
- **Owner:** Chaitanya2872

---

### P2 — Medium / Fix in Next Sprint

---

#### IDE-10 — `UserService.getAssignees` loads ALL active users then filters in Java; a purpose-built repository method exists but is unused
- **File:** `src/main/java/com/fawnix/identity/users/service/UserService.java:64-69`  
  vs. `src/main/java/com/fawnix/identity/users/repository/UserRepository.java:27`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```java
  // UserService.java:64-69
  public List<AssigneeResponse> getAssignees() {
      return userRepository.findAllByActiveTrueOrderByFullNameAsc().stream()
          .filter(this::isAssignable)   // Java-side filter: only ROLE_SALES_REP
          .map(userMapper::toAssignee)
          .toList();
  }

  // UserRepository.java:27 — exists but is never called
  List<UserEntity> findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(List<String> roleNames);
  ```
- **Why it is wrong:** For a system with 500 users where 50 are `ROLE_SALES_REP`, the current code hydrates 500 `UserEntity` objects (with their EAGER roles + permissions graphs via `EntityGraph`) just to discard 450. The repository method that would push the `IN (...)` predicate to the database is already written but is dead code.
- **Proper fix:**
  ```java
  public List<AssigneeResponse> getAssignees() {
      return userRepository
          .findDistinctByActiveTrueAndRoles_NameInOrderByFullNameAsc(new ArrayList<>(ASSIGNEE_ROLE_NAMES))
          .stream().map(userMapper::toAssignee).toList();
  }
  ```
- **Owner:** Chaitanya2872

---

#### IDE-11 — `getUserSummary` loads every user with full roles graph to produce a count-by-role map — use a projection instead
- **File:** `src/main/java/com/fawnix/identity/users/service/UserService.java:197-204`
- **Severity / Confidence:** P2 / Med
- **Offending code:**
  ```java
  public UserSummaryResponse getUserSummary() {
      List<UserEntity> users = userRepository.findAllByOrderByFullNameAsc();   // full hydration
      Map<String, Integer> byRole = new LinkedHashMap<>();
      for (UserEntity user : users) {
          user.getRoles().forEach(role -> byRole.merge(role.getName(), 1, Integer::sum));
      }
      return new UserSummaryResponse(users.size(), byRole);
  }
  ```
- **Why it is wrong:** This is an internal summary endpoint that returns total user count and counts per role. It hydrates every `UserEntity` with full `roles` + `roles.permissions` + `permissions` graphs to extract only a role name string per user. This generates expensive eager joins that are not needed.
- **Proper fix:** Use a JPQL count-group query:
  ```java
  @Query("SELECT r.name, COUNT(u) FROM UserEntity u JOIN u.roles r GROUP BY r.name")
  List<Object[]> countByRoleName();
  ```
- **Owner:** Chaitanya2872

---

#### IDE-12 — `RoleService.generateUniqueKey` has a check-then-act race condition
- **File:** `src/main/java/com/fawnix/identity/auth/service/RoleService.java:171-179`
- **Severity / Confidence:** P2 / Med
- **Offending code:**
  ```java
  private String generateUniqueKey(String displayName) {
      String base = displayName.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_")...;
      String candidate = base.isBlank() ? "role" : base;
      String unique = candidate;
      int suffix = 2;
      while (roleRepository.findByName(unique).isPresent()) {
          unique = candidate + "_" + suffix++;
      }
      return unique;
  }
  ```
- **Why it is wrong:** Two concurrent role creations with the same display name will both read `findByName` as empty, both select the same `unique` key, and attempt to insert. The second transaction will fail with a unique-constraint violation from the `roles.name` column, producing an unhandled `DataIntegrityViolationException` that bypasses `GlobalExceptionHandler` and leaks a 500 to the client.
- **Proper fix:** Catch `DataIntegrityViolationException` around `roleRepository.save()` and convert it to a user-friendly `BadRequestException("A role with this name already exists.")`. Alternatively, generate a UUID-based internal key and only use the display name as a human label (not as the DB key).
- **Owner:** Chaitanya2872

---

#### IDE-13 — Upstream HTTP error body from external OTP service is reflected raw to clients (potential info disclosure / injection)
- **File:** `src/main/java/com/fawnix/identity/auth/service/FawnixOtpClient.java:97-107`
- **Severity / Confidence:** P2 / High
- **Offending code:**
  ```java
  private String resolveUpstreamMessage(HttpStatusCodeException exception, String fallbackMessage) {
      String responseBody = exception.getResponseBodyAsString();
      ...
      String sanitized = responseBody.trim();
      ...
      return sanitized.length() > 240 ? sanitized.substring(0, 240) : sanitized;
  }
  ```
- **Why it is wrong:** The raw response body from an external third-party service (the Fawnix OTP API) is surfaced directly in the 400 error response returned to the browser. This body could contain: stack traces, internal server hostnames, SQL error messages, or HTML markup that could be rendered downstream. Truncating at 240 characters does not sanitize the content. The variable is named `sanitized` but is not actually sanitized.
- **Proper fix:** Either use only the fallback message, or parse a known field (e.g., `message`) from the expected JSON response structure using Jackson rather than reflecting raw text:
  ```java
  return fallbackMessage;  // safest option — do not reflect third-party errors
  ```
- **Owner:** Chaitanya2872

---

#### IDE-14 — `AccessRequestController` endpoints `GET /me`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}` have no `@PreAuthorize` annotation — authorization relies solely on Spring Security's global `anyRequest().authenticated()` rule
- **File:** `src/main/java/com/fawnix/identity/access/controller/AccessRequestController.java:29-73`
- **Severity / Confidence:** P2 / Med
- **Offending code:**
  ```java
  @GetMapping("/me")
  public AccessRequestDtos.AccessRequestPageResponse listMyRequests(...) { ... }

  @PostMapping
  public AccessRequestDtos.AccessRequestResponse submitRequest(...) { ... }

  @GetMapping("/{id}")
  public AccessRequestDtos.AccessRequestResponse getRequest(...) { ... }
  ```
- **Why it is wrong:** The authorization check for these endpoints is pushed entirely into service-layer code (owner check, `isMaster` flag). This is not wrong per se, but the business rules are invisible at the controller boundary and rely on correct principal extraction. The `GET /{id}` endpoint (lines 48-55) performs its own authority check in the controller body (`userDetails.getAuthorities().stream().anyMatch(...)`) rather than via `@PreAuthorize`, which is an inconsistent pattern that is easy to miss in a code review. At minimum, `@PreAuthorize("isAuthenticated()")` should be explicit on each endpoint for clarity and defence-in-depth.
- **Proper fix:** Add `@PreAuthorize("isAuthenticated()")` to each of the four undecorated handler methods. Move the `isMaster` check into a `@PreAuthorize` SpEL expression or a dedicated authorization service method.
- **Owner:** Chaitanya2872 / Ravi-Shankar-ACS

---

#### IDE-15 — `IllegalArgumentException` thrown from `UserService` bypasses intended error semantics
- **File:** `src/main/java/com/fawnix/identity/users/service/UserService.java:183,191`
- **Severity / Confidence:** P2 / Med
- **Offending code:**
  ```java
  .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));  // line 183
  ...
  .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));  // line 191
  ...
  throw new IllegalArgumentException("Assignee not found");  // validateAssignable line 319
  ```
- **Why it is wrong:** `GlobalExceptionHandler` maps `IllegalArgumentException` to HTTP 400 Bad Request. But "Assignee not found" is a 404 Not Found situation. Internal callers (e.g., from the org-service) will receive a 400 when the actual problem is that the ID does not exist. The correct type is `ResourceNotFoundException`. Additionally, the same string `"Assignee not found"` is used for a fundamentally different error in `validateAssignable` (the user exists but has the wrong role), conflating two distinct error conditions.
- **Proper fix:**
  ```java
  .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));  // entity missing

  // validateAssignable — user found but ineligible:
  throw new BadRequestException("User is not eligible as an assignee.");
  ```
- **Owner:** Chaitanya2872

---

#### IDE-16 — `PermissionRepository` `@Modifying` queries have no `clearAutomatically` — first-level cache may return stale data
- **File:** `src/main/java/com/fawnix/identity/auth/repository/PermissionRepository.java:22-48`
- **Severity / Confidence:** P2 / Med
- **Offending code:**
  ```java
  @Modifying
  @Query(value = "update user_permissions set permission = :newKey ...", nativeQuery = true)
  int renameUserPermissionAssignments(...);
  ```
- **Why it is wrong:** All five `@Modifying` native queries bypass Hibernate's session cache. Without `@Modifying(clearAutomatically = true)`, entities loaded in the same transaction before these bulk updates are still referenced from the first-level cache with stale field values. In `PermissionService.updatePermission`, this could cause the subsequent `findById(nextKey)` call at line 84 to return a stale entity or `Optional.empty()` depending on cache state.
- **Proper fix:**
  ```java
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(...)
  int renamePermission(...);
  ```
  Apply to all five `@Modifying` methods.
- **Owner:** Chaitanya2872

---

### P3 — Low / Technical Debt

---

#### IDE-17 — `normalizeEmail`, `normalizePhone`, `normalizeLanguage` are copy-pasted verbatim across three service classes
- **File:** `AuthService.java:193-214`, `UserService.java:271-292`, `FawnixOtpAuthService.java:144-157`
- **Severity / Confidence:** P3 / High
- **Offending code (representative — identical logic in all three):**
  ```java
  private String normalizeEmail(String email) {
      if (email == null) { return ""; }
      return email.trim().toLowerCase(Locale.ROOT);
  }
  private String normalizePhone(String phoneNumber) {
      if (phoneNumber == null) { return null; }
      String trimmed = phoneNumber.trim();
      return trimmed.isEmpty() ? null : trimmed;
  }
  ```
- **Why it is wrong:** Three separate copies of the same logic. If the normalization rule changes (e.g., enforce E.164 for phone numbers), all three must be updated. One copy already diverges: `FawnixOtpAuthService` lacks `normalizeLanguage` entirely.
- **Proper fix:** Extract into a `UserNormalizer` utility class in the `common` package and use it from all three services.
- **Owner:** Chaitanya2872

---

#### IDE-18 — `verifySecret` private helper is duplicated in two internal controllers
- **File:** `InternalUserController.java:76-79` and `InternalAdminAuthController.java:48-51`
- **Severity / Confidence:** P3 / High
- **Offending code:**
  ```java
  // Identical method in both controllers:
  private void verifySecret(String providedSecret) {
      if (!Objects.equals(internalServiceSecret, providedSecret)) {
          throw new ForbiddenOperationException("Internal access denied.");
      }
  }
  ```
- **Why it is wrong:** Duplicate logic. A Spring `Filter` or `HandlerInterceptor` (matching `/internal/**`) would centralize this check and eliminate the repeated injection of `@Value("${app.security.internal-service-secret}")` into each controller.
- **Proper fix:** Create an `InternalSecretFilter extends OncePerRequestFilter` that validates the header for all `/internal/**` requests, similar to the pattern already used in `approval-service` and `analytics-service` (which have a proper `InternalServiceAuthFilter`). Register it in `SecurityConfig`.
- **Owner:** Chaitanya2872

---

#### IDE-19 — `FawnixOtpAuthController` exposes two endpoints that do exactly the same thing
- **File:** `src/main/java/com/fawnix/identity/auth/controller/FawnixOtpAuthController.java:38-49`
- **Severity / Confidence:** P3 / High
- **Offending code:**
  ```java
  @PostMapping("/fawnix/exchange")
  public AuthDtos.AccessTokenResponse exchangeFawnixAccessToken(@RequestHeader(...) String authorization) {
      return exchangeSsoToken(authorization);
  }

  @PostMapping("/sso/fawnix")
  public AuthDtos.AccessTokenResponse exchangeSsoToken(@RequestHeader(...) String authorization) {
      return otpAuthService.exchangeFawnixAccessToken(extractBearerToken(authorization));
  }
  ```
- **Why it is wrong:** `/api/auth/fawnix/exchange` is an alias that simply delegates to `/api/auth/sso/fawnix`. This creates two permittedAll public endpoints for the same sensitive SSO exchange operation with no documentation explaining why both exist. This is route sprawl and doubles the attack surface.
- **Proper fix:** Remove the alias; keep one canonical path. Add a deprecation header if clients must migrate.
- **Owner:** Chaitanya2872

---

#### IDE-20 — V6 migration file is named `seed_hirepath_roles` (legacy `com.hirepath` namespace artifact)
- **File:** `src/main/resources/db/migration/V6__seed_hirepath_roles.sql`
- **Severity / Confidence:** P3 / Low
- **Offending code:**
  The file name implies these roles (`ROLE_HR_MANAGER`, `ROLE_RECRUITER`, `ROLE_HIRING_MANAGER`, `ROLE_INTERVIEWER`, `ROLE_EMPLOYEE`) came from a "HirePath" HRMS integration. The Java namespace is clean (`com.fawnix`), but the migration name and role purpose suggest bulk-migration from an older product.
- **Why it is wrong:** Not a bug, but the filename leaks product history and is inconsistent with the broader naming conventions (all other migrations use `fawnix`-centric names). Juniors may be confused about whether these roles are "owned" by the identity service or imported from elsewhere.
- **Proper fix:** File renames in Flyway migrations are not advisable (they change the checksum). Add a comment block at the top of the file explaining the provenance of these roles.
- **Owner:** Chaitanya2872 [migrated]

---

#### IDE-21 — `UserEntity` and `AccessRequestEntity` manage their own `createdAt`/`updatedAt` fields manually — no `@PrePersist`/`@PreUpdate` lifecycle callback
- **File:** `src/main/java/com/fawnix/identity/users/entity/UserEntity.java:44-48` and `src/main/java/com/fawnix/identity/access/entity/AccessRequestEntity.java:47-51`
- **Severity / Confidence:** P3 / Med
- **Offending code:**
  ```java
  // UserService.java:95,128 — caller must remember to set this:
  Instant now = Instant.now();
  ...
  user.setUpdatedAt(Instant.now());
  ```
- **Why it is wrong:** Audit timestamp management is scattered across service methods. Any new path that modifies a user without calling `setUpdatedAt()` silently leaves stale timestamps. The correct Spring Data/JPA pattern is to use `@EntityListeners(AuditingEntityListener.class)` with `@CreatedDate` / `@LastModifiedDate`, or at minimum `@PrePersist` / `@PreUpdate` JPA lifecycle methods.
- **Proper fix:**
  ```java
  @PrePersist
  void onCreate() { createdAt = updatedAt = Instant.now(); }

  @PreUpdate
  void onUpdate() { updatedAt = Instant.now(); }
  ```
- **Owner:** Chaitanya2872

---

#### IDE-22 — `UserEntity.roles` and `UserEntity.permissions` use `FetchType.EAGER` — will cause Cartesian product joins at scale
- **File:** `src/main/java/com/fawnix/identity/users/entity/UserEntity.java:50-64`
- **Severity / Confidence:** P3 / Med
- **Offending code:**
  ```java
  @ManyToMany(fetch = FetchType.EAGER)
  ...
  private Set<RoleEntity> roles = new LinkedHashSet<>();

  @ElementCollection(fetch = FetchType.EAGER)
  ...
  private Set<String> permissions = new LinkedHashSet<>();
  ```
- **Why it is wrong:** Every `UserEntity` load, anywhere in the codebase, eagerly fetches roles and permissions. Combined with `roles.permissions` also being eagerly loaded (via `RoleEntity`), a single `findById` generates multiple joins. The `@EntityGraph` declarations in `UserRepository` already override this at query level for targeted cases, making the entity-level `EAGER` redundant. As permission sets grow, each login / JWT validation hits the DB for full permission trees.
- **Proper fix:** Change both to `FetchType.LAZY` and rely on the existing `@EntityGraph` annotations in the repository for the cases that do need eager loading. Validate that the security filter path (`loadByUserId`) still works correctly with lazy loading.
- **Owner:** Chaitanya2872

---

## Redundancy

### Within identity-service

| Clone A | Clone B | Description |
|---|---|---|
| `AuthService.java:193-214` (normalizeEmail, normalizePhone, normalizeLanguage) | `UserService.java:271-292` | Identical private utility methods — see IDE-17 |
| `AuthService.java:193-214` | `FawnixOtpAuthService.java:144-157` | Same normalization logic, partially — see IDE-17 |
| `InternalUserController.java:76-79` (verifySecret) | `InternalAdminAuthController.java:48-51` (verifySecret) | Identical method body — see IDE-18 |
| `AuthService.java:162-164` (revokeActiveTokens, no saveAll) | `UserService.java:355-362` (revokeRefreshTokens, has saveAll) | Same logical operation with divergent save semantics — see IDE-05 |

### vs. Other Services in the Monorepo

| identity-service | Other service | Description |
|---|---|---|
| `InternalUserController.java:76-79` (inline verifySecret) | `approval-service/.../InternalServiceAuthFilter.java:38-39` (proper Spring filter) | Identity uses in-controller manual check; approval-service/analytics-service/org-service all implement a proper `OncePerRequestFilter`. Identity should adopt the same pattern (IDE-18). |
| `application.yml:60` (`internal-service-secret: ${...}:fawnix-internal-secret`) | All 10+ other services with same default | Shared default value means every service is equally compromised if the secret is not set — see IDE-02. |

---

## Tests & Gaps

**Test coverage: zero.**

`src/test/` does not exist in this service. This is the authentication and authorization core of the entire platform. There are no unit tests for:
- `JwtService` — token generation, validation, expiry, issuer checking
- `AuthService` — login, register, refresh, logout, token issuance
- `FawnixOtpAuthService` — OTP verification, user upsert, SSO exchange
- `AccessRequestService` — permission conflict detection, review approval flow
- `RoleService` — key uniqueness, system-role protection
- `SecurityConfig` — filter chain, public endpoints

The `spring-security-test` dependency is present in `pom.xml`, confirming test infrastructure is available but unused.

**Minimum test plan for the next sprint:**
1. `JwtServiceTest` — generate, parse, expire, reject wrong-issuer, reject tampered signature.
2. `AuthServiceTest` — `register-admin` blocked unless authed (after IDE-01 fix); refresh rejects expired/revoked token; login revokes old tokens.
3. `FawnixOtpAuthServiceTest` — upsert creates new user exactly once; upsert updates existing user fields.
4. `AccessRequestServiceTest` — owner-only operations reject other users; reviewer can see any request; approve grants permissions to requester.
5. `SecurityConfigTest` (`@SpringBootTest`) — verify `/api/auth/register-admin` returns 401 without credentials (after IDE-01 fix); verify `/internal/**` is accessible without JWT but rejected with wrong secret.

---

## Coverage Note

**Fully inspected (read every line):**
- All controller classes (6 controllers, 40 endpoints)
- All service classes (AuthService, UserService, FawnixOtpAuthService, RoleService, PermissionService, AccessRequestService)
- All entity classes (5 entities)
- All repository interfaces
- All DTO classes
- All security classes (JwtService, JwtAuthenticationFilter, SecurityConfig, AppUserDetails, AuthorizationService)
- All configuration classes (DataSeeder, CorsProperties, JwtProperties)
- All Flyway migrations (V1–V14)
- `application.yml`
- `pom.xml` (deps and versions)

**Skimmed / not individually inspected:**
- `GlobalExceptionHandler` — read fully; no critical gaps found
- Common exception/response classes — read; standard pattern

**Overall confidence: High.**  
The service is modest in size (54 Java files). Every meaningful file was read in full. The git history was queried for primary authors. No generated code or multi-module sub-artifacts exist that might hide additional findings.

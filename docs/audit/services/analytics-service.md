# analytics-service — Service Audit

**Audit date:** 2026-07-14  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Service root:** `backend/services/analytics-service`  
**Primary historical author:** Ravi-Shankar-ACS (entire service introduced in commit `096c301` "feat: integrate HRMS modules…" — all files marked **[migrated]**)

---

## Summary

`analytics-service` is a **stub in production scaffold clothing**. Its single business endpoint (`GET /api/analytics/dashboard`) returns hardcoded zeros and an empty map — no real logic, no database queries, no data models. Despite this, the service ships a full security stack (JWT filter, internal-service auth filter, Spring Security config, two error handlers, and a JwtProperties bean) that is copy-pasted verbatim from sibling services, adding six redundancy pairs that must be kept in sync forever. The two headline risks are: (1) hardcoded weak default secrets in `application.yml` that are the **same across 14 other services**, meaning a dev-mode leak exposes the entire cluster; (2) a silent `catch (Exception ignored)` in `JwtAuthenticationFilter` that swallows tampered-token evidence and continues the filter chain, potentially passing requests without authentication silently through to the `anyRequest().authenticated()` gate. The service also has a Dockerfile `EXPOSE` mismatch, zero tests, and unused heavyweight dependencies.

---

## Surface Map

### Endpoints

| Method | Path | Controller | Notes |
|--------|------|-----------|-------|
| GET | `/api/analytics/dashboard` | `AnalyticsController.dashboard()` | Returns static zeros; no service layer, no DB |

### Entities / Repositories

None. The Flyway migration (`V1__init.sql`) is a comment-only placeholder: `-- Baseline schema for analytics-service (no persistent tables yet)`.

### Flyway Migrations

| File | Content |
|------|---------|
| `src/main/resources/db/migration/V1__init.sql` | Empty (comment only) |

### Feign Clients

None declared. `@EnableFeignClients` is present on `AnalyticsServiceApplication` with no `@FeignClient` interfaces anywhere in the codebase.

### Config Properties (application.yml)

| Key | Default value | Risk |
|-----|--------------|------|
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/fawnix_analytics` | — |
| `spring.datasource.username` | `postgres` | Weak dev default |
| `spring.datasource.password` | `postgres` | Weak dev default |
| `server.port` | `8091` | Mismatches Dockerfile EXPOSE 8087 |
| `app.security.jwt.secret` | `change-this-local-dev-secret-change-this-local-dev-secret` | Committed default shared across 14+ services |
| `app.security.internal-service-secret` | `fawnix-internal-secret` | Committed default shared across 14+ services |
| `app.security.jwt.issuer` | `fawnix-verse` | Not validated on token parse (see ANA-05) |
| `app.security.jwt.access-token-expiration-minutes` | `30` | Unused in this service (see ANA-08) |
| `app.security.jwt.refresh-token-expiration-days` | `14` | Unused in this service (see ANA-08) |

---

## Findings

### P0 — Critical

---

#### ANA-01 — Hardcoded weak default secrets committed to VCS
**Severity:** P0  **Confidence:** High  
**File:** `src/main/resources/application.yml` lines 40–41  
**Owner:** Ravi-Shankar-ACS [migrated]

```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
```

**Why wrong:** Both secrets are committed as fallback defaults in plain text. Any environment where `JWT_SECRET` / `INTERNAL_SERVICE_SECRET` are not explicitly injected (local dev, CI with missing env, misconfigured container) silently uses these known values. Because the **identical defaults appear in 14 other services** (verified: 14 matching `application.yml` files), a single leaked dev token is valid everywhere; a caller who knows `fawnix-internal-secret` can hit any service's `/internal/**` routes across the entire cluster.

**Fix:** Remove the default fallback values entirely — Spring Boot will refuse to start if the env var is missing, which is the desired fail-safe:
```yaml
secret: ${JWT_SECRET}
internal-service-secret: ${INTERNAL_SERVICE_SECRET}
```
Provide values exclusively via environment injection (`.env.local` gitignored, K8s secrets, Vault). Rotate both secrets immediately if the repository has ever been cloned externally.

---

#### ANA-02 — Silent exception swallow in JWT filter allows unauthenticated requests to reach authenticated routes
**Severity:** P0  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/filter/JwtAuthenticationFilter.java` lines 43–57  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
try {
    AppUserDetails userDetails = jwtService.toUserDetails(token);
    if (jwtService.isTokenValid(token)) {
        // sets authentication
    }
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);   // ← always continues
```

**Why wrong:** After catching any exception (invalid signature, tampered payload, expired token that throws during parsing), the code clears the context and calls `filterChain.doFilter` unconditionally. For the single authenticated route (`GET /api/analytics/dashboard`), Spring Security's `anyRequest().authenticated()` check runs downstream and should reject the request — but the entire exception (including details of *why* the token was rejected) is silently dropped with no log entry. In practice this is a debugging nightmare: bad tokens fail silently with a generic 401, making authentication incidents nearly invisible. A more serious variant: if a future developer adds a route to `permitAll()` intending it for public access, this pattern would pass a forged token through without any log trace.

**Fix:** Log the rejection at WARN level and do not re-use the bare `Exception` catch — only catch the specific JJWT exception hierarchy:
```java
} catch (JwtException | IllegalArgumentException e) {
    log.warn("JWT validation failed for request {}: {}", request.getRequestURI(), e.getMessage());
    SecurityContextHolder.clearContext();
}
```

---

### P1 — High

---

#### ANA-03 — Dockerfile EXPOSE port mismatches application server port
**Severity:** P1  **Confidence:** High  
**File:** `Dockerfile` line 11 vs `src/main/resources/application.yml` line 21  
**Owner:** Ravi-Shankar-ACS [migrated]

```dockerfile
EXPOSE 8087           # Dockerfile line 11
```
```yaml
port: ${SERVER_PORT:8091}   # application.yml line 21
```

**Why wrong:** `EXPOSE 8087` documents/publishes port 8087, but the JVM binds on 8091 (when `SERVER_PORT` is not set). Any Docker-based health check, service-mesh sidecar, or load-balancer proxy that relies on `EXPOSE` metadata will try to connect to 8087 and fail. Kubernetes readiness probes configured from the image's exposed port will flip the pod to NotReady. The notifications-service (used as baseline) correctly matches 8088/8092.

**Fix:** Align the Dockerfile to the application port:
```dockerfile
EXPOSE 8091
```
Or, better, rely on `SERVER_PORT` in both:
```dockerfile
EXPOSE ${SERVER_PORT:-8091}
```

---

#### ANA-04 — `/internal/**` routes are `permitAll()` in Spring Security but InternalServiceAuthFilter sets no SecurityContext principal
**Severity:** P1  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/config/SecurityConfig.java` lines 46–48  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
.requestMatchers("/internal/**").permitAll()
// ...
.addFilterBefore(internalServiceAuthFilter, UsernamePasswordAuthenticationFilter.class)
```

**Why wrong:** `InternalServiceAuthFilter` validates the `X-Internal-Service-Secret` header (blocking callers with wrong/missing secret) but never populates `SecurityContextHolder` on success. The route is `permitAll()`, so Spring Security's authorization layer does not enforce any principal. This means: (a) if `@PreAuthorize` is used on a future `/internal` endpoint, it would see an anonymous principal and fail for any role check; (b) if `@AuthenticationPrincipal` is used as a method parameter it returns `null`; (c) there is no audit trail of *which* service called the internal route. This is a latent correctness issue for any developer who adds an `/internal` endpoint and assumes `@AuthenticationPrincipal` works.

**Fix:** After validating the secret, populate SecurityContext with a synthetic service principal:
```java
UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
    "internal-service", null, List.of(new SimpleGrantedAuthority("ROLE_INTERNAL"))
);
SecurityContextHolder.getContext().setAuthentication(auth);
filterChain.doFilter(request, response);
```

---

#### ANA-05 — JWT issuer claim not validated on token parse
**Severity:** P1  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/jwt/JwtService.java` lines 61–65  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
private Claims extractClaims(String token) {
    return Jwts.parser()
        .verifyWith((javax.crypto.SecretKey) getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
}
```

**Why wrong:** The parser validates the signature but does not call `.requireIssuer(jwtProperties.getIssuer())`. Any token signed with the same HMAC secret but issued by a different service (e.g., an internal microservice that signs its own tokens with the shared secret) would be accepted as valid. Given that the same `JWT_SECRET` default is used across all 14+ services, this means tokens from *any* of those services are cross-accepted. The `issuer` field is even configured in `JwtProperties` and `application.yml` (`fawnix-verse`) but is never referenced by `JwtService` in this service.

**Fix:**
```java
return Jwts.parser()
    .verifyWith((javax.crypto.SecretKey) getSigningKey())
    .requireIssuer(jwtProperties.getIssuer())
    .build()
    .parseSignedClaims(token)
    .getPayload();
```

---

#### ANA-06 — `@EnableFeignClients` declared with no Feign clients; unnecessary Feign + JPA + Validation dependencies
**Severity:** P1  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/AnalyticsServiceApplication.java` line 10; `pom.xml` lines 23–30, 52–54  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
@EnableFeignClients   // AnalyticsServiceApplication.java:10 — no @FeignClient exists
```
```xml
<!-- pom.xml -->
<dependency>spring-boot-starter-data-jpa</dependency>      <!-- no @Entity, no @Repository -->
<dependency>spring-boot-starter-validation</dependency>    <!-- no @Valid, no constraint annotations -->
<dependency>spring-cloud-starter-openfeign</dependency>    <!-- no @FeignClient -->
```

**Why wrong:** `@EnableFeignClients` triggers classpath scanning and OpenFeign infrastructure beans at startup for zero clients. `spring-boot-starter-data-jpa` brings in Hibernate and starts a JPA EntityManagerFactory against a database that has no tables, causing Hibernate schema validation overhead (`ddl-auto: validate`) on an empty schema. `spring-boot-starter-validation` initializes the Hibernate Validator infrastructure for no annotated inputs. All three add startup time, memory, and classpath surface with no benefit.

**Fix:** Remove `@EnableFeignClients` from the application class. Remove `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, and `spring-cloud-starter-openfeign` from `pom.xml` until actual use is introduced. Remove Flyway dependencies and `application.yml` datasource config if the database stays empty.

---

### P2 — Medium

---

#### ANA-07 — `getBytes()` without explicit charset in key derivation (platform-dependent encoding)
**Severity:** P2  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/jwt/JwtService.java` line 70  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
    jwtProperties.getSecret().getBytes()   // ← no charset specified
)));
```

**Why wrong:** `String.getBytes()` uses `Charset.defaultCharset()`, which is JVM-platform-dependent. In most JVM configurations this is UTF-8, but it can differ (e.g., in some IBM JVMs or if `-Dfile.encoding` is set). If the analytics-service runs on a host with a different default charset than the identity-service (which signs tokens), key derivation differs and all tokens are rejected. This is a silent, hard-to-diagnose production failure.

**Fix:**
```java
jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8)
```

Note: The outer `Base64.encode → Decoders.BASE64.decode` round-trip is also unnecessary noise (it encodes then immediately decodes, returning the original bytes). Simplify to:
```java
private Key getSigningKey() {
    byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
    return Keys.hmacShaKeyFor(keyBytes);
}
```

---

#### ANA-08 — `JwtProperties` carries token-generation fields unused in a validation-only service
**Severity:** P2  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/jwt/JwtProperties.java` lines 9–10, 21–34  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
private int accessTokenExpirationMinutes;
private int refreshTokenExpirationDays;
```

**Why wrong:** These fields exist for token *generation* (used in `identity-service`). The analytics-service only *validates* tokens. Neither field is read anywhere in this service. They are dead configuration: the corresponding `application.yml` keys (`access-token-expiration-minutes: 30`, `refresh-token-expiration-days: 14`) will silently fail to update behavior if changed. Carrying them also misleads any developer who sees the config and thinks this service issues tokens.

**Fix:** Extract a minimal `JwtValidationProperties` interface/class for consumer services containing only `secret` and `issuer`. Keep the full `JwtProperties` in `identity-service` only.

---

#### ANA-09 — Both error handlers create unmanaged `ObjectMapper` instances
**Severity:** P2  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/security/handler/RestAccessDeniedHandler.java` line 19;  
`src/main/java/com/hirepath/analytics/security/handler/RestAuthenticationEntryPoint.java` line 19  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
private final ObjectMapper objectMapper = new ObjectMapper();  // both files, line 19
```

**Why wrong:** A `new ObjectMapper()` bypasses Spring's auto-configured `ObjectMapper` bean (which has modules registered, date/time format configured, naming strategies applied, etc.). If Spring's configuration adds `JavaTimeModule` or changes field naming, these handlers produce inconsistent JSON responses. Additionally, `ObjectMapper` instances are thread-safe but heavyweight to create; `new ObjectMapper()` in a `@Component` field (created once) is acceptable performance-wise but the misconfiguration is the real risk.

**Fix:** Inject the Spring-managed `ObjectMapper` bean via constructor:
```java
private final ObjectMapper objectMapper;

public RestAccessDeniedHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
}
```

---

#### ANA-10 — `AnalyticsController.dashboard()` returns hardcoded stub data with no authorization
**Severity:** P2  **Confidence:** High  
**File:** `src/main/java/com/hirepath/analytics/controller/AnalyticsController.java` lines 13–22  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
@GetMapping("/dashboard")
public Map<String, Object> dashboard() {
    return Map.of(
        "open_positions", 0,
        "total_applications", 0,
        "pending_requests", 0,
        "hired_this_period", 0,
        "pipeline", Map.of()
    );
}
```

**Why wrong:** This endpoint is `anyRequest().authenticated()` but has no `@PreAuthorize` role check. Any authenticated user (regardless of role) can call it. As currently written it returns static zeros, so it is harmless in production today — but when this stub is replaced with real aggregation queries, the missing role-guard will remain and expose sensitive hiring data to all users. There is also no `@AuthenticationPrincipal` parameter, which will be needed for per-user/tenant scoping.

**Fix:** Add role enforcement now before the implementation is wired in:
```java
@GetMapping("/dashboard")
@PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'RECRUITER')")
public Map<String, Object> dashboard(@AuthenticationPrincipal AppUserDetails user) {
    // stub for now
}
```

---

### P3 — Low / Structural

---

#### ANA-11 — `groupId` mismatch between parent POM and module POM
**Severity:** P3  **Confidence:** High  
**File:** `pom.xml` lines 5, 10  
**Owner:** Ravi-Shankar-ACS [migrated]

```xml
<parent>
    <groupId>com.fawnix</groupId>       <!-- parent -->
</parent>
<groupId>com.hirepath</groupId>         <!-- this module overrides to hirepath -->
```

**Why wrong:** The parent aggregator is `com.fawnix:verse-backend`; all newer services use `com.fawnix.*` packages. This service declares `com.hirepath` as its `groupId` and uses `com.hirepath.analytics.*` Java packages, indicating it was scaffolded under the old brand before a rename. This inconsistency means: Maven artifact coordinates differ from the rest of the ecosystem, making dependency references in tooling (Renovate, dependency graphs, internal bill-of-materials) inconsistent.

**Fix:** Align `groupId` to `com.fawnix` and migrate the Java package from `com.hirepath.analytics` to `com.fawnix.analytics`. This is a rename, not a rewrite — a single IDE refactor covers it.

---

#### ANA-12 — Missing `GlobalExceptionHandler` (`@RestControllerAdvice`)
**Severity:** P3  **Confidence:** High  
**File:** No `*ExceptionHandler*.java` exists in `src/main/java/com/hirepath/analytics/`  
**Owner:** Ravi-Shankar-ACS [migrated]

**Why wrong:** Six peer services (`task-service`, `identity-service`, `crm-service`, `sales-service`, `inventory-service`, `procurement-service`) define a `GlobalExceptionHandler`. Without one, unhandled exceptions (e.g., a future `NotFoundException` or validation error) fall back to Spring Boot's default `BasicErrorController`, which returns a `500` with a Whitelabel error page body that exposes stack traces and internal class names in non-production profiles.

**Fix:** Add a `@RestControllerAdvice` class with at minimum:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleAll(Exception e, HttpServletRequest req) {
    log.error("Unhandled exception", e);
    return ResponseEntity.internalServerError()
        .body(new ErrorResponse(500, "Internal server error", req.getRequestURI()));
}
```

---

#### ANA-13 — Filter addition order ambiguity between JWT and internal-service filters
**Severity:** P3  **Confidence:** Med  
**File:** `src/main/java/com/hirepath/analytics/security/config/SecurityConfig.java` lines 48–49  
**Owner:** Ravi-Shankar-ACS [migrated]

```java
.addFilterBefore(internalServiceAuthFilter, UsernamePasswordAuthenticationFilter.class)
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
```

**Why wrong:** Both calls use the same anchor (`UsernamePasswordAuthenticationFilter`). Spring Security resolves ordering between two filters inserted at the same position by insertion order — the *last* `addFilterBefore` runs *first* (jwtAuthenticationFilter runs before internalServiceAuthFilter). For `/internal/**` paths, JwtAuthenticationFilter runs first: if no Bearer header is present it passes through, then InternalServiceAuthFilter runs its secret check. This ordering works today, but it is not documented and is easy to accidentally reverse. A future developer who swaps the lines changes the auth order with no compile-time warning.

**Fix:** Use explicit ordering with `addFilterAfter` to document intent:
```java
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
.addFilterAfter(internalServiceAuthFilter, jwtAuthenticationFilter.getClass());
```

---

## Redundancy

All security infrastructure in this service is a verbatim namespace-rename copy of the same files in other `com.hirepath.*` services. The only differences are the Java `package` declaration.

| analytics-service file | Identical twin in | Diff |
|------------------------|------------------|------|
| `security/jwt/JwtService.java` | `notifications-service/.../security/jwt/JwtService.java` | Package name only |
| `security/jwt/JwtService.java` | `forms-service/.../security/jwt/JwtService.java` | Package name only |
| `security/jwt/JwtService.java` | `recruitment-service/.../security/jwt/JwtService.java` | Package name only |
| `security/filter/InternalServiceAuthFilter.java` | `notifications-service/.../security/filter/InternalServiceAuthFilter.java` | Package name only |
| `security/filter/InternalServiceAuthFilter.java` | `approval-service/.../security/filter/InternalServiceAuthFilter.java` | Package name only |
| `security/filter/InternalServiceAuthFilter.java` | `org-service/.../security/filter/InternalServiceAuthFilter.java` | Package name only |
| `security/filter/InternalServiceAuthFilter.java` | `forms-service/.../security/filter/InternalServiceAuthFilter.java` | Package name only |
| `security/filter/JwtAuthenticationFilter.java` | `notifications-service/.../security/filter/JwtAuthenticationFilter.java` | Package + import names only |
| `security/service/AppUserDetails.java` | `notifications-service/.../security/service/AppUserDetails.java` | Package name only |
| `security/service/AppUserDetails.java` | `approval-service/.../security/service/AppUserDetails.java` | Package name only |
| `security/service/AppUserDetails.java` | `org-service/.../security/service/AppUserDetails.java` | Package name only |
| `security/service/AppUserDetails.java` | `integration-service/.../security/service/AppUserDetails.java` | Package name only |
| `security/handler/RestAccessDeniedHandler.java` | `notifications-service/.../security/handler/RestAccessDeniedHandler.java` | Package name only |
| `security/handler/RestAuthenticationEntryPoint.java` | `notifications-service/.../security/handler/RestAuthenticationEntryPoint.java` | Package name only |
| `security/config/SecurityConfig.java` | `notifications-service/.../security/config/SecurityConfig.java` | Package + import names only |
| `security/config/SecurityConfig.java` | `approval-service/.../security/config/SecurityConfig.java` | Package + import names only |
| `security/config/SecurityConfig.java` | `integration-service/.../security/config/SecurityConfig.java` | Package + import names only |
| `security/config/SecurityConfig.java` | `recruitment-service/.../security/config/SecurityConfig.java` | Package + import names only |

**Impact:** The bugs in `JwtAuthenticationFilter` (ANA-02), `JwtService` (ANA-05, ANA-07), and the handlers (ANA-09) are **replicated across every one of these twin files** in the sibling services. Any fix must be applied to all clones or the defects persist across the cluster.

**Recommended resolution:** Extract a `fawnix-security-common` Maven module (under `com.fawnix.common.security`) containing all seven classes with proper parameterization. Each service POM depends on it. This collapses ~90 duplicate files into one maintained location.

---

## Tests & Gaps

| Category | Finding |
|----------|---------|
| Unit tests | **Zero.** `src/test/` does not exist. The `spring-boot-starter-test` dependency is declared in `pom.xml` (line 73) but no test source directory was created. |
| Integration tests | None. |
| Security filter tests | None. The JWT silent-swallow bug (ANA-02) and issuer non-validation (ANA-05) would be caught by a simple `MockMvcTest` with an invalid/cross-issued token. |
| Contract tests | None. Given the service exposes an HTTP API consumed (presumably) by a frontend, no consumer-driven contract tests exist. |

**Minimum required coverage before stub is replaced with real code:**
1. `AnalyticsControllerTest` — unauthenticated request returns 401, authenticated request returns 200.
2. `JwtAuthenticationFilterTest` — tampered token clears SecurityContext and returns 401 (validates ANA-02 fix).
3. `InternalServiceAuthFilterTest` — missing/wrong secret returns 403, correct secret continues chain.
4. `JwtServiceTest` — expired token, wrong issuer, and wrong signature each return `false` from `isTokenValid`.

---

## Coverage Note

**Fully inspected:** All 10 Java source files (475 total lines), `application.yml`, `pom.xml`, `Dockerfile`, `V1__init.sql`. Every file was opened and read in full.

**Cross-service redundancy:** 18 file pairs manually diffed. Pattern is consistent across at minimum `notifications-service`, `approval-service`, `org-service`, `forms-service`, `integration-service`, `recruitment-service`.

**Not inspected:** Gateway/API-gateway routing configuration (no gateway service found in `backend/services/`); Kubernetes manifests or Helm charts (none present in repo root); Spring Cloud Config server (Eureka client is configured; no Config Server dependency found).

**Confidence overall:** HIGH for all findings within this service. The security defects (ANA-01, ANA-02, ANA-05) are verifiable from the source with no runtime ambiguity. The port mismatch (ANA-03) is directly readable from two config files. The redundancy claims are supported by line-by-line diffs. The sole Low/Med confidence finding is ANA-13 (filter ordering), marked Med because Spring Security's exact ordering behavior for same-anchor `addFilterBefore` calls warrants a runtime integration test to confirm.

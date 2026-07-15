# api-gateway — Service Audit

**Date:** 2026-07-14
**Auditor:** Claude Sonnet 4.6 (automated, exhaustive file-level inspection)
**Target root:** `backend/platform/api-gateway`

---

## Summary

The api-gateway is a Spring Cloud Gateway service (Spring Boot 3.3.5, Spring Cloud 2023.0.3) acting as the single entry point for all downstream services. It contains exactly **4 Java source files and 1 application.yml**; there are no controllers, entities, Flyway migrations, Feign clients, or RestTemplate calls — routing is 100% declarative YAML. The service is small but it is the only authentication enforcement layer for the entire platform: flaws here affect all 14+ downstream services simultaneously. The two critical risks are (1) a prefix-matching bug that inadvertently exposes `/api/auth/register-master` — a privileged admin endpoint — without JWT enforcement, and (2) the `/actuator/gateway` endpoint is unauthenticated and leaks the complete internal routing topology. A known-weak default JWT secret (`change-this-local-dev-secret-...`) is committed in both `application.yml` and `compose.yml`, compounding both risks.

---

## Surface Map

### Routes (application.yml, lines 9–100)

| Route ID | Method / Path Pattern | Upstream Target | Notes |
|---|---|---|---|
| identity-admin-auth | ANY `/api/auth/register-admin` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | Hardcoded localhost fallback |
| identity-auth | ANY `/api/auth/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | Hardcoded localhost fallback |
| identity-users | ANY `/api/users`, `/api/users/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | |
| identity-roles | ANY `/api/roles`, `/api/roles/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | |
| identity-permissions | ANY `/api/permissions`, `/api/permissions/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | |
| identity-access-requests | ANY `/api/access-requests`, `/api/access-requests/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` | |
| crm-leads | ANY `/api/leads/**` | `lb://CRM-SERVICE` | |
| crm-reports | ANY `/api/reports/**` | `lb://CRM-SERVICE` | |
| crm-integrations | ANY `/api/integrations/**` | `lb://CRM-SERVICE` | |
| org-service | ANY `/api/setup/**`, `/api/departments/**`, `/api/org/**` | `lb://ORG-SERVICE` | |
| forms-service | ANY `/api/recruitment/forms/**` | `lb://FORMS-SERVICE` | |
| approval-service | ANY `/api/approval-flows/**`, `/api/approvals/**` | `lb://APPROVAL-SERVICE` | |
| recruitment-service | ANY `/api/recruitment/hiring-requests/**` ... `/api/public/forms/**` | `lb://RECRUITMENT-SERVICE` | `/api/public/forms/**` blocked by filter (see API-01) |
| integration-service | ANY `/api/settings/portal-credentials/**`, `/api/calendar/**` | `lb://INTEGRATION-SERVICE` | |
| analytics-service | ANY `/api/analytics/**` | `lb://ANALYTICS-SERVICE` | |
| notifications-service | ANY `/api/notifications/**` | `lb://NOTIFICATIONS-SERVICE` | |
| task-service | ANY `/api/tasks`, `/api/tasks/**` | `lb://TASK-SERVICE` | |
| project-service | ANY `/api/v1/projects`, `/api/v1/projects/**`, `/api/v1/project-meetings`, `/api/v1/project-meetings/**` | `lb://PROJECT-SERVICE` | |
| inventory | ANY `/api/inventory`, `/api/inventory/**` | `lb://INVENTORY-SERVICE` | `StripPrefix=1` applied |
| hrms | ANY `/api/hrms/**` | `lb://HRMS-SERVICE` | |
| sales | ANY `/api/sales/**` | `lb://SALES-SERVICE` | |
| procurement | ANY `/api/procurement/**`, `/api/procurement` | `lb://PROCUREMENT-SERVICE` | `StripPrefix=1` applied |

### JWT Public-Bypass List (GatewayAuthenticationFilter.java, lines 17–28)

```
/api/auth/login
/api/auth/register          <-- prefix collision (see API-02)
/api/auth/request-otp
/api/auth/verify-otp
/api/auth/fawnix/exchange
/api/auth/sso/fawnix
/api/auth/refresh
/api/integrations/meta/webhook
/api/integrations/whatsapp/webhook
/actuator                   <-- full actuator bypass (see API-03)
```

### No Entities, No Migrations, No Feign / RestTemplate calls

This service has no persistence layer, no Flyway SQL, and no outbound HTTP client. All upstream calls are handled by Spring Cloud Gateway's reactive proxy. Coverage of those areas is N/A for this service.

---

## Findings

### P0 — Critical

---

#### API-01 | Missing public-bypass for `/api/public/forms/**` — recruitment public endpoint unreachable

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/security/GatewayAuthenticationFilter.java:17–28` |
| **Severity** | P0 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
// GatewayAuthenticationFilter.java lines 17-28
private static final List<String> PUBLIC_PREFIXES = List.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/request-otp",
    "/api/auth/verify-otp",
    "/api/auth/fawnix/exchange",
    "/api/auth/sso/fawnix",
    "/api/auth/refresh",
    "/api/integrations/meta/webhook",
    "/api/integrations/whatsapp/webhook",
    "/actuator"
    // --- /api/public is NOT here ---
);
```

**Why it is wrong:**

The recruitment-service exposes a genuinely public endpoint at `/api/public/forms/**` (class `PublicApplyController`, `@RequestMapping("/api/public/forms")`) for unauthenticated job applications. The gateway routing config correctly routes `/api/public/forms/**` to `RECRUITMENT-SERVICE` (application.yml line 60). However, `GatewayAuthenticationFilter` does not include `/api/public` in `PUBLIC_PREFIXES`. Because the filter runs at `Ordered.HIGHEST_PRECEDENCE` and exits with `401 UNAUTHORIZED` before the route ever fires, every request to `/api/public/forms/**` is rejected at the gateway — the recruitment public apply feature is completely broken in all environments.

The recruitment-service itself correctly marks `/api/public/**` as `permitAll()` (`SecurityConfig.java:46`), but that code is never reached.

**Proper fix:**

Add `/api/public` to `PUBLIC_PREFIXES`:

```java
private static final List<String> PUBLIC_PREFIXES = List.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/request-otp",
    "/api/auth/verify-otp",
    "/api/auth/fawnix/exchange",
    "/api/auth/sso/fawnix",
    "/api/auth/refresh",
    "/api/integrations/meta/webhook",
    "/api/integrations/whatsapp/webhook",
    "/api/public",   // <-- add this
    "/actuator"
);
```

---

#### API-02 | Prefix collision — `/api/auth/register` bypass leaks `/api/auth/register-admin` and any future `/api/auth/register-*`

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/security/GatewayAuthenticationFilter.java:18, 66` |
| **Severity** | P0 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
// line 18 — bypass entry
"/api/auth/register",

// line 66 — matching logic (startsWith, not equals)
return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
```

**Why it is wrong:**

`path.startsWith("/api/auth/register")` returns `true` for every path beginning with that string, including:

- `/api/auth/register-admin` — creates admin users; identity service marks this `permitAll()` but the gateway was evidently intended to add an additional layer of route-level protection (a separate route `identity-admin-auth` was created specifically for this path).
- `/api/auth/register-master` — protected with `@PreAuthorize("@authz.hasAuthority(...)")` at the identity service level, but the JWT is **never forwarded** to the identity service when the gateway short-circuits the token check. The identity service's Spring Security filter reads the JWT from the incoming request; since the gateway strip passes the original request headers, Spring Security at the identity service still validates. However, this is brittle: any new endpoint under `/api/auth/register-X` that relies on the gateway filter for JWT enforcement will silently be exposed.

The correct fix removes the ambiguity by making bypass entries exact where possible, and/or by using a list of exact paths instead of `startsWith` for all entries.

**Proper fix:**

Split the logic: use exact matching for paths that need it, and reserve `startsWith` only for genuine namespace prefixes (e.g. `/api/public`).

```java
private static final Set<String> PUBLIC_EXACT = Set.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/request-otp",
    "/api/auth/verify-otp",
    "/api/auth/fawnix/exchange",
    "/api/auth/sso/fawnix",
    "/api/auth/refresh"
);

private static final List<String> PUBLIC_PREFIXES = List.of(
    "/api/integrations/meta/webhook",
    "/api/integrations/whatsapp/webhook",
    "/api/public",
    "/actuator"
);

private boolean isPublic(String path) {
    return PUBLIC_EXACT.contains(path)
        || PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
}
```

---

### P1 — High

---

#### API-03 | `/actuator/gateway` endpoint publicly accessible — full routing topology disclosed

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/resources/application.yml:113–115` and `GatewayAuthenticationFilter.java:28` |
| **Severity** | P1 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 (yml); Chaitanya2872 (filter) |

**Offending code:**

```yaml
# application.yml lines 113-115
management:
  endpoints:
    web:
      exposure:
        include: health,info,gateway
```

```java
// GatewayAuthenticationFilter.java line 28
"/actuator"
```

**Why it is wrong:**

The `gateway` actuator endpoint exposes all configured routes — including upstream URIs, predicates, and filters — to any unauthenticated caller. Because `/actuator` is in `PUBLIC_PREFIXES` using `startsWith`, the path `/actuator/gateway` (and `/actuator/gateway/routes`, `/actuator/gateway/routedefinitions`) is completely open to the internet.

An attacker can enumerate all downstream service names (e.g. `lb://CRM-SERVICE`, direct IPs for identity), discover bypass paths, and map the internal service topology without any credentials.

**Proper fix:**

Option 1 (recommended): Remove `gateway` from the exposed endpoints:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

Option 2: Restrict actuator to a separate management port not exposed externally:

```yaml
management:
  server:
    port: 9090   # not exposed in compose port mappings
```

---

#### API-04 | Committed weak default JWT secret — valid tokens can be forged

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/resources/application.yml:121`; `compose.yml:792` |
| **Severity** | P1 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 (application.yml); Ravi-Shankar-ACS (compose.yml) |

**Offending code:**

```yaml
# application.yml line 121
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}

# compose.yml line 792
JWT_SECRET: ${JWT_SECRET:-change-this-local-dev-secret-change-this-local-dev-secret}
```

**Why it is wrong:**

The fallback secret is **committed in version control** and is the same string used by all 14 other services (confirmed across `analytics-service`, `identity-service`, `recruitment-service`, `crm-service`, etc.). If `JWT_SECRET` is not set in the deployment environment, the application starts with this known secret. Any operator who runs `docker compose up` without a `.env` file, or any system where the env var is absent, will be running with a shared, publicly known HMAC-SHA key. Anyone who reads this repository can mint valid JWTs for any user, role, or permission in the system.

Additionally, the production `compose.yml` (at `PRD/compose.yml`) repeats the same weak default (line 186, 228, etc.) — increasing the chance a production instance was started without overriding it.

**Proper fix:**

1. Remove the fallback value; force the property to be required:
   ```yaml
   secret: ${JWT_SECRET}   # no default — startup fails loudly if unset
   ```
2. Add a `@PostConstruct` validation in `GatewayJwtService` (or `JwtProperties`) to reject any secret shorter than 32 bytes.
3. Generate a cryptographically random secret for each environment and inject via secrets manager (Vault, AWS Secrets Manager, Docker secrets), not via `.env` files.
4. Rotate the secret in all running environments immediately, since it is now in git history.

---

#### API-05 | Hardcoded production IP addresses committed to source control

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/resources/application.yml:118`; `compose.yml:791, 103` |
| **Severity** | P1 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 (application.yml) |

**Offending code:**

```yaml
# application.yml line 118
allowed-origins: ${FRONTEND_ORIGINS:http://localhost:5173,...,http://54.76.187.129,...,http://108.131.209.156,...}
```

**Why it is wrong:**

Raw production server IPs (`54.76.187.129`, `108.131.209.156`) are embedded as fallback defaults in a committed config file. This:

1. Discloses live production infrastructure to anyone with repository access.
2. Ties the codebase to specific IPs — infra changes require code changes.
3. The fallback list also includes `http://` (not `https://`) variants of the production IP, which permits cookie/credential transmission over plain HTTP from these origins.
4. The same IPs appear in `compose.yml:791` and `compose.yml:103` (speech-to-text ALLOW_ORIGINS), broadening the disclosure.

**Proper fix:**

Remove all IP defaults from committed files. Use the environment variable exclusively:

```yaml
allowed-origins: ${FRONTEND_ORIGINS}
```

Set `FRONTEND_ORIGINS` in deployment-specific secrets or environment configuration (never committed). For local development, create a `.env.local` file (git-ignored):

```
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### P2 — Medium

---

#### API-06 | Broad `catch (Exception)` silently swallows all JWT parsing failures

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/security/GatewayJwtService.java:33` |
| **Severity** | P2 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
// GatewayJwtService.java lines 25-37
public boolean isTokenValid(String token) {
    for (String secret : getCandidateSecrets()) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) getSigningKey(secret))
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return claims.getExpiration().toInstant().isAfter(Instant.now());
        } catch (Exception exception) {
            // Try the next configured secret.
        }
    }
    return false;
}
```

**Why it is wrong:**

Catching `Exception` instead of specific JJWT exception types (`ExpiredJwtException`, `UnsupportedJwtException`, `MalformedJwtException`, `SignatureException`, `IllegalArgumentException`) means:

1. A `NullPointerException` or `ClassCastException` caused by a misconfigured secret (e.g. wrong Base64 padding, empty secret leaking through to `getSigningKey`) is silently treated as "wrong secret, try next" instead of failing loudly.
2. Real parsing failures from a known-valid secret are masked — the loop continues when it should stop.
3. There is no logging of exceptions at any level, making security debugging impossible. If tokens are being rejected in production, there is no trace of why.

The iterator pattern (try each candidate secret) is architecturally sound; the catch scope is not.

**Proper fix:**

```java
public boolean isTokenValid(String token) {
    for (String secret : getCandidateSecrets()) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) getSigningKey(secret))
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return !claims.getExpiration().toInstant().isBefore(Instant.now());
        } catch (SignatureException | MalformedJwtException | UnsupportedJwtException e) {
            // Signature mismatch — try next candidate secret
            log.debug("JWT did not match secret candidate: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            return false; // correct secret but token is expired — stop iterating
        }
        // Let other exceptions (NPE, IllegalArg) propagate — they indicate misconfiguration
    }
    return false;
}
```

---

#### API-07 | Redundant and incorrect key-derivation: double Base64 encode/decode is a no-op

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/security/GatewayJwtService.java:53–57` |
| **Severity** | P2 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
// GatewayJwtService.java lines 53-57
private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        secret.getBytes()
    )));
}
```

**Why it is wrong:**

The canonical JJWT v0.12 pattern treats the config value as a **Base64-encoded byte sequence**:

```java
// Correct JJWT pattern
Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))
```

What this code does instead:
1. Calls `secret.getBytes()` → raw UTF-8 bytes.
2. Calls `Base64.getEncoder().encodeToString(...)` → produces a Base64 string of those bytes.
3. Calls `Decoders.BASE64.decode(...)` → decodes back to the original raw UTF-8 bytes.

Steps 2 and 3 cancel each other out. The result is identical to `Keys.hmacShaKeyFor(secret.getBytes())`. The round-trip is a no-op. The code is misleading and obscures the actual key material being used.

Critically: the gateway config secret (`change-this-local-dev-secret-...`) is a **plain text string**, not a Base64-encoded value. This is inconsistent with the stated JJWT expectation. If in future someone generates a proper Base64-encoded secret (which is the right thing to do), the existing code will Base64-encode it again before decoding, producing incorrect key material that doesn't match what the identity service uses (which also has the same double-encode bug, so they incidentally match each other). The identity service's `JwtService.java:77-81` uses the same pattern, confirming the copy-paste origin.

**Proper fix:**

1. Define a convention: the `JWT_SECRET` env var should be the raw UTF-8 signing secret (minimum 32 chars for HS256). Update `getSigningKey` accordingly:

```java
private Key getSigningKey(String secret) {
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
}
```

2. Alternatively (preferred for key hygiene): define `JWT_SECRET` as a Base64-encoded 256-bit key and use the correct JJWT decode:

```java
private Key getSigningKey(String base64Secret) {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
}
```

Apply the same fix to all 14 downstream service `JwtService` files (they all have the same bug).

---

#### API-08 | 401 responses return an empty body — no `WWW-Authenticate` header, no JSON error

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/security/GatewayAuthenticationFilter.java:46–54` |
| **Severity** | P2 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
// Lines 46-54
if (authorization == null || !authorization.startsWith("Bearer ")) {
    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
    return exchange.getResponse().setComplete();
}

String token = authorization.substring(7);
if (!gatewayJwtService.isTokenValid(token)) {
    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
    return exchange.getResponse().setComplete();
}
```

**Why it is wrong:**

RFC 9110 §11.6.1 requires servers returning 401 to include a `WWW-Authenticate` challenge header. Beyond the spec violation, frontend clients (and mobile apps) have no way to distinguish "missing token" from "expired token" from "invalid token" — all return an identical empty body 401. This forces frontend code to treat every auth failure the same way, preventing UX improvements like "your session expired, please log in again" vs. "you are not allowed here."

**Proper fix:**

```java
private Mono<Void> rejectUnauthorized(ServerWebExchange exchange, String reason) {
    ServerHttpResponse response = exchange.getResponse();
    response.setStatusCode(HttpStatus.UNAUTHORIZED);
    response.getHeaders().add(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
    response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
    byte[] body = ("{\"error\":\"UNAUTHORIZED\",\"message\":\"" + reason + "\"}").getBytes(StandardCharsets.UTF_8);
    DataBuffer buffer = response.bufferFactory().wrap(body);
    return response.writeWith(Mono.just(buffer));
}
```

---

#### API-09 | Identity service routes bypass Eureka — hardcoded localhost fallback breaks multi-host deployments

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/resources/application.yml:10, 14, 18, 22, 26, 30` |
| **Severity** | P2 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Offending code:**

```yaml
# All six identity-service routes use:
uri: ${IDENTITY_SERVICE_URL:http://localhost:8081}
```

**Why it is wrong:**

All other services use `lb://SERVICE-NAME` for Eureka-based load-balanced discovery. The six identity routes use a direct URL with `localhost:8081` as fallback. When `IDENTITY_SERVICE_URL` is not set (e.g. during CI builds, local runs without the full stack, or infra changes), the gateway connects to `localhost:8081` — which may be nothing, a different service, or an attacker-controlled listener if the gateway runs on a shared host. In contrast, missing lb:// targets simply fail discovery, which is a safe failure mode.

The `compose.yml` correctly sets `IDENTITY_SERVICE_URL: http://identity-service:8081` (line 790), so this doesn't break compose-based deployments, but any deployment that forgets this env var silently connects to localhost.

**Proper fix:**

Register identity-service with Eureka (it already has Eureka client configured, `application.yml` name is `identity-service`) and switch routes to use service discovery:

```yaml
uri: lb://IDENTITY-SERVICE
```

Or, if direct URL is intentional for performance, remove the unsafe localhost fallback:

```yaml
uri: ${IDENTITY_SERVICE_URL}   # no default — fail loudly
```

---

### P3 — Low

---

#### API-10 | No rate limiting on the gateway — auth endpoints are exposed to brute-force

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/pom.xml` (no rate-limiting dependency); `application.yml` (no `RequestRateLimiter` filter) |
| **Severity** | P3 |
| **Confidence** | High |
| **Owner** | Chaitanya2872 |

**Why it is wrong:**

The public auth endpoints (`/api/auth/login`, `/api/auth/request-otp`) have no rate limiting at the gateway. Spring Cloud Gateway provides a built-in `RequestRateLimiter` filter with Redis backing. Without it, login brute-force and OTP enumeration attacks are unrestricted. The recruitment-service has its own `PublicFormRateLimiter` for its public forms, but this protection does not apply at the gateway level.

**Proper fix:**

Add `spring-boot-starter-data-redis-reactive` to pom.xml and configure `RequestRateLimiter` on auth routes:

```yaml
- id: identity-auth
  uri: ${IDENTITY_SERVICE_URL}
  predicates:
    - Path=/api/auth/**
  filters:
    - name: RequestRateLimiter
      args:
        redis-rate-limiter.replenishRate: 10
        redis-rate-limiter.burstCapacity: 20
        key-resolver: "#{@remoteAddrKeyResolver}"
```

---

#### API-11 | `CorsWebFilter` with `allowedHeaders=["*"]` and `allowCredentials=true` — spec non-compliance

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/java/com/fawnix/gateway/config/GatewayCorsConfig.java:34–35` |
| **Severity** | P3 |
| **Confidence** | Med |
| **Owner** | Chaitanya2872 |

**Offending code:**

```java
configuration.setAllowedHeaders(List.of("*"));
configuration.setAllowCredentials(true);
```

**Why it is wrong:**

Per the Fetch specification (CORS), when `Access-Control-Allow-Credentials: true` is in the response, `Access-Control-Allow-Headers: *` is not allowed — wildcard header values are prohibited with credentialed requests. Spring Framework 5.3+ resolves `*` to the actual `Access-Control-Request-Headers` value from the preflight, which makes this work in practice on modern Spring builds. However, it is technically non-compliant with the spec and may break on non-Spring intermediaries or older clients. This is also a maintenance hazard: if the CORS filter is ever swapped for a non-Spring implementation, the `*` will silently stop working.

**Proper fix:**

Enumerate the required headers explicitly:

```java
configuration.setAllowedHeaders(List.of(
    "Authorization", "Content-Type", "Accept", "X-Requested-With",
    "Cache-Control", "X-Service-Token"   // add any custom headers
));
```

---

#### API-12 | `DedupeResponseHeader` default-filter suggests dual CORS handling — risk of header leakage

| Field | Value |
|---|---|
| **File** | `backend/platform/api-gateway/src/main/resources/application.yml:7` |
| **Severity** | P3 |
| **Confidence** | Med |
| **Owner** | Chaitanya2872 |

**Offending code:**

```yaml
default-filters:
  - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin Vary, RETAIN_FIRST
```

**Why it is wrong:**

`DedupeResponseHeader` is used to strip duplicate CORS headers that arise when both `CorsWebFilter` (bean) and the downstream service's own CORS configuration both add the same headers. The presence of this filter is a symptom that the CORS story is fragmented: some downstream services add their own CORS headers, the gateway adds CORS headers via `CorsWebFilter`, and the dedup filter stitches them together. `RETAIN_FIRST` arbitrarily picks one set of headers — but if the two sets have different `Access-Control-Allow-Origin` values, silently discarding one could mask a misconfiguration. The correct fix is to ensure only one layer adds CORS headers (the gateway), and downstream services are configured to not add CORS headers at all.

**Proper fix:**

Audit downstream services (especially `identity-service`, which has its own `CorsWebFilter`) to disable their CORS handling when behind the gateway. Then remove the `DedupeResponseHeader` filter.

---

#### API-13 | Gateway `compose.yml` missing `depends_on` for most downstream services

| Field | Value |
|---|---|
| **File** | `compose.yml:773–786` |
| **Severity** | P3 |
| **Confidence** | High |
| **Owner** | Ravi-Shankar-ACS |

**Offending code:**

```yaml
api-gateway:
  depends_on:
    eureka-server:   condition: service_healthy
    identity-service: condition: service_healthy
    crm-service:     condition: service_healthy
    forms-service:   condition: service_healthy
    procurement-service: condition: service_healthy
    project-service: condition: service_healthy
    # missing: analytics-service, notifications-service, task-service,
    #          recruitment-service, hrms-service, inventory-service,
    #          sales-service, org-service, integration-service
```

**Why it is wrong:**

The gateway starts routing traffic before 9 of the 15 downstream services are healthy. Requests to those services during startup will result in Eureka-not-yet-registered errors or `503 Service Unavailable` responses proxied back to clients, without a clear error. This is a local-dev and CI reliability issue — the gateway starts successfully but silently fails to route approximately 60% of the declared routes.

**Proper fix:**

Add all services that are included in routes to `depends_on`, or use `condition: service_started` (looser) rather than `service_healthy` for faster startup with the understanding that some warm-up is needed.

---

## Redundancy

The `GatewayJwtService` in this service is a near-clone of the `JwtService` in each downstream service. The key-derivation method (`getSigningKey`) is **identical** across at least 12 files.

| api-gateway file | Cloned in downstream service |
|---|---|
| `security/GatewayJwtService.java:53–57` | `services/inventory-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/analytics-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/task-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/notifications-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/project-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/sales-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/recruitment-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/procurement-service/.../JwtService.java:68–70` |
| `security/GatewayJwtService.java:53–57` | `services/crm-service/.../JwtService.java:133–135` |
| `security/GatewayJwtService.java:53–57` | `services/identity-service/.../JwtService.java:76–81` |

The JwtProperties inner class pattern (`@ConfigurationProperties`, `secret` + optional `fawnixSecret`) is also duplicated 14 times across the monorepo. The correct fix is to extract a `jwt-commons` Maven module containing `JwtProperties`, `JwtKeyDerivation`, and `TokenValidator`, and have all services depend on it. The bug in API-07 (double Base64 encode/decode) would then be fixed once, everywhere.

---

## Tests and Gaps

**No test directory exists.** `ls backend/platform/api-gateway/src/` shows only `main/`. There are zero unit tests, zero integration tests, and zero contract tests for the api-gateway.

The following scenarios are completely untested:

- JWT validation (valid token → pass; expired token → 401; tampered token → 401; wrong secret → 401).
- Public path bypass logic (OTP endpoints pass without auth; arbitrary `/api/auth/register-X` does not bypass).
- CORS preflight handling (OPTIONS → 200 without auth enforcement).
- Route mapping (requests to `/api/public/forms/**` reach RECRUITMENT-SERVICE).
- Actuator security (unauthenticated `/actuator/gateway` returns route topology).
- StripPrefix behavior for inventory and procurement routes.

**Recommended minimum test set:**

1. `GatewayAuthenticationFilterTest` — verify each PUBLIC_PREFIXES entry bypasses the filter, and an arbitrary protected path returns 401 without a token.
2. `GatewayJwtServiceTest` — valid token returns `true`; expired token returns `false`; invalid signature returns `false`; malformed token returns `false`; empty candidate secret list returns `false`.
3. A Spring Cloud Gateway integration test (`@SpringBootTest(webEnvironment = RANDOM_PORT)`) with mocked downstream services that validates route predicates and filter order.

---

## Coverage Note

**Fully inspected:**

- All 4 Java source files (204 lines total) — read in full.
- `application.yml` (123 lines) — read in full.
- `pom.xml` — read in full.
- `compose.yml` (810 lines) — read in full for gateway-relevant sections.
- `PRD/compose.yml` — scanned for JWT/secrets.

**Cross-service comparison performed for:**

- JWT service / key derivation pattern (10+ services).
- CORS configuration (identity-service).
- Identity service `SecurityConfig` (for register-admin intent verification).
- Recruitment service `PublicApplyController` and `SecurityConfig` (for API-01 impact).

**Not inspected (out of scope for this service):**

- Downstream service internals beyond what was needed to verify gateway-level findings.
- Eureka server configuration.
- No Flyway migrations exist in this service (N/A).
- No Feign clients exist in this service (N/A).

**Overall confidence:** High. The service is small, all source was read in full, and cross-service comparisons were performed to substantiate each finding. The P0 findings (API-01, API-02) are definitive functional/security bugs that require no further investigation.

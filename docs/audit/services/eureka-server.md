# eureka-server — Service Audit

**Audited:** 2026-07-14
**Auditor:** Automated code audit (claude-sonnet-4-6)
**Root:** `backend/platform/eureka-server`
**Commit range inspected:** b3473b8..HEAD (all commits touching this path)

---

## Summary

`eureka-server` is a minimal Spring Cloud Netflix Eureka server — a pure service-discovery node with no business logic, no database, no controllers, and no custom code beyond the three standard files every Eureka stub generates. The service is healthy at the framework level. However, it carries **two real security risks** that are production-relevant: the Eureka dashboard and REST API are completely unauthenticated, and in the production Compose file the server is bound to a host port that makes it reachable from the public internet. All other checklist items either do not apply (no entities, no migrations, no Feign clients, no @Transactional) or are confirmed clean.

---

## Surface map

### Controllers / endpoints

None. All HTTP is provided entirely by the Spring Cloud Netflix Eureka autoconfiguration. The effective exposed surface is:

| Path | Description | Auth required? |
|---|---|---|
| `GET /eureka/apps` | Lists all registered service instances (XML/JSON) | **No** |
| `GET /eureka/apps/{appId}` | Instance details for one service | **No** |
| `POST /eureka/apps/{appId}` | Client registers a new instance | **No** |
| `DELETE /eureka/apps/{appId}/{instanceId}` | Client deregisters an instance | **No** |
| `PUT /eureka/apps/{appId}/{instanceId}` | Heartbeat renewal | **No** |
| `GET /` | Eureka web dashboard (HTML) | **No** |
| `GET /actuator/health` | Spring Actuator health | **No** |
| `GET /actuator/info` | Spring Actuator info | **No** |

### Entities / tables

None.

### Flyway migrations

None.

### Feign / RestTemplate outbound calls

None.

### Configuration keys (`application.yml`)

| Key | Value / default | Notes |
|---|---|---|
| `spring.application.name` | `eureka-server` | OK |
| `server.port` | `${SERVER_PORT:8761}` | Port env-injected |
| `eureka.client.register-with-eureka` | `false` | Correct for a server node |
| `eureka.client.fetch-registry` | `false` | Correct for a server node |
| `management.endpoints.web.exposure.include` | `health,info` | Appropriately restricted |

---

## Findings

### P1 — Security

---

#### EUR-01 — Eureka dashboard and REST API are completely unauthenticated

- **ID:** EUR-01
- **Severity / Confidence:** P1 / High
- **File:** `backend/platform/eureka-server/src/main/resources/application.yml` (entire file) and `backend/platform/eureka-server/pom.xml` (entire file)
- **Owner:** Chaitanya2872

**Offending code (pom.xml lines 17-26):**
```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
  </dependency>
</dependencies>
```
`spring-boot-starter-security` is absent. `application.yml` contains no `spring.security.*` keys.

**Why it is wrong:** The Eureka REST API (`GET /eureka/apps`, `POST /eureka/apps/{id}`, `DELETE /eureka/apps/{id}/{instance}`) and the HTML dashboard (`GET /`) are completely open to any caller with network access. An attacker who can reach the port can: enumerate every internal service name, IP, and port registered with the registry; force-deregister services to cause cascading failures; or register a rogue service to intercept traffic if clients use client-side load balancing.

Spring Cloud Netflix does not add Spring Security automatically in Spring Cloud 2023.x (unlike some older versions). No HTTP Basic or custom filter is wired anywhere in this module.

**Proper fix:** Add `spring-boot-starter-security` and configure HTTP Basic:

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  security:
    user:
      name: ${EUREKA_USER:eureka}
      password: ${EUREKA_PASSWORD:change-me}
```

```java
// EurekaSecurityConfig.java (new class in com.fawnix.discovery)
@Configuration
@EnableWebSecurity
public class EurekaSecurityConfig {
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.ignoringRequestMatchers("/eureka/**"))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
        .anyRequest().authenticated())
      .httpBasic(Customizer.withDefaults());
    return http.build();
  }
}
```

All clients must then pass credentials:
```yaml
eureka:
  client:
    service-url:
      defaultZone: http://${EUREKA_USER}:${EUREKA_PASSWORD}@eureka-server:8761/eureka/
```

---

#### EUR-02 — Production Compose binds Eureka to a public host port with no authentication

- **ID:** EUR-02
- **Severity / Confidence:** P1 / High
- **File:** `PRD/compose.yml:155-156`
- **Owner:** Chaitanya2872

**Offending code:**
```yaml
    ports:
      - "8765:8761"
```

**Why it is wrong:** The production Compose file maps the Eureka server to host port `8765`. The Caddy reverse proxy (`PRD/Caddyfile`) only routes `fawnixverse.acstechnologies.co.in` traffic for `/api/*` and `/` — it does not protect port `8765` in any way. Port `8765` is therefore reachable directly on the EC2 host's public IP. Combined with EUR-01 (no authentication), anyone on the internet can browse the Eureka dashboard, enumerate every internal service IP/port, and deregister services.

The dev `compose.yml` has the same issue at line 147 (`8761:8761`), though that is less critical since dev environments are typically firewalled.

**Proper fix:** Remove the `ports:` stanza from the PRD Compose `eureka-server` service entirely. All legitimate callers (other containers) reach it via `http://eureka-server:8761/eureka/` on the internal Docker network and do not need the host binding:

```yaml
  eureka-server:
    # ports: section REMOVED — internal traffic only
    networks:
      - fawnix-network
```

If there is a legitimate operational need to access the dashboard remotely, place it behind the Caddy reverse proxy with authentication, or use an SSH tunnel — do not expose it bare on a public port.

---

### P2 — Operational / Reliability

---

#### EUR-03 — Single-node Eureka with no peer replication configured

- **ID:** EUR-03
- **Severity / Confidence:** P2 / High
- **File:** `backend/platform/eureka-server/src/main/resources/application.yml:9-11`
- **Owner:** Chaitanya2872

**Offending code:**
```yaml
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

**Why it is wrong:** This configuration is correct for a single-node development setup but becomes a single point of failure in production. All 13+ microservices depend on `eureka-server:condition:service_healthy` (see `compose.yml`). If the single Eureka node restarts, every downstream service loses its registry — load balancing via `lb://` URIs in the API gateway will fail until the registry repopulates (typically 90 s of heartbeat cycles). There is no peer URL configured for failover.

**Proper fix (if HA is required):** Run two Eureka replicas and configure peer awareness:
```yaml
# application-peer1.yml
eureka:
  instance:
    hostname: eureka1
  client:
    serviceUrl:
      defaultZone: http://eureka2:8762/eureka/
```
For the current single-Compose deployment this is an accepted risk; the team should explicitly document the SPOF and the recovery procedure (restart order) in a runbook.

---

#### EUR-04 — No `eureka.server.wait-time-in-ms-when-sync-empty` / self-preservation tuning for containerised environment

- **ID:** EUR-04
- **Severity / Confidence:** P3 / Med
- **File:** `backend/platform/eureka-server/src/main/resources/application.yml` (missing key)
- **Owner:** Chaitanya2872

**Offending code:** (absent)

**Why it is wrong:** Eureka's self-preservation mode is designed for network partitions in distributed clusters. In a single-Docker-network deployment with fast container startups and a single registry, self-preservation causes the registry to keep stale entries (e.g., a restarted container under a new IP) for up to 90 s, which manifests as 500 errors from the gateway using the stale `lb://` address. The default `renewalPercentThreshold` (0.85) will trigger on every restart cycle.

**Proper fix:**
```yaml
eureka:
  server:
    enable-self-preservation: false          # disable in Docker-only deployment
    eviction-interval-timer-in-ms: 5000      # evict dead instances faster
    wait-time-in-ms-when-sync-empty: 0       # don't hold startup for peer sync
```
Add a comment explaining this is intentional for the single-node Docker setup, and re-evaluate if moving to a multi-host Kubernetes deployment.

---

### P3 — Observability / Hygiene

---

#### EUR-05 — No `spring-boot-starter-test` and no `src/test` directory

- **ID:** EUR-05
- **Severity / Confidence:** P3 / High
- **File:** `backend/platform/eureka-server/pom.xml` (no test dependency); `src/test` directory does not exist
- **Owner:** Chaitanya2872

**Offending code (pom.xml):** `<dependencies>` block contains no `spring-boot-starter-test` or JUnit 5 entry.

**Why it is wrong:** For a pure infrastructure service this is low severity — there is no business logic to unit-test. However, at minimum a `@SpringBootTest` smoke test verifying the context loads (including the Eureka server autoconfiguration) should exist. Regressions in configuration (e.g., a wrong property rename) would go undetected until the container fails in CI.

**Proper fix:**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```
```java
// src/test/java/com/fawnix/discovery/EurekaServerApplicationTests.java
@SpringBootTest
class EurekaServerApplicationTests {
  @Test
  void contextLoads() {}
}
```

---

#### EUR-06 — No logging configuration; default Spring Boot log level may expose registry internals

- **ID:** EUR-06
- **Severity / Confidence:** P3 / Low
- **File:** `backend/platform/eureka-server/src/main/resources/application.yml` (missing `logging:` block)
- **Owner:** Chaitanya2872

**Offending code:** (absent)

**Why it is wrong (Low confidence — informational):** The default Spring Boot log level is `INFO`. Netflix Eureka at INFO already logs every registration, heartbeat, and deregistration event including service names and IP addresses. In a containerised environment these appear in `docker logs` and in any aggregated log sink. If logs are shipped to a third-party collector, internal topology is leaked. The concern is Low confidence because it depends entirely on the log shipping setup (unknown from this codebase).

**Proper fix:** Add a logging block that suppresses the most verbose Eureka internals in production:
```yaml
logging:
  level:
    com.netflix.eureka: WARN
    com.netflix.discovery: WARN
```

---

## Redundancy

This service is a 3-file stub. There is no duplication within the module.

**Cross-service observation (Low confidence — informational):** The `EUREKA_SERVER_URL` default value `http://localhost:8761/eureka/` is copy-pasted identically into every one of the 15 sibling `application.yml` files:

```
backend/services/crm-service/src/main/resources/application.yml (eureka.client.service-url.defaultZone)
backend/services/identity-service/src/main/resources/application.yml
backend/services/analytics-service/src/main/resources/application.yml
... (15 total occurrences)
```

This is a Compose / application-property pattern, not a code clone. The value is correctly overridden via `EUREKA_SERVER_URL` env var at runtime, so it is not a bug — but if the default port ever changes, all 15 files need updating simultaneously. A shared Spring Cloud Config Server or a BOM-level property default would eliminate the drift risk.

---

## Tests & gaps

| Area | Status |
|---|---|
| `src/test` directory | **Does not exist** |
| `spring-boot-starter-test` dependency | **Missing from pom.xml** |
| Spring context smoke test | **Missing** |
| Eureka security integration test | **Missing** (would catch EUR-01 automatically) |

**Recommended minimum:** A single `@SpringBootTest` that asserts the context loads. Given the security findings (EUR-01), a second integration test that fires an `HTTP GET /eureka/apps` and asserts a `401` response would provide an automated regression guard.

---

## Coverage note

**Fully inspected:**
- `backend/platform/eureka-server/pom.xml` — all 36 lines
- `backend/platform/eureka-server/src/main/java/com/fawnix/discovery/EurekaServerApplication.java` — all 14 lines
- `backend/platform/eureka-server/src/main/resources/application.yml` — all 18 lines
- `compose.yml` (eureka-server stanza, lines 134-155) — eureka port and environment
- `PRD/compose.yml` (eureka-server stanza, lines 153-168) — production port exposure
- `PRD/Caddyfile` — confirmed no protection of port 8765
- `PRD/.env.example` — confirmed default secrets pattern
- `backend/pom.xml` — parent POM, Spring Cloud 2023.0.3 BOM confirmed
- `.github/workflows/deploy-ec2.yml` — deployment pipeline reviewed

**Not inspected / out of scope:**
- Actual Maven dependency tree (would require `mvn dependency:tree`; `spring-security` transitive inclusion was assessed from Spring Cloud 2023.0.3 release notes and is High-confidence absent)
- AWS Security Group rules protecting port 8765 on the EC2 host (not visible in this repo; EUR-02 severity assumes the EC2 instance is internet-reachable based on the production deployment context)
- Runtime behaviour of Eureka self-preservation in the live environment

**Overall confidence:** High for findings EUR-01 through EUR-05; Low for EUR-06.

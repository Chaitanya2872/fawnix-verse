# Backend Architecture

The backend is a Maven multi-module Spring Boot 3 microservices system under `backend/`.

---

## 1. Stack & build

| Concern | Choice |
|---|---|
| Framework | Spring Boot 3.3.5 |
| Language | Java 17 |
| Cloud | Spring Cloud 2023.0.3 (Gateway, Eureka, OpenFeign, LoadBalancer) |
| Persistence | Spring Data JPA (Hibernate) + Flyway |
| Auth | JJWT 0.12.6 |
| Build | Maven multi-module (parent `backend/pom.xml`) |
| Object storage | MinIO SDK 8.6.0 (crm) / AWS SDK v2 (recruitment) |
| AI | Spring AI 1.1.6 (task-service, OpenAI) |

The parent POM uses `<dependencyManagement>` to import the Spring Cloud BOM and manages the
Spring Boot plugin centrally. **Caveat**: 8 services declare their own `com.hirepath` groupId
and version, and a few pull dependencies (MinIO, POI, Commons CSV, Spring AI, AWS SDK) with
inline versions rather than parent-managed ones (audit item).

> `backend/src/` is a **legacy monolith** (53 Java files). It is **not** listed in the parent
> POM `<modules>`, so it never compiles or deploys — it is dead code and is flagged for removal.

---

## 2. Module structure

```
backend/
  pom.xml                         # parent — dependencyManagement + <modules>
  platform/
    eureka-server/                # service registry
    api-gateway/                  # ingress + JWT + CORS + routing
  services/
    identity-service/  crm-service/  inventory-service/  hrms-service/
    sales-service/  org-service/  forms-service/  approval-service/
    recruitment-service/  integration-service/  analytics-service/
    notifications-service/  procurement-service/  task-service/  project-service/
  src/                            # DEAD legacy monolith (not a module)
```

---

## 3. Service anatomy (reference: `crm-service`)

Package root `com.fawnix.crm`. Organized **package-by-feature**, each feature carrying its
own layers:

```
com.fawnix.crm
  <feature>/                      # e.g. leads, contacts, accounts, deals, activities
    controller/                   # @RestController — thin, delegates to service
    service/                      # business logic
    repository/                   # Spring Data JPA (+ Specifications for filtering)
    entity/                       # @Entity
    dto/                          # request/response records
    mapper/                       # hand-written entity<->dto mappers
    specification/                # JPA Specifications (dynamic queries)
  common/
    exception/                    # GlobalExceptionHandler, typed exceptions
    response/                     # ApiErrorResponse
    config/                       # DataSeeder, CorsProperties
  security/                       # JwtService, JwtAuthenticationFilter, AppUserDetails, …
  storage/                        # MinIO integration
  contact/  contacts/             # (call recordings vs contact entities — naming split)
  integrations/meta/              # Meta lead webhooks + settings
```

**Adherence across services**: 7 services follow `com.fawnix.*` with this convention.
The 8 HirePath-migrated services use `com.hirepath.*` and vary (e.g. `domain/` instead of
`entity/`, `SecurityConfig` at the root package). See the [backend audit](../audit/backend.md).

---

## 4. Platform components

### Eureka (`platform/eureka-server`)
Standard registry, self-registration disabled, `:8761`. No security, no peer replication.

### API Gateway (`platform/api-gateway`)
- Routes defined in `application.yml`. Most use `lb://SERVICE-NAME`; identity-service uses a
  hardcoded URL; inventory/procurement use `StripPrefix=1`.
- `GatewayAuthenticationFilter` + `GatewayJwtService` validate the bearer token before
  forwarding. Public paths (auth, webhooks) are allow-listed.
- CORS is centralized here (`GatewayCorsConfig`, reactive `CorsWebFilter`).

---

## 5. Cross-cutting patterns

### Security (JWT)
Each service carries its **own copy** of `JwtService`, `JwtAuthenticationFilter`,
`AppUserDetails`, `JwtProperties`, `RestAccessDeniedHandler`, `RestAuthenticationEntryPoint`
— copy-pasted with only the package changed (~14 copies). `JwtService.extractClaims()` tries
multiple secrets in turn to support dual-token (verse + external Fawnix SSO) operation.

### Exception handling
`@RestControllerAdvice GlobalExceptionHandler` → `ApiErrorResponse`
(`timestamp,status,error,message,path,fieldErrors`). Present in **crm, identity, inventory,
procurement, sales, task**; **absent** in the HirePath services (they fall back to Spring's
default `/error`).

### Persistence
- Flyway migrations per service (`src/main/resources/db/migration/V{n}__*.sql`); counts range
  from 1 (analytics/hrms placeholder) to 16 (crm).
- `spring.jpa.hibernate.ddl-auto: validate` everywhere JPA is configured.
- `open-in-view: false` in most services (good); missing in hrms/org.
- Dynamic filtering via JPA **Specifications** (crm, sales, identity, approval, task).
- DTO mapping is **hand-written** (`@Component` mappers) — no MapStruct.

### Inter-service communication
- **OpenFeign** is the primary mechanism (declarative clients).
- A few `RestTemplate` calls with hardcoded URLs remain (`crm → identity`,
  `sales → inventory @ http://localhost:8083`).
- **Three** internal-auth mechanisms coexist: `X-Internal-Service-Secret` header,
  service-issued JWT (`ServiceJwtProvider`), and plain RestTemplate. User identity is **not**
  propagated on internal calls — only service identity.

### Configuration
- `${ENV_VAR:default}` throughout `application.yml`.
- `@ConfigurationProperties` for structured config (JWT, storage, STT, WhatsApp, Meta, CORS).
- No Spring profiles (`spring.profiles.active`) in use.

---

## 6. External integrations

| Integration | Service | Mechanism |
|---|---|---|
| MinIO (objects) | crm-service | MinIO SDK; `MinioClient` constructed in service ctor (not a bean). |
| Speech-to-text | crm-service → Python STT | `RestTemplate`, tolerant response parsing (`transcript`/`text`/…). |
| Meta / WhatsApp leads | crm-service | Inbound webhooks + `@ConfigurationProperties`. |
| S3 (attachments) | recruitment-service | AWS SDK v2; default bucket `hirepath` (residual). |
| OpenAI (task import) | task-service | Spring AI `gpt-4o-mini`, feature-flagged. |
| Redis | notifications-service | Outbox processor. |

---

## 7. Where to look

| You want to… | Go to |
|---|---|
| Add a route to a service | `backend/platform/api-gateway/.../application.yml` |
| Add an endpoint | `<service>/.../<feature>/controller/` (follow crm-service) |
| Change JWT handling | `<service>/.../security/` (currently duplicated per service) |
| Add a DB change | `<service>/src/main/resources/db/migration/V{n}__*.sql` |
| Call another service | Feign client under `<service>/.../<integration>/` |
| Change service config | `<service>/src/main/resources/application.yml` |

See the [backend coding standards](../coding-standards/backend-spring-boot.md) for target
conventions and the [backend audit](../audit/backend.md) for outstanding issues.

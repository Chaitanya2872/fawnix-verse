# How To Handle It Properly

The recurring anti-patterns in this codebase, each paired with the correct approach and a code
sketch. This is the teaching companion to the findings — aimed at a team that copy-pasted because
nobody had shown the shared-abstraction pattern. Cross-links to the
[coding standards](../../coding-standards/).

---

## Backend

### <a id="jpa-audit-fields"></a>1. Audit timestamps → JPA Auditing (not 46 copies)

**Anti-pattern** (in 46 entities): every entity re-declares `createdAt`/`updatedAt` + accessors, and
service code sets them by hand.

**Proper:**
```java
// common-jpa/com/fawnix/common/jpa/BaseAuditEntity.java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseAuditEntity {
    @CreatedDate      @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt;
    @LastModifiedDate @Column(name="updated_at", nullable=false)                  private Instant updatedAt;
    public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
```
```java
@SpringBootApplication @EnableJpaAuditing          // once per service
public class CrmServiceApplication { … }

@Entity @Table(name="accounts")
public class AccountEntity extends BaseAuditEntity { /* audit block gone */ }
```
Delete every manual `entity.setCreatedAt(Instant.now())`. → removes ~550 LOC, one place to fix bugs.

---

### <a id="shared-library-modules"></a>2. Cross-cutting code → shared Maven modules (not 15 copies)

**Anti-pattern**: `JwtAuthenticationFilter`/`JwtService`/`SecurityConfig` copied into 15 services;
`GlobalExceptionHandler`/`ApiErrorResponse` into 6.

**Proper:** create sibling modules under `backend/` and add them to the parent `<modules>`:

| Module | Contains |
|---|---|
| `common-jpa` | `BaseAuditEntity` |
| `common-web` | `GlobalExceptionHandler`, `ApiErrorResponse` |
| `common-security` | JWT filter/service/config/properties/user-details |
| `common-util` | `trimToNull`, shared helpers |

```xml
<!-- each service pom.xml -->
<dependency><groupId>com.fawnix</groupId><artifactId>common-security</artifactId></dependency>
```
A service that needs custom rules overrides only one bean:
```java
@Bean SecurityFilterChain chain(HttpSecurity http, JwtAuthenticationFilter jwt) throws Exception {
    return CommonSecurity.baseline(http, jwt)                 // shared config
        .authorizeHttpRequests(a -> a.requestMatchers("/internal/**").permitAll())
        .build();
}
```
Use a neutral package (`com.fawnix.common.*`) so the `com.hirepath` services can depend on it too.
A security fix is then made **once**.

---

### <a id="shared-contracts-for-feign"></a>3. Inter-service DTOs → one versioned contract (not per-consumer copies)

**Anti-pattern**: each caller copies the provider's request DTO into its own `client/dto/`. They start
identical and silently drift (task-service's `SendNotificationRequest` already lost 2 fields).

**Proper:** a `*-api-contract` module per provider, holding the DTO **and** the Feign interface:
```java
// notifications-api-contract
public record SendNotificationRequest(List<RecipientTarget> recipients, NotificationContent content) {}

@FeignClient(name = "notifications-service")
public interface NotificationsClient {
    @PostMapping("/internal/notifications/send") void send(@RequestBody SendNotificationRequest req);
}
```
Provider and every caller depend on the contract module — the class exists exactly once. Version the
module so breaking changes are explicit.

---

### 4. External calls → outside the transaction

**Anti-pattern**: HTTP call to inventory/WhatsApp while a DB transaction is open ([B3](./real-bugs.md)).

**Proper:** commit first, react after commit.
```java
@Transactional
public void submitOrder(String id) {
    var order = …; order.setStatus(APPROVED); repo.save(order);
    events.publishEvent(new OrderApprovedEvent(order.getId(), items));   // in-txn
}
@TransactionalEventListener(phase = AFTER_COMMIT)
public void reserve(OrderApprovedEvent e) { inventoryClient.reserve(e.orderId(), e.items()); }
```
Never let an external system's latency hold a DB connection, and never leave the DB and an external
system in split-brain state.

---

### 5. IDs → DB sequences (not `count()+1` or `random+exists`)

**Anti-pattern**: `taskRepository.count()+1`, or random + `existsByOrderNumber` ([B4](./real-bugs.md)).
Both race under concurrency and re-use retired numbers.

**Proper:**
```sql
CREATE SEQUENCE task_code_seq START 1;
```
```java
@GeneratedValue(strategy=SEQUENCE, generator="task_code_seq")
@SequenceGenerator(name="task_code_seq", sequenceName="task_code_seq", allocationSize=1)
private Long codeNumber;   // render "TSK-%05d" after insert
```

---

### 6. Reads → predicate + paginate in SQL (not `findAll().stream().filter`)

**Anti-pattern**: load the whole table, filter/authorize/count in Java (K1–K3, K5–K7).

**Proper:** push it to the query, page it, and preload per-user sets once:
```java
Page<TaskEntity> findByAssigneeOrSpaceMember(String userId, Set<String> spaceIds, Pageable pageable);
// counts:
long countByStatusInAndScheduledAtBefore(List<Status> s, Instant t);
```
For batch mapping, load related rows with `@EntityGraph`/one `findByIdIn` and group into a `Map`.

---

## Frontend

### 7. Server data → `queryKeys.ts` + `hooks.ts` + types (not inline `useQuery`)

**Anti-pattern**: `useQuery(['positions'], …)` scattered in components with `any` responses.

**Proper:** one factory + one hook per resource, typed:
```ts
// queryKeys.ts
export const recruitmentKeys = {
  all: ['recruitment'] as const,
  positions: (status?: string) => [...recruitmentKeys.all, 'positions', status] as const,
  candidate: (id: string)     => [...recruitmentKeys.all, 'candidate', id] as const,
};
// hooks.ts
export const usePositions = (status?: string) =>
  useQuery({ queryKey: recruitmentKeys.positions(status),
             queryFn: () => recruitmentApi.listPositions(status), staleTime: 30_000 });
export const useCreatePosition = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: recruitmentApi.createPosition,
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitmentKeys.positions() }) });
};
```
And set global defaults once in `src/app/providers.tsx` (`staleTime`, `retry`, `refetchOnWindowFocus`).
See [frontend standards §4](../../coding-standards/frontend-react-typescript.md#4-server-state--tanstack-query-v5).

### 8. Forms → `react-hook-form` + Zod (not 26 `useState`)

**Anti-pattern**: a panel with 18–26 `useState` and a parent drilling `on*Change` setters.

**Proper:**
```ts
const schema = z.object({ vendorId: z.string().uuid(), amount: z.number().positive() });
type Form = z.infer<typeof schema>;
const { register, handleSubmit, formState:{errors} } =
  useForm<Form>({ resolver: zodResolver(schema), defaultValues: buildDefaults(req) });
```
The panel owns its state; the parent only gives defaults + `onSubmit`.

### 9. Big components → decompose by view/concern

A route component over ~400 lines, or with 15+ `useState`, is a refactor signal. Extract views
(`BoardView`, `FormPreview`) and data hooks (`useTaskFilters`); the page becomes a thin composition.

### 10. Shared utilities → one home

`formatCurrency`/`formatDate` in `src/lib/format.ts`; status-tone maps and `<P2PStatCard>`,
`<P2PSelectField>` in `src/modules/purchases/p2p/components/`. Merge classes with `cn()`, never string
concatenation. Delete `"use client"` and dead SSR guards. Type API responses; don't `any` them.

### 11. Types → generate, don't hand-`any`

Generate from the backend (`openapi-typescript`/`orval`) so the client can't drift from the server.
In manual mappers, use `unknown` + narrowing (that is their whole purpose).

---

## Process (so it stops recurring)

The root cause is not any single developer — it is the **absence of guardrails**. Add them:

1. **CI gates** (warn-first, then enforce): `tsc --noEmit`, `eslint --max-warnings 0`,
   `prettier --check`, `mvn spotless:check`, and — once written — tests. A junior can't merge `any`,
   an unused var, or an unformatted file. See [DevOps standards §4](../../coding-standards/docker-devops.md#4-cicd).
2. **A tiny test suite first** (there are zero): unit-test the money math (B1), `JwtService`, and one
   repository with Testcontainers. Tests make the refactors above safe.
3. **One reference module, then replicate.** Make `crm/leads` (frontend) and `crm-service` (backend)
   the canonical templates; bring one weak module up to standard as a worked example, then fan out.
4. **A duplication check** (`jscpd`) in CI to stop new copy-paste at the door.
5. **PR review checklist**: no new `any`, no inline query keys, no `findAll().filter`, no HTTP in a
   transaction, no copied DTO/entity/security class — point to this doc.

The abstractions in §1–§6 remove ~5,000+ LOC of duplication; the guardrails keep it removed.

# inventory-service — Service Audit

**Date:** 2026-07-14
**Auditor:** Claude Code (claude-sonnet-4-6)
**Revision base:** commit `5939027`

---

## Summary

`inventory-service` is a Spring Boot 3 microservice managing products, stock transactions, warehouses, and inventory reservations for the Fawnix-Verse platform. It follows a clean package-by-feature layout (`com.fawnix.inventory.*`) with no `com.hirepath` namespace contamination. The overall code quality is above average for a junior team: BigDecimal is used correctly for money, Flyway migrations are ordered correctly, and a GlobalExceptionHandler is present. However, three issues require urgent attention before production: a **concurrency race condition** on stock reservation (no database-level lock), a **permissive internal-auth bypass** when `INTERNAL_SERVICE_SECRET` is not set in the environment, and **unbounded `findAll()` queries** (full table scans on transactions and products) that will OOM under realistic load. A hardcoded default JWT secret in `application.yml` is a latent security risk. Zero tests exist.

---

## Surface Map

### Endpoints

| Controller | Method | Path | Auth |
|---|---|---|---|
| ProductController | GET | `/inventory` | JWT |
| ProductController | GET | `/inventory/overview` | JWT |
| ProductController | GET | `/inventory/{id}` | JWT |
| ProductController | POST | `/inventory` | JWT |
| ProductController | PATCH | `/inventory/{id}` | JWT |
| ProductController | DELETE | `/inventory/{id}` | JWT |
| StockTransactionController | GET | `/inventory/transactions` | JWT |
| StockTransactionController | POST | `/inventory/transactions` | JWT |
| StockTransactionController | POST | `/inventory/transactions/products/{productId}/receive` | JWT |
| StockTransactionController | POST | `/inventory/transactions/products/{productId}/consume` | JWT |
| InternalInventoryReservationController | POST | `/internal/inventory/reservations/reserve` | X-Internal-Service-Secret |
| InternalInventoryReservationController | POST | `/internal/inventory/reservations/validate` | X-Internal-Service-Secret |
| InternalInventoryReservationController | POST | `/internal/inventory/reservations/fulfill` | X-Internal-Service-Secret |

### Entities / Tables

| Entity | Table | Notes |
|---|---|---|
| `ProductEntity` | `products` | SKU unique index, status enum stored as VARCHAR |
| `StockTransactionEntity` | `stock_transactions` | ManyToOne → products (LAZY), no unique constraint on `txn_ref` |
| `WarehouseEntity` | `warehouses` | No FK to products; warehouses and products are completely unlinked |

### Flyway Migrations

| Version | File | Summary |
|---|---|---|
| V1 | `V1__baseline.sql` | `service_metadata` table + bootstrap insert |
| V2 | `V2__create_inventory_schema.sql` | Creates `products` + `stock_transactions` tables with indexes |
| V3 | `V3__add_product_price_tiers.sql` | Adds `price_tier_1/2/3` columns to `products` |
| V4 | `V4__seed_inventory_catalog.sql` | Bulk-inserts 100+ product catalog rows |
| V5 | `V5__add_product_reserved_qty.sql` | Adds `reserved_qty` column (NOT NULL DEFAULT 0) |
| V6 | `V6__create_warehouses.sql` | Creates `warehouses` table with case-insensitive unique index on code |

### Outbound Calls / External Dependencies

None — no Feign clients, no RestTemplate, no WebClient. The service is a pure standalone microservice consuming its own PostgreSQL database and registering with Eureka.

### Config Properties (`application.yml` keys)

| Property | Source | Default | Risk |
|---|---|---|---|
| `spring.datasource.url` | `INVENTORY_DB_URL` | `jdbc:postgresql://localhost:5432/fawnix_inventory` | Dev default leaks in prod if env not set |
| `spring.datasource.username` | `INVENTORY_DB_USERNAME` | `postgres` | Generic credential default |
| `spring.datasource.password` | `INVENTORY_DB_PASSWORD` | `postgres` | Hardcoded fallback password |
| `app.security.jwt.secret` | `JWT_SECRET` | `change-this-local-dev-secret-change-this-local-dev-secret` | **Hardcoded secret — see INV-05** |
| `app.security.internal-service-secret` | `INTERNAL_SERVICE_SECRET` | `""` (empty string) | **Empty default — see INV-03** |
| `server.port` | `SERVER_PORT` | `8083` | Fine |

---

## Findings

### P0 — Critical (data corruption or security breach possible in production)

---

#### INV-01 — Race Condition in Stock Reservation: No Database-Level Lock

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/reservations/service/InventoryReservationService.java:33–41`
**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
ProductEntity product = productRepository.findById(item.productId().trim())
    .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

BigDecimal available = productService.getAvailableStock(product);  // reads in-memory state
if (available.compareTo(item.quantity()) < 0) {
    throw new BadRequestException("Insufficient stock for " + product.getName() + ".");
}
productService.reserveStock(product, item.quantity());  // writes using same in-memory state
```

**Why it is wrong:**
Two concurrent `POST /internal/inventory/reservations/reserve` requests both load the same product row (stock=10, reserved=0). Both compute `available = 10`, both pass the check, and both call `reserveStock`. Each call increments `reservedQty` on its own in-memory `ProductEntity` copy and saves. PostgreSQL `READ COMMITTED` (the default) means neither transaction sees the other's uncommitted write. The result is `reserved_qty` is set to `quantityA` by TX1 and then overwritten with `quantityB` by TX2 — one reservation is silently lost, and `reserved_qty` never reflects the combined obligation. Over-commitment of stock then leads to fulfill calls that corrupt `stock_qty` below zero (blocked only by the application-level check, which is also racy).

`ProductService.reserveStock()` also checks available stock internally at line 268, but it uses the same already-loaded in-memory entity, so the double-check provides no protection.

**Proper fix:**
Use pessimistic locking to serialize concurrent reservations per product:

```java
// In ProductRepository:
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM ProductEntity p WHERE p.id = :id")
Optional<ProductEntity> findByIdForUpdate(@Param("id") String id);
```

Then call `findByIdForUpdate` inside `InventoryReservationService.reserve()` (which is already `@Transactional`). Each request will hold a row-level lock until the transaction commits, preventing the race.

Alternatively, add a `@Version Long version` field to `ProductEntity` for optimistic locking, but pessimistic is simpler here since the `/reserve` endpoint is inherently a write and contention is expected.

---

#### INV-02 — Unbounded `findAll()` in Overview + Transactions Endpoints: OOM Risk

**Files:**
- `ProductService.java:82–87` (overview)
- `StockTransactionRepository.java:9` (`findAllByOrderByTxnDateDescCreatedAtDesc`)
- `StockTransactionService.java:41` (listTransactions)

**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code (overview, ProductService.java:82–83):**
```java
List<ProductEntity> products = productRepository.findAll(Sort.by(...));
List<StockTransactionEntity> outwardTransactions = stockTransactionRepository.findAll().stream()
    .filter(t -> t.getTxnType() == TransactionType.OUTWARD)
    ...
```

**Offending code (list transactions, StockTransactionService.java:38–41):**
```java
if (sku == null || sku.isBlank()) {
    transactions = transactionRepository.findAllByOrderByTxnDateDescCreatedAtDesc();
}
```

**Why it is wrong:**
`stockTransactionRepository.findAll()` loads every transaction row into heap with no limit. With a modest 50k rows at ~200 bytes each, that is ~10 MB per request — but a catalog import event could produce hundreds of thousands of rows quickly. The overview endpoint will time out and OOM well before that. Similarly, `GET /inventory/transactions` with no `sku` filter will dump the entire table as JSON with no pagination, making it unusable at scale.

Additionally, the in-Java filter (`filter(t -> t.getTxnType() == OUTWARD)`) throws away INWARD/RECEIVED/etc. rows after loading them all from the DB — a textbook filter-in-Java on an unbounded result set.

**Proper fix:**
1. **Overview endpoint:** Add a `@Query` to fetch only `OUTWARD` transactions with a date range (last 90 days) and a `LIMIT 12` for the recent-consumption list. Do not call `stockTransactionRepository.findAll()`.
2. **List transactions:** Add pagination. Add a `@Query` to filter by `txn_type` in SQL.

```java
// In StockTransactionRepository:
@Query("SELECT t FROM StockTransactionEntity t WHERE t.txnType = :type ORDER BY t.txnDate DESC, t.createdAt DESC")
Page<StockTransactionEntity> findByType(@Param("type") TransactionType type, Pageable pageable);

List<StockTransactionEntity> findByTxnTypeOrderByTxnDateDescCreatedAtDesc(TransactionType type);
```

---

#### INV-03 — Empty Internal-Service Secret: Authentication Bypass When Env Var Is Unset

**Files:**
- `application.yml:36` — `internal-service-secret: ${INTERNAL_SERVICE_SECRET:}`
- `InternalServiceAuthFilter.java:20–23, 39`

**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code (InternalServiceAuthFilter.java:39):**
```java
if (!Objects.equals(internalServiceSecret, provided)) {
    response.setStatus(HttpStatus.FORBIDDEN.value());
    return;
}
```

**Offending code (application.yml:36):**
```yaml
internal-service-secret: ${INTERNAL_SERVICE_SECRET:}   # default is empty string ""
```

**Why it is wrong:**
When `INTERNAL_SERVICE_SECRET` is not set in the environment (e.g., local dev, a misconfigured staging deploy), `internalServiceSecret` is an empty string `""`. The filter then passes any caller who sends the header `X-Internal-Service-Secret: ` (an empty value) or who crafts a request where `Objects.equals("", "")` evaluates to `true`. Furthermore, if the env var is absent and the deployed environment happens to allow sending an empty header, any unauthenticated service can call `/internal/inventory/reservations/reserve` and corrupt stock without a valid JWT.

The `SecurityConfig.java:45` also has `.requestMatchers("/internal/**").permitAll()`, meaning the Spring Security layer does NOT gate this path — the only protection is the filter. If the filter is bypassed (empty secret), the endpoints are wide open.

**Proper fix:**
1. Remove the empty default. Force the secret to be set:
```yaml
internal-service-secret: ${INTERNAL_SERVICE_SECRET}  # no default — app will fail to start if unset
```
2. Add a startup validation in the filter constructor:
```java
public InternalServiceAuthFilter(@Value("${app.security.internal-service-secret}") String internalServiceSecret) {
    if (internalServiceSecret == null || internalServiceSecret.isBlank()) {
        throw new IllegalStateException("INTERNAL_SERVICE_SECRET must be configured");
    }
    this.internalServiceSecret = internalServiceSecret;
}
```

---

### P1 — High (functional bugs or security issues that will surface in normal use)

---

#### INV-04 — N+1 Query in `listTransactions` and `getOverview`: Lazy Product Load Per Transaction

**Files:**
- `StockTransactionService.java:126–131`
- `ProductService.java:132–146`

**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code (StockTransactionService.java:128–130):**
```java
private TransactionDtos.TransactionResponse toResponse(StockTransactionEntity entity) {
    return new TransactionDtos.TransactionResponse(
        entity.getId(),
        entity.getProduct().getSku(),    // triggers LAZY load
        entity.getProduct().getName(),   // triggers LAZY load (second access, may be cached in session)
        ...
    );
}
```

**Why it is wrong:**
`StockTransactionEntity.product` is `@ManyToOne(fetch = FetchType.LAZY)`. When `listTransactions` loads N transactions and maps them with `toResponse`, JPA issues a separate `SELECT * FROM products WHERE id = ?` for each transaction's product. With `open-in-view: false` and an active `@Transactional(readOnly = true)`, the session is open so no `LazyInitializationException` occurs — but the DB is hit N+1 times. Similarly, in `getOverview`, the `recentConsumption.stream()` at `ProductService.java:132–146` calls `transaction.getProduct()` 12 times with no batch fetch.

**Proper fix:**
Add a JPQL query with `JOIN FETCH` or use a Hibernate batch fetch size:

```java
// Option A - repository method with join fetch:
@Query("SELECT t FROM StockTransactionEntity t JOIN FETCH t.product ORDER BY t.txnDate DESC, t.createdAt DESC")
List<StockTransactionEntity> findAllWithProductOrderByTxnDateDesc();

// Option B - entity-level batch:
// In StockTransactionEntity:
@ManyToOne(fetch = FetchType.LAZY)
@BatchSize(size = 50)
@JoinColumn(name = "product_id", nullable = false)
private ProductEntity product;
```

---

#### INV-05 — Hardcoded JWT Secret Default in `application.yml`

**File:** `backend/services/inventory-service/src/main/resources/application.yml:41`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```yaml
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
```

**Why it is wrong:**
If `JWT_SECRET` is not injected (misconfigured prod deploy, secret manager failure), the service falls back to a known, committed plaintext secret. Any attacker who reads the GitHub repository can forge valid JWTs — roles, permissions, userId — and authenticate as any user. The default secret is 57 characters (456 bits as UTF-8), which satisfies jjwt's minimum key size check, so the service starts normally with no warning.

**Proper fix:**
Remove the default entirely, forcing a startup failure if the env var is absent. If local dev convenience is needed, use a `.env.local` file that is gitignored:

```yaml
secret: ${JWT_SECRET}  # required — no fallback
```

---

#### INV-06 — `PATCH /inventory/{id}` Missing `@Valid`: Negative Prices and Quantities Bypass Validation

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/products/controller/ProductController.java:57–63`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
@PatchMapping("/{id}")
public ProductDtos.ProductResponse updateProduct(
    @PathVariable String id,
    @RequestBody ProductDtos.UpdateProductRequest request  // No @Valid
) {
```

**Why it is wrong:**
`CreateProductRequest` has `@DecimalMin("0.00")` on price, stockQty, and reorderLevel. `UpdateProductRequest` has no constraints at all. Because `@Valid` is absent from the controller parameter, even if constraints were added to `UpdateProductRequest`, they would never fire. A client can PATCH a product with `price = -9999.00`, setting it to a negative value. This corrupts catalog data used for line-total calculations in stock transactions.

**Proper fix:**
1. Add `@Valid` to the PATCH parameter.
2. Add `@DecimalMin("0.00")` constraints to `UpdateProductRequest` (mirroring `CreateProductRequest`).

```java
@PatchMapping("/{id}")
public ProductDtos.ProductResponse updateProduct(
    @PathVariable String id,
    @Valid @RequestBody ProductDtos.UpdateProductRequest request  // add @Valid
)
```

---

#### INV-07 — Confusing Double Base64 Encoding in `JwtService.getSigningKey()`: Key Derivation Defect

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/security/jwt/JwtService.java:68–72`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
}
```

**Why it is wrong:**
The intent of this pattern is: the secret is expected to already be a base64-encoded string in config, and `Decoders.BASE64.decode()` converts it to raw bytes for the HMAC key. However, the code wraps that decode in `Base64.getEncoder().encodeToString(secret.getBytes())` first, which re-encodes the raw string to base64 and then immediately decodes it back. The net effect is `Keys.hmacShaKeyFor(secret.getBytes())` — using the raw UTF-8 bytes of the secret string as the HMAC key.

This means:
1. The code does not match its apparent intent (base64-encoded secret in config).
2. If a deployer configures `JWT_SECRET` as a proper base64 string (the common pattern), the key will be derived from the base64 string's UTF-8 bytes rather than the decoded bytes — producing a different key than all other services that derive the key correctly.
3. The identity service and other services almost certainly use a different derivation, meaning tokens issued by the identity service may not be verified correctly (or vice versa), depending on how those services decode the key.

**Proper fix:**
Pick one consistent convention across all services. If the secret is stored as a base64-encoded string:

```java
private Key getSigningKey() {
    byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getSecret());
    return Keys.hmacShaKeyFor(keyBytes);
}
```

If it is stored as a raw string, use `.getBytes()` directly:
```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
}
```

Verify this matches the identity-service's `JwtService` derivation exactly. The two must agree or cross-service token validation will silently fail.

---

### P2 — Medium (design issues, data integrity risks, non-obvious bugs)

---

#### INV-08 — `GET /inventory/transactions` Has No Pagination: Unusable at Scale

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/transactions/controller/StockTransactionController.java:27–31`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
@GetMapping
public TransactionDtos.TransactionListResponse listTransactions(
    @RequestParam(required = false) String sku
) {
    return transactionService.listTransactions(sku);
}
```

**Why it is wrong:**
`TransactionListResponse` wraps a plain `List<TransactionResponse>` with no `total`, `page`, or `totalPages` fields. The endpoint dumps all transactions for a SKU (or all transactions with no filter) as a single unbounded response. `ProductController.listProducts` has proper pagination — the inconsistency is a sign of copy-paste drift. In practice this means the frontend will receive megabytes of JSON as the catalog grows.

**Proper fix:**
Add `page`/`pageSize` params and convert `listTransactions` to use `Pageable`:
```java
@GetMapping
public TransactionDtos.TransactionListResponse listTransactions(
    @RequestParam(required = false) String sku,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "50") int pageSize
)
```
Add a `total` / `totalPages` wrapper to `TransactionListResponse` matching `ProductListResponse`.

---

#### INV-09 — `reserve()` Response Returns Wrong `reservedQuantity` Field

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/reservations/service/InventoryReservationService.java:43–50`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
responses.add(new InventoryReservationDtos.ReserveInventoryLineResponse(
    product.getId(),
    product.getSku(),
    product.getName(),
    item.quantity(),           // requestedQuantity
    available,                 // availableBeforeReservation
    item.quantity()            // reservedQuantity <-- wrong: should be product.getReservedQty() after update
));
```

**Why it is wrong:**
The `reservedQuantity` field in the response is meant to tell the caller how much is now reserved after this call. It is set to `item.quantity()` (what was just requested), which coincidentally equals the new reserved amount only if `reservedQty` was zero before. If the product already had existing reservations (`reservedQty = 5`) and the caller reserves 3 more, the response reports `reservedQuantity = 3` when the true DB state is `reservedQty = 8`. Any service consuming this response and trusting `reservedQuantity` will have incorrect state.

The same pattern appears in `fulfill()` at line 105–110.

**Proper fix:**
Read the post-save `reservedQty` from the entity:
```java
productService.reserveStock(product, item.quantity());
// product.getReservedQty() now reflects the new total after reserveStock's save
responses.add(new ReserveInventoryLineResponse(
    product.getId(), product.getSku(), product.getName(),
    item.quantity(),
    available,
    product.getReservedQty()   // actual post-reservation total
));
```

---

#### INV-10 — Silent Token Validation Failure: JWT Parse Exception Is Swallowed

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/security/filter/JwtAuthenticationFilter.java:43–57`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
try {
    AppUserDetails userDetails = jwtService.toUserDetails(token);
    if (jwtService.isTokenValid(token)) {
        ...
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);
```

**Why it is wrong:**
`catch (Exception ignored)` swallows every exception silently. If the JWT library throws a `SignatureException` (wrong signing key), a `MalformedJwtException`, or any other parsing error, the filter clears the security context and proceeds with the request unauthenticated. The next filter chain step will hit `anyRequest().authenticated()` and return a 401 — correct behavior. However:

1. No log is emitted. Security events (forged tokens, signing key mismatches) are invisible in logs.
2. The `isTokenValid()` call at line 45 parses the JWT a second time via `extractClaims()`, meaning a valid-signature expired token triggers two parse calls and the second exception from `isTokenValid()` is also swallowed inside `isTokenValid`'s own try-catch.
3. The token string from line 44 is parsed by `toUserDetails()` first. If `toUserDetails()` succeeds but `isTokenValid()` returns `false` (expired token), the `authentication` object is correctly not set — but the try-catch structure makes this hard to reason about.

**Proper fix:**
Log the exception at WARN level and eliminate the double-parse:
```java
try {
    if (jwtService.isTokenValid(token)) {
        AppUserDetails userDetails = jwtService.toUserDetails(token);
        UsernamePasswordAuthenticationToken auth = ...;
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
} catch (JwtException ex) {
    log.warn("Invalid JWT token for {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);
```

---

#### INV-11 — `updateProduct` Allows Direct `stockQty` Overwrite Without Creating a Transaction Record

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/products/service/ProductService.java:235–241`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
if (request.stockQty() != null) {
    product.setStockQty(scale(request.stockQty()));
}
product.setStatus(resolveStatus(product.getStockQty(), product.getReorderLevel()));
product.setUpdatedAt(Instant.now());
return toResponse(productRepository.save(product));
```

**Why it is wrong:**
`PATCH /inventory/{id}` allows setting `stockQty` to any value with no corresponding `StockTransactionEntity` record. This creates an inventory audit gap: the `stock_transactions` table will not reflect the adjustment, the `getOverview()` consumption summary will be wrong, and any reconciliation report will show unaccountable stock changes. The stock adjustment methods (`applyStockAdjustment`, `receiveStock`, `consumeStock`) all create transaction records — the direct patch bypasses this entirely.

**Proper fix:**
Remove `stockQty` from `UpdateProductRequest`. Stock quantity changes must go through the transaction endpoints. If an administrative override is truly needed, create a dedicated `POST /inventory/{id}/adjust` endpoint that creates an `ADJUSTMENT` transaction type and records the actor.

---

#### INV-12 — Warehouses Are Completely Disconnected From Products and Transactions

**Files:**
- `WarehouseEntity.java` (no FK to products)
- `ProductEntity.java` (no `warehouseId` field)
- `V6__create_warehouses.sql` (no FK constraints linking warehouses to products or transactions)

**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Why it is wrong:**
The `warehouses` table was added in V6 but `products` and `stock_transactions` have no warehouse reference. This means all inventory is implicitly "at one location." The `WarehouseService` exposes full CRUD but the data has zero operational effect. Callers of the reservation API have no way to specify which warehouse to reserve from, and `getOverview()` doesn't aggregate stock by warehouse. This is either an incomplete feature that ships as "done" or a schema that will require a breaking migration later.

**Proper fix:**
Add a `warehouse_id` FK to the `products` table (or a separate `product_warehouse_stock` join table for multi-location). Block merging of warehouse-related feature work until the data model is connected. Alternatively, document explicitly that warehouses are a future capability not yet linked to inventory tracking.

---

### P3 — Low (code quality, maintainability, minor design issues)

---

#### INV-13 — `trimToNull` and `scale` Are Copy-Pasted Across Three Service Classes

**Files:**
- `ProductService.java:448–454, 409–411`
- `StockTransactionService.java:163–169, 152–154`
- `WarehouseService.java:238–244, 234–236`

**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code (identical in all three):**
```java
private String trimToNull(String value) {
    if (value == null) { return null; }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
}

private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
}
```

**Why it is wrong:**
Six private methods with identical bodies. If the rounding mode needs to change to `HALF_EVEN` (banker's rounding), it must be changed in three places. A junior will miss one. Extract to a shared `InventoryStringUtils` and `MoneyUtils` class in `com.fawnix.inventory.common`.

**Proper fix:**
```java
// common/util/StringUtils.java
public final class StringUtils {
    private StringUtils() {}
    public static String trimToNull(String value) { ... }
}

// common/util/MoneyUtils.java
public final class MoneyUtils {
    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    public static BigDecimal scale(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
}
```

---

#### INV-14 — `ForbiddenOperationException` Is Declared and Handled But Never Thrown

**Files:**
- `ForbiddenOperationException.java`
- `GlobalExceptionHandler.java:49–56`

**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Why it is wrong:**
`ForbiddenOperationException` is declared and has a dedicated `@ExceptionHandler` but is thrown nowhere in the codebase. This is dead code that inflates the exception hierarchy and confuses readers into looking for where business-rule authorization is enforced. Spring Security's `AccessDeniedException` (already handled at line 58) covers the role/permission gate.

**Proper fix:**
Either delete `ForbiddenOperationException` and its handler, or actually use it where role-based business rules apply (e.g., a non-admin trying to delete a product with active reservations).

---

#### INV-15 — `createTransaction` Delta-Zero Guard Is Unreachable Dead Code

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/transactions/service/StockTransactionService.java:73–76`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
BigDecimal delta = resolveDelta(request.txnType(), entity.getQuantity());
if (delta.compareTo(BigDecimal.ZERO) == 0) {
    throw new BadRequestException("Quantity must be greater than zero.");
}
```

**Why it is wrong:**
`request.quantity()` is validated as `@DecimalMin("0.01")` in `CreateTransactionRequest`, so `entity.getQuantity()` is always ≥ 0.01. `resolveDelta()` returns either `+quantity` or `-quantity` (negation), never zero. The guard can never be reached. It misleads readers into thinking there is a code path where delta is zero.

**Proper fix:** Remove lines 73–76. The DTO validation already guarantees this.

---

#### INV-16 — JWT Token Parsed Twice Per Request in `JwtAuthenticationFilter`

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/security/filter/JwtAuthenticationFilter.java:44–55`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```java
AppUserDetails userDetails = jwtService.toUserDetails(token); // parse #1
if (jwtService.isTokenValid(token)) {                          // parse #2 via extractClaims()
```

**Why it is wrong:**
Every authenticated request causes two full JJWT parse+signature-verify cycles. This is wasteful — `toUserDetails()` already calls `extractClaims()`, which validates the signature. The expiry check in `isTokenValid()` simply reads the `exp` claim from already-parsed claims. Parsing twice doubles the CPU cost of signature verification (HMAC-SHA256) on every request.

**Proper fix:**
Combine into one parse:
```java
Claims claims = jwtService.extractClaims(token); // expose as package-visible
if (claims.getExpiration().toInstant().isAfter(Instant.now())) {
    AppUserDetails userDetails = jwtService.fromClaims(claims);
    ...
}
```

---

#### INV-17 — `DataIntegrityViolationException` Exposed Verbatim as 400 Response

**File:** `backend/services/inventory-service/src/main/java/com/fawnix/inventory/common/exception/GlobalExceptionHandler.java:35–47`
**Severity:** P3 | **Confidence:** Med
**Owner:** Chaitanya2872

**Offending code:**
```java
@ExceptionHandler({
    BadRequestException.class,
    IllegalArgumentException.class,
    ConstraintViolationException.class,
    DataIntegrityViolationException.class
})
public ResponseEntity<ApiErrorResponse> handleBadRequest(
    RuntimeException exception,
    HttpServletRequest request
) {
    LOGGER.warn("Bad request for ... {}", exception.getMessage());
    return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request, Map.of());
}
```

**Why it is wrong:**
`DataIntegrityViolationException.getMessage()` includes the raw JDBC error string, e.g., `ERROR: duplicate key value violates unique constraint "ux_warehouses_code_lower" Detail: Key (lower(warehouse_code))=(WH-MAIN) already exists.`. This leaks schema internals (constraint names, column names) to API clients. It also returns the error as a 400, which is correct for constraint violations from user input, but the message should be sanitized.

**Proper fix:**
Add a dedicated handler that maps to a safe user-facing message:
```java
@ExceptionHandler(DataIntegrityViolationException.class)
public ResponseEntity<ApiErrorResponse> handleIntegrityViolation(
    DataIntegrityViolationException ex, HttpServletRequest request
) {
    LOGGER.warn("Data integrity violation for {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
    return build(HttpStatus.CONFLICT, "A resource with conflicting data already exists.", request, Map.of());
}
```

---

## Redundancy

### Cross-Service Copy-Paste of Security Infrastructure

The entire `security/` package is replicated across at least 10 services in this monorepo:

| File | inventory-service | Other service |
|---|---|---|
| `JwtService.java` | `com/fawnix/inventory/security/jwt/JwtService.java` | `com/fawnix/sales/security/jwt/JwtService.java` — diff only in package declaration (confirmed via `diff`) |
| `AppUserDetails.java` | `com/fawnix/inventory/security/service/AppUserDetails.java` | 10 other copies found across analytics, task, project, approval, forms, notifications, org, recruitment services |
| `InternalServiceAuthFilter.java` | `com/fawnix/inventory/security/filter/InternalServiceAuthFilter.java` | 7 other copies found |
| `GlobalExceptionHandler.java` | `com/fawnix/inventory/common/exception/GlobalExceptionHandler.java` | 5 other copies: sales, task, crm, procurement, identity services — diff only in package imports |

These 28+ files are line-for-line copies modulo package declarations. The `JwtService.getSigningKey()` double-encoding bug (INV-07) exists in every copy and cannot be fixed atomically. Any security patch requires manually editing every service. This is a maintenance and security debt sink.

**Recommendation:** Extract `JwtService`, `AppUserDetails`, `InternalServiceAuthFilter`, `ApiErrorResponse`, and `GlobalExceptionHandler` into a shared `fawnix-security-commons` Maven module, published as a `<scope>compile</scope>` dependency. All services import the module; security patches are made in one place.

### `trimToNull` / `scale` Within inventory-service

- `ProductService.java:448–454` == `StockTransactionService.java:163–169` == `WarehouseService.java:238–244`
- `ProductService.java:409–411` == `StockTransactionService.java:152–154` == `WarehouseService.java:234–236`

See INV-13 for fix.

---

## Tests & Gaps

**Zero test coverage.** There is no `src/test` directory. No unit tests, no integration tests, no slice tests (no `@WebMvcTest`, no `@DataJpaTest`, no `@SpringBootTest`). The `pom.xml` declares no test framework dependency beyond Spring Boot's transitive test starter.

**Critical gaps** (ordered by impact):

1. No test for the reservation race condition (INV-01) — would require a concurrent test with two threads and a testcontainer PostgreSQL.
2. No test for the `listTransactions` unbounded query (INV-02) — a simple slice test with 1000 rows would expose the missing pagination.
3. No test for `InternalServiceAuthFilter` with empty/null/correct/wrong secret (INV-03).
4. No test for `updateProduct` accepting negative prices (INV-06).
5. No test for `JwtAuthenticationFilter` behavior with expired, malformed, or wrongly-signed tokens (INV-10).
6. No test for stock adjustment arithmetic (`applyStockAdjustment`, `fulfillReservedStock`, `reserveStock`) edge cases (zero stock, over-fulfillment).
7. No test for `getOverview` with zero products / zero transactions.

Minimum viable test plan: add `@DataJpaTest` for `ProductRepository`, `@WebMvcTest` for `ProductController` and `StockTransactionController`, and a `@SpringBootTest` integration test using Testcontainers for the reservation race condition.

---

## Coverage Note

**Fully inspected (line-by-line):**
- All 37 Java source files
- All 6 Flyway migrations
- `application.yml`
- `pom.xml`

**Cross-service redundancy check:**
- Compared `GlobalExceptionHandler`, `JwtService`, `AppUserDetails`, `InternalServiceAuthFilter` against peer services using `diff` — confirmed copy-paste at package-declaration level only.

**Not inspected:**
- The parent `pom.xml` at `backend/services/` level (not read; only referenced `jjwt.version` in `pom.xml`).
- Other services' `application.yml` — could not confirm whether `jwt.secret` derivation in identity-service matches inventory-service's encoding. The INV-07 finding is flagged as High confidence on the double-encoding logic itself, but cross-service token interoperability impact is marked Medium confidence pending identity-service audit.
- No runtime or behavioral testing was performed; all analysis is static.

**Overall confidence: High** for code-level findings. INV-12 (warehouse disconnection) is a design observation, not a runtime defect — marked High confidence that the feature is incomplete. INV-07 cross-service impact is Medium confidence without inspecting the identity-service JWT issuance.

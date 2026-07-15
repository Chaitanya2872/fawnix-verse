# sales-service — Service Audit

**Date:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated)  
**Root:** `backend/services/sales-service`  
**Package:** `com.fawnix.sales`

---

## Summary

`sales-service` is a Spring Boot 3 microservice implementing a full order-to-cash workflow: quotes, sales orders (with multi-stage approval), deliveries, invoices, payments, and returns. The service is structurally sound and avoids most junior antipatterns (BigDecimal for money, proper `@Transactional` placement, package-by-feature layout, a real `GlobalExceptionHandler`). However it has three production-grade correctness bugs that will bite at scale: **unbounded `findAll()` in the report endpoint** (full table scan, OOM at volume), **HTTP outbound calls inside `@Transactional` boundaries** (leaving DB and inventory service permanently out of sync on network failure), and a **check-then-insert race condition in document number generation** (duplicate `SO-`, `QT-`, `INV-`, etc. numbers are possible under concurrent load). A hardcoded `"INR"` currency in credit note generation is a correctness defect for any multi-currency order. There are also significant utility-method duplications across every service class that indicate missing shared infrastructure.

---

## Surface Map

### Controllers & Endpoints

| Controller | Method | Path |
|---|---|---|
| `QuoteController` | GET | `/api/sales/quotes` |
| `QuoteController` | GET | `/api/sales/quotes/{id}` |
| `QuoteController` | POST | `/api/sales/quotes` |
| `QuoteController` | PATCH | `/api/sales/quotes/{id}` |
| `QuoteController` | PATCH | `/api/sales/quotes/{id}/status` |
| `QuoteController` | DELETE | `/api/sales/quotes/{id}` |
| `QuoteController` | POST | `/api/sales/quotes/{id}/convert-to-order` |
| `SalesOrderController` | GET | `/api/sales/orders` |
| `SalesOrderController` | GET | `/api/sales/orders/{id}` |
| `SalesOrderController` | POST | `/api/sales/orders` |
| `SalesOrderController` | PATCH | `/api/sales/orders/{id}` |
| `SalesOrderController` | PATCH | `/api/sales/orders/{id}/status` |
| `SalesOrderController` | POST | `/api/sales/orders/{id}/submit` |
| `SalesOrderController` | POST | `/api/sales/orders/{id}/confirm` |
| `SalesOrderController` | POST | `/api/sales/orders/{id}/approval-action` |
| `SalesOrderController` | GET | `/api/sales/orders/approval-rules` |
| `SalesOrderController` | POST | `/api/sales/orders/approval-rules` |
| `SalesOrderController` | PATCH | `/api/sales/orders/approval-rules/{id}` |
| `SalesDeliveryController` | GET | `/api/sales/deliveries` |
| `SalesDeliveryController` | POST | `/api/sales/deliveries` |
| `SalesDeliveryController` | PATCH | `/api/sales/deliveries/{id}/status` |
| `SalesInvoiceController` | GET | `/api/sales/invoices` |
| `SalesInvoiceController` | POST | `/api/sales/invoices` |
| `SalesInvoiceController` | PATCH | `/api/sales/invoices/{id}/status` |
| `SalesPaymentController` | GET | `/api/sales/payments` |
| `SalesPaymentController` | POST | `/api/sales/payments` |
| `SalesReturnController` | GET | `/api/sales/returns` |
| `SalesReturnController` | POST | `/api/sales/returns` |
| `SalesReturnController` | PATCH | `/api/sales/returns/{id}/status` |
| `SalesReportController` | GET | `/api/sales/reports/overview` |

### Entities & Tables

| Entity | Table |
|---|---|
| `QuoteEntity` | `quotes` |
| `QuoteLineItemEntity` | `quote_items` |
| `SalesOrderEntity` | `sales_orders` |
| `SalesOrderItemEntity` | `sales_order_items` |
| `SalesOrderApprovalRuleEntity` | `sales_order_approval_rules` |
| `SalesOrderApprovalEntity` | `sales_order_approvals` |
| `SalesOrderAuditLogEntity` | `sales_order_audit_logs` |
| `SalesDeliveryEntity` | `sales_deliveries` |
| `SalesInvoiceEntity` | `sales_invoices` |
| `SalesPaymentEntity` | `sales_payments` |
| `SalesReturnEntity` | `sales_returns` |
| `SalesCreditNoteEntity` | `sales_credit_notes` |

### Flyway Migrations

| Version | File | Purpose |
|---|---|---|
| V1 | `V1__baseline.sql` | Bootstrap `service_metadata` |
| V2 | `V2__create_sales_quotes.sql` | `quotes`, `quote_items` |
| V3 | `V3__add_quote_item_inventory_fields.sql` | Add `inventory_product_id`, `make`, `utility` to `quote_items` |
| V4 | `V4__create_sales_orders.sql` | `sales_orders`, `sales_order_items` |
| V5 | `V5__add_sales_order_inventory_reservation_fields.sql` | Inventory reservation columns on `sales_orders` |
| V6 | `V6__create_sales_deliveries_and_invoices.sql` | `sales_deliveries`, `sales_invoices` |
| V7 | `V7__expand_order_to_cash_workflow.sql` | Add approval, payment, return, credit note, audit tables + many columns to `sales_orders` |

### Outbound HTTP Calls

| Client | Endpoint Called | Used In |
|---|---|---|
| `InventoryReservationClient` (RestTemplate) | `POST /internal/inventory/reservations/validate` | `SalesOrderService.validateInventoryAvailability` |
| `InventoryReservationClient` (RestTemplate) | `POST /internal/inventory/reservations/reserve` | `SalesOrderService.reserveInventory` |
| `InventoryReservationClient` (RestTemplate) | `POST /internal/inventory/reservations/fulfill` | `SalesDeliveryService.fulfillInventory` |

---

## Findings

### P0 — Critical / Data Corrupting

---

#### SAL-01 — HTTP Outbound Call Inside `@Transactional` — DB + Inventory Can Permanently Desync

- **File:line:** `SalesOrderService.java:646` (reserve), `SalesOrderService.java:506` (validate), `SalesDeliveryService.java:158` (fulfill)
- **Severity / Confidence:** P0 / High
- **Owner:** Chaitanya2872

**Offending code (reserve path):**
```java
// SalesOrderService.java:628-653
private void reserveInventory(SalesOrderEntity order) {
    ...
    InventoryReservationClient.ReserveInventoryResponse response =
        inventoryReservationClient.reserve(order.getId(), reservableItems);  // HTTP call
    if (response == null || !response.reserved()) {
        throw new BadRequestException("Inventory reservation failed.");
    }
    order.setInventoryReserved(true);
    ...
}
```

`reserveInventory` and `fulfillInventory` are called from methods annotated `@Transactional` (`handleSubmission` → `createOrder`, `markApproved`, `updateStatus`; `SalesDeliveryService.updateStatus`). The HTTP call to inventory-service is **not** rolled back if the enclosing DB transaction later fails, and the DB update **is** rolled back if the HTTP call throws (but the inventory-service has already committed the reservation). These are two independent commit scopes with no saga/compensation.

**Impact:** A DB connection failure, constraint violation, or even a JVM OOM after the HTTP call succeeds leaves inventory reserved but the sales order not marked as such (or vice versa). At scale, this causes phantom reservations that block stock indefinitely.

**Fix:** Decouple the HTTP call from the DB transaction. Use an outbox pattern or publish a domain event after the DB commit, then have a separate process call inventory. At minimum, move the HTTP call to occur **after** `salesOrderRepository.save()` commits (i.e., outside the `@Transactional` boundary) and implement a retry/reconciliation job.

```java
// In the service method — call after transaction commits:
@Transactional
public SalesOrderDtos.SalesOrderResponse updateStatus(...) {
    // ... DB-only work ...
    SalesOrderEntity saved = salesOrderRepository.save(order);
    return toResponse(saved);  // return first
}
// Then in a @TransactionalEventListener(phase = AFTER_COMMIT):
public void onOrderApproved(OrderApprovedEvent event) {
    inventoryReservationClient.reserve(...);
}
```

---

#### SAL-02 — Unbounded `findAll()` in Report Endpoint — OOM at Production Volume

- **File:line:** `SalesReportService.java:42-43`
- **Severity / Confidence:** P0 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesReportService.java:42-44
List<SalesOrderEntity> orders = orderRepository.findAll();            // ALL rows
List<SalesInvoiceEntity> invoices = invoiceRepository.findAllByOrderByCreatedAtDesc(); // ALL rows
List<SalesPaymentEntity> payments = paymentRepository.findTop50ByOrderByCreatedAtDesc();
```

`GET /api/sales/reports/overview` loads **every `sales_orders` row and every `sales_invoices` row** into the JVM heap to aggregate metrics in Java. At 50k orders this is a full table scan into memory. All computed values (count by status, total outstanding, overdue amount, per-customer totals) can and should be computed in SQL using `COUNT`, `SUM`, `GROUP BY` with appropriate `WHERE` filters.

**Impact:** As data grows this endpoint becomes the most likely cause of heap exhaustion and service outage. Each call also holds a DB connection for the full scan duration.

**Fix:** Replace each aggregation with a targeted query or native SQL aggregate.

```java
// Example — push everything to DB:
long totalOrders = orderRepository.count();
long pendingApproval = orderRepository.countByStatus(SalesOrderStatus.PENDING_APPROVAL);
BigDecimal outstanding = invoiceRepository.sumBalanceDue(); // @Query("SELECT SUM(i.balanceDue) FROM ...")
BigDecimal overdue = invoiceRepository.sumOverdueBalanceDue(LocalDate.now());
// etc.
```

---

### P1 — High Severity / Correctness Defect

---

#### SAL-03 — Race Condition in Document Number Generation — Duplicate Numbers Under Concurrency

- **File:line:** `SalesOrderService.java:868-878`, `QuoteService.java:406-415`, `SalesInvoiceService.java:156-165`, `SalesDeliveryService.java:174-182`, `SalesPaymentService.java:122-130`, `SalesReturnService.java:157-178`
- **Severity / Confidence:** P1 / High
- **Owner:** Chaitanya2872

**Offending code (representative — SalesOrderService.java:868-878):**
```java
private String generateOrderNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
        String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
        String candidate = "SO-" + datePart + "-" + suffix;
        if (!salesOrderRepository.existsByOrderNumber(candidate)) {
            return candidate;       // <-- read
        }                           // another thread can pick the same candidate here
    }                               // before either inserts
    return "SO-" + datePart + "-" + UUID.randomUUID()...
}
```

The pattern is: READ whether the number exists → if not, use it. Two concurrent `createOrder` calls can both read `existsByOrderNumber("SO-20260714-4521") == false`, both return the same number, and then the second DB insert fails with a unique constraint violation — which surfaces as a 400 Bad Request with a raw `DataIntegrityViolationException` message leaking schema details to the client (caught by `GlobalExceptionHandler` but with the constraint message exposed). This same pattern exists in **6 service methods**.

**Impact:** Under moderate concurrent load (e.g., a batch quote-to-order conversion), document number collisions are guaranteed. The fallback UUID suffix is not a fix because the same race applies to it.

**Fix:** Use a DB sequence or, for the date+counter pattern, a `SELECT ... FOR UPDATE` on a counter row, or simply use `UUID.randomUUID().toString()` as the stored document number (opaque but collision-free) and generate a display number separately from a DB sequence.

```sql
-- migration: add sequence
CREATE SEQUENCE IF NOT EXISTS seq_sales_order_number START 1;
```
```java
// In service:
private String generateOrderNumber() {
    Long seq = em.createNativeQuery("SELECT nextval('seq_sales_order_number')")
                 .getSingleResult(Long.class);
    return String.format("SO-%s-%05d", LocalDate.now(ZoneOffset.UTC).format(YYYYMMDD), seq);
}
```

---

#### SAL-04 — Hardcoded `"INR"` Currency on Credit Notes — Breaks Multi-Currency Orders

- **File:line:** `SalesReturnService.java:105`
- **Severity / Confidence:** P1 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesReturnService.java:105
creditNote.setCurrency("INR");
```

A credit note for a return against a USD or EUR sales order will be issued in INR. The credit note is not linked to the order's currency at all; `SalesReturnEntity` does not store the order's currency and `SalesReturnService.createReturn` does not fetch it. Credit notes are financial documents — wrong currency means wrong amounts in any downstream accounting reconciliation.

**Fix:** Fetch the order's currency at return creation and propagate it through.

```java
// In createReturn:
SalesOrderEntity order = orderRepository.findById(request.salesOrderId())...;
salesReturn.setCurrency(order.getCurrency());  // persist currency on return

// In issueCreditNoteIfRequired:
creditNote.setCurrency(salesReturn.getCurrency());
```

---

#### SAL-05 — `SALES_REP` Can Approve Orders — No Approver Role Enforcement

- **File:line:** `SalesOrderController.java:93-101`
- **Severity / Confidence:** P1 / Med
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesOrderController.java:93-101
@PostMapping("/{id}/approval-action")
@PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
public SalesOrderDtos.SalesOrderResponse applyApprovalAction(...) {
```

The approval action endpoint is accessible to `SALES_REP`. An approval workflow designed for manager-level sign-off is bypassed by the same role that submitted the order. The `ApprovalActionRequest.roleLabel` field is a free-text hint from the client — the server does not validate that the calling user's role matches the `roleKey` of the approval stage they are acting on.

**Impact:** A sales rep can call `POST /api/sales/orders/{id}/approval-action` with `action: "APPROVE"` to self-approve their own orders.

**Fix:** Restrict the endpoint to `ADMIN` and `SALES_MANAGER` at a minimum, or add service-layer validation:

```java
@PostMapping("/{id}/approval-action")
@PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
```

And in the service, cross-check `userDetails.getRoleNames()` against `currentApproval.getRoleKey()`:
```java
if (!userDetails.getRoleNames().contains(currentApproval.getRoleKey())) {
    throw new ForbiddenOperationException("You are not authorized to act on this approval stage.");
}
```

---

#### SAL-06 — `LocalDate.now()` Uses JVM Default Timezone in Document Number Generation

- **File:line:** `SalesOrderService.java:869`, `QuoteService.java:406`, `SalesInvoiceService.java:156`, `SalesDeliveryService.java:174`, `SalesPaymentService.java:122`, `SalesReturnService.java:158`, `SalesReturnService.java:170`
- **Severity / Confidence:** P1 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesOrderService.java:869 (same pattern in 6 other methods)
String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
```

`LocalDate.now()` picks the JVM's default timezone (whatever the container's `TZ` env var is, often UTC). If the server runs in UTC but the business operates in IST (+5:30), orders created between midnight UTC and 05:30 IST will carry yesterday's date. More critically, if the JVM's default timezone is ever changed (common in containerized deploys), the date part in document numbers shifts silently.

**Fix:** Always use UTC explicitly:
```java
String datePart = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.BASIC_ISO_DATE);
```

---

#### SAL-07 — JWT Parsed Twice Per Request — Expiry Check After Claims Extraction

- **File:line:** `JwtAuthenticationFilter.java:44-46`, `JwtService.java:34-38`
- **Severity / Confidence:** P1 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtAuthenticationFilter.java:44-46
AppUserDetails userDetails = jwtService.toUserDetails(token);  // parses + verifies signature
if (jwtService.isTokenValid(token)) {                          // parses + verifies AGAIN
```

`toUserDetails` calls `extractClaims` which calls `Jwts.parser().parseSignedClaims(token)` — full signature verification + base64 decode. `isTokenValid` then calls `extractClaims` again, repeating the full parse. Worse: if the token is expired, `isTokenValid` returns `false` via `catch (Exception)`, but `toUserDetails` may have already thrown (JJWT throws `ExpiredJwtException` from `parseSignedClaims`). If `toUserDetails` does not throw on expired tokens (depends on JJWT version config), then an expired token would still populate `userDetails` — the subsequent `isTokenValid` returning false is the only gate. If `toUserDetails` throws instead, the `catch (Exception ignored)` swallows the exception silently, logging nothing useful.

**Fix:** Parse once, validate expiry from the already-extracted claims:
```java
try {
    Claims claims = jwtService.extractClaims(token);  // make package-scoped if needed
    if (claims.getExpiration().toInstant().isAfter(Instant.now())) {
        AppUserDetails userDetails = jwtService.toUserDetails(claims);
        // set authentication
    }
} catch (JwtException e) {
    SecurityContextHolder.clearContext();
    // optionally log at WARN level
}
```

---

### P2 — Medium Severity / Significant Code Quality

---

#### SAL-08 — `APPROVE` Branch in `applyApprovalAction` Queries Approvals Twice

- **File:line:** `SalesOrderService.java:237`, `SalesOrderService.java:253`
- **Severity / Confidence:** P2 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// Line 237: load all approvals
List<SalesOrderApprovalEntity> approvals =
    approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId());

// ... modify currentApproval and save it ...

// Line 253: load all approvals AGAIN to check for remaining pending
if (approvalRepository.findBySalesOrderIdOrderBySequenceNoAscCreatedAtAsc(order.getId()).stream()
    .noneMatch(item -> item.getStatus() == ApprovalDecisionStatus.PENDING)) {
```

After saving `currentApproval`, the code re-queries all approvals from the DB. The already-loaded `approvals` list (with `currentApproval` now mutated in memory) can be reused directly since Hibernate's first-level cache reflects the update.

**Fix:**
```java
// After approvalRepository.save(currentApproval), re-check using the in-memory list:
boolean allDecided = approvals.stream()
    .noneMatch(a -> a.getStatus() == ApprovalDecisionStatus.PENDING);
if (allDecided) {
    markApproved(order, userDetails, request.remarks());
} else { ...
```

---

#### SAL-09 — `QuoteService.getQuotes` Has No Upper Bound on `pageSize`

- **File:line:** `QuoteService.java:51`
- **Severity / Confidence:** P2 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// QuoteService.java:51
int resolvedPageSize = Math.max(pageSize, 1);  // no upper bound
```

Compare with `SalesOrderService.getOrders` (line 74) which correctly applies `Math.min(..., 200)`. A caller can request `pageSize=100000`, causing a massive DB read.

**Fix:**
```java
int resolvedPageSize = Math.min(Math.max(pageSize, 1), 200);
```

---

#### SAL-10 — `SalesReturnService.getReturns` Has N+1 for Credit Notes

- **File:line:** `SalesReturnService.java:51`, `SalesReturnService.java:126`
- **Severity / Confidence:** P2 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesReturnService.java:47-51
public SalesReturnDtos.SalesReturnListResponse getReturns(String salesOrderId) {
    List<SalesReturnEntity> returns = salesReturnRepository.findTop50BySalesOrderIdOrderByCreatedAtDesc(...);
    return new SalesReturnDtos.SalesReturnListResponse(returns.stream().map(this::toResponse).toList());
}
// toResponse (line 126):
List<SalesReturnDtos.SalesCreditNoteResponse> notes =
    creditNoteRepository.findBySalesReturnIdOrderByCreatedAtDesc(salesReturn.getId()).stream()...
```

For each of the up-to-50 returned `SalesReturnEntity` objects, `toResponse` issues a separate query to `sales_credit_notes`. This is a classic N+1 problem: 50 returns = 51 DB queries per list call.

**Fix:** Either join-fetch credit notes in the repository query (with `@EntityGraph` or JPQL `JOIN FETCH`), or batch-load all credit notes for the returned return IDs in a single `IN` query.

```java
// In SalesReturnRepository:
@Query("SELECT r FROM SalesReturnEntity r LEFT JOIN FETCH r.creditNotes WHERE r.salesOrderId = :id ORDER BY r.createdAt DESC")
List<SalesReturnEntity> findTop50WithCreditNotesBySalesOrderId(@Param("id") String id, Pageable pageable);
```
This requires mapping `creditNotes` as a `@OneToMany` in the entity.

---

#### SAL-11 — `SalesInvoiceService.createInvoice` Mutates Order Status Inside Invoice `@Transactional` — No Audit Log Entry

- **File:line:** `SalesInvoiceService.java:76-78`
- **Severity / Confidence:** P2 / Med
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesInvoiceService.java:76-78
SalesInvoiceEntity saved = salesInvoiceRepository.save(invoice);
order.setStatus(SalesOrderStatus.INVOICED);
order.setUpdatedAt(now);
salesOrderRepository.save(order);
```

`SalesInvoiceService` reaches across domain boundaries to change `SalesOrderEntity.status` directly. There is no audit log entry written for this status change (unlike every other status transition in `SalesOrderService.updateStatus`). The audit trail in `sales_order_audit_logs` will have no record of the transition to `INVOICED`.

**Fix:** Route status changes back through `SalesOrderService` or publish a domain event. At minimum, write an audit log entry:

```java
order.setStatus(SalesOrderStatus.INVOICED);
salesOrderRepository.save(order);
// write audit:
SalesOrderAuditLogEntity log = new SalesOrderAuditLogEntity();
log.setActionType("INVOICED");
log.setDetails("Invoice " + saved.getInvoiceNumber() + " created.");
auditLogRepository.save(log);
```

---

#### SAL-12 — `JwtService.getSigningKey` Performs Pointless Double Encode/Decode

- **File:line:** `JwtService.java:68-72`
- **Severity / Confidence:** P2 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// JwtService.java:68-72
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
}
```

`Base64.getEncoder().encodeToString(bytes)` then `Decoders.BASE64.decode(base64String)` round-trips back to the original bytes. The final call is `Keys.hmacShaKeyFor(originalSecretBytes)` — the base64 encoding and decoding accomplish nothing. This is identical across all 14 services that copy this file. The matching behavior between identity-service and sales-service is coincidental — if either service changes to the canonical pattern (`Keys.hmacShaKeyFor(secret.getBytes(UTF_8))`), token validation breaks between them.

**Fix:**
```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(java.nio.charset.StandardCharsets.UTF_8));
}
```
**Note:** Update all 14 services in one coordinated change.

---

#### SAL-13 — `applyApprovalAction` Action Is a Free-String — Invalid Actions Reach `default` Branch

- **File:line:** `SalesOrderService.java:236`
- **Severity / Confidence:** P2 / Med
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesOrderService.java:236
String action = request.action().trim().toUpperCase(Locale.ROOT);
// ...
switch (action) {
    case "APPROVE" -> { ... }
    case "REJECT" -> { ... }
    case "SEND_BACK" -> { ... }
    default -> throw new BadRequestException("Unsupported approval action.");
}
```

`ApprovalActionRequest.action` is a `String` validated only at runtime in the switch. Replace with an enum to get compile-time safety and eliminate the need for the default branch.

**Fix:**
```java
// In the DTO record:
public enum ApprovalAction { APPROVE, REJECT, SEND_BACK }
public record ApprovalActionRequest(ApprovalAction action, String remarks, String roleLabel) {}

// In service — use switch on enum, no default needed
switch (request.action()) {
    case APPROVE -> { ... }
    case REJECT -> { ... }
    case SEND_BACK -> { ... }
}
```

---

#### SAL-14 — `INTERNAL_SERVICE_SECRET` Defaults to Empty String in `application.yml`

- **File:line:** `application.yml:38`, `InternalServiceConfig.java:15-18`
- **Severity / Confidence:** P2 / High
- **Owner:** Chaitanya2872

**Offending code:**
```yaml
# application.yml:38
internal-service-secret: ${INTERNAL_SERVICE_SECRET:}   # defaults to ""
```
```java
// InternalServiceConfig.java:15-18
return builder.additionalInterceptors((request, body, execution) -> {
    request.getHeaders().set("X-Internal-Service-Secret", secret);  // sends "" if not set
    return execution.execute(request, body);
}).build();
```

If `INTERNAL_SERVICE_SECRET` is not set in an environment, the header is sent as an empty string. The inventory-service receiving `X-Internal-Service-Secret: ""` may or may not validate this (depends on its implementation), but the intent of an internal-service secret is completely defeated in local/dev/staging environments where the env var is commonly skipped.

**Fix:** Fail fast on startup if secret is blank:
```java
@Bean
public RestTemplate internalRestTemplate(RestTemplateBuilder builder,
    @Value("${app.security.internal-service-secret}") String secret) {  // no default — fail if absent
    Assert.hasText(secret, "INTERNAL_SERVICE_SECRET must be set");
    ...
}
```

---

### P3 — Low Severity / Maintainability

---

#### SAL-15 — `confirmOrder` Allows Re-Confirmation of Already Confirmed Orders

- **File:line:** `SalesOrderService.java:217`
- **Severity / Confidence:** P3 / Med
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesOrderService.java:217
if (order.getStatus() != SalesOrderStatus.APPROVED && order.getStatus() != SalesOrderStatus.CONFIRMED) {
    throw new BadRequestException("Only approved orders can be confirmed.");
}
```

A `CONFIRMED` order can be re-confirmed. This is probably unintentional — `isLocked` (used in `updateOrder`) includes `CONFIRMED` as locked, but `confirmOrder` doesn't enforce it. Each re-confirmation overwrites `confirmedAt` and adds another audit log entry.

**Fix:**
```java
if (order.getStatus() != SalesOrderStatus.APPROVED) {
    throw new BadRequestException("Only approved orders can be confirmed.");
}
```

---

#### SAL-16 — `SalesReturnService.updateStatus` Calls `issueCreditNoteIfRequired` for Both `APPROVED` and `CREDIT_ISSUED` Status

- **File:line:** `SalesReturnService.java:89-92`, `SalesReturnService.java:97-98`
- **Severity / Confidence:** P3 / High
- **Owner:** Chaitanya2872

**Offending code:**
```java
// SalesReturnService.java:89-92
if (request.status() == SalesReturnStatus.APPROVED || request.status() == SalesReturnStatus.CREDIT_ISSUED) {
    ...
    issueCreditNoteIfRequired(salesReturn, userDetails);
}

// issueCreditNoteIfRequired line 98:
if (creditNoteRepository.findBySalesReturnIdOrderByCreatedAtDesc(salesReturn.getId()).isEmpty()) {
    // issue credit note
    ...
    salesReturn.setStatus(SalesReturnStatus.CREDIT_ISSUED);
}
```

If a caller explicitly sets status to `CREDIT_ISSUED`, `issueCreditNoteIfRequired` is called, which checks if a credit note already exists — this is a guard. But there is a subtle state inconsistency: when status is set to `APPROVED`, `issueCreditNoteIfRequired` internally overrides it to `CREDIT_ISSUED`. The `salesReturn` entity is saved with `CREDIT_ISSUED` from `updateStatus`'s `toResponse(salesReturnRepository.save(salesReturn))` even though the caller requested `APPROVED`. This can confuse downstream code or clients.

**Fix:** Explicitly separate the `APPROVED` transition (approval only, no credit note) from a `CREDIT_ISSUED` transition (issue credit note). Do not auto-transition status inside a helper method.

---

#### SAL-17 — `SalesOrderService` Is 940 Lines — God Class Risk

- **File:line:** `SalesOrderService.java:1-940`
- **Severity / Confidence:** P3 / High
- **Owner:** Chaitanya2872

`SalesOrderService` is 940 lines and handles: order creation, update, submission, approval workflow orchestration, inventory validation, inventory reservation, duplicate detection, risk scoring, quote conversion, and audit logging. Adding any new feature requires editing this single file, increasing merge conflict probability and making unit testing harder.

**Suggested split:**
- `SalesOrderValidationService` — `validateOrder`, `validateInventoryAvailability`, `isCreditLimitExceeded`, `isDuplicateOrder`, `isRiskyTerms`
- `SalesOrderApprovalService` — `handleSubmission`, `resolveApprovalRules`, `matchesRule`, `ensureApprovalReady`, `markApproved`, `applyApprovalAction`
- `SalesOrderInventoryService` — `reserveInventory`

---

## Redundancy

The following utility methods are copy-pasted verbatim across every service class with zero shared infrastructure. The body of each copy is identical.

### Within `sales-service`

| Method | Files with identical copies |
|---|---|
| `private String trimToNull(String)` | `SalesOrderService.java:887` · `QuoteService.java:372` · `SalesInvoiceService.java:171` · `SalesDeliveryService.java:185` · `SalesPaymentService.java:137` · `SalesReturnService.java:185` (6 copies) |
| `private BigDecimal scaleMoney(BigDecimal)` | `SalesOrderService.java:919` · `QuoteService.java:387` · `SalesInvoiceService.java:167` (named `scale` in payment/return) |
| `private BigDecimal defaultMoney(BigDecimal)` | `SalesOrderService.java:915` · `QuoteService.java:380` |
| `generateXxxNumber()` (same logic, different prefix) | `SalesOrderService.java:868` · `QuoteService.java:406` · `SalesInvoiceService.java:156` · `SalesDeliveryService.java:174` · `SalesPaymentService.java:122` · `SalesReturnService.java:157` · `SalesReturnService.java:170` (7 near-identical methods) |

**Fix:** Extract a `com.fawnix.sales.common.util.StringUtils`, `MoneyUtils`, and `DocumentNumberGenerator` utility class. The number generator should also fix the race condition (SAL-03).

### Across the Monorepo

| Pattern | sales-service location | Duplicated in |
|---|---|---|
| `JwtService.java` (entire file, differs only in package import) | `security/jwt/JwtService.java:1-73` | `inventory-service/.../JwtService.java`, `procurement-service/.../JwtService.java`, `project-service/.../JwtService.java`, `crm-service/.../JwtService.java`, `identity-service/.../JwtService.java` (and 9 more services) — 14 total copies |
| `GlobalExceptionHandler.java` (identical structure) | `common/exception/GlobalExceptionHandler.java:1-113` | `inventory-service`, `identity-service`, `procurement-service`, `crm-service`, `task-service` |
| `AppUserDetails.java` | `security/service/AppUserDetails.java` | Equivalent in all other services |
| `JwtProperties.java` | `security/jwt/JwtProperties.java` | Equivalent in all other services |
| `SecurityConfig.java` | `SecurityConfig.java` | Equivalent in all other services |
| `RestAuthenticationEntryPoint.java` | `security/handler/` | Equivalent in all other services |

**Fix:** Extract a `security-commons` shared library (Maven module under `backend/`) containing the JWT stack, `GlobalExceptionHandler`, and `ApiErrorResponse`. Each service pulls it as a dependency.

---

## Tests & Gaps

**No test source directory exists.** `find backend/services/sales-service/src/test` returns nothing.

There are zero unit tests, zero integration tests, and zero `@SpringBootTest` tests for any class in this service. This means:

- The race condition in number generation (SAL-03) has never been observed in CI.
- The HTTP-inside-transaction desync (SAL-01) has no reproducible test case.
- The N+1 in `SalesReturnService.getReturns` (SAL-10) would be immediately visible in any integration test with a proper query counter.
- The `SALES_REP` self-approval gap (SAL-05) has no test preventing regression.

**Minimum required coverage:**
1. `SalesOrderServiceTest` — unit tests for `calculateTotals`, `validateOrder`, `generateOrderNumber` (mock the repo to simulate collision), `applyApprovalAction` (approve/reject/send-back state machine).
2. `SalesReportServiceTest` — test with a fixed dataset to catch the `findAll` regression before it hits prod.
3. `SalesDeliveryServiceTest` — integration test asserting inventory `fulfill` is called exactly once per delivery.
4. `SecurityConfigTest` — verify `SALES_REP` cannot call `/api/sales/orders/{id}/approval-action`.

---

## Coverage Note

**Fully inspected:**
- All 7 Flyway migrations — read every SQL statement
- All 8 controllers — every endpoint, every `@PreAuthorize`
- All 6 service classes — complete logic review
- All 12 entities — field types, column annotations, cascade settings
- `SecurityConfig`, `JwtService`, `JwtAuthenticationFilter`, `JwtProperties` — full security stack
- `InventoryReservationClient`, `InternalServiceConfig` — complete outbound HTTP review
- `GlobalExceptionHandler` — all handlers
- `application.yml` — all config keys
- `pom.xml` — dependency set

**Skimmed (not read in full):**
- `SalesOrderDtos.java`, `QuoteDtos.java`, and other DTO files — checked for suspicious fields (double/float for money) but did not exhaustively verify every record field
- Repository interfaces — read all; confirmed no native queries that could mask issues
- `SalesOrderSpecifications.java`, `QuoteSpecifications.java` — read; no issues found

**Confidence overall:** High for all P0/P1 findings. Medium for SAL-05 (authorization intent depends on undocumented business rules around who should be an approver). Low for nothing — all low-confidence suspicions investigated to conclusion before inclusion.

**Not inspected (out of scope):**
- `graphify-out/` at the repo root — not a service source artifact
- Docker/CI configuration for this service
- The identity-service role provisioning logic (traced far enough to confirm role naming convention)

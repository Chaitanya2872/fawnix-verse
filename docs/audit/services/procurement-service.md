# procurement-service — Service Audit

**Audited:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6 (automated senior review)  
**Root:** `backend/services/procurement-service`  
**Primary author across most files:** Chaitanya2872

---

## Summary

procurement-service implements a full Procure-to-Pay (P2P) flow: Purchase Requisitions → Approval → Purchase Orders → Goods Receipts → Invoices → Payments, plus Vendor management. The service is substantially complete and well-structured, using proper BigDecimal arithmetic, Flyway migrations, and a working GlobalExceptionHandler. However, it carries three critical-severity issues: (1) a JWT signing-key double-encoding bug that will cause authentication breakage if the raw secret is changed to a non-ASCII-safe value; (2) HTTP calls to inventory-service executed inside open database transactions, which can corrupt connection pool state; and (3) actor identity (requesterId, actorId, receivedBy) is accepted from the HTTP request body / query parameter rather than extracted from the authenticated principal, allowing any logged-in user to spoof actions on behalf of any other user. There are also a race condition in vendor-code generation, missing approval-role enforcement, and zero automated tests.

---

## Surface Map

### Controllers and Endpoints

| Controller | Class-level path(s) | Method | Path | Action |
|---|---|---|---|---|
| PurchaseRequisitionController | `/procurement/requisitions`, `/requisitions` | POST | `/` | Create PR |
| | | PUT | `/{id}` | Update PR |
| | | GET | `/` | List PRs |
| | | GET | `/{id}` | Get PR |
| | | DELETE | `/{id}` | Delete PR |
| | | GET | `/{id}/documents` | List PR documents |
| | | POST | `/{id}/documents` (multipart) | Upload document |
| | | GET | `/{requisitionId}/documents/{documentId}/content` | Download document |
| | | DELETE | `/{requisitionId}/documents/{documentId}` | Delete document |
| | | POST | `/{id}/submit` | Submit for approval |
| | | POST | `/{id}/approval-actions` | Approve / reject |
| | | POST | `/{id}/evaluation` | Update evaluation |
| | | POST | `/{id}/budget` | Update budget |
| | | POST | `/{id}/negotiation` | Update negotiation |
| PurchaseOrderController | `/procurement/purchase-orders`, `/purchase-orders` | POST | `/from-requisition/{purchaseRequisitionId}` | Create PO from PR |
| | | GET | `/` | List POs |
| | | GET | `/{id}` | Get PO |
| | | DELETE | `/{id}` | Delete PO |
| GoodsReceiptController | `/procurement/goods-receipts`, `/goods-receipts` | POST | `/` | Create GRN |
| | | GET | `/` | List GRNs |
| | | GET | `/{id}` | Get GRN |
| InvoiceController | `/procurement/invoices`, `/invoices` | POST | `/` | Create invoice |
| | | GET | `/` | List invoices |
| | | GET | `/{id}` | Get invoice |
| | | POST | `/{id}/approval-actions` | Approve / reject invoice |
| PaymentController | `/procurement/payments`, `/payments` | POST | `/` | Create payment request |
| | | GET | `/` | List payments |
| | | GET | `/{id}` | Get payment |
| | | POST | `/{id}/approval-actions` | Approve / reject payment |
| VendorController | `/procurement/vendors`, `/vendors` | POST | `/` | Create vendor |
| | | GET | `/` | List vendors |
| | | GET | `/{id}` | Get vendor |
| | | PUT | `/{id}` | Update vendor |
| | | DELETE | `/{id}` | Delete vendor |
| | | GET | `/{id}/documents` | List vendor documents |
| | | POST | `/{id}/documents` (multipart) | Upload document |
| | | GET | `/{vendorId}/documents/{documentId}/content` | Download document |
| | | DELETE | `/{vendorId}/documents/{documentId}` | Delete document |

### JPA Entities and Tables

| Entity | Table | Notable constraints |
|---|---|---|
| `PurchaseRequisition` | `purchase_requisitions` | `pr_number` unique |
| `PurchaseRequisitionItem` | `pr_items` | FK → `purchase_requisitions` CASCADE |
| `PurchaseRequisitionDocument` | `pr_documents` | `bytea` storage |
| `PurchaseOrder` | `purchase_orders` | `po_number` unique, `purchase_requisition_id` unique |
| `PurchaseOrderItem` | `po_items` | FK → `purchase_orders` CASCADE |
| `GoodsReceipt` | `goods_receipts` | `grn_number` unique, unique per PO enforced in code only |
| `Invoice` | `invoices` | `invoice_number` unique |
| `Payment` | `payments` | `invoice_id` unique, `payment_number` unique |
| `Vendor` | `vendors` | `vendor_code` unique, partial unique index on `email` (CI), partial unique index on `mobile` |
| `VendorAddress` | `vendor_addresses` | FK → `vendors` CASCADE |
| `VendorContactPerson` | `vendor_contact_persons` | FK → `vendors` CASCADE |
| `VendorBankAccount` | `vendor_bank_accounts` | FK → `vendors` CASCADE |
| `VendorDocument` | `vendor_documents` | `bytea` storage |
| `ApprovalWorkflow` | `approval_workflows` | — |
| `ApprovalStep` | `approval_steps` | Unique `(workflow_id, step_order)` |
| `ApprovalLog` | `approval_logs` | — |

### Flyway Migrations

| Version | File | Summary |
|---|---|---|
| V1 | `V1__baseline.sql` | `service_metadata` bootstrap row |
| V2 | `V2__create_procurement_schema.sql` | Core schema: all main tables + indexes + seed approval workflow |
| V3 | `V3__add_payment_requests.sql` | `payments` table |
| V4 | `V4__add_pr_evaluation_fields.sql` | evaluation columns on `purchase_requisitions` |
| V5 | `V5__add_pr_negotiation_fields.sql` | negotiation columns |
| V6 | `V6__add_vendor_documents.sql` | `vendor_documents` table |
| V7 | `V7__expand_purchase_requisition_types_and_manual_items.sql` | `request_type` column; nullable `product_id`/`sku` |
| V8 | `V8__add_pr_budget_priority_and_tax_fields.sql` | budget/priority/tax columns |
| V9 | `V9__create_purchase_requisition_documents.sql` | `pr_documents` table |
| V10 | `V10__enhance_vendor_management.sql` | Expanded vendor columns, `vendor_addresses`, `vendor_contact_persons`, `vendor_bank_accounts`, data migration from flat columns |

### Outbound Feign / HTTP Calls

| Client | Interface | Called Endpoint | Called In |
|---|---|---|---|
| `InventoryClient` | `InventoryClient.java:10` | `GET /inventory/{id}` (inventory-service) | `PurchaseRequisitionService.createPurchaseRequisition` (inside `@Transactional`), `PurchaseRequisitionService.updatePurchaseRequisition` (inside `@Transactional`), `PurchaseOrderService.createPurchaseOrderFromRequisition` (inside `@Transactional`) |

---

## Findings

### P0 — Critical

---

#### PRO-01 — JWT signing-key double-encoded: will misvalidate tokens if secret contains special characters

**File:** `src/main/java/com/fawnix/procurement/security/jwt/JwtService.java:69`  
**Also:** `ServiceJwtProvider.java:50`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(Base64.getEncoder().encodeToString(
        jwtProperties.getSecret().getBytes()
    )));
}
```

**Why it is wrong:** The secret string (e.g. `change-this-local-dev-secret`) is first re-encoded to Base64 by `Base64.getEncoder().encodeToString(...)`, then that Base64 string is decoded back by `Decoders.BASE64.decode(...)`. The net result is that the actual HMAC key bytes are the raw UTF-8 bytes of the original secret — the encode/decode pair cancels out — but only because the secret happens to be plain ASCII. If the secret ever contains bytes outside Base64's alphabet (e.g. a truly random 256-bit key expressed as a binary or hex string), `BASE64.decode` will throw `IllegalArgumentException`, silently caught by `isTokenValid` returning `false`, causing every request to be rejected. Additionally, this pattern was copy-pasted to `ServiceJwtProvider.getSigningKey()` and exists verbatim in at least 9 other services (approval, analytics, task, project, integration, org, sales, notifications, crm). The identity-service presumably generates tokens with the raw secret bytes, so any future secret rotation to a proper random key will break all downstream services.

**Proper fix:** Remove the double-encode. If the config secret is already stored as a Base64 string, decode it once. If it is raw text, convert directly:
```java
// Option A: secret in config is a raw string (current convention)
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
}

// Option B: secret in config is already Base64-encoded (better practice)
private Key getSigningKey() {
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
}
```
Coordinate with identity-service so both ends use the same encoding convention. Fix all 9 other services at the same time.

---

#### PRO-02 — HTTP call to inventory-service inside open database transaction

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseRequisitionService.java:77–107` and `src/main/java/com/fawnix/procurement/service/PurchaseOrderService.java:64–101`  
**Severity:** P0 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code (PurchaseRequisitionService):**
```java
@Transactional                          // line 77 — opens DB tx
public ProcurementDtos.PurchaseRequisitionResponse createPurchaseRequisition(...) {
    ...
    items = request.items().stream()
        .map(itemRequest -> createRequisitionItem(saved, itemRequest))  // line 104
        ...
}

private PurchaseRequisitionItem createRequisitionItem(...) {
    if (request.productId() != null) {
        InventoryProductResponse product = fetchProduct(request.productId());  // line 415 — HTTP call
        ...
    }
}
```

**Why it is wrong:** The Feign call to inventory-service at line 415 is made while holding an open PostgreSQL connection (acquired at line 77 by Spring's transaction management). If inventory-service is slow or times out, the DB connection is held for the entire duration of the HTTP call, exhausting the connection pool under any load. If inventory-service is unavailable, a `FeignException` is thrown inside the transaction, and while the `catch (FeignException.NotFound)` handler converts it to a `BadRequestException`, any other Feign exception (connection timeout, 5xx) propagates as-is, rolling back the transaction — but the connection still remained held for the entire timeout period. The same pattern exists in `PurchaseOrderService.createPurchaseOrderFromRequisition` (line 64).

**Proper fix:** Resolve all product lookups before opening the transaction, then pass the resolved data in:
```java
public ProcurementDtos.PurchaseRequisitionResponse createPurchaseRequisition(
        ProcurementDtos.CreatePurchaseRequisitionRequest request) {
    // Resolve all product data outside the transaction
    Map<UUID, InventoryProductResponse> productMap = resolveProducts(request.items());

    return doCreatePurchaseRequisition(request, productMap);  // @Transactional on this private method won't work; use a separate @Service bean
}
```
Alternatively, move the Feign call to a non-transactional service layer that composes the transactional write.

---

#### PRO-03 — Actor identity accepted from request body / query parameter — spoofable

**File:** `src/main/java/com/fawnix/procurement/controller/PurchaseRequisitionController.java:107–111`  
**Also:** `ProcurementDtos.java:141–149` (ApprovalDecisionRequest), `ProcurementDtos.java:211–219` (CreatePaymentRequest), `ProcurementDtos.java:186–195` (CreateGoodsReceiptRequest)  
**Severity:** P0 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code (submit endpoint):**
```java
@PostMapping("/{id}/submit")
public ProcurementDtos.PurchaseRequisitionResponse submitPurchaseRequisition(
    @PathVariable UUID id,
    @RequestParam UUID actorId          // ← caller supplies their own identity
) {
    return purchaseRequisitionService.submitPurchaseRequisition(id, actorId);
}
```

**Why it is wrong:** `actorId` (in submit), `actorId` (in `ApprovalDecisionRequest`), `requesterId` (in create/update PR), `receivedBy` (in GRN), and `requestedBy` (in payment) are all supplied by the HTTP client in the request body or query string. Any authenticated user can claim to be any other user for all audit, approval, and attribution purposes. The JWT in the Authorization header already contains the authenticated user's ID as the `sub` claim, which is parsed into `AppUserDetails` and available from the SecurityContext. These fields should never be accepted from the client.

**Proper fix:**
```java
// In controller
@PostMapping("/{id}/submit")
public ProcurementDtos.PurchaseRequisitionResponse submitPurchaseRequisition(
    @PathVariable UUID id,
    @AuthenticationPrincipal AppUserDetails principal   // ← from verified JWT
) {
    UUID actorId = UUID.fromString(principal.getUsername());
    return purchaseRequisitionService.submitPurchaseRequisition(id, actorId);
}
```
Apply this fix to all five affected fields across all controllers. Remove the client-supplied UUID parameters from DTOs.

---

### P1 — High

---

#### PRO-04 — Race condition in vendor code generation: `findAll().size()` is not atomic

**File:** `src/main/java/com/fawnix/procurement/service/VendorService.java:463–468`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
private String generateVendorCode() {
    int sequence = vendorRepository.findAll().size() + 1;    // line 464 — full table scan
    String candidate = formatVendorCode(sequence);
    while (vendorRepository.existsByVendorCodeIgnoreCase(candidate)) {
        sequence += 1;
        candidate = formatVendorCode(sequence);
    }
    return candidate;
}
```

**Why it is wrong:** Two concurrent requests to create vendors will both read `size()` before either commits. Both get the same `sequence`, both generate `VND-00042` (for example), and the second commit will hit the unique constraint on `vendor_code`, surfacing as an unhandled `DataIntegrityViolationException` that the GlobalExceptionHandler maps to a 400 Bad Request with a confusing error message. Additionally, `findAll()` on a growing vendor table is a full-table load purely to count rows.

**Proper fix:** Use a database sequence:
```sql
-- migration
CREATE SEQUENCE IF NOT EXISTS vendor_code_seq START 1;
```
```java
// Repository
@Query(value = "SELECT NEXTVAL('vendor_code_seq')", nativeQuery = true)
Long nextVendorCodeSequence();

// Service
private String generateVendorCode() {
    return "VND-" + String.format("%05d", vendorRepository.nextVendorCodeSequence());
}
```

---

#### PRO-05 — N+1 query in `getPurchaseOrders` and `getPurchaseRequisitions`

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseOrderService.java:104–112`  
**Also:** `src/main/java/com/fawnix/procurement/service/PurchaseRequisitionService.java:147–151`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Chaitanya2872 (PO), Chaitanya2872 (PR)

**Code (PurchaseOrderService):**
```java
@Transactional(readOnly = true)
public List<ProcurementDtos.PurchaseOrderResponse> getPurchaseOrders() {
    return purchaseOrderRepository.findAll().stream()           // line 106 — 1 query
        .map(purchaseOrder -> procurementMapper.toPurchaseOrderResponse(
            purchaseOrder,
            purchaseOrderItemRepository.findByPurchaseOrderId(purchaseOrder.getId())  // line 109 — N queries
        ))
        .toList();
}
```

**Why it is wrong:** For N purchase orders, this issues N+1 database queries. With 100 POs, that is 101 queries. The mapper also calls `toVendorResponse` for each PO, which iterates over `vendor.getAddresses()`, `vendor.getContactPersons()`, and `vendor.getBankAccounts()` — all lazily loaded, adding 3N more queries for a total of 4N+1. Same pattern in `getPurchaseRequisitions` (1+N item queries) and `getInvoices` / `getPayments` (each embeds full `VendorResponse`).

**Proper fix:** Add a `JOIN FETCH` JPQL query, or use Spring Data projections. At minimum for PO items:
```java
// PurchaseOrderRepository
@Query("SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.vendor v " +
       "LEFT JOIN FETCH v.addresses LEFT JOIN FETCH v.contactPersons LEFT JOIN FETCH v.bankAccounts")
List<PurchaseOrder> findAllWithDetails();
```
Then fetch all PO items in one batch query keyed by PO IDs rather than per-PO.

---

#### PRO-06 — `approverRole` from `ApprovalStep` is stored but never enforced at runtime

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseRequisitionService.java:490–494`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
private void validateApprover(ApprovalStep step, UUID actorId) {
    if (step.getApproverUserId() != null && !step.getApproverUserId().equals(actorId)) {
        throw new ForbiddenOperationException("This requisition is assigned to a different approver.");
    }
    // approverRole is NEVER checked here
}
```

**Why it is wrong:** The seeded approval workflow in V2 assigns `ROLE_MANAGER` and `ROLE_FINANCE` to steps. Any authenticated user who knows the requisition ID can call `POST /procurement/requisitions/{id}/approval-actions` with `action: APPROVED` and their own UUID as `actorId`. Since `approverUserId` is `NULL` for the seeded steps, `validateApprover` passes unconditionally — anyone approves. The `approverRole` field in `ApprovalStep` is a dead letter.

**Proper fix:** Check the authenticated principal's roles (available from `SecurityContextHolder`) against `step.getApproverRole()`:
```java
private void validateApprover(ApprovalStep step, UUID actorId) {
    AppUserDetails principal = (AppUserDetails) SecurityContextHolder.getContext()
        .getAuthentication().getPrincipal();
    if (step.getApproverUserId() != null && !step.getApproverUserId().equals(actorId)) {
        throw new ForbiddenOperationException("This requisition is assigned to a different approver.");
    }
    if (step.getApproverRole() != null) {
        boolean hasRole = principal.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(step.getApproverRole()));
        if (!hasRole) {
            throw new ForbiddenOperationException("You do not have the required role to approve this step.");
        }
    }
}
```

---

#### PRO-07 — `Content-Disposition` header built by string concatenation — header-injection risk

**File:** `src/main/java/com/fawnix/procurement/controller/PurchaseRequisitionController.java:93`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + content.fileName() + "\"")
```

**Why it is wrong:** `content.fileName()` is taken from the DB `file_name` column, which was originally set via `StringUtils.cleanPath(file.getOriginalFilename())` from the upload. `StringUtils.cleanPath` strips path traversal (`../`) but does NOT strip newline characters (`\r`, `\n`) that would terminate the header value and inject additional HTTP headers (CRLF injection / response splitting). VendorController (line 89) correctly uses `ContentDisposition.inline().filename(...)` which encodes the filename properly. PRController does not.

**Proper fix:** Use the same safe builder already used in VendorController:
```java
// PurchaseRequisitionController.java line 89-94
return ResponseEntity.ok()
    .contentType(content.mediaType())
    .header(HttpHeaders.CONTENT_DISPOSITION,
        ContentDisposition.inline().filename(content.fileName()).build().toString())
    .body(new ByteArrayResource(content.content()));
```

---

### P2 — Medium

---

#### PRO-08 — TOCTOU race in `createPurchaseOrderFromRequisition`: check-then-act without row lock

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseOrderService.java:69–70`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Vaishnavi Nerella

**Code:**
```java
if (purchaseOrderRepository.findByPurchaseRequisitionId(purchaseRequisitionId).isPresent()) {
    throw new BadRequestException("A purchase order already exists for this requisition.");
}
// ... time gap ...
PurchaseOrder saved = purchaseOrderRepository.save(purchaseOrder);  // line 98
```

**Why it is wrong:** Two concurrent POST requests for the same `purchaseRequisitionId` both pass the check at line 69 simultaneously, both create a PO, and the second hits the `UNIQUE` constraint on `purchase_requisition_id` in `purchase_orders`, surfacing as an unhandled `DataIntegrityViolationException` (500) rather than a clean 400. Additionally, `requireApprovedPurchaseRequisition` (called at line 73) carries no `@Transactional` annotation and the `@Transactional` on `createPurchaseOrderFromRequisition` does not take a pessimistic lock on the requisition row.

**Proper fix:** Use a pessimistic write lock on the requisition:
```java
// PurchaseRequisitionRepository
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT pr FROM PurchaseRequisition pr WHERE pr.id = :id")
Optional<PurchaseRequisition> findByIdForUpdate(@Param("id") UUID id);
```
Then catch `DataIntegrityViolationException` in `GlobalExceptionHandler` and re-throw a proper `BadRequestException`. The handler already maps `DataIntegrityViolationException` to 400 (line 33), but the message will be a raw JDBC message rather than a user-friendly one.

---

#### PRO-09 — `ServiceJwtProvider` token cache has a non-atomic check-then-update race

**File:** `src/main/java/com/fawnix/procurement/security/jwt/ServiceJwtProvider.java:25–46`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
private volatile String cachedToken;
private volatile Instant cachedExpiry;

public String getToken() {
    Instant now = Instant.now();
    if (cachedToken != null && cachedExpiry != null && cachedExpiry.isAfter(now.plusSeconds(30))) {
        return cachedToken;  // fast path
    }
    // ... build new token ...
    cachedToken = token;    // line 44 — two separate volatile writes, not atomic
    cachedExpiry = expiry;
    return token;
}
```

**Why it is wrong:** `volatile` makes each individual field write atomic and visible, but the two writes `cachedToken = token` and `cachedExpiry = expiry` are not a single atomic operation. A thread reading between the two writes sees the new `cachedToken` with the old `cachedExpiry`. In practice this only causes a few extra token generations, not a security breach, but it is a correctness defect. Multiple threads will regenerate the token simultaneously when the cache expires (thundering herd).

**Proper fix:** Use a single `volatile` holder or `AtomicReference` on a record:
```java
private record TokenCache(String token, Instant expiry) {}
private volatile TokenCache cache;

public synchronized String getToken() {
    TokenCache current = cache;
    Instant now = Instant.now();
    if (current != null && current.expiry().isAfter(now.plusSeconds(30))) {
        return current.token();
    }
    // ... build token ...
    cache = new TokenCache(token, expiry);
    return token;
}
```

---

#### PRO-10 — `VendorBankAccountRequest` has `@NotBlank` on `accountNumber` that conflicts with the "update existing, keep number" use-case

**File:** `src/main/java/com/fawnix/procurement/dto/ProcurementDtos.java:357–365`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
public record VendorBankAccountRequest(
    UUID id,
    @NotBlank(message = "Account number is required.")
    @Size(max = 64, ...)
    String accountNumber,
    @NotBlank(message = "Please re-enter account number.")
    ...
    String confirmAccountNumber,
```

**Why it is wrong:** The service logic at `VendorService.java:432–438` supports an "existing account, keep the account number unchanged" path by allowing `accountNumber` and `confirmAccountNumber` to both be `null` when `id` is non-null. But because `@NotBlank` is declared in the DTO, Bean Validation fires before the service is ever called, and the update request is rejected with a 400. The service-layer logic for unchanged accounts is therefore unreachable for any request that passes through `@Valid`.

**Proper fix:** Remove `@NotBlank` from `accountNumber`/`confirmAccountNumber` in the DTO. Move the "required for new accounts" validation into the service where the `id`/`null` context is available:
```java
// In validateBankAccounts (VendorService.java)
if (!unchangedExisting) {
    if (!StringUtils.hasText(account.accountNumber())) {
        throw new BadRequestException("Account number is required.");
    }
    ...
}
```

---

#### PRO-11 — `VendorResponse` DTO duplicates `vendorName` as `displayName` and exposes legacy flat address fields alongside structured `billingAddress`

**File:** `src/main/java/com/fawnix/procurement/dto/ProcurementDtos.java:439–473`  
**Also:** `src/main/java/com/fawnix/procurement/mapper/ProcurementMapper.java:116–149`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code (mapper, lines 119 and 125):**
```java
return new ProcurementDtos.VendorResponse(
    vendor.getId(),
    vendor.getVendorCode(),
    vendor.getVendorName(),   // field 3: vendorName
    ...
    vendor.getVendorName(),   // field 8: displayName — exact same value
    ...
    vendor.getGstNumber(),    // field 10: taxIdentifier — duplicates gstNumber (field 15)
    billingAddress != null ? billingAddress.addressLine1() : null,  // flat fields
    ...
    billingAddress,           // and also the structured object
```

**Why it is wrong:** `vendorName` appears twice in the JSON output (once as `vendorName`, once as `displayName`). `taxIdentifier` is set to `gstNumber` while `gstNumber` is also already in the response. The flat `addressLine1`–`postalCode` fields at positions 21–26 are redundant with `billingAddress.addressLine1()` etc. This is API bloat that confuses consumers (the frontend gets the same data in two shapes), breaks future API evolution, and doubles the serialized payload. The legacy flat fields stem from the original V2 schema columns that were superseded by V10 `vendor_addresses`.

**Proper fix:** Remove the `displayName`, `taxIdentifier`, and the six flat address fields from `VendorResponse`. Coordinate a frontend migration to use `vendor.vendorName` and `vendor.billingAddress.addressLine1`.

---

#### PRO-12 — `getAll` list endpoints have no pagination: unbounded result sets

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseRequisitionService.java:147–151`, `PurchaseOrderService.java:104–112`, `GoodsReceiptService.java:65–68`, `InvoiceService.java:68–72`, `PaymentService.java:64–68`, `VendorService.java:63–67`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
return purchaseOrderRepository.findAll().stream()   // no limit
    .map(...)
    .toList();
```

**Why it is wrong:** All six list endpoints call `findAll()` with no `Pageable`. With hundreds of POs (and their N+1 sub-queries loading vendor collections), these endpoints will OOM or time out in production. There is no `@Size` or other cap to prevent abuse.

**Proper fix:** Accept `Pageable` from the controller and return `Page<T>`, or minimally add a result limit:
```java
// Controller
@GetMapping
public Page<ProcurementDtos.PurchaseOrderResponse> getPurchaseOrders(Pageable pageable) {
    return purchaseOrderService.getPurchaseOrders(pageable);
}
```

---

#### PRO-13 — Three-way invoice match checks only total amount, not line-item match

**File:** `src/main/java/com/fawnix/procurement/service/InvoiceService.java:121–135`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
private MatchingResult evaluateMatching(Invoice invoice) {
    if (!goodsReceiptRepository.existsByPurchaseOrderId(...)) {
        return new MatchingResult("PENDING_GRN", ...);
    }
    BigDecimal poTotal = scale(invoice.getPurchaseOrder().getTotalAmount());
    BigDecimal invoiceTotal = scale(invoice.getAmount());
    if (invoiceTotal.compareTo(poTotal) != 0) {
        return new MatchingResult("MISMATCH", ...);
    }
    return new MatchingResult("MATCHED", ...);   // full approval granted
}
```

**Why it is wrong:** The system claims to perform a "three-way match" in the docstring and in the matched message ("PO, GRN, and invoice are aligned"). In reality it only checks (a) GRN exists for the PO and (b) invoice total == PO total. A partial goods receipt, a GRN for a different quantity, or a partial invoicing scenario are all silently approved. Partial GRN is possible because `GoodsReceipt` has no quantity fields — it only records that a receipt happened.

**Proper fix:** At minimum, document the limitation clearly in comments and drop the word "three-way match" from the user-visible match notes. If real three-way matching is required, add line-item quantities to `GoodsReceipt` and compare against PO line items.

---

#### PRO-14 — Default credentials committed in `application.yml` — DB password and internal service secret are weak fallbacks

**File:** `src/main/resources/application.yml:7,36,41`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```yaml
password: ${PROCUREMENT_DB_PASSWORD:postgres}
internal-service-secret: ${INTERNAL_SERVICE_SECRET:fawnix-internal-secret}
secret: ${JWT_SECRET:change-this-local-dev-secret-change-this-local-dev-secret}
```

**Why it is wrong:** Default fallback values for production-critical secrets are committed to source control. If the deployment environment fails to inject the env-var (misconfigured secret mount, missing Kubernetes secret), the service silently uses the well-known fallback. Any developer with repo access knows the default internal-service-secret and JWT signing key. The JWT secret default (`change-this-local-dev-secret-...`) is only 64 characters of ASCII and is guessable.

**Proper fix:** Remove the default values from non-dev config. For local development use a separate `application-local.yml` that is git-ignored:
```yaml
# application.yml — no defaults for secrets
password: ${PROCUREMENT_DB_PASSWORD}
internal-service-secret: ${INTERNAL_SERVICE_SECRET}
secret: ${JWT_SECRET}
```

---

### P3 — Low / Informational

---

#### PRO-15 — Redundant JWT parse in `JwtAuthenticationFilter`: `toUserDetails` then `isTokenValid` both call `extractClaims`

**File:** `src/main/java/com/fawnix/procurement/security/filter/JwtAuthenticationFilter.java:44–45`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
AppUserDetails userDetails = jwtService.toUserDetails(token);   // parses JWT (extractClaims #1)
if (jwtService.isTokenValid(token)) {                           // parses JWT again (extractClaims #2)
```

**Why it is wrong:** The JJWT `Jwts.parser().parseSignedClaims(token)` call is performed twice per request. `isTokenValid` also re-checks expiry, but JJWT already validates the `exp` claim during `parseSignedClaims` and throws `ExpiredJwtException` if expired — so `isTokenValid` is logically redundant: if `toUserDetails` succeeds, the token is valid by definition. If it throws (expired, bad sig), the `catch (Exception ignored)` block at line 51 handles it.

**Proper fix:** Remove `isTokenValid` and rely on the exception handling:
```java
try {
    AppUserDetails userDetails = jwtService.toUserDetails(token);
    // If we get here, token is valid
    UsernamePasswordAuthenticationToken authentication = ...;
    SecurityContextHolder.getContext().setAuthentication(authentication);
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}
filterChain.doFilter(request, response);
```

---

#### PRO-16 — `CreatePurchaseRequisitionRequest` and `UpdatePurchaseRequisitionRequest` are identical records

**File:** `src/main/java/com/fawnix/procurement/dto/ProcurementDtos.java:34–97`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
Both records have exactly the same 16 fields with the same constraints. The only difference is the class name.

**Why it is wrong:** Any future change to the PR schema must be applied in two places. Junior contributors will update one and miss the other. The update request could sensibly omit `requesterId` (since it should come from the auth principal per PRO-03) and could have additional update-specific constraints.

**Proper fix:** Extract shared validation fields into a base record interface, or merge into a single request record used for both create and update once PRO-03 is fixed.

---

#### PRO-17 — `trimToNull` and `generateDocumentNumber` are copy-pasted across all 4–5 services

**File:** See Redundancy section (PRO-R01, PRO-R02)  
**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872

**Why it is wrong:** 5 identical `trimToNull` implementations and 4 identical `generateDocumentNumber` implementations. If the date format or UUID truncation logic needs to change, it must be updated in every copy.

**Proper fix:** Move both to a shared utility class `ProcurementStringUtils` or `DocumentNumberGenerator` in the `common` package and reference it from all services.

---

#### PRO-18 — Dual `@RequestMapping` paths on every controller expose all endpoints twice

**File:** All 6 controllers, e.g. `PurchaseRequisitionController.java:28`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
@RequestMapping({"/procurement/requisitions", "/requisitions"})
```

**Why it is wrong:** Every controller registers two base paths. The short form (`/requisitions`) will not have the `/procurement` prefix that the API gateway is presumably routing on, making the short paths reachable as unauthenticated-but-authenticated (JWT is still required, but path-based WAF rules or gateway routing may not protect the short paths equally). All six controllers have this pattern, creating 12 base paths total.

**Proper fix:** If the gateway handles path rewriting, remove the short path. If internal services need a stable short path, document the intent explicitly.

---

#### PRO-19 — All files and blobs stored as PostgreSQL `bytea` — no file-system or object-storage abstraction

**File:** `src/main/java/com/fawnix/procurement/domain/VendorDocument.java:35`, `PurchaseRequisitionDocument.java` (equivalent)  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Chaitanya2872

**Why it is wrong:** Vendor documents and PR documents are stored as `bytea` columns in PostgreSQL. A 10 MB file limit per upload is enforced, but with multiple documents per vendor and PR, the `vendor_documents` and `pr_documents` tables will grow large, increase WAL volume, and inflate backup sizes. Streaming (serving chunks from DB to HTTP response) is not implemented — `document.getFileData()` loads the entire blob into JVM heap, meaning a concurrent fetch of ten 10 MB files allocates 100 MB on the service's heap.

**Proper fix:** Use an object store (S3-compatible) and store only the object key in the DB. For the short term, at least switch to streaming the JDBC `ResultSet` `InputStream` to the HTTP response rather than loading into a `byte[]`.

---

#### PRO-20 — `approvalStepRepository.findByWorkflowIdOrderByStepOrderAsc` is called twice in `reviewPurchaseRequisition`

**File:** `src/main/java/com/fawnix/procurement/service/PurchaseRequisitionService.java:331–333`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```java
List<ApprovalStep> steps = getApplicableApprovalSteps(workflow, totalAmount);  // DB query
ApprovalStep currentStep = steps.stream()
    .filter(step -> step.getStepOrder().equals(requisition.getCurrentStepOrder()))
    .findFirst()
    .orElseThrow(...);
```
This is fine (one query). But `submitPurchaseRequisition` also calls `getApplicableApprovalSteps` and these are separate invocations within the same transaction that could be cached. Minor, but notable pattern.

---

#### PRO-21 — `assets/acs.jpeg` committed inside `src/main/resources` — binary blob in service JAR

**File:** `src/main/resources/assets/acs.jpeg`  
**Severity:** P3 | **Confidence:** High  
**Owner:** (unknown — binary, no meaningful git log)

**Why it is wrong:** A JPEG image is bundled into the production JAR with no apparent use in this microservice (no endpoint serves it, no reference found in Java code). This unnecessarily increases JAR size and has no business purpose in a P2P backend service.

**Proper fix:** Remove the file. If it is a branding asset, host it in the frontend or a CDN.

---

## Redundancy

### PRO-R01 — `trimToNull` copy-pasted in 5 service classes

| Location A | Location B |
|---|---|
| `service/PurchaseRequisitionService.java:585–591` | `service/PurchaseOrderService.java:188–194` |
| `service/PurchaseRequisitionService.java:585–591` | `service/VendorService.java:503–509` |
| `service/PurchaseRequisitionService.java:585–591` | `service/GoodsReceiptService.java:83–89` |
| `service/PurchaseRequisitionService.java:585–591` | `service/PaymentService.java:115–121` |

All five implementations are character-identical. Should be extracted to `common/util/StringUtils.java` (or similar).

### PRO-R02 — `generateDocumentNumber` copy-pasted in 4 service classes

| Location A | Location B |
|---|---|
| `service/PurchaseRequisitionService.java:569–572` | `service/PurchaseOrderService.java:179–182` |
| `service/PurchaseRequisitionService.java:569–572` | `service/GoodsReceiptService.java:78–81` |
| `service/PurchaseRequisitionService.java:569–572` | `service/PaymentService.java:110–113` |

All four implementations are character-identical.

### PRO-R03 — `getSigningKey` double-encoding bug replicated in `JwtService` and `ServiceJwtProvider`

| Location A | Location B |
|---|---|
| `security/jwt/JwtService.java:68–72` | `security/jwt/ServiceJwtProvider.java:49–53` |

Both have the same `BASE64.decode(Base64.getEncoder().encodeToString(...))` anti-pattern. The same pattern also exists verbatim in at least 9 other services in this monorepo (approval, analytics, task, project, integration, org, sales, notifications, crm).

### PRO-R04 — `CreateVendorRequest` and `UpdateVendorRequest` are identical records

| Location |
|---|
| `dto/ProcurementDtos.java:221–260` (CreateVendorRequest — 20 fields) |
| `dto/ProcurementDtos.java:262–301` (UpdateVendorRequest — 20 identical fields) |

Same pattern as PRO-16 for PR requests.

### PRO-R05 — Security stack (JwtService, JwtProperties, JwtAuthenticationFilter, SecurityConfig, handlers) is copy-pasted across all 15 services

Each service in the monorepo carries its own copy of the JWT security stack with minor namespace differences. A shared `security-common` library would cut ~400 lines per service and allow fleet-wide security fixes to be deployed in one commit.

---

## Tests & Gaps

`src/test/` directory does not exist. There are zero automated tests (unit, integration, or contract) in this service.

**Specific untested critical paths:**
- `reviewPurchaseRequisition` — multi-step approval logic, step progression, rejection path
- `createPurchaseOrderFromRequisition` — duplicate-PO guard, status transition to `PO_CREATED`
- `reviewInvoice` — three-way match evaluation, MISMATCH blocking approval
- `generateVendorCode` — race condition behavior
- `JwtService.toUserDetails` and `isTokenValid` — token parsing

The `spring-boot-starter-test` dependency is present in `pom.xml` (line 79–81), so the test infrastructure exists but is unused.

---

## Coverage Note

**Fully read and line-numbered:**
- All 6 controllers (100%)
- All 6 service classes (100%)
- `ProcurementDtos.java`, `ProcurementMapper.java` (100%)
- `SecurityConfig.java`, `JwtAuthenticationFilter.java`, `JwtService.java`, `JwtProperties.java`, `ServiceJwtProvider.java`, `AppUserDetails.java` (100%)
- `InternalServiceConfig.java`, `GlobalExceptionHandler.java`, `InventoryClient.java` (100%)
- All 10 Flyway migrations (100%)
- `application.yml`, `pom.xml` (100%)
- Key domain entities: `PurchaseRequisition.java`, `PurchaseOrder.java`, `Invoice.java`, `Payment.java`, `Vendor.java`, `VendorBankAccount.java`, `ApprovalStep.java`, `AuditableEntity.java` (100%)

**Skimmed but not line-by-line:**
- Remaining domain entities (`GoodsReceipt.java`, `ApprovalLog.java`, `ApprovalWorkflow.java`, `PurchaseRequisitionItem.java`, `PurchaseOrderItem.java`, `VendorAddress.java`, `VendorContactPerson.java`, `VendorDocument.java`, `PurchaseRequisitionDocument.java`) — enum types and value objects, lower risk
- All 15 `Repository` interfaces — cursory check only; no custom `@Query` methods spotted beyond `findByWorkflowIdOrderByStepOrderAsc` (ApprovalStepRepository) and standard finders
- `RestAuthenticationEntryPoint.java`, `ApiErrorResponse.java`, exception classes — structural only

**Confidence overall:** High for the findings listed. The audit did not execute the code or run tests, so runtime behavior (e.g., actual JJWT version behavior on expiry, exact Feign timeout defaults) is reasoned from static analysis.

**Self-gaps:**
- Could not verify whether `@Transactional(readOnly = true)` on `getItems()` (line 390) actually propagates correctly when called from other `@Transactional` methods (Spring should join the outer transaction, which is correct, but this is worth a targeted test)
- Did not trace the `open-in-view: false` setting against all lazy-load paths to confirm no `LazyInitializationException` can surface at the mapper layer for entities loaded in read-only transactions
- Did not inspect `ApprovalLogRepository` custom delete methods (`deleteByEntityTypeAndEntityId`) for correctness — assumed JPQL derived delete

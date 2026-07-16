# Redundancy Report — Copy-Paste & the Abstractions That Remove It

**~12% of the codebase (16,230 LOC) is duplicated** — the dominant maintainability problem, and a
direct symptom of a junior team copy-pasting instead of extracting shared code. Each cluster below
is real evidence (from the clone detector, `data/duplication.csv`) plus the correct fix.

Owner tags follow the [attribution caveat](./README.md#-read-this-first-how-to-read-the-attribution).
**[migrated]** = HirePath.

---

## 1. Security stack copied into 15 services — the worst one
- **Evidence**: `JwtAuthenticationFilter`, `JwtService`, `AppUserDetails`, `JwtProperties`,
  `SecurityConfig` — **75 class files**, identical modulo package, across all 15 services
  (`*/security/**`). The clone detector shows the filter body shared across 15 files.
- **Owner**: mixed (Chaitanya for Fawnix copies, Ravi **[migrated]** for HirePath copies).
- **Cost**: a security fix (token bypass, missing Bearer check, algorithm confusion) must be applied
  **15 times**; task-service's copy has already begun to diverge.
- **Proper fix**: a **`common-security`** Maven module with one canonical implementation; services
  depend on it and keep at most a `SecurityFilterChain` override. See
  [fixing-properly.md](./fixing-properly.md#shared-library-modules).

## 2. Entity audit fields copied into 46 entities
- **Evidence**: `created_at`/`updated_at` columns + their getters/setters (~12 lines) repeated across
  **46 `@Entity` classes** (CRM 14, Sales 10, Task 11, Inventory 3, Identity 5, Project 2, …).
  Procurement even created a **local** `AuditableEntity` that nobody else reuses. Worse, there are no
  `@PrePersist`/`@PreUpdate` hooks — timestamps are set by hand in service code, so every write path
  must remember to set both.
- **Owner**: Chaitanya2872.
- **Proper fix**: one `@MappedSuperclass BaseAuditEntity` with Spring Data JPA Auditing
  (`@CreatedDate`/`@LastModifiedDate`, `@EntityListeners(AuditingEntityListener.class)`,
  `@EnableJpaAuditing`). Every entity `extends BaseAuditEntity` and deletes the block; remove the
  manual `setCreatedAt(...)` calls. Removes ~550 LOC. Sketch in
  [fixing-properly.md](./fixing-properly.md#jpa-audit-fields).

## 3. `GlobalExceptionHandler` + `ApiErrorResponse` copied into 6 services
- **Evidence**: 12 files; `ApiErrorResponse` is byte-identical; handler bodies share ~7
  `@ExceptionHandler` methods. Divergence has already started (task-service dropped logging; CRM added
  multipart handlers). And the **8 HirePath services have none at all** (see main audit) — so the
  contract is simultaneously duplicated **and** missing.
- **Owner**: Chaitanya2872 (Fawnix copies).
- **Proper fix**: move both to a **`common-web`** module; every service depends on it and adds only
  domain-specific handlers.

## 4. Cross-service client DTOs copied per consumer
- **Evidence** (all **[migrated]**, Owner Ravi-Shankar):
  | DTO | Copies | Dup |
  |---|---|---|
  | `SendNotificationRequest` | approval + notifications + recruitment (+task variant) | 90% |
  | `InternalFormSubmissionRequest` | forms + recruitment | 89% |
  | `ApprovalRequestCreateRequest` | approval + recruitment | ~identical |
  | `CalendarEventRequest` / `…UpdateRequest` | integration + recruitment | ~identical |
- **Cost**: they were identical *at copy time* — the most dangerous moment, because everyone assumes
  they stay in sync. The task-service `SendNotificationRequest` **already dropped two fields**.
- **Proper fix**: a **versioned `*-api-contract` module per provider** (e.g. `notifications-api-contract`)
  containing the DTO **and** the `@FeignClient` interface, defined once and imported by provider and
  all callers. Sketch in [fixing-properly.md](./fixing-properly.md#shared-contracts-for-feign).

## 5. Near-duplicate entities (copy an entity, tweak a few fields)
- **`SalesOrderEntity` ≈ `QuoteEntity`** — 20 of Quote's 28 fields identical (customer block, both
  addresses, money fields, audit-who). Owner Chaitanya2872.
- **`PositionCreateRequest` ≈ `PositionUpdateRequest`** — 11 shared fields (81%). Owner Ravi **[migrated]**.
- **Proper fix**: a `@MappedSuperclass SalesDocumentBase` (which itself extends `BaseAuditEntity`) for
  the first; a shared base/record for the DTO pair.

## 6. Frontend P2P pages copy-paste helpers, styles, and components
- **Evidence** (Owner Chaitanya, some Vaishnavi):
  - `formatCurrency`/`formatDate` re-declared in ≥7 files (`p2p/{pr,po,payment,vendors}`, `sales`),
    with a naming split (`fmtCurrency` vs `formatCurrency`).
  - `toneForStatus` re-declared per page (`pr:99`, `po:659`, `payment:41`).
  - Stat-card component copy-pasted (`po:663 StatusStat`, `payment:52 PaymentStat`, `leads:132 StatCard`).
  - Button/field Tailwind strings (`buttonPrimary`, `fieldShellClass`, …) verbatim across ≥4 pages.
  - A whole `SelectField` combobox (~80 lines) re-implemented in `pr` and `vendors`.
- **Proper fix**: the existing `src/modules/purchases/p2p/components/` folder is underused — put shared
  `formatCurrency`/`formatDate` in `src/lib/format.ts`, and `<P2PStatCard>`, `<P2PSelectField>`,
  `<P2PButton>`, status-tone maps in the shared p2p folder.

## 7. Small utilities re-implemented everywhere
- `formatDate`/`fmtDate` in **~14 files** despite a canonical `src/lib/utils.ts`.
- `trimToNull` copied identically in **6 Java services** (`TaskService:2131`, `LeadService:790`,
  `LeadImportService:430`, `SalesOrderService:887`, `PurchaseRequisitionService:585`).
- `normalizeRole` duplicated in `src/lib/api.ts` and `src/lib/setupApi.ts`.
- **Proper fix**: one shared util per platform (`src/lib/`, a backend `common-util` module).

## 8. Dead duplicate: the legacy monolith
- `backend/src/` (54 files, 3,559 LOC) is **not a Maven module** and duplicates the live crm-service
  (`verse/leads/LeadEntity` ≈ `crm/leads/LeadEntity`, 59% dup). It also ships a committed `Admin@123`.
  Owner Chaitanya2872.
- **Proper fix**: delete the directory (`git rm -r backend/src/`).

## 9. Redundant schema file
- `backend/postgresql-all-services-schema.sql` (1,497 lines) is a monolithic all-services schema that
  duplicates the per-service Flyway migrations. Owner Chaitanya2872. It can drift from the real
  (Flyway-owned) schemas.
- **Proper fix**: delete it; Flyway migrations per service are the single source of truth. If a
  consolidated view is wanted, generate it, don't hand-maintain it.

---

## The shared modules to create (removes clusters 1–5, 7)

| New module | Absorbs | Removes |
|---|---|---|
| `common-jpa` | `BaseAuditEntity` (JPA Auditing) | cluster 2 (~550 LOC) |
| `common-web` | `GlobalExceptionHandler`, `ApiErrorResponse` | cluster 3 |
| `common-security` | JWT filter/service/config/props/user | cluster 1 (~4,500 LOC / 75 files) |
| `common-util` | `trimToNull`, shared helpers | cluster 7 (backend) |
| `<svc>-api-contract` (per provider) | shared DTO + Feign interface | cluster 4 |

Migration order (safe, incremental): `common-jpa` → `common-web` → `common-security`; the contract
modules per provider; delete `backend/src` and the schema file immediately (self-contained).
Do each behind a smoke test since there are currently **no tests**.

Detailed sketches: [fixing-properly.md](./fixing-properly.md).

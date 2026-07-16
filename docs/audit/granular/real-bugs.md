# Real Bugs — Verified Correctness Defects

These are not style opinions. Each was **read and confirmed in source**. They are ranked by
blast radius. Owner is the current code owner (see the [attribution caveat](./README.md#-read-this-first-how-to-read-the-attribution));
**[migrated]** marks code carried in from HirePath.

Security-class bugs (committed secrets, VMS auth bypass) are in [../security.md](../security.md).

---

## P1 — data-corrupting or money-wrong

### B1. IOTIQ purchase orders are double-taxed ✓verified
- **File**: `src/modules/purchases/p2p/po/page.tsx:258-261` · **Owner**: Vaishnavi Nerella
- CGST and SGST are applied **unconditionally**, while IGST is applied only for the IOTIQ template:
  ```ts
  const igstAmount = template === "IOTIQ" ? … : 0;
  const cgstAmount = subtotal * ACS_TAX_RATE;   // ← no template guard
  const sgstAmount = subtotal * ACS_TAX_RATE;   // ← no template guard
  const grandTotal = subtotal + igstAmount + cgstAmount + sgstAmount + otherCharges;
  ```
  For an IOTIQ PO the grand total is overstated by `subtotal × 18%` (IGST **plus** CGST+SGST).
  These totals are sent to vendors and drive payments.
- **Fix**: guard CGST/SGST on `template === "ACS"` (only intra-state ACS uses CGST/SGST; IOTIQ uses
  IGST only).

### B2. `@Transactional` silently does nothing on inbound WhatsApp handling ✓verified
- **File**: `WhatsappQuestionnaireService.java:231-232` (called from `:225`) · **Owner**: Chaitanya2872
- The method is `@Transactional` but **`protected`**, and it is called via `this.…` from the same
  class. Spring's proxy only advises `public` methods invoked through the proxy — so the annotation
  is a **no-op**. Every inbound webhook message runs with **no transaction**; a mid-method failure
  leaves partial state with no rollback.
- **Fix**: make it `public` (and, since it's a webhook path, ensure it's invoked through the proxy).

### B3. External HTTP calls inside DB transactions ✓verified
- **Files**: `SalesOrderService.java:506` (`validate`), `:646` (`reserve`) — reached from
  `@Transactional` create/update/submit paths · **Owner**: Chaitanya2872
- Inventory reserve/validate HTTP calls execute while a DB transaction (and connection) is held.
  Two failure modes: (a) DB save fails after `reserve` succeeds → stock reserved for an order that
  never commits, no compensation; (b) slow inventory service holds DB connections → pool exhaustion.
  `LeadService` and `WhatsappQuestionnaireService` have the same pattern for WhatsApp sends.
- **Fix**: commit first, then call external services from `@TransactionalEventListener(AFTER_COMMIT)`.

### B4. Non-atomic ID generation → duplicate task codes / order numbers ✓verified
- **Files**: `TaskService.java:2072` (`count() + 1`), `SalesOrderService.java:868-878`
  (`existsByOrderNumber` check-then-insert) · **Owner**: Chaitanya2872
- Both read-then-write without atomicity. Concurrent creates produce the **same** code/number →
  unique-constraint 500s, or silent duplicates. Deleting a task then creating one **re-uses** a
  retired code.
- **Fix**: DB sequence (`CREATE SEQUENCE …`, `@GeneratedValue(strategy = SEQUENCE)`), formatted after
  insert. No retry loop needed.

### B5. Batch lead import has no transaction — partial imports commit permanently ✓verified
- **File**: `LeadImportService.java:69-112` · **Owner**: Chaitanya2872
- `importLeads` loops calling per-row `@Transactional` `createLead`/`updateLead`, each auto-committing.
  Row 50 failing leaves rows 1–49 committed; re-running duplicates them.
- **Fix**: annotate `importLeads` `@Transactional` so rows join one transaction (or batch `saveAll`).

### B6. Inventory validation treats "no response" as "OK" ✓verified
- **File**: `SalesOrderService.java:491-514` (call `:506`) · **Owner**: Chaitanya2872
- On a null/timeout inventory response the method logs a warning and lets order creation proceed —
  the stock check never actually happened, so an order is saved as if stock were available.
- **Fix**: fail closed — throw `ServiceUnavailableException` on null; don't equate "unknown" with "OK".

---

## P1 — user-visible / feature-dead

### B7. Salary renders `?12.5L` instead of `₹12.5L` ✓verified
- **File**: `src/modules/recruitment/OffersPage.tsx:23` · **Owner**: Ravi-Shankar **[migrated]**
  ```ts
  return `?${(num / 100000).toFixed(1)}L`   // literal '?' — the ₹ was lost to bad encoding
  ```
  Every salary in the Offers UI shows a `?`.
- **Fix**: `` `₹${(num/100_000).toFixed(1)}L` `` (explicit unicode escape).

### B8. Drag-and-drop form builder is broken by a nested component ✓verified
- **File**: `src/modules/recruitment/ApplicationFormBuilderPage.tsx:335` (defined inside the page
  component at `:82`, used `:472`) · **Owner**: Ravi-Shankar **[migrated]**
- `SortableFieldCard` is declared **inside** `ApplicationFormBuilderPage`, so every parent render
  creates a new component identity → `useSortable`'s registered DOM node is destroyed/recreated →
  drag breaks or behaves erratically.
- **Fix**: hoist `SortableFieldCard` to module scope (or its own file), pass props explicitly.

### B9. `TalentPoolPage` renders 5 hardcoded fake candidates, no API ✓verified (earlier pass)
- **File**: `src/modules/recruitment/TalentPoolPage.tsx:13-77` · **Owner**: Ravi-Shankar **[migrated]**
- The whole page (candidates + stat tiles) is computed from a `mockPool` constant; buttons have no
  handlers. It looks functional but is permanently disconnected from the backend.
- **Fix**: replace with a `useTalentPool` query hook; wire stats to real data; implement or disable
  the actions.

---

## P2 — wrong data, silently

### B10. Payment rejection reason is hardcoded ✓verified
- **File**: `src/modules/purchases/p2p/payment/page.tsx:524` · **Owner**: Chaitanya2872
  ```ts
  payload: { action: "REJECTED", …, remarks: "Rejected from payment desk" }
  ```
  Finance reviewers cannot state the real reason; this string is stored and surfaces in audit logs.
  (Note the same file threads a real `remarks` field elsewhere at `:396` — the reject path just
  ignores it.)
- **Fix**: capture `remarks` from the reviewer before dispatching the mutation.

### B11. `TaskService` uses the wrong `@Transactional` import ✓verified
- **File**: `TaskService.java:70` (`import jakarta.transaction.Transactional`) · **Owner**: Chaitanya2872
- Not Spring's annotation. Consequences: `readOnly = true` is unavailable (reads run full dirty
  checking), and behavior diverges from every other service. Combined with the `findAll()`-then-filter
  reads (see [findings-backend.md](./findings-backend.md)), reads are needlessly heavy.
- **Fix**: `import org.springframework.transaction.annotation.Transactional;` and mark reads `readOnly`.

### B12. `parsePermissions` 500s on an unknown permission string ✓verified (deep-dive)
- **File**: `TaskService.java:1891` · **Owner**: Chaitanya2872
- `TaskSpacePermission.valueOf(value)` throws on any stale/renamed DB value, 500-ing every read that
  touches that space. A rename migration can take the task feature down.
- **Fix**: catch `IllegalArgumentException`, log, and skip unknown values.

### B13. Effect that writes `localStorage` clobbers the saved draft before data loads ✓verified (deep-dive)
- **File**: `src/modules/purchases/p2p/pr/page.tsx:1242-1282` · **Owner**: Chaitanya2872
- The sourcing effect runs on mount while `vendors` is still `[]`, computes an empty default, and
  writes it to `localStorage`, overwriting a prior draft. Because its deps don't re-trigger on
  "vendors arrived," the correct default never lands for the current requisition.
- **Fix**: restore from storage on mount (no `vendors` dep); only recompute defaults after
  `requisition.id` changes **and** `vendors.length > 0`.

---

## Cross-cutting

- **`useEffect` → many `setState` cascades** are masked by file-level `eslint-disable` in
  `task-management/page.tsx` and `p2p/pr/page.tsx` (rules `set-state-in-effect`,
  `preserve-manual-memoization`, `purity`). These are real re-render/ordering hazards, not false
  positives — see [findings-frontend.md](./findings-frontend.md).
- **Money as JS `number` / Java double-ish** and `ZoneId.systemDefault()` date handling in
  `TaskService` are latent correctness risks under scale/timezone changes — see
  [findings-backend.md](./findings-backend.md).

**Suggested fix order:** B1 (money) → B2–B6 (data integrity) → B7–B9 (visible/dead) → the rest.

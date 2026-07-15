# purchases — Module Audit

**Audit date:** 2026-07-14
**Auditor:** Claude Sonnet 4.6 (automated)
**Root:** `src/modules/purchases`

---

## Summary

The purchases module implements a full Procure-to-Pay (P2P) workflow: Purchase Requisitions → Purchase Orders → Goods Receipts → Invoices → Payments, with a vendor master and supporting dashboard/alerts/reports pages. The data layer (api.ts, hooks.ts, types.ts) is well-structured with a proper query-key factory and consistently wrapped errors. The biggest risks are concentrated in the two giant page files (`p2p/pr/page.tsx` at 2,973 lines / 48 useState calls, and `p2p/po/page.tsx` at 2,261 lines), which are genuine god-components that are difficult to maintain and test. Secondary issues include `localStorage` used as persistent application state across three locations, a critical tax-calculation correctness bug in the PO document preview, hardcoded "Logged-in User" strings, and ten copies of `formatCurrency`/`formatDate` duplicated across the module instead of using the shared lib.

---

## Surface map

### Pages / Routes

| Route              | File                                   | Purpose                          | Lines |
|--------------------|----------------------------------------|----------------------------------|-------|
| `/purchases`       | `page.tsx`                             | Redirect → `/p2p`                | 5     |
| `/p2p` (layout)    | `p2p/components/P2PModuleLayout.tsx`   | Thin `<Outlet />`                | 5     |
| `/p2p`             | `p2p/dashboard/page.tsx`               | P2P Command Center               | 429   |
| `/p2p/pr`          | `p2p/pr/page.tsx`                      | PR CRUD + evaluation + negotiation| 2,973 |
| `/p2p/po`          | `p2p/po/page.tsx`                      | PO creation + document preview   | 2,261 |
| `/p2p/vendors`     | `p2p/vendors/page.tsx`                 | Vendor master CRUD               | 2,239 |
| `/p2p/receipt`     | `p2p/receipt/page.tsx`                 | GRN creation / register          | 449   |
| `/p2p/invoice`     | `p2p/invoice/page.tsx`                 | Invoice desk + approval          | 617   |
| `/p2p/payment`     | `p2p/payment/page.tsx`                 | Payment desk + approval          | 551   |
| `/p2p/alerts`      | `p2p/alerts/page.tsx`                  | Operations exception queue        | 275   |
| `/p2p/reports`     | `p2p/reports/page.tsx`                 | Executive KPI report             | 174   |
| `/p2p/budget`      | `p2p/budget/page.tsx`                  | Redirect → `/p2p/pr`             | 5     |
| `/p2p/negotiation` | `p2p/negotiation/page.tsx`             | Redirect → `/p2p/pr`             | 5     |

### API Endpoints (api.ts)

| Entity               | Methods                                         |
|----------------------|-------------------------------------------------|
| Procurement Products | GET (proxied from inventory module)             |
| Purchase Requisitions| GET / POST / PUT / DELETE / submit / review / evaluation / budget / negotiation / documents |
| Vendors              | GET / POST / PUT / DELETE / documents           |
| Purchase Orders      | GET / POST / DELETE                             |
| Goods Receipts       | GET / POST                                      |
| Invoices             | GET / POST / review                             |
| Payments             | GET / POST / review                             |

### Shared Components

| Component         | File                               |
|-------------------|------------------------------------|
| P2PLayout         | `p2p/components/P2PLayout.tsx`     |
| P2PCard           | `p2p/components/P2PCard.tsx`       |
| P2PFormField      | `p2p/components/P2PFormField.tsx`  |
| P2PTable          | `p2p/components/P2PTable.tsx`      |
| P2PStatusBadge    | `p2p/components/P2PStatusBadge.tsx`|
| P2PModuleLayout   | `p2p/components/P2PModuleLayout.tsx`|
| PurchaseOrderDocument | `PurchaseOrderDocument.tsx`    |

---

## Findings

---

### P0 — Critical Correctness Bugs

---

#### PUR-01 — Tax calculation error: IOTIQ PO grand total includes CGST+SGST that should not apply

**File:** `src/modules/purchases/p2p/po/page.tsx:251-269`
**Severity:** P0 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
function calculatePurchaseOrderTaxes(template: PoTemplate, subtotal: number, details: PoDraftDetails) {
  const igstAmount =
    template === "IOTIQ"
      ? details.igstAmountMode === "MANUAL"
        ? parseAmountInput(details.igstAmount || "")
        : subtotal * IOTIQ_TAX_RATE          // 18% IGST for inter-state
      : subtotal * ACS_IGST_RATE;
  const cgstAmount = subtotal * ACS_TAX_RATE;  // 9% — always computed
  const sgstAmount = subtotal * ACS_TAX_RATE;  // 9% — always computed
  const grandTotal = subtotal + igstAmount + cgstAmount + sgstAmount + otherCharges;
```

**Why it is wrong:** When `template === "IOTIQ"`, IGST (inter-state) is applied, meaning CGST and SGST are zero. However, `cgstAmount` and `sgstAmount` are unconditionally set to 9% of the subtotal and added to the grand total. For an IOTIQ PO with subtotal ₹1,00,000, the document will display grand total ₹1,36,000 (subtotal + 18% IGST + 9% CGST + 9% SGST) instead of the legally correct ₹1,18,000. Every IOTIQ PO document generated will show an inflated amount that is legally incorrect and misleading to vendors.

**Fix:**
```ts
function calculatePurchaseOrderTaxes(template: PoTemplate, subtotal: number, details: PoDraftDetails) {
  const isInterState = template === "IOTIQ";
  const igstAmount = isInterState
    ? (details.igstAmountMode === "MANUAL"
        ? parseAmountInput(details.igstAmount || "")
        : subtotal * IOTIQ_TAX_RATE)
    : 0;
  const cgstAmount = isInterState ? 0 : subtotal * ACS_TAX_RATE;
  const sgstAmount = isInterState ? 0 : subtotal * ACS_TAX_RATE;
  // ... rest unchanged
```

---

### P1 — High-Severity Bugs and Risks

---

#### PUR-02 — localStorage used as primary state store for sourcing evaluation data

**File:** `src/modules/purchases/p2p/pr/page.tsx:1247-1294`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
const persisted = window.localStorage.getItem(persistedKey);
// ...
window.localStorage.setItem(
  `fawnix.p2p.requisition-sourcing.${requisition.id}`,
  JSON.stringify({
    shortlistedVendorIds,
    vendorBenchmarks,
    externalCandidates,
    recommendedVendorId,
  })
);
```

**Why it is wrong:** Vendor evaluation shortlists, benchmark quotes, external candidate data, and the recommended vendor selection are persisted only in `localStorage`, keyed per requisition ID and per browser session. This means: (a) switching browsers or devices loses all evaluation work with no warning; (b) multiple procurement team members cannot collaborate on the same requisition's vendor evaluation; (c) localStorage is not cleared on logout so it leaks data across users on shared machines; (d) there is no versioning or validation of the stored shape, so a schema change will silently read bad data. This data belongs in the backend as part of the requisition's evaluation state.

**Fix:** Move shortlist, benchmark, and external-candidate state to the server. Extend `UpdatePurchaseRequisitionEvaluationPayload` to carry these fields, or create a dedicated evaluation endpoint. Until then, at minimum log a console warning that this state is session-only, and call `localStorage.removeItem(persistedKey)` on user logout.

---

#### PUR-03 — localStorage used for vendor draft without XSS sanitisation

**File:** `src/modules/purchases/p2p/vendors/page.tsx:1928,1940-1943`
**Severity:** P1 | **Confidence:** High
**Owner:** Vaishnavi Nerella

**Offending code:**
```ts
localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
// ...
const draft = localStorage.getItem(DRAFT_KEY);
setVendorForm(draft ? { ...createEmptyVendorForm(), ...JSON.parse(draft) } : createEmptyVendorForm());
```

**Why it is wrong:** `JSON.parse(draft)` is spread directly into form state with no schema validation or sanitisation. If an attacker can modify localStorage (via another XSS vector), any field including `gstNumber`, `panNumber`, or `bankAccounts` can be poisoned and submitted as real vendor data. Even without malicious actors, any structural change to `VendorForm` will silently restore an incompatible draft and corrupt form state.

**Fix:** Wrap the parse in a schema validator (e.g. zod) and catch parse/validation errors. At minimum, use a version key in the stored object and discard drafts from older versions:
```ts
const raw = JSON.parse(draft) as { version?: number } & Partial<VendorForm>;
if (raw.version !== DRAFT_VERSION) { localStorage.removeItem(DRAFT_KEY); return; }
```

---

#### PUR-04 — Non-null assertion on conditional query argument

**File:** `src/modules/purchases/hooks.ts:106,217`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
export function usePurchaseRequisitionDocuments(requisitionId?: string) {
  return useQuery({
    queryKey: procurementKeys.requisitionDocuments(requisitionId ?? "unknown"),
    queryFn: () => fetchPurchaseRequisitionDocuments(requisitionId!),  // line 106
    enabled: !!requisitionId,
  });
}

export function useVendorDocuments(vendorId?: string) {
  return useQuery({
    queryFn: () => fetchVendorDocuments(vendorId!),  // line 217
```

**Why it is wrong:** The `enabled: !!requisitionId` guard prevents the function from executing at mount, but there is a race condition: if `enabled` is overridden by a parent, or if TanStack Query's refetch logic fires before React batches the conditional, the `!` assertion will call `fetchPurchaseRequisitionDocuments(undefined)` (cast as string), making an API call to `/procurement/requisitions/undefined/documents`. This is a latent runtime error.

**Fix:** Use a conditional return inside `queryFn` instead of the `!` operator:
```ts
queryFn: () => {
  if (!requisitionId) return Promise.reject(new Error("No requisition ID"));
  return fetchPurchaseRequisitionDocuments(requisitionId);
},
```

---

#### PUR-05 — God-component: `P2PPrManagementPage` / `RequisitionDetailPanel` at 2,973 lines with 48 useState calls

**File:** `src/modules/purchases/p2p/pr/page.tsx:1-2972`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
The file defines a single exported page alongside `CreateRequisitionPanel`, `RequisitionDetailPanel`, inline `SelectField`, `InputWithIcon`, `FlatSection`, `MetricStrip`, `DetailBlock`, `InfoPair`, and `workflowStage` — all in one 2,973-line file. `RequisitionDetailPanel` alone has 28 local `useState` calls. `P2PPrManagementPage` has 20 more.

**Why it is wrong:** Files of this size are untestable in isolation, have a high probability of hidden bugs (the suppressed `react-hooks/set-state-in-effect` and `@typescript-eslint/no-unused-vars` eslint disables at line 1-2 are strong signals), and mean every change has a high risk of accidental side effects. The `eslint-disable` for `set-state-in-effect` at line 2 directly masks real React anti-patterns where setState is called inside effects without proper dependency guards, which can cause infinite render loops.

**Fix:** Extract `CreateRequisitionPanel`, `RequisitionDetailPanel`, `SelectField`, `InputWithIcon`, and the local utility functions into separate files. Extract the 28 `useState` calls in `RequisitionDetailPanel` into a custom hook `useRequisitionDetailState(requisition)`. This is a major refactor but each piece is independently extractable.

---

#### PUR-06 — God-component: `P2PPoPage` at 2,261 lines

**File:** `src/modules/purchases/p2p/po/page.tsx:1-2261`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
The PO page mixes: PDF document building logic (`numberToIndianWords`, `draftDoc`, `orderDoc`), company master data constants (`ACS_COMPANY`, `IOTIQ_COMPANY`, `ACS_TERMS`, `IOTIQ_TERMS`), form state management, the PO create panel, a delete dialog, and a print-preview modal.

**Why it is wrong:** Document-generation logic and company-constant data are co-located with React form state and rendering. Testing the `numberToIndianWords` function requires importing a React component file. The `ACS_TERMS` array alone is 17 entries of business-legal content that will drift silently if this file is not touched.

**Fix:** Extract `numberToIndianWords` + `numberBelowThousandToWords` into `src/modules/purchases/utils/numberToWords.ts`. Extract `ACS_COMPANY`, `IOTIQ_COMPANY`, `ACS_TERMS`, `IOTIQ_TERMS`, and the constant objects into `src/modules/purchases/po-templates.ts`. Extract `PreviewModal` and `DeletePurchaseOrderDialog` into their own component files.

---

#### PUR-07 — Hardcoded "Logged-in User" string written into PO document

**File:** `src/modules/purchases/p2p/po/page.tsx:473,629`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
// line 473, createDefaultPoDraftDetails()
preparedBy: "Logged-in User",
// ...
// line 629, orderDoc()
preparedBy: "Logged-in User",
```

**Why it is wrong:** The string `"Logged-in User"` is embedded in every generated PO PDF under the "Prepared By" field. This is a placeholder that was never wired to the authenticated user. Every PO document printed by the application will show this literal string, which is unprofessional and incorrect.

**Fix:** Pass `currentUser.name` into `createDefaultPoDraftDetails` and `orderDoc`:
```ts
function createDefaultPoDraftDetails(template: PoTemplate, vendor?: Vendor | null, preparedBy = "Pending"): PoDraftDetails
```
Then in the PO page, pass `currentUser?.name ?? ""` to both call sites.

---

#### PUR-08 — Hardcoded request ID "P2P-REQ-1024" rendered in shared header

**File:** `src/modules/purchases/shared.tsx:25`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```tsx
<span className="font-semibold text-slate-900">P2P-REQ-1024</span>
```

**Why it is wrong:** The `P2PHeader` component in `shared.tsx` renders a hardcoded request ID badge that is never replaced with real data. While this component appears to be unused in the current routing (no import found in non-shared files), if it were ever consumed it would mislead every user with a fake request ID. It is leftover dead code that was never wired to an actual PR.

**Fix:** The component is currently unused. Either delete it entirely (it has been superseded by `P2PLayout`), or fix the value to be a prop before re-introducing it.

---

### P2 — Medium Severity

---

#### PUR-09 — `RequisitionDetailPanel` uses `useEffect` to set state from `requisition` prop — suppressed eslint-disable

**File:** `src/modules/purchases/p2p/pr/page.tsx:1216-1240,1284-1295`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
/* eslint-disable react-hooks/set-state-in-effect */   // line 2
// ...
useEffect(() => {
  setActiveTab("overview");
  setBudgetName(requisition.budgetName ?? "");
  // ... 18 more setState calls
}, [requisition]);   // line 1216

useEffect(() => {
  // ... setShortlistedVendorIds, setVendorBenchmarks, etc
}, [requisition.id, requisition.negotiationVendorId, vendors]);   // line 1282

useEffect(() => {
  // ... write to localStorage
}, [externalCandidates, recommendedVendorId, requisition.id, ...]);   // line 1284
```

**Why it is wrong:** The `eslint-disable react-hooks/set-state-in-effect` suppression at line 2 was added to silence the linter rather than fix the underlying anti-pattern. Multiple `useEffect` hooks each call several `setState` functions, causing multiple re-renders when a new `requisition` prop arrives. The `localStorage` write effect has 5 dependencies and will write to storage on every interaction during the panel lifetime, even when the user is just typing in a field. This creates unnecessary I/O pressure on every keystroke.

**Fix:** Replace the 28 individual state variables with a single `useReducer` holding the panel's form state, initialized from `requisition`. For the localStorage write, debounce it with a 500ms timeout. Use `useLayoutEffect` for the sync reset to suppress unnecessary renders.

---

#### PUR-10 — `fetchProcurementProducts` uses hardcoded `pageSize: 100` and discards pagination

**File:** `src/modules/purchases/api.ts:34-41`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
const response = await fetchProducts({
  search: "",
  category: "",
  brand: "",
  status: "ALL",
  page: 1,
  pageSize: 100,  // hardcoded
});
return response.data;
```

**Why it is wrong:** Once the inventory has more than 100 products, the PR creation form will silently stop showing products beyond the first 100 without any indication that the list is truncated. There is no pagination in the product selector dropdown. This is a silent data correctness failure.

**Fix:** Either (a) implement a server-side search endpoint for products and replace the static dropdown with a search-as-you-type combobox, or (b) fetch all pages until exhausted with pagination, or (c) at minimum increase `pageSize` to a server-configured maximum and add a visible warning when the limit is hit.

---

#### PUR-11 — `ReviewPurchaseRequisitionPayload` type reused for Invoice and Payment review actions

**File:** `src/modules/purchases/hooks.ts:331,358` and `src/modules/purchases/api.ts:376-420`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
// hooks.ts:331
export function useReviewInvoice() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewPurchaseRequisitionPayload }) =>
      reviewInvoice(id, payload),
  });
}
// Similarly in api.ts:376
export async function reviewInvoice(
  id: string,
  payload: ReviewPurchaseRequisitionPayload  // semantically wrong type
```

**Why it is wrong:** `ReviewPurchaseRequisitionPayload` is a PR-domain type used verbatim for invoice and payment approval. If the backend adds an invoice-specific field (e.g. `paymentInstruction`) to the invoice review endpoint, adding it to the shared type will incorrectly appear to also apply to PR review. The type names are also misleading: a developer adding `useReviewInvoice` has no indication that the payload shape is defined under a PR type.

**Fix:** Define `ReviewActionPayload = { action: "APPROVED" | "REJECTED"; actorId: string; remarks?: string }` as a shared base type in `types.ts`, and delete `ReviewPurchaseRequisitionPayload`. Then each domain (PR, Invoice, Payment) can extend this base if needed.

---

#### PUR-12 — Vendors page uses unvalidated `JSON.parse` from localStorage on mount

**File:** `src/modules/purchases/p2p/vendors/page.tsx:1940-1943`
**Severity:** P2 | **Confidence:** High
**Owner:** Vaishnavi Nerella

**Offending code:**
```ts
function openCreatePanel() {
  const draft = localStorage.getItem(DRAFT_KEY);
  resetEditorState();
  setVendorForm(draft ? { ...createEmptyVendorForm(), ...JSON.parse(draft) } : createEmptyVendorForm());
```

**Why it is wrong:** `JSON.parse(draft)` is not wrapped in a try-catch. If the stored value is malformed (corrupted browser storage, manual edit, or cross-tab race), the uncaught `SyntaxError` will bubble up and crash the React tree, giving the user a blank screen with no recovery path.

**Fix:**
```ts
let restored: Partial<VendorForm> = {};
try {
  restored = JSON.parse(draft) as Partial<VendorForm>;
} catch {
  localStorage.removeItem(DRAFT_KEY);
}
setVendorForm({ ...createEmptyVendorForm(), ...restored });
```

---

#### PUR-13 — `window.confirm` used for destructive PR delete action

**File:** `src/modules/purchases/p2p/pr/page.tsx:2646`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
async function handleDeleteRequisition(requisitionId: string) {
  const confirmed = window.confirm("Delete this draft PR?");
  if (!confirmed) return;
  await deleteRequisition.mutateAsync(requisitionId);
```

**Why it is wrong:** `window.confirm` is a browser-blocking dialog that cannot be styled, is inaccessible (no keyboard focus management), and cannot be unit-tested. It also breaks in some mobile browsers and React portals. A deletion of a PR record containing line items, documents, and financial data deserves a proper confirmation modal with destructive-action styling.

**Fix:** Implement a `<DeleteConfirmDialog>` component (similar to the `DeletePurchaseOrderDialog` already built in `p2p/po/page.tsx:739-800`) and reuse the pattern.

---

#### PUR-14 — `a href` hardcoded link to `/p2p/po` bypasses React Router

**File:** `src/modules/purchases/p2p/pr/page.tsx:2391-2402`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```tsx
<a
  href="/p2p/po"
  className={cn(
    "inline-flex shrink-0 items-center gap-2 ...",
    isReadyForPo || requisition.status === "PO_CREATED"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "pointer-events-none bg-slate-100 text-slate-400"
  )}
>
  <ArrowRightCircle className="h-4 w-4" />
  Open PO Desk
</a>
```

**Why it is wrong:** Using `<a href>` instead of `<Link to>` from React Router triggers a full page reload, losing all in-memory state (open panel, unsaved form data) and causing an unnecessary server round-trip. If the app is deployed under a sub-path, this hardcoded `/p2p/po` will also fail.

**Fix:** Replace with `<Link to="/p2p/po">` from `react-router-dom`, and handle the disabled state with `aria-disabled` and `tabIndex={-1}` instead of `pointer-events-none`.

---

#### PUR-15 — All queries lack `staleTime`; dashboard fires 6 simultaneous stale-immediately fetches on every focus

**File:** `src/modules/purchases/hooks.ts:71-365` (most `useQuery` hooks)
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
export function usePurchaseRequisitions() {
  return useQuery({
    queryKey: procurementKeys.requisitions(),
    queryFn: fetchPurchaseRequisitions,
    // no staleTime — defaults to 0 (stale immediately)
  });
}
// Same pattern repeated for vendors, orders, receipts, invoices, payments
```

**Why it is wrong:** With `staleTime: 0` (the default), every time the user switches browser tabs or refocuses the window, TanStack Query will immediately refetch all 6 procurement queries in parallel. The dashboard page uses all 6 hooks simultaneously. On each tab-switch in a busy procurement session, the user will trigger 6 API calls. This causes unnecessary backend load and brief loading flickers on cached data.

**Fix:** Set a reasonable `staleTime` on each query based on how frequently data changes. For example:
```ts
staleTime: 30_000, // 30 seconds is reasonable for most procurement lists
```
The `useProcurementProducts` hook already correctly sets `staleTime: 60_000`; apply the same discipline to the others.

---

#### PUR-16 — Inline `SelectField` component defined inside `pr/page.tsx` duplicates the native `<select>` used in invoice/payment/receipt pages

**File:** `src/modules/purchases/p2p/pr/page.tsx:210-290` vs `p2p/invoice/page.tsx:154-165`, `p2p/payment/page.tsx:131-142`, `p2p/receipt/page.tsx:116-128`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code (pr/page.tsx:210-290):**
```tsx
function SelectField({ value, options, onChange, ... }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // custom keyboard + click-outside handling
  // ...
}
```

**Why it is wrong:** A custom translucent dropdown was built into the PR page, while other pages use native `<select>` elements. The custom dropdown lacks `role="combobox"` / proper ARIA, creates maintenance burden, and users get different interaction models (keyboard, accessibility, mobile) depending on which page they are on. The accessibility of the custom dropdown is incomplete — clicking an option does not close on `Escape` in all browsers consistently.

**Fix:** Extract the `SelectField` into `src/modules/purchases/p2p/components/P2PSelectField.tsx` and replace all native `<select>` uses in receipt/invoice/payment pages with this shared component. Add correct ARIA attributes: `role="combobox"`, `aria-controls`, `aria-activedescendant`.

---

### P3 — Low Severity / Standards

---

#### PUR-17 — `formatCurrency` / `formatDate` / `daysSince` / `percentage` duplicated 10+ times across the module with no shared utility file

**Severity:** P3 | **Confidence:** High
**Owner:** Multiple

`formatCurrency` appears in 7 files:
- `PurchaseOrderDocument.tsx:98`
- `p2p/pr/page.tsx:82`
- `p2p/po/page.tsx:232`
- `p2p/dashboard/page.tsx:25`
- `p2p/invoice/page.tsx:21`
- `p2p/payment/page.tsx:20`
- `p2p/alerts/page.tsx:15`
- `p2p/reports/page.tsx:17`

`formatDate` appears in 6 files with slightly different `Intl.DateTimeFormat` options — some use `"2-digit" month`, some use `"short"` — meaning dates render inconsistently depending on which page the user is on.

`daysSince` is duplicated at `p2p/dashboard/page.tsx:38` and `p2p/alerts/page.tsx:23`.

`percentage` is duplicated at `p2p/dashboard/page.tsx:33` and `p2p/reports/page.tsx:12`.

**Fix:** Create `src/modules/purchases/utils/format.ts` and export all shared helpers from there. Standardise `formatDate` to one locale option (`{ day: "2-digit", month: "short", year: "numeric" }`).

---

#### PUR-18 — Composite `key` using `${item.productId}-${index}` in item list render is unstable

**File:** `src/modules/purchases/p2p/pr/page.tsx:954`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```tsx
{items.map((item, index) => {
  // ...
  return (
    <div key={`${item.productId}-${index}`} ...>
```

**Why it is wrong:** `item.productId` is empty string for adhoc items, making the key `"-0"`, `"-1"`, etc. — effectively just index-based keys, which break React reconciliation when items are reordered or removed (e.g. removing item at index 0 will cause items to misrender).

**Fix:** Add a stable `id` field to `DraftItem` (e.g. `id: crypto.randomUUID()` when the item is created in `emptyDraft`), and use `key={item.id}`.

---

#### PUR-19 — `P2PHeader` and `P2PNavigation` in `shared.tsx` are dead exports

**File:** `src/modules/purchases/shared.tsx:10-54`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

No file in `src/` imports `P2PHeader` or `P2PNavigation`. They were superseded by `P2PLayout` + `P2PModuleLayout`. The nav items in `shared.tsx` only link to 3 routes (Dashboard, PR Input, PO) while the full module has 10 routes.

**Fix:** Delete `shared.tsx` entirely. It is unreferenced dead code.

---

#### PUR-20 — No mutation `onError` toast on `useSaveBudget` / `useSaveEvaluation` / `useSaveNegotiation` in PR detail panel

**File:** `src/modules/purchases/p2p/pr/page.tsx:2868-2907`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```ts
onSaveBudget={(id, payload) =>
  updateBudget.mutate({ id, payload })   // no onError handler
}
onSaveEvaluation={(id, decision, notes) =>
  updateEvaluation.mutate({ id, payload: { decision, notes } })  // no onError handler
}
```

**Why it is wrong:** When `updateBudget`, `updateEvaluation`, or `updateNegotiation` fail, the user receives no feedback. The approve/submit/reject mutations do have toast.error handlers (lines 2843, 2858), but the three save operations silently fail. A user may believe they saved negotiation terms and proceed to create a PO with stale data.

**Fix:**
```ts
updateBudget.mutate({ id, payload }, {
  onSuccess: () => toast.success("Budget saved."),
  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save budget."),
})
```

---

#### PUR-21 — `P2PModuleLayout` is a no-op `<Outlet />`

**File:** `src/modules/purchases/p2p/components/P2PModuleLayout.tsx:1-5`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```tsx
export function P2PModuleLayout() {
  return <Outlet />;
}
```

This is a one-line wrapper with no logic, no layout chrome, and no navigation sidebar or breadcrumb. The module layout adds zero value over using `<Outlet />` directly in the router config.

**Fix (Low):** Delete the component and replace with `<Outlet />` directly in the router. If a real module chrome (nav sidebar, module header) is planned, implement it here. This is cosmetic but adds maintenance surface for juniors who will wonder what it does.

---

#### PUR-22 — `calculatePurchaseOrderTaxes` computes CGST/SGST regardless of template — even for ACS the IGST rate is also applied simultaneously (double tax)

**File:** `src/modules/purchases/p2p/po/page.tsx:251-270`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

(This is an extension of PUR-01 for the ACS template path.)

For `template === "ACS"`:
- `igstAmount = subtotal * 0.18` (ACS_IGST_RATE)
- `cgstAmount = subtotal * 0.09`
- `sgstAmount = subtotal * 0.09`
- `grandTotal = subtotal + igstAmount + cgstAmount + sgstAmount` → effectively `subtotal * 1.36`

Under Indian GST law, intra-state transactions use CGST + SGST (total 18%) while inter-state use IGST (18%). Applying all three simultaneously results in 36% effective tax — double the legal rate. The ACS template likely represents intra-state transactions, so `igstAmount` for ACS should be 0.

**Fix:** Same as PUR-01 fix — make `igstAmount` conditional on `template === "IOTIQ"` (inter-state) and `cgstAmount`/`sgstAmount` conditional on `template === "ACS"`.

---

#### PUR-23 — Rejection reason is hardcoded to `"Rejected from invoice desk"` / `"Rejected from payment desk"`

**File:** `src/modules/purchases/p2p/invoice/page.tsx:581`, `src/modules/purchases/p2p/payment/page.tsx:524`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

**Offending code:**
```tsx
// invoice/page.tsx:581
payload: { action: "REJECTED", actorId: currentUser.id, remarks: "Rejected from invoice desk" },
// payment/page.tsx:524
payload: { action: "REJECTED", actorId: currentUser.id, remarks: "Rejected from payment desk" },
```

**Why it is wrong:** The rejection reason visible in the backend audit trail and to the vendor/requester will always be the literal string `"Rejected from invoice desk"`, regardless of the actual reason. There is no remarks input in the `InvoiceDetailPanel` or `PaymentDetailPanel` for rejection.

**Fix:** Add a `rejectionRemarks` input field in both detail panels (a single-line textarea) and pass the value as `remarks` to the reject mutation.

---

## Redundancy

| # | Clone A | Clone B | Nature |
|---|---------|---------|--------|
| R1 | `p2p/pr/page.tsx:82-88` `formatCurrency` | `p2p/dashboard/page.tsx:25-31` `formatCurrency` | Exact same `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })` — appears 7× across the module |
| R2 | `p2p/pr/page.tsx:90-97` `formatDate` | `p2p/invoice/page.tsx:25-32` `formatDate` | Exact same `Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })` — appears 5× |
| R3 | `p2p/dashboard/page.tsx:38-43` `daysSince` | `p2p/alerts/page.tsx:23-28` `daysSince` | Exact same function body |
| R4 | `p2p/dashboard/page.tsx:33-37` `percentage` | `p2p/reports/page.tsx:12-15` `percentage` | Same semantics, slightly different guard (`!total` vs `total === 0`) |
| R5 | `p2p/pr/page.tsx:210-290` `SelectField` (custom translucent dropdown) | `p2p/invoice/page.tsx:154-165` native `<select>` | Same purpose — field to choose a single item from a list — but two entirely different implementations; similar pattern in receipt/payment pages |
| R6 | `p2p/po/page.tsx:349-355` `buttonPrimary/buttonSecondary` CSS strings | `p2p/pr/page.tsx:179-188` same CSS strings | Identical Tailwind button class strings duplicated across both large files |
| R7 | `p2p/po/page.tsx:94-188` `IOTIQ_TERMS` array | `PurchaseOrderDocument.tsx:77-85` `DEFAULT_IOTIQ_TERMS` array | Near-identical T&C arrays duplicated; `po/page.tsx` has 7 entries, `PurchaseOrderDocument.tsx` has 7 entries — same content, different variable names |
| R8 | `p2p/po/page.tsx:357-367` `panelFieldClass` | `p2p/pr/page.tsx:166-178` `fieldShellClass` | Near-identical input class generator functions: same state machine (disabled/error/default), slightly different border radius (`rounded-xl` vs `rounded-md`) |
| R9 | `p2p/po/page.tsx:115-188` `ACS_TERMS` / `IOTIQ_TERMS` / `IOTIQ_COMPANY` etc. | `p2p/po/page.tsx:214-228` `IOTIQ_BUYER` / `ACS_BUYER` | Company master data constants duplicated within the same file in two separate places, some with slight differences (`IOTIQ_COMPANY.addressLines` vs `IOTIQ_BILLING.addressLines` differ by one letter: "Pardhas Picasa" vs "Pardha Picasa" — likely a typo, see PUR-A below) |

**PUR-A (bonus typo):** `p2p/po/page.tsx:97` reads `"Pardhas Picasa Building"` while `p2p/po/page.tsx:108` and `PurchaseOrderDocument.tsx` contexts use `"Pardha Picasa Building"`. One of these is wrong in the generated PDF.

---

## Tests & gaps

**No tests exist.** A `find` across the entire `src/modules/purchases/` directory reveals zero `*.test.*` or `*.spec.*` files.

**Priority test targets:**
1. `calculatePurchaseOrderTaxes` in `p2p/po/page.tsx` — a pure function with a correctness bug (PUR-01/PUR-22) that would be immediately caught by a unit test with basic GST scenarios.
2. `numberToIndianWords` — a pure function used in PO documents; untested for edge cases (zero, large crore values, fractional paise).
3. `procurementKeys` factory — snapshot test to prevent query key collisions if the key structure is refactored.
4. `validateVendorForm` in `p2p/vendors/page.tsx` — a validation function with regex checks that has no test coverage.

---

## Coverage note

**Fully inspected (every line read):**
- `api.ts` (421 lines)
- `hooks.ts` (366 lines)
- `types.ts` (381 lines)
- `page.tsx` (root redirect, 5 lines)
- `shared.tsx` (55 lines)
- `p2p/dashboard/page.tsx` (429 lines)
- `p2p/pr/page.tsx` (2,973 lines — all pages read)
- `p2p/invoice/page.tsx` (617 lines)
- `p2p/payment/page.tsx` (551 lines)
- `p2p/receipt/page.tsx` (449 lines)
- `p2p/alerts/page.tsx` (275 lines)
- `p2p/reports/page.tsx` (174 lines)
- `p2p/budget/page.tsx` (5 lines)
- `p2p/negotiation/page.tsx` (5 lines)
- All `p2p/components/*.tsx` files
- `PurchaseOrderDocument.tsx` (339 lines)

**Partially inspected (first 1,303 of 2,261 lines read for PO page):**
- `p2p/po/page.tsx` — the first half (form structure) was fully read; lines 1,304–2,261 (second half: existing-PO display, filter logic, and table rows) were not read. Additional findings may exist in the PO list rendering and existing order detail panel.

**Partially inspected (first 100 of 2,239 lines for vendors):**
- `p2p/vendors/page.tsx` — the data model and localStorage sections were fully read; the bulk of the vendor form rendering (addresses, contacts, bank accounts) and the vendor list table were not read. The `validateVendorForm` function body was not inspected.

**Overall confidence:** High for data layer and architecture findings; Medium for UI-level findings in the bottom halves of the vendor and PO files.

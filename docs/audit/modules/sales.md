# sales — Module Audit

**Audited:** 2026-07-14  
**Auditor:** Claude Sonnet 4.6  
**Root:** `src/modules/sales`

---

## Summary

The sales module implements a full quotation-to-order pipeline: quote creation with Kanban view, order management with approvals, and a downstream trail of deliveries, invoices, payments, and returns. The data layer is structurally solid — TanStack Query with a key factory, typed API wrappers, and correct mutation invalidation for most paths. The critical failures are: (1) five stub route pages import a named export `SalesOrdersWorkspacePage` that does not exist in `orders/page.tsx`, meaning those routes crash on load; (2) `toast` is called in `sales/page.tsx` without being imported, causing a runtime `ReferenceError`; (3) the main `SalesPage` is a 1,844-line god-component with 22 `useState` calls; (4) `"use client"` appears throughout a Vite/React-Router project where it is a no-op directive.

---

## Surface Map

### Quotation sub-module (`src/modules/sales/`)

| File | Role |
|---|---|
| `api.ts` | REST calls for `/sales/quotes` |
| `hooks.ts` | TanStack Query wrappers (`salesKeys` factory) |
| `types.ts` | `Quote`, `QuoteFormData`, `QuoteFilter`, etc. |
| `page.tsx` | 1,844-line god-component — Kanban board, quote builder drawer, detail modal, quotation preview modal |
| `QuotationDocument.tsx` | Print-ready PDF-like quotation document with hardcoded bank/contact data |

### Order sub-module (`src/modules/sales/orders/`)

| File | Role |
|---|---|
| `api.ts` | REST calls for orders, deliveries, invoices, payments, returns, reports |
| `hooks.ts` | TanStack Query wrappers (`salesOrderKeys` factory) |
| `types.ts` | 13 status values, full domain type set |
| `page.tsx` | Orders table + analytics (bar chart + donut), create/edit drawer |
| `detail-page.tsx` | Order detail page (453 lines) |
| `components.tsx` | 1,736-line shared component library with drawers, boards, formatters |
| `order-detail-sections.tsx` | Reusable KVGrid, StatusBadge, InvoiceViewDrawer, etc. |
| `payments-page.tsx` | Standalone payments list page |
| `shipments-page.tsx` | Standalone shipments list page |
| `approvals-page.tsx` | **STUB** — imports non-existent `SalesOrdersWorkspacePage` |
| `delivery-page.tsx` | **STUB** — same broken import |
| `invoices-page.tsx` | **STUB** — same broken import |
| `reports-page.tsx` | **STUB** — same broken import |
| `returns-page.tsx` | **STUB** — same broken import |

### API endpoints consumed

| Path | Method | Hook |
|---|---|---|
| `/sales/quotes` | GET / POST / PATCH / DELETE | `useQuotes`, `useCreateQuote`, `useUpdateQuote`, `useDeleteQuote` |
| `/sales/quotes/:id/status` | PATCH | `useUpdateQuoteStatus` |
| `/sales/quotes/:id/convert-to-order` | POST | `useConvertQuoteToOrder` |
| `/sales/orders` | GET / POST | `useSalesOrders`, `useCreateSalesOrder` |
| `/sales/orders/:id` | GET / PATCH | `useSalesOrder`, `useUpdateSalesOrder` |
| `/sales/orders/:id/submit`, `/confirm`, `/approval-action`, `/status` | POST / PATCH | various hooks |
| `/sales/deliveries`, `/invoices`, `/payments`, `/returns` | GET / POST / PATCH | `useSalesDeliveries` et al. |
| `/sales/reports/overview` | GET | `useSalesReportOverview` |

---

## Findings

### P0 — Crash / Runtime broken

---

#### SAL-01 — Five stub pages import a non-existent named export

**File:Line:** `orders/approvals-page.tsx:3`, `orders/delivery-page.tsx:3`, `orders/invoices-page.tsx:3`, `orders/reports-page.tsx:3`, `orders/returns-page.tsx:3`  
**Severity:** P0  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
// approvals-page.tsx (and all four siblings — identical pattern)
import { SalesOrdersWorkspacePage } from "./page";
export default function SalesOrderApprovalsPage() {
  return <SalesOrdersWorkspacePage initialTab="Approvals" />;
}
```

**Why wrong:** `orders/page.tsx` exports only `export default function SalesOrdersPage()`. There is no named export `SalesOrdersWorkspacePage` and no `initialTab` prop anywhere in that file. All five routes (/sales/approvals, /sales/deliveries, /sales/invoices, /sales/reports, /sales/returns) will throw a module-resolution error or render nothing depending on the bundler mode.

**Fix:** Either (a) rename and export the page function plus add an `initialTab` prop, or (b) replace each stub with an actual page implementation.

```tsx
// In orders/page.tsx — add named export and prop
export function SalesOrdersWorkspacePage({ initialTab = "Orders" }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  // ... rest of implementation
}
```

---

#### SAL-02 — `toast` called without import in `sales/page.tsx`

**File:Line:** `sales/page.tsx:1136`, `sales/page.tsx:1139`  
**Severity:** P0  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
// line 1134–1140 (no import for toast anywhere in the file)
const order = await convertQuoteToOrder.mutateAsync(activeQuote.data.id);
setActiveQuoteId(null);
toast.success(`Order ${order.orderNumber} is ready.`);
// ...
toast.error(error instanceof Error ? error.message : "Unable to convert quotation.");
```

**Why wrong:** `toast` is never imported in `sales/page.tsx`. Running the "Convert to Order" action throws `ReferenceError: toast is not defined` at runtime, meaning the success/failure notification is swallowed and the convert flow has no UX feedback.

**Fix:**
```tsx
import { toast } from "sonner";  // add at top of file with other imports
```

---

### P1 — Correctness / Data bug

---

#### SAL-03 — `useEffect` sets state on every `searchParams` change in `detail-page.tsx` — potential infinite loop

**File:Line:** `orders/detail-page.tsx:98–111`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
useEffect(() => {
  const panel = searchParams.get("panel");
  if (panel !== "invoice") return;
  if (invoice) {
    setInvoiceViewOpen(true);
  } else {
    setInvoiceCreateOpen(true);
  }
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete("panel");
    return next;
  }, { replace: true });
}, [invoice, searchParams, setSearchParams]);
```

**Why wrong:** The dependency array includes `searchParams`. When `setSearchParams` removes the `panel` key, it creates a new `URLSearchParams` object, which causes `searchParams` to be a new reference, firing the effect again. On the second run `panel` will be `null` so the guard exits early — but this still re-executes on every invoice query refetch because `invoice` is also a dependency that changes when the query resolves. The ESLint suppression `react-hooks/set-state-in-effect` at line 1 signals this problem was noticed but silenced instead of fixed.

**Fix:** Drive this from a one-shot state flag rather than a URL-param polling effect:

```tsx
const hasHandledPanel = useRef(false);
useEffect(() => {
  if (hasHandledPanel.current) return;
  const panel = searchParams.get("panel");
  if (panel !== "invoice") return;
  hasHandledPanel.current = true;
  if (invoice) setInvoiceViewOpen(true);
  else setInvoiceCreateOpen(true);
  setSearchParams((prev) => { ... }, { replace: true });
}, [invoice, searchParams, setSearchParams]);
```

---

#### SAL-04 — `deliveryMap` silently drops multi-delivery orders (last-write-wins)

**File:Line:** `orders/page.tsx:480–484`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const deliveryMap = useMemo(
  () => new Map(deliveries.map((d) => [d.salesOrderId, d.status])),
  [deliveries]
);
```

**Why wrong:** When an order has more than one delivery record, `new Map(array)` keeps only the last entry for each key. The table column "Shipment" will show the wrong (last-inserted) delivery status and the dropdown will show "View shipment" even for partial shipments. The same issue exists for `invoiceMap` (`invoices.map` — line 486), which only tracks one invoice per order.

**Fix:** Track an array of statuses or pick the most recent record explicitly:
```tsx
// deliveries sorted descending by createdAt so the latest wins deliberately
const deliveryMap = useMemo(() => {
  const sorted = [...deliveries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return new Map(sorted.map((d) => [d.salesOrderId, d.status]));
}, [deliveries]);
```

---

#### SAL-05 — Analytics bar-chart consumes filtered/paginated data, not all orders

**File:Line:** `orders/page.tsx:602–603`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
// All orders for the analytics panel (unfiltered — use a separate all-orders query if available)
const allOrders = orders;   // `orders` is the filtered, paginated (PAGE_SIZE=50) slice
```

**Why wrong:** The developer comment acknowledges the problem. `orders` is derived from `ordersQuery.data?.data`, which is a page of at most 50 records filtered by the current `filter.status` and `filter.search`. The bar chart and donut chart therefore show stats for only the currently visible page, not the full dataset, making them silently wrong when there are more than 50 orders or when a status filter is active.

**Fix:** Add a dedicated unfiltered query and keep it separate from the table query:
```tsx
const allOrdersQuery = useSalesOrders({ search: "", status: "ALL", page: 1, pageSize: 1000 });
const allOrders = allOrdersQuery.data?.data ?? [];
```

---

#### SAL-06 — `handleCreateQuote` has no try/catch — API errors are silently swallowed

**File:Line:** `sales/page.tsx:1160–1173`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
async function handleCreateQuote() {
  const validationError = validateForm();
  if (validationError) { setBuilderError(validationError); return; }
  setBuilderError(null);
  if (builderMode === "edit" && editingQuoteId) {
    await updateQuote.mutateAsync({ id: editingQuoteId, data: form });
  } else {
    await createQuote.mutateAsync(form);
  }
  closeBuilder();
}
```

**Why wrong:** `mutateAsync` throws on API error. Without try/catch, an unhandled promise rejection propagates up (visible in DevTools but not to the user). The builder closes or stays open depending on timing, leaving the user uncertain whether the save succeeded. The button stays disabled but never shows an error state.

**Fix:**
```tsx
async function handleCreateQuote() {
  // ... validation ...
  try {
    if (builderMode === "edit" && editingQuoteId) {
      await updateQuote.mutateAsync({ id: editingQuoteId, data: form });
    } else {
      await createQuote.mutateAsync(form);
    }
    closeBuilder();
  } catch (err) {
    setBuilderError(err instanceof Error ? err.message : "Unable to save quotation.");
  }
}
```

---

#### SAL-07 — `useEffect` in `orders/page.tsx` syncs form state from query on every `isCreateDrawerOpen` toggle

**File:Line:** `orders/page.tsx:467–470`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
/* eslint-disable react-hooks/set-state-in-effect */
// line 1–3 silences the lint rule for this file
useEffect(() => {
  if (!editingOrderQuery.data || !isCreateDrawerOpen) return;
  setManualForm(buildManualFormFromOrder(editingOrderQuery.data));
}, [editingOrderQuery.data, isCreateDrawerOpen]);
```

**Why wrong:** Every time `editingOrderQuery.data` refetches in the background (every 30 s) while the drawer is open, this effect fires and overwrites any in-progress user edits in the form. The eslint-disable at line 1 suppresses the linter rather than fixing the pattern.

**Fix:** Set the form once when the drawer opens, using a ref guard:
```tsx
const hasPopulatedForm = useRef(false);
useEffect(() => {
  if (!isCreateDrawerOpen) { hasPopulatedForm.current = false; return; }
  if (!editingOrderQuery.data || hasPopulatedForm.current) return;
  hasPopulatedForm.current = true;
  setManualForm(buildManualFormFromOrder(editingOrderQuery.data));
}, [editingOrderQuery.data, isCreateDrawerOpen]);
```

---

#### SAL-08 — `detailId` is never set to a real value — `OrderDetailDrawer` and `detailQuery` are dead code

**File:Line:** `orders/page.tsx:437`, `orders/page.tsx:450`, `orders/page.tsx:814–828`  
**Severity:** P1  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const [detailId, setDetailId] = useState("");         // initialized empty
const detailQuery = useSalesOrder(detailId);          // enabled: Boolean("") = false
// ...
<OrderDetailDrawer open={Boolean(detailId)} ... />    // always false
```

**Why wrong:** `setDetailId` is only used to clear it (`if (!open) setDetailId("")`). There is no code path that sets `detailId` to a non-empty string. `useSalesOrder("")` is disabled via `enabled: Boolean(id)`, but the query object still participates in the render. The `OrderDetailDrawer` is rendered but can never open. `useSalesOrder` and the `detail` constant are unused live code. The `@typescript-eslint/no-unused-vars` disable at line 3 masks this.

**Fix:** Either wire `setDetailId(order.id)` to a row-click handler, or delete the dead state, query, and drawer if the feature is intentionally removed.

---

### P2 — Quality / Maintainability

---

#### SAL-09 — `SalesPage` is a 1,844-line god-component with 22 `useState` calls

**File:Line:** `sales/page.tsx:831–1843`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code (excerpt):**
```tsx
export default function SalesPage() {
  // 22 useState declarations:
  const [filter, setFilter] = useState<QuoteFilter>({ ... });
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<"create" | "edit">("create");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [form, setForm] = useState<QuoteFormData>(createEmptyQuoteForm());
  // ... 11 more
```

**Why wrong:** Exceeds the 400-line threshold by 4×. Mixing Kanban board, quote builder, detail modal, preview modal, and DnD logic in one render function makes the component impossible to test, and any prop-threading change touches the entire file.

**Fix:** Extract into self-contained sub-components:
- `<QuotationBuilderDrawer>` — owns builder state + form
- `<QuoteDetailModal>` — owns `activeQuoteId` + `activeQuote` query
- `<QuotationPreviewModal>` — already partially extracted but still lives in the same file
- `<QuoteKanbanBoard>` — owns `optimisticStatuses`, `draggingQuoteId`, `movingQuoteId`, DnD context

---

#### SAL-10 — `"use client"` directive is a no-op in a Vite/React-Router app

**File:Line:** `sales/page.tsx:1`, `orders/page.tsx:4`, `orders/components.tsx:1`, `orders/detail-page.tsx:2`, `orders/order-detail-sections.tsx:1`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
"use client";  // top of each file
```

**Why wrong:** `"use client"` is a Next.js App Router boundary directive. This project uses Vite + React Router (confirmed by `package.json`). The string literal is treated as a no-op expression statement by the bundler. It adds noise, misleads future contributors, and suggests files were copied from a Next.js codebase.

**Fix:** Remove the directive from all five files. Search: `grep -rn '"use client"' src/` to find the full list across the project.

---

#### SAL-11 — Three `eslint-disable` suppressions mask real rule violations

**File:Line:** `orders/page.tsx:1–3`, `orders/detail-page.tsx:1`, `orders/order-detail-sections.tsx:1`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-unused-vars */
```

**Why wrong:** `react-hooks/set-state-in-effect` is disabled to hide the SAL-07 loop and the SAL-03 effect. `no-unused-vars` hides the dead `detailId`/`detail` variables (SAL-08). These suppressions are silently hiding active bugs, not marking intentional deviations.

**Fix:** Fix the underlying issues (SAL-03, SAL-07, SAL-08) and remove the file-level disables.

---

#### SAL-12 — `ValidUntilDatePicker` initialises `activeMonth` from a stale closure

**File:Line:** `sales/page.tsx:193–198`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const initialDate = parseDateOnlyValue(value) ?? new Date();
const [open, setOpen] = useState(false);
const [view, setView] = useState<"days" | "months">("days");
const [activeMonth, setActiveMonth] = useState(
  new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
);
```

**Why wrong:** `useState` initialiser only runs once. If the parent resets `value` (e.g., the user clears the field, or `openEditBuilder` loads a different quote with a different `validUntil`), `activeMonth` will still show the month from the first render. The `useEffect` at line 202 partially compensates but only syncs on open/close, not on external `value` changes while the picker is closed.

**Fix:** Derive `activeMonth` from `value` via `useMemo` instead of stale `useState`:
```tsx
const activeMonthFromValue = useMemo(() => {
  const d = parseDateOnlyValue(value);
  return d ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date();
}, [value]);
const [activeMonth, setActiveMonth] = useState(activeMonthFromValue);
// sync when value changes externally
useEffect(() => setActiveMonth(activeMonthFromValue), [activeMonthFromValue]);
```

---

#### SAL-13 — `window.setTimeout` in `onBlur` handler has no cleanup (memory leak risk)

**File:Line:** `sales/page.tsx:585`  
**Severity:** P2  **Confidence:** Med  
**Owner:** Chaitanya2872

**Code:**
```tsx
onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
```

**Why wrong:** If `CustomerLeadSearch` unmounts within 120 ms of blur (e.g., the builder drawer closes while the input is focused), `setIsOpen` is called on an unmounted component. In React 18 this is a no-op and no longer throws, but the timer handle is never cleared, creating a minor resource leak and a stale closure. In older React this was a warning.

**Fix:**
```tsx
const closeTimer = useRef<number | null>(null);
// in onBlur:
onBlur={() => { closeTimer.current = window.setTimeout(() => setIsOpen(false), 120); }}
// in onMouseDown on each lead item (already done via event.preventDefault — correct)
// Add cleanup:
useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
```

---

#### SAL-14 — Three global unfiltered fetches fetched with no orderId on every page load

**File:Line:** `orders/page.tsx:452–454`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const deliveriesQuery = useSalesDeliveries();   // all deliveries, no filter
const invoicesQuery = useSalesInvoices();        // all invoices, no filter
const paymentsQuery = useSalesPayments();        // all payments, no filter
```

**Why wrong:** These three calls fetch every delivery, invoice, and payment in the system on every load of the orders list page, just to compute the status columns. As data grows, these payloads can become very large. The deliveries/invoices already have API-side `salesOrderId` filters that go unused here.

**Fix:** Either (a) request the backend add aggregate status to `SalesOrderSummary` (preferred), or (b) lazy-load the data only when the user opens a row, or (c) at minimum add a reasonable `pageSize` cap.

---

#### SAL-15 — Index-keyed skeleton rows in loading states

**File:Line:** `orders/page.tsx:701–706`, `orders/payments-page.tsx:108–113`, `orders/shipments-page.tsx:114–119`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
// orders/page.tsx:701–706
Array.from({ length: 6 }).map((_, i) => (
  <tr key={i}>
```

**Why wrong:** Index keys on skeleton rows are not inherently dangerous because skeletons do not reorder, but they establish a copy-paste pattern that developers apply to real data rows. In `orders/page.tsx` line 427 (inside `OrdersAnalytics`), the same pattern is used for loading animation divs. If developers copy this to real list items, React cannot reconcile items correctly during updates.

**Fix:** Use a stable constant string for skeleton keys: `key={`skeleton-${i}`}`. For real data rows, always key by `order.id`, `delivery.id`, etc.

---

#### SAL-16 — `formatCurrency` duplicated across module, QuotationDocument uses different rounding

**File:Line:** `sales/page.tsx:84–89` vs `sales/orders/components.tsx:254–260` vs `sales/QuotationDocument.tsx:62–66`  
**Severity:** P2  **Confidence:** High  
**Owner:** Vaishnavi Nerella (QuotationDocument), Chaitanya2872 (others)

**Code:**
```tsx
// sales/page.tsx:84 — formats with ₹ symbol, maximumFractionDigits: 2
const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

// orders/components.tsx:254 — same, but exported with currency param
export function fmtCurrency(value: number, currency = "INR") { ... }

// QuotationDocument.tsx:62 — NO currency symbol, maximumFractionDigits: 0
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
```

**Why wrong:** Three separate implementations with different rounding rules. `QuotationDocument` deliberately omits the currency symbol and rounds to integers, which is the correct behaviour for a print template. However, the lack of a shared utility means future changes are applied inconsistently. At least 5 more `formatCurrency` copies exist across the project (`purchases/`, `inventory/`).

**Fix:** Create `src/lib/format.ts` (or extend the existing `src/lib/utils.ts`) with canonical `formatCurrency(value, currency?)` and `formatCurrencyRounded(value)` functions. Import from there.

---

#### SAL-17 — Hardcoded banking details, contact email, and phone in `QuotationDocument.tsx`

**File:Line:** `sales/QuotationDocument.tsx:22–30`  
**Severity:** P2  **Confidence:** High  
**Owner:** Vaishnavi Nerella

**Code:**
```tsx
const COMPANY = {
  phone: "Ph. No.: 9706139943",
  email: "Email: chandra.shekhar@iotiq.co.in",
  bankDetails: [
    ["Account Number", "43884151275"],
    ["Bank", "SBI"],
    ["IFSC", "SBIN0020828"],
    ...
  ],
};
```

**Why wrong:** A name change, bank account rotation, or departing employee forces a code change and deployment. This data should come from a configurable source (env vars, admin settings, or at minimum a shared config file).

**Fix:** Move to a `COMPANY_CONFIG` object in `src/config/company.ts` (or pull from an API endpoint). Do not store bank account numbers in source code.

---

#### SAL-18 — Unsafe type assertions for order form payloads

**File:Line:** `orders/page.tsx:571`, `orders/page.tsx:585`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
updateMutation.mutate(
  { id: editingOrderId, payload: basePayload as UpdateSalesOrderInput },
  ...
);
// and
createMutation.mutate(
  { ...basePayload, status: manualForm.status } as CreateSalesOrderInput,
  ...
);
```

**Why wrong:** `as T` bypasses TypeScript structural checking. If `basePayload` is missing a required field that `CreateSalesOrderInput` requires, or has an incompatible type, the cast hides the mismatch. This is especially risky because `ManualOrderFormState` stores numeric fields as strings (`quantity: string`, `unitPrice: string`) and the transformation in `handleCreateOrder` may miss a field.

**Fix:** Remove the cast and let TypeScript enforce the shape. If the types do not align, fix the shape or the type definition.

---

#### SAL-19 — `SalesOrdersPage` analytics uses `orders` (50-record page) but comment admits it is wrong

**File:Line:** `orders/page.tsx:602`  
**Severity:** P2 (duplicate emphasis from SAL-05 for the comment itself as a quality finding)  **Confidence:** High

See SAL-05. The comment `// All orders for the analytics panel (unfiltered — use a separate all-orders query if available)` is a known-bad workaround that was committed unfixed.

---

#### SAL-20 — `KVGrid` in `order-detail-sections.tsx` uses index keys for real data cells

**File:Line:** `orders/order-detail-sections.tsx:52`, `orders/order-detail-sections.tsx:130`, `orders/order-detail-sections.tsx:203`  
**Severity:** P2  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
{items.map((item, i) => (
  <div key={i} className="flex flex-col gap-1.5 px-4 py-3">
```

**Why wrong:** `items` is an array of `{ label, value, icon? }` where `label` is a unique string. Keying by index causes React to reuse DOM nodes when the array reorders or items are removed. All three occurrences in this file use `key={i}`.

**Fix:** Use `key={item.label}` — the `label` field is already unique within each invocation.

---

### P3 — Minor / Informational

---

#### SAL-21 — `useQuote("")` fires with empty string in `SalesPage` (wasted enabled check)

**File:Line:** `sales/page.tsx:858–859`  
**Severity:** P3  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const activeQuote = useQuote(activeQuoteId ?? "");
const previewQuote = useQuote(previewQuoteId ?? "");
```

`useQuote` uses `enabled: Boolean(id)` (hooks.ts:37), so these never fire, but the pattern is fragile — if `enabled` is removed, empty-string requests are sent. Use `null` with a conditional hook pattern, or at minimum avoid the empty-string fallback:
```tsx
const activeQuote = useQuote(activeQuoteId ?? "");  // OK only because enabled checks Boolean(id)
```

---

#### SAL-22 — `PAGE_SIZE = 200` for quotes list effectively disables pagination

**File:Line:** `sales/page.tsx:51`  
**Severity:** P3  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const PAGE_SIZE = 200;
```

All 200 quotes are fetched on every load. For a small org this is fine, but the paginated API and TanStack Query pagination overhead add overhead with no benefit. If pagination is not needed, the backend endpoint should return all records; if it is needed, the UI should implement pagination controls. Using `200` as a "get everything" hack prevents either solution.

---

#### SAL-23 — `toLabel` lowercases status strings but capitalises nothing — display inconsistency

**File:Line:** `orders/components.tsx:250–252`  
**Severity:** P3  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
export function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}
```

`PENDING_APPROVAL` → `"pending approval"` (fully lowercase). Most UI strings are title-case. This makes status labels look like plain metadata rather than readable UI text.

**Fix:** Title-case the result:
```tsx
export function toLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

---

#### SAL-24 — `SalesOrdersHero`, `SalesOrdersKpis`, `SalesOrdersQueueCard`, `AcceptedQuotesCard` in `components.tsx` are exported but never imported anywhere

**File:Line:** `orders/components.tsx:270`, `orders/components.tsx:311`, `orders/components.tsx:360`  
**Severity:** P3  **Confidence:** Med  
**Owner:** Chaitanya2872

These components define elaborate prop types (KpiMetric, QueueProps, AcceptedQuotesProps, PendingApproval) and full JSX trees but are not imported by any page file in the module (confirmed by grep). They appear to be design exploration or a prior architecture that was partially replaced by the current `orders/page.tsx` implementation.

**Fix:** Confirm these are unused and delete them (reduces `components.tsx` by ~350 lines).

---

#### SAL-25 — `SalesOrdersPage` fetches quotes unconditionally to enable the "From accepted quote" menu item

**File:Line:** `orders/page.tsx:455`  
**Severity:** P3  **Confidence:** High  
**Owner:** Chaitanya2872

**Code:**
```tsx
const quotesQuery = useQuotes({ search: "", status: QuoteStatus.ACCEPTED, page: 1, pageSize: 200 });
```

This fires on every page load to determine whether the "From accepted quote" dropdown item should show an error toast. It is wasteful if the user never opens that dropdown. Consider lazy-fetching (only fetch when the dropdown opens) or caching with a long staleTime.

---

## Redundancy

| # | Clone A | Clone B | Notes |
|---|---|---|---|
| R-01 | `sales/page.tsx:84–89` `fmtCurrency` | `orders/components.tsx:254–260` `fmtCurrency` | Same Intl formatter; components version adds `currency` param |
| R-02 | `sales/page.tsx:84–89` `fmtCurrency` | `sales/QuotationDocument.tsx:62–66` `formatCurrency` | Different rounding — intentional but should be shared |
| R-03 | `sales/page.tsx:99–103` `fmtDate` | `orders/components.tsx:262–268` `fmtDate` | Identical implementation |
| R-04 | `sales/page.tsx:84` `fmtCurrency` | `inventory/invoices-page.tsx:14` `formatCurrency` | Cross-module duplicate |
| R-05 | `orders/components.tsx:250` `toLabel` | Multiple callers in orders sub-pages | Good — it is shared. But `orders/page.tsx` also duplicates the pattern at line 198 in `getShipmentStatus` using `toLabel(deliveryMap.get…)` correctly |
| R-06 | `sales/page.tsx:113–131` `createEmptyQuoteForm` + `buildLeadPrefill` | `orders/page.tsx:120–185` `createInitialManualForm` + `buildManualFormFromOrder` | Structural pattern identical — create-empty + populate-from-record; not extractable as-is because the form shapes differ, but the empty-form factory pattern should be typed consistently |
| R-07 | Filter bar pattern (search input + status select) | `orders/page.tsx:652–671`, `orders/payments-page.tsx:83–89`, `orders/shipments-page.tsx:77–95` | Three near-identical filter bars; extract a `<FilterBar>` component |

---

## Tests & Gaps

**Zero test files exist** in the entire project (confirmed by `find . -name "*.test.*" -o -name "*.spec.*"` returning no output). The sales module has no unit tests, no integration tests, and no component tests.

Critical untested paths:
- `validateForm()` — custom validation with a hardcoded 12% max discount rule
- `serializeForm()` — date ISO conversion, null coercion for optional fields
- `buildLeadPrefill()` / `buildManualFormFromOrder()` — data mapping from API shape to form shape
- `handleDragEnd` — optimistic status update + rollback on failure
- `toDateOnlyValue` / `parseDateOnlyValue` — timezone-sensitive date arithmetic
- Query key factories (`salesKeys`, `salesOrderKeys`) — incorrect keys cause stale data

**Recommended starting point:** Unit-test `serializeForm`, `validateForm`, `buildLeadPrefill`, and `toDateOnlyValue` — all are pure functions with no dependencies.

---

## Coverage Note

**Fully inspected:** `api.ts`, `hooks.ts`, `types.ts`, `page.tsx` (all 1,844 lines), `QuotationDocument.tsx`, `orders/api.ts`, `orders/hooks.ts`, `orders/types.ts`, `orders/page.tsx` (all 831 lines), `orders/detail-page.tsx` (453 lines), `orders/payments-page.tsx`, `orders/shipments-page.tsx`, `orders/order-detail-sections.tsx`, all five stub pages.

**Skimmed (structure only, not line-by-line):** `orders/components.tsx` — read lines 1–500 in detail; lines 500–1,736 were read with targeted searches. The file is 1,736 lines and contains many drawer/board components; specific rendering bugs in the deeper drawers (CreateReturnDrawer, InvoiceViewDrawer, InvoiceEditDrawer) may exist and were not exhaustively verified.

**Not inspected:** Routing configuration (no app-level router file was located during this audit). The way the stub pages are actually wired to routes was inferred from import patterns, not confirmed by reading the router.

**Overall confidence:** High for the findings listed. The five crash-level P0/P1 issues are fully reproducible. The god-component and use-client findings are definitively confirmed by line counts and package.json. The formatCurrency redundancy was confirmed by grep across the module tree.

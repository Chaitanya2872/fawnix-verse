# inventory — Module Audit

> Audited: 2026-07-14 | Auditor: Claude Sonnet 4.6 | Branch: master

---

## Summary

The inventory module is a genuine, production-wired frontend covering product CRUD, stock receive/consume, warehouse management, transaction history, and a read-only bills+invoices cross-module view. The data layer is well-structured — TanStack Query with a proper key factory, consistent `staleTime`, and typed API functions. The headline risks are: (1) `InventoryPage` (`page.tsx`) has grown to 1 212 lines with ten `useState` calls and five helper components defined inside the same file, crossing the god-component threshold; (2) `tableSummary.lowStock` / `tableSummary.outOfStock` counts are computed from the **current page slice only**, but are labelled without qualification, misleading users; (3) `fetchTransactions` fetches the full transaction list with no pagination, which will degrade silently at scale; (4) `toProductPayload` silently drops the `status` field from every create/update call; and (5) four copies of `formatDate` and three copies of `formatCurrency` live across the module's own files.

---

## Surface Map

### Pages / Routes

| File | Route concept | Lines | Notes |
|---|---|---|---|
| `page.tsx` | `/inventory` — product list + analytics | 1 212 | God component |
| `transactions-page.tsx` | `/inventory/transactions` | 178 | Client-side filter only, no pagination |
| `warehouses-page.tsx` | `/inventory/warehouses` | 754 | Solid; lazy-init form via `key` prop |
| `invoices-page.tsx` | `/inventory/invoices` | 371 | Borrows hooks from two other modules |
| `layout.tsx` | Shared shell | 54 | `"use client"` not needed |

### Data Layer

| File | Purpose | Notes |
|---|---|---|
| `api.ts` | Raw API calls | 170 lines; typed; all wrapped in `rethrow` |
| `hooks.ts` | TanStack Query hooks | 228 lines; key factory exported; optimistic cache patches |
| `types.ts` | Domain types + constants | 202 lines; clean |
| `export.ts` | CSV download helpers | 119 lines; private helpers duplicated from module peers |

### Query Keys

| Key | Value |
|---|---|
| `inventoryKeys.all` | `["inventory"]` |
| `inventoryKeys.list(filter)` | `["inventory","list",{…filter}]` |
| `inventoryKeys.overview()` | `["inventory","overview"]` |
| `inventoryKeys.transactions()` | `["inventory","transactions"]` |
| `inventoryKeys.warehouses()` | `["inventory","warehouses"]` |
| `inventoryKeys.warehouseList(filter)` | `["inventory","warehouses",{…filter}]` |

No collisions detected with other modules in `src/modules/`. (The only other `"inventory"` string in the codebase is a permission key in `src/modules/users/permissions.ts`, not a query key.)

---

## Findings

### P1 — High impact, fix before next release

---

#### INV-01 · `toProductPayload` silently drops `status`

- **File:** `src/modules/inventory/api.ts:22-40`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

```ts
function toProductPayload(data: Partial<ProductFormData>): Partial<ProductFormData> {
  return {
    name: data.name,
    sku: data.sku,
    // ... all fields listed ...
    priceTier3: data.priceTier3,
    // ← status is never included
  };
}
```

`ProductFormData` includes `status: ProductStatus`, yet the serialisation helper omits it. Every `createProduct` and `updateProduct` call goes through this function. If the backend derives status from stock quantities server-side, this is harmless; but if the API honours a submitted status (e.g. for manual overrides), the `status` field the user selected in `ProductDialog` (line 355 in `page.tsx`) is silently discarded. There is no comment explaining the omission.

**Fix:** Either add `status: data.status` to the return object, or document with a `// status is derived server-side` comment so future contributors don't add it accidentally.

---

#### INV-02 · `tableSummary.lowStock` / `tableSummary.outOfStock` count current page only, not full dataset

- **File:** `src/modules/inventory/page.tsx:754-760`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

```ts
const tableSummary = useMemo(() => {
  return {
    totalItems: pageData?.total ?? products.length,  // ← correct: server total
    lowStock: products.filter((p) => p.status === ProductStatus.LOW_STOCK).length,   // ← page slice only
    outOfStock: products.filter((p) => p.status === ProductStatus.OUT_OF_STOCK).length, // ← page slice only
  };
}, [pageData?.total, products]);
```

`products` is `productsQuery.data?.data`, which is the current page (8 items). `totalItems` correctly reads the server total, but `lowStock` and `outOfStock` count only the visible page. The header KPI tiles (lines 948-956) display these counts without any "visible" qualifier, so a user on page 2 will see different numbers than on page 1, and neither will match reality.

**Fix:** Source these counts from `overviewQuery.data` (which already provides `categories[].lowStockCount` and `outOfStockCount`). The `analyticsSummary` memo (line 763) already does this correctly for the analytics dialog — apply the same logic to the header KPIs, or expose aggregate counts directly in `InventoryOverview`.

---

#### INV-03 · `fetchTransactions` fetches all records with no pagination

- **File:** `src/modules/inventory/api.ts:100-107`, `src/modules/inventory/transactions-page.tsx:35-44`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

```ts
export async function fetchTransactions(): Promise<InventoryTransactionListResponse> {
  const response = await api.get<InventoryTransactionListResponse>("/inventory/transactions");
  return response.data;
}
```

The API call passes no `page`/`pageSize` parameters. Client-side filtering (`useMemo` at line 35-44 of `transactions-page.tsx`) is applied after the full list arrives. At 10 000+ transactions this will cause a multi-second JSON parse and render spike every 15 s (the configured `staleTime`). The `InventoryTransactionListResponse` type has no `total`/`totalPages` fields, so the backend may already return everything — if so, the backend also needs to be fixed.

**Fix:** Add `page`/`pageSize` params to `fetchTransactions`, extend `InventoryTransactionListResponse` to match `PaginatedProducts`, convert the `transactions-page.tsx` filter state to server-side query params, and add `placeholderData: keepPreviousData` as done in `useProducts`.

---

#### INV-04 · Optimistic cache update conflicts with immediate `invalidateQueries` in `useReceiveStock` / `useConsumeStock`

- **File:** `src/modules/inventory/hooks.ts:169-196`
- **Severity:** P1 | **Confidence:** Med

```ts
onSuccess: (transaction, variables) => {
  patchProductStock(queryClient, variables.productId, variables.data.quantity, "receive");
  prependTransaction(queryClient, transaction);
  queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });  // ← triggers background refetch
  queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions() });
},
```

`patchProductStock` writes an optimistic value to the query cache. The `invalidateQueries` calls that follow immediately mark those same queries stale and schedule background refetches. When the refetch lands, it overwrites the optimistic value with server data — which is correct — but the patch and the refetch can race. If the server is slow, the table shows the optimistic stock for longer than intended. More importantly, running `invalidateQueries` in `onSuccess` (not `onSettled`) means cache invalidation is skipped if the mutation errors after a partial server write. The typical TanStack Query pattern for optimistic updates is `onMutate` for the patch + `onError` rollback + `onSettled` invalidation — not patching in `onSuccess` alongside `invalidateQueries`.

**Fix:** Move the `invalidateQueries` calls to `onSettled` (runs on both success and error). If the instant UI feedback is important, move `patchProductStock` to `onMutate` and roll back in `onError`.

---

### P2 — Correctness / quality issues, fix in next sprint

---

#### INV-05 · `InventoryPage` is a god component (1 212 lines, 10 `useState` calls)

- **File:** `src/modules/inventory/page.tsx:718-1212`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

`InventoryPage` exports a single default function of 495 lines containing 10 state variables, 7 mutations/queries, 5 inline handler functions, and renders 4 separate dialogs. Five helper components (`StatusBadge`, `UnderlineTab`, `ActionButton`, `InventoryAnalyticsDialog`, `ProductDialog`, `DeleteDialog`, `StockAdjustmentDialog`) are defined in the same 1 212-line file rather than extracted to separate component files.

This is not a gold-plating concern — the file is already actively causing problems: it slows down editor parsing, makes merge conflicts likely, and makes it impossible to test individual dialogs in isolation.

**Fix:** Extract each dialog into its own file under `src/modules/inventory/components/` (e.g. `product-dialog.tsx`, `delete-dialog.tsx`, `stock-adjustment-dialog.tsx`, `analytics-dialog.tsx`). Move `StatusBadge`, `UnderlineTab`, `ActionButton` into a `ui.tsx` file. The page file should shrink to ~200 lines of orchestration code.

---

#### INV-06 · `matchesBillSearch` calls `.toLowerCase()` on all array members without null-guard

- **File:** `src/modules/inventory/invoices-page.tsx:95-104`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Vaishnavi Nerella

```ts
function matchesBillSearch(bill: Bill, search: string) {
  if (!search) return true;
  return [
    bill.invoiceNumber,
    bill.poNumber,
    bill.vendor.vendorName,
    bill.status,
    bill.matchingStatus,
    bill.matchingNotes,         // typed as `string` (non-optional) but API may return null
  ].some((value) => value.toLowerCase().includes(search));  // ← no null check
}
```

All fields in the array are typed as `string` (non-nullable) in `src/modules/purchases/types.ts:233-248`. However, `matchingNotes` at line 243 is `string` without `| null`, relying on the backend never returning `null`. If the API response ever returns `null` here, `.toLowerCase()` throws `TypeError: Cannot read properties of null`. Compare with `matchesInvoiceSearch` on line 107 which correctly calls `.filter(Boolean)` before `.some`.

**Fix:** Apply the same pattern as `matchesInvoiceSearch`:
```ts
return [bill.invoiceNumber, bill.poNumber, bill.vendor.vendorName, bill.status, bill.matchingStatus, bill.matchingNotes]
  .filter(Boolean)
  .some((value) => value!.toLowerCase().includes(search));
```

---

#### INV-07 · `"use client"` directive on `layout.tsx` is a no-op

- **File:** `src/modules/inventory/layout.tsx:1`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Vaishnavi Nerella (1 commit) / Chaitanya2872 (8 commits on page.tsx that imports it)

```ts
"use client";

import React from "react";
// ...pure presentational component, no hooks, no browser APIs
```

`InventoryLayout` has zero hooks, zero browser API calls, and no client-only dependencies. In a Next.js App Router project, `"use client"` on a purely presentational server-renderable component forces it and all its children into the client bundle unnecessarily. The component could be a Server Component by default, allowing the `children` (which do need `"use client"`) to opt in individually.

**Fix:** Remove `"use client"` from `layout.tsx`. The pages that import it already have their own `"use client"` directives and will remain client components.

---

#### INV-08 · "Consume" and "Receive" action buttons in the product table have no visible label or `aria-label`

- **File:** `src/modules/inventory/page.tsx:1061-1072`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

```tsx
<ActionButton tone="brand" onClick={() => openAction(product, "consume")}>
  C
</ActionButton>
<ActionButton tone="brand" onClick={() => openAction(product, "receive")}>
  R
</ActionButton>
```

Single-letter "C" and "R" buttons have no `aria-label`, no `title`, and no tooltip. Screen readers will announce "C" and "R" with no context, and sighted users cannot determine their purpose without prior knowledge of the system. `ActionButton` (line 156-184) also does not accept or forward an `aria-label` prop.

**Fix:** Add `aria-label` to `ActionButton`'s prop interface and forward it to `<button>`. Use descriptive labels at the call site:
```tsx
<ActionButton aria-label={`Consume stock for ${product.name}`} tone="brand" onClick={() => openAction(product, "consume")}>
  Consume
</ActionButton>
```

---

#### INV-09 · `ProductDialog` resets form via `useEffect` instead of `key` prop — stale state risk if `open` does not change between two different product edits

- **File:** `src/modules/inventory/page.tsx:335-359`
- **Severity:** P2 | **Confidence:** Med

```ts
React.useEffect(() => {
  if (!open) return;
  setForm(product ? { ...product fields... } : defaultForm);
}, [open, product]);
```

When the user opens the dialog for product A, closes it (`open` becomes `false`), then immediately opens it for product B (`open` becomes `true`), the effect fires correctly because `open` changed. However if `open` is already `true` (e.g. the dialog stays mounted) and only `product` changes — for example by a parent re-render caused by a refetch — the effect will fire and overwrite any in-progress edits the user has made. Compare: `WarehouseDialog` at line 154 uses a lazy `useState` initialiser and a `key={editWarehouse.id}` prop (line 739) which is the correct pattern.

**Fix:** Mount `ProductDialog` under a `key` prop (e.g. `key={editProduct?.id ?? "new"}`) and remove the `useEffect`. The lazy `useState` initialiser already used in `WarehouseDialog` is the correct pattern to adopt.

---

#### INV-10 · `tableSummary.lowStock` and `tableSummary.outOfStock` are included in `analyticsSummary` as fallback, causing the analytics dialog to show page-scoped counts when the overview query is loading

- **File:** `src/modules/inventory/page.tsx:762-783`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

```ts
const analyticsSummary = useMemo<InventoryAnalyticsSummary>(() => {
  const categoryLowStock = categories.reduce(...lowStockCount...);
  const categoryOutOfStock = categories.reduce(...outOfStockCount...);
  return {
    lowStock: categoryLowStock || tableSummary.lowStock,   // ← falls back to page-only count
    outOfStock: categoryOutOfStock || tableSummary.outOfStock,
    ...
  };
}, [...]);
```

When `overviewQuery` is loading (first mount), `categories` falls back to `buildCategorySummary(products)` which produces page-scoped category data. `categoryLowStock` will be 0 or a page-scoped value, triggering the `|| tableSummary.lowStock` fallback. The analytics dialog will display misleading numbers until the overview query resolves.

**Fix:** Show a loading skeleton in the analytics dialog (the `isLoading` prop is already threaded in at line 1196) instead of falling back to page-scoped fallbacks. Set `analyticsSummary.lowStock` to `overviewQuery.data?.totalLowStock ?? null` and handle `null` with a loading state in the UI.

---

### P3 — Code quality / maintenance issues

---

#### INV-11 · `formatDate` is defined four times within the module

- **File:** `src/modules/inventory/export.ts:25`, `src/modules/inventory/invoices-page.tsx:18`, `src/modules/inventory/transactions-page.tsx:11`, `src/modules/inventory/warehouses-page.tsx:66`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

All four implementations use `Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })`. They are functionally identical. A shared `src/lib/utils.ts` already exports a `formatDate` (line 9), though it uses a different format string (`"MMM d, yyyy"` via `date-fns` vs locale-aware `Intl` here). This means the module cannot drop-in use the shared utility, but should still extract its own into a single shared location.

**Fix:** Create `src/modules/inventory/utils.ts` exporting a single `formatDate(value?: string | null): string` that all files in this module import. This is one function, not four.

---

#### INV-12 · `formatCurrency` is defined three times within the module

- **File:** `src/modules/inventory/export.ts:34`, `src/modules/inventory/invoices-page.tsx:14`, `src/modules/inventory/page.tsx:93`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

`export.ts` signature: `(value?: number | null): string` — handles null.
`invoices-page.tsx` signature: `(value: number, currency = "INR"): string` — adds currency param.
`page.tsx` signature: `(value: number): string` — INR only.

All three use `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`. The `invoices-page.tsx` variant is the superset.

**Fix:** Add `formatCurrency(value: number | null | undefined, currency?: string): string` to the module-level `utils.ts` proposed in INV-11. Import from there in all three files.

---

#### INV-13 · `formatQuantity` is duplicated between `transactions-page.tsx` and `invoices-page.tsx`

- **File:** `src/modules/inventory/transactions-page.tsx:19`, `src/modules/inventory/invoices-page.tsx:27`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

Both are character-for-character identical:
```ts
function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
```

**Fix:** Consolidate into module `utils.ts` (INV-11).

---

#### INV-14 · `inputClass` Tailwind string inlined in `StockAdjustmentDialog` instead of using the `inputClass` constant defined 3 lines above

- **File:** `src/modules/inventory/page.tsx:625, 638, 659`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

The `inputClass` constant is defined at line 366 (inside `ProductDialog`). `StockAdjustmentDialog` (a sibling function, lines 553-699) defines the same 98-character class string inline three times instead of either sharing the constant or defining its own named constant.

```tsx
// line 625 — inlined, not referencing inputClass
className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
```

**Fix:** Extract `inputClass` to module scope (or to a shared `ui.ts`). All form inputs in the module can then reference one constant.

---

#### INV-15 · `UnderlineTab` component is duplicated between `page.tsx` and `invoices-page.tsx`

- **File:** `src/modules/inventory/page.tsx:132-154`, `src/modules/inventory/invoices-page.tsx:71-93`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

Both files define a `function UnderlineTab({ active, onClick, children })` that is character-for-character identical in JSX output. This also means the prop interface is implicitly duplicated.

**Fix:** Move to `src/modules/inventory/ui.tsx` (or inline into `page.tsx` and import into `invoices-page.tsx` once the god-component refactor in INV-05 is done).

---

#### INV-16 · `DeleteDialog` component is duplicated between `page.tsx` and `warehouses-page.tsx`

- **File:** `src/modules/inventory/page.tsx:504-551`, `src/modules/inventory/warehouses-page.tsx:412-462`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872 / Vaishnavi Nerella

Both files define a `DeleteDialog` component accepting `{ open/warehouse, isLoading, onClose, onConfirm }`. The JSX structure is identical (rose icon, name display, Cancel/Delete buttons). They differ only in entity name (`product.name` vs `warehouse.name`) and icon (`AlertTriangle` vs `Trash2`).

**Fix:** Extract a generic `ConfirmDeleteDialog` (entity name + display label as props) into `src/modules/inventory/components/confirm-delete-dialog.tsx`. Both pages import it.

---

#### INV-17 · `warehouseList` query key is scoped under `warehouses()` but `useCreateWarehouse` / `useUpdateWarehouse` / `useDeleteWarehouse` invalidate only `warehouses()` — not `warehouseList`

- **File:** `src/modules/inventory/hooks.ts:199-227`
- **Severity:** P3 | **Confidence:** Med

```ts
inventoryKeys.warehouses: () => [...inventoryKeys.all, "warehouses"]
inventoryKeys.warehouseList: (filter) => [...inventoryKeys.warehouses(), filter]
```

`warehouseList` keys are prefixed with `warehouses()`. TanStack Query's `invalidateQueries` with a partial key invalidates all keys that begin with that prefix — so `invalidateQueries({ queryKey: inventoryKeys.warehouses() })` **will** catch `warehouseList` keys. This is currently correct behavior, but it is only safe because of TanStack Query's prefix matching semantics, not because the code makes that intent explicit.

**Fix (low effort):** Add a comment above the warehouse mutation `onSuccess` handlers: `// warehouses() prefix invalidates all warehouseList(…) entries via TanStack Query prefix matching`. This prevents a future developer from "fixing" it by narrowing to `warehouseList`.

---

#### INV-18 · `toProductPayload` is identity-like — it restates all `ProductFormData` fields except `status`, making it a maintenance trap

- **File:** `src/modules/inventory/api.ts:22-40`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

The function explicitly lists 15 keys from `data` and returns them unchanged. Any new field added to `ProductFormData` must also be manually added here, or it silently fails to appear in API calls. TypeScript will not warn because the return type is `Partial<ProductFormData>` (allowing any subset). This is the root cause of INV-01 (the `status` omission).

**Fix:** Either delete the function and spread `data` directly (`api.patch(url, data)`), or if field filtering is genuinely needed, use a type-safe pick utility:
```ts
const { id, createdAt, updatedAt, ...payload } = data as Product;
await api.patch<Product>(`/inventory/${id}`, payload);
```

---

## Redundancy

Concrete cross-file clone pairs within the module:

| Clone | File A | Line(s) A | File B | Line(s) B |
|---|---|---|---|---|
| `formatDate` (Intl en-IN) | `export.ts` | 25-31 | `invoices-page.tsx` | 18-25 |
| `formatDate` (Intl en-IN) | `export.ts` | 25-31 | `transactions-page.tsx` | 11-17 |
| `formatDate` (Intl en-IN) | `export.ts` | 25-31 | `warehouses-page.tsx` | 66-73 |
| `formatCurrency` (INR) | `export.ts` | 34-37 | `page.tsx` | 93-95 |
| `formatCurrency` (INR) | `page.tsx` | 93-95 | `invoices-page.tsx` | 14-16 |
| `formatQuantity` (en-IN) | `transactions-page.tsx` | 19-21 | `invoices-page.tsx` | 27-29 |
| `UnderlineTab` component | `page.tsx` | 132-154 | `invoices-page.tsx` | 71-93 |
| `DeleteDialog` component | `page.tsx` | 504-551 | `warehouses-page.tsx` | 412-462 |
| `inputClass` Tailwind string | `page.tsx:366` (const) | 366 | `page.tsx` (inlined) | 625, 638, 659 |
| `inputClass` Tailwind string | `page.tsx:366` | 366 | `warehouses-page.tsx` | 176 |

Cross-module duplicates (not a finding for this module, noted for a broader audit):

- `formatDate` (en-IN Intl) is also defined in `src/modules/purchases/PurchaseOrderDocument.tsx:87` — five total copies project-wide.
- `formatCurrency` is defined in `src/modules/purchases/p2p/dashboard/page.tsx:25` — four total project-wide.

---

## Tests & Gaps

Zero test files exist anywhere in the project (`find . -name "*.test.*" -o -name "*.spec.*"` returned no output). There is no test for:

- `patchProductStock` optimistic logic (especially the stock floor at zero)
- `buildCategorySummary` (client-side aggregation)
- `escapeCsvValue` edge cases (embedded quotes, commas, newlines)
- `getStatusFromStock` reorder level boundary conditions
- `matchesBillSearch` / `matchesInvoiceSearch` null-path behavior

For a module with financial data (price, stock quantities, line totals), the absence of unit tests for the pure logic functions is the most consequential gap.

---

## Coverage Note

**Fully read and line-audited:**
- `types.ts` (202 lines)
- `api.ts` (170 lines)
- `hooks.ts` (228 lines)
- `layout.tsx` (54 lines)
- `export.ts` (119 lines)
- `page.tsx` (1 212 lines)
- `transactions-page.tsx` (178 lines)
- `warehouses-page.tsx` (754 lines)
- `invoices-page.tsx` (371 lines)

**Skimmed for cross-module context:**
- `src/modules/purchases/types.ts` (Invoice interface, line 233)
- `src/modules/purchases/hooks.ts` (staleTime, useInvoices)
- `src/modules/sales/orders/hooks.ts` (useSalesInvoices staleTime)
- `src/lib/utils.ts` (formatDate presence)

**Not inspected:**
- Backend API shape (only inferred from frontend types)
- Whether the server actually derives `status` from stock quantities (affects INV-01 severity)
- Whether `fetchTransactions` backend returns all records or has a hidden limit (affects INV-03 urgency)
- Network request timing / actual bundle size impact of `"use client"` on layout.tsx (INV-07 is structural, not measured)

**Overall confidence in findings:** High. All findings are backed by direct code reads with file:line citations. The one Med-confidence finding (INV-04, INV-09) is marked as such because the impact depends on runtime timing.

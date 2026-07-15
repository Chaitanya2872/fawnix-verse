# reports — Module Audit

_Audited: 2026-07-14 | Auditor: Claude Sonnet 4.6_

---

## Summary

The `reports` module is a CRM-focused analytics dashboard (single route `/reports`) that fetches lead-pipeline metrics from one API endpoint and renders them as hand-rolled chart components. The module is small and tidy in structure — 4 files, no state machine complexity, no mutations — but the single page file (`page.tsx`, 510 lines, 6 sub-components) is a candidate for extraction. The two most impactful issues are: (1) a `"use client"` directive that is a no-op in this Vite/React-Router app but signals copy-paste from a Next.js codebase, and (2) the `stageMetrics` field returned by the API but silently discarded in favour of `statusCounts`, suggesting the two datasets may diverge with no UI signal. There are also minor correctness and consistency problems in the export utilities and one set of dead ternary branches in `StageCard`.

---

## Surface Map

### Route

| Route path | Component | Permission |
|---|---|---|
| `/reports` | `ReportsPage` (default export) | `PERMISSIONS.PAGE_REPORTS` |

### Module files

| File | Role | Lines |
|---|---|---|
| `src/modules/reports/api.ts` | HTTP fetch, error re-throw wrapper | 19 |
| `src/modules/reports/hooks.ts` | TanStack Query key factory + `useReportsOverview` | 16 |
| `src/modules/reports/types.ts` | Response types; imports `LeadStatus` from CRM module | 38 |
| `src/modules/reports/page.tsx` | Page + 6 co-located sub-components + 2 export handlers | 510 |

### Sub-components (all in `page.tsx`)

| Component | Purpose | Lines |
|---|---|---|
| `ChartCard` | Titled chart wrapper | 31–51 |
| `DonutChart` | CSS conic-gradient ring + legend | 53–95 |
| `VerticalBarChart` | Bar chart (count) | 97–122 |
| `HorizontalBarChart` | Bar chart (currency value) | 124–149 |
| `InsightCard` | KPI tile | 151–178 |
| `StageCard` | Funnel stage row with progress bar | 189–232 |

### API endpoint consumed

| Endpoint | Method | Params |
|---|---|---|
| `/reports/overview` | GET | `start?: string`, `end?: string` |

---

## Findings

### P1 — High-impact correctness / design issues

---

#### REP-01 — `stageMetrics` field fetched and typed but never consumed
**File:** `src/modules/reports/types.ts:33`, `src/modules/reports/page.tsx:256–264`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

```ts
// types.ts:33
stageMetrics: StageMetric[];

// page.tsx: reads statusCounts instead
const statusCounts = data.statusCounts ?? {};
const stageChartItems = LEAD_STATUS_ORDER.map((status, index) => ({
  value: statusCounts[status] ?? 0, // <-- stageMetrics never touched
```

**Why it is wrong:** The API response type declares `stageMetrics: StageMetric[]` (a typed array with both `status` and `count`), but the page ignores this array entirely and reconstructs the same information from `statusCounts` (a `Partial<Record<...>>`) using `LEAD_STATUS_ORDER`. If the backend populates `stageMetrics` with richer data (e.g., calculated subtotals, ordering different from `LEAD_STATUS_ORDER`) the chart will silently show wrong data. Conversely, if `statusCounts` is removed from the response, the chart silently goes blank with no error.

**Fix:** Either remove `stageMetrics` from the response type if it is intentionally unused, or replace the `statusCounts` reconstruction with the already-typed array:

```ts
const stageChartItems = data.stageMetrics.map((item, idx) => ({
  label: LEAD_STATUS_LABELS[item.status],
  value: item.count,
  color: chartPalette[idx % chartPalette.length],
}));
```

---

#### REP-02 — `triggerBlobDownload`: link never appended to DOM; immediate revoke may drop download in Firefox
**File:** `src/modules/reports/page.tsx:180–187`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

```ts
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();               // link not in DOM
  URL.revokeObjectURL(url);   // revoked synchronously before browser downloads
}
```

**Why it is wrong:** `link.click()` without appending the element to `document.body` is unreliable in Firefox and some WebKit versions. `URL.revokeObjectURL()` called synchronously after `click()` can race the browser's download initiation, causing the download to fail or produce an empty file. The shared `inventory/export.ts` in the same codebase (lines 14–22) correctly appends and removes the anchor.

**Fix:** Mirror the pattern in `src/modules/inventory/export.ts`:

```ts
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

---

#### REP-03 — CSV export missing UTF-8 BOM; line separator is `\n` not `\r\n`
**File:** `src/modules/reports/page.tsx:311`
**Severity:** P1 | **Confidence:** High
**Owner:** Chaitanya2872

```ts
const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
```

**Why it is wrong:** Microsoft Excel does not recognise UTF-8 without a BOM and will mangle non-ASCII characters (currency symbols, lead source names with accented characters). RFC 4180 also specifies `\r\n` as the line terminator. The project's own `src/modules/inventory/export.ts:14` already does this correctly with `new Blob(["﻿", csv], ...)` and `"\r\n"`.

**Fix:**
```ts
const blob = new Blob(["﻿", rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
```

---

### P2 — Likely bugs / design smells

---

#### REP-04 — `"use client"` directive is a no-op in a Vite/React-Router app
**File:** `src/modules/reports/page.tsx:1`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

```tsx
"use client";
```

**Why it is wrong:** `"use client"` is a React Server Components boundary marker for Next.js 13+. This project uses Vite 7 + React Router DOM v7 — there is no RSC layer. The string is treated as a no-op expression statement. Its presence misleads developers into believing this file requires special RSC treatment. The same problem affects 14 other files in the repo (`crm/presales/page.tsx`, `crm/leads/page.tsx`, `inventory/page.tsx`, etc.), indicating a systematic copy-paste from a Next.js template.

**Fix:** Remove the directive from all affected files.

---

#### REP-05 — `fmtPercent` inconsistently applied: UI uses the function, CSV/PDF inline the arithmetic
**File:** `src/modules/reports/page.tsx:294`, `page.tsx:355`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

```ts
// UI (lines 413, 427, 495): uses fmtPercent()
sub={`Conversion ${fmtPercent(data.conversionRate)}`}

// CSV export (line 294): duplicates arithmetic inline
`... ${Math.round(row.conversionRate * 100)}% rate`

// PDF export (line 355): same inline duplication
`... (${Math.round(row.conversionRate * 100)}% rate)`
```

**Why it is wrong:** Three call sites handle the same formatting independently. If the data contract assumption (that `conversionRate` is in the `0.0–1.0` range) is wrong, three separate fixes are needed. If the API ever returns a whole integer (e.g., `25` for 25%), `fmtPercent(25)` would display `2500%`, but this bug would only be noticed in the UI, not the CSV/PDF path since they don't use the function.

**Fix:** Use `fmtPercent` in all three call sites and add a comment documenting the assumed range (`0.0–1.0`).

---

#### REP-06 — `StageCard` `compact` prop: both ternary branches produce identical strings (dead code)
**File:** `src/modules/reports/page.tsx:210`, `page.tsx:215`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

```tsx
// line 210
<p className={`text-sm font-semibold ${compact ? "text-slate-900" : "text-slate-900"}`}>

// line 215
compact ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-600"
```

**Why it is wrong:** Both branches of these ternary expressions produce identical strings. The `compact` prop has no visual effect on the label colour or badge colour — only the container padding and one font-size class differ. `StageCard` is only ever called with `compact` (line 482), so the non-compact branch is dead code. This is a copy-paste leftover that confuses maintainers.

**Fix:** Remove the dead ternary branches:
```tsx
<p className="text-sm font-semibold text-slate-900">
<span className="rounded-full px-2 text-[10px] font-semibold bg-slate-100 text-slate-600">
```

---

#### REP-07 — Date-range filtering wired in API/hooks but entirely absent from the UI
**File:** `src/modules/reports/api.ts:8`, `src/modules/reports/hooks.ts:6,10`, `src/modules/reports/page.tsx:236`
**Severity:** P2 | **Confidence:** High
**Owner:** Chaitanya2872

```ts
// api.ts:8 — param declared
export async function fetchOverview(params?: { start?: string; end?: string })

// hooks.ts:10 — exposed to consumers
export function useReportsOverview(params?: { start?: string; end?: string })

// page.tsx:236 — called with no arguments, always all-time
const { data, isLoading, isError, error } = useReportsOverview();
```

**Why it is wrong:** The backend endpoint supports date-range filtering, the hook exposes it, but no date-picker UI exists and the page never passes `start`/`end`. Users always see all-time aggregates. The date-range params are dead code that create false expectations and add complexity to the query key for no benefit.

**Fix (choose one):** (a) Add a date-range picker using the existing `src/components/ui/DatePicker.tsx` and wire it to `useReportsOverview({ start, end })`; (b) if date filtering is out of scope, remove the `params` argument from both `fetchOverview` and `useReportsOverview`.

---

### P3 — Minor issues / cleanup

---

#### REP-08 — Redundant `status as LeadStatus` cast — type is already `LeadStatus`
**File:** `src/modules/reports/page.tsx:480`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

```tsx
avgDays={data.avgDaysInStage?.[status as LeadStatus]}
```

**Why it is wrong:** `LEAD_STATUS_ORDER` is typed `LeadStatus[]` (see `src/modules/crm/leads/types.ts:400`), so the loop variable `status` is already inferred as `LeadStatus`. The cast is a redundant `as`-assertion that silently hides potential type-narrowing feedback from the compiler.

**Fix:** `avgDays={data.avgDaysInStage?.[status]}`

---

#### REP-09 — "Converted" InsightCard shows loss-rate as sub-label — confusing UX
**File:** `src/modules/reports/page.tsx:424–430`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

```tsx
<InsightCard
  label="Converted"
  value={data.convertedCount}
  sub={`Loss ${fmtPercent(data.lossRate)}`}  // loss rate under "Converted" label
/>
```

**Why it is wrong:** A user reading a card labelled "Converted" with a sub-text "Loss 20%" is likely to interpret the loss rate as related to conversions, not as the separate churn metric it is. The two numbers belong to opposite outcomes and should not be co-located in the same card without explicit separation.

**Fix:** Either split into two cards or change the sub to reflect the conversion metric:
```tsx
sub={`${fmtPercent(data.conversionRate)} conversion rate`}
```

---

#### REP-10 — Loading state is a plain text card — no skeleton
**File:** `src/modules/reports/page.tsx:238–244`
**Severity:** P3 | **Confidence:** High
**Owner:** Chaitanya2872

```tsx
if (isLoading) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-slate-500">Loading analytics...</CardContent>
    </Card>
  );
}
```

**Why it is wrong:** The full analytics page renders a KPI grid, three charts, and a sidebar. Replacing all of that with a single tiny card causes jarring layout shift and looks unfinished.

**Fix:** Add skeleton placeholders matching the KPI grid and chart sections using Tailwind `animate-pulse` utility divs, consistent with the loading approach in other data-heavy pages.

---

#### REP-11 — Export buttons lack `type="button"` — fragile if wrapped in a future form
**File:** `src/modules/reports/page.tsx:386`, `page.tsx:393`, `page.tsx:399`
**Severity:** P3 | **Confidence:** Med
**Owner:** Chaitanya2872

```tsx
<button onClick={() => navigate("/crm/leads")} className="...">
<button onClick={handleExportCSV} className="...">
<button onClick={handleExportPDF} className="...">
```

**Why it is wrong:** HTML `<button>` defaults to `type="submit"`. If a filter form panel is ever added to this page, these buttons will unintentionally submit it. The safe default for action-only buttons is `type="button"`.

**Fix:** Add `type="button"` to all three.

---

#### REP-12 — `src/modules/reports/types.ts` imports `LeadStatus` from CRM internals — tight coupling
**File:** `src/modules/reports/types.ts:1`
**Severity:** P3 | **Confidence:** Med
**Owner:** Chaitanya2872

```ts
import { LeadStatus } from "@/modules/crm/leads/types";
```

**Why it is wrong:** The `reports` module is a cross-cutting analytics module (route `/reports`, not `/crm/reports`). Directly importing from `@/modules/crm/leads/types` couples it to CRM module internals. If `LeadStatus` is renamed, moved, or extended (e.g., to support multiple entity types), this import breaks silently.

**Fix (medium-term):** Re-export `LeadStatus` from a shared barrel (e.g., `src/modules/crm/index.ts`) and import from there, or move `LeadStatus` to a shared `src/types/crm.ts`.

---

## Redundancy

### Clone pair 1 — Compact-USD currency formatter defined twice

| Location A | Location B |
|---|---|
| `src/modules/reports/page.tsx:11–17` | `src/modules/crm/leads/lead-ui.tsx:23–24` |

```ts
// reports/page.tsx — private to this file
const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(value);

// crm/leads/lead-ui.tsx — exported but with different name
export const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
```

Identical logic, different names. `reports/page.tsx` should import `fmt` from `crm/leads/lead-ui.tsx` (or both should import from a shared `src/lib/` formatter).

---

### Clone pair 2 — `DonutChart` component defined independently in two modules

| Location A | Location B |
|---|---|
| `src/modules/reports/page.tsx:53–95` | `src/modules/sales/orders/page.tsx:223–266` |

Both render a donut ring chart with a label in the centre. The reports version uses CSS `conic-gradient`; the sales version uses SVG `stroke-dasharray`. Props diverge: `reports` passes `segments[]` + `totalLabel`; `sales` passes `segments[]` + `total`. Neither references the other. As the design grows, two divergent implementations with different accessibility and rendering approaches must be maintained separately.

---

### Clone pair 3 — `triggerBlobDownload` is a buggy re-implementation of the pattern in `inventory/export.ts`

| Location A (buggy) | Location B (reference) |
|---|---|
| `src/modules/reports/page.tsx:180–187` | `src/modules/inventory/export.ts:14–22` |

The inventory version appends the anchor to `document.body`, uses the UTF-8 BOM, and uses `\r\n`. The reports version skips all three. The correct fix is to extract a shared `downloadBlob(blob, filename)` utility to `src/lib/download.ts` and use it in both places.

---

## Tests & Gaps

**Tests:** Zero. There is no test runner configuration (`vitest.config.*`, `jest.config.*`) at the project root, and no `*.test.*` or `*.spec.*` files exist anywhere under `src/`. The file `src/modules/crm/leads/_test.txt` contains only the text `hello` and is not a test file.

**What should be tested in this module:**

| Scenario | Why |
|---|---|
| `fmtPercent(0)`, `fmtPercent(0.5)`, `fmtPercent(1)` | Validates the 0–1 range assumption; would catch if API returns 0–100 |
| `handleExportCSV` blob contains UTF-8 BOM and `\r\n` delimiters | Regression for REP-03 |
| `triggerBlobDownload` appends and removes anchor from DOM | Regression for REP-02 |
| `useReportsOverview` query key structure with and without date params | Prevent future key collision |
| `DonutChart` renders fallback when all segment values are 0 | Edge-case guard at line 63 |
| `ReportsPage` renders error card when API fails | Error path coverage |

---

## Coverage Note

**Fully inspected:** All 4 files in `src/modules/reports/` were read line-by-line. The router (`src/app/router.tsx`) was read to confirm the exact route path. `src/services/api-client.ts` was read to understand the auth/session pattern. `src/modules/crm/leads/types.ts` was read for type dependency analysis. `src/modules/crm/leads/lead-ui.tsx` was inspected for formatter duplication. `src/modules/sales/orders/page.tsx` was inspected for `DonutChart` duplication. `src/modules/inventory/export.ts` was read for the blob download reference pattern. `tsconfig.app.json` was checked to confirm `strict: true` and `noUnusedLocals: true`.

**Skimmed:** `src/modules/purchases/p2p/reports/page.tsx` — opened only to check for chart component overlap; none found. `src/lib/utils.ts` — confirmed no shared currency/percent formatters exist.

**Could not inspect:** No backend source code is present in the repository. The assumption that `conversionRate` and `lossRate` are in the `0.0–1.0` range (REP-05) cannot be confirmed from the frontend alone — **confidence: Med**. If the backend returns whole integers (0–100), every `fmtPercent()` call on this page displays values 100× too large.

**Overall confidence: High** on structural, consistency, and dead-code findings. **Med** on the `conversionRate` data-contract assumption and the form-submit risk for buttons (REP-11).

# integrations — Module Audit

**Audited:** 2026-07-14  
**Root:** `src/modules/integrations/`  
**Auditor:** Claude (senior code review)

---

## Summary

The integrations module exposes four pages: a main settings page for Meta Lead Ads and WhatsApp Cloud API (`page.tsx`), a portal-credentials manager (`PortalCredentialsPage.tsx`), a calendar-connections manager (`CalendarIntegrationsPage.tsx`), and a one-line re-export stub for the approvals workflow page (`ApprovalWorkflowsPage.tsx`). The `api.ts` / `hooks.ts` / `types.ts` triad used by the main page is well-structured and follows the project's TanStack Query factory pattern. The newer sub-pages (`PortalCredentialsPage`, `CalendarIntegrationsPage`) were written in a different style — raw CSS classes, inline query-key strings, `any` types, zero error handling on mutations — suggesting they were added by a different contributor who did not follow the established conventions in this very module. The headline risks are: silent save failures in `PortalCredentialsPage` and `CalendarIntegrationsPage` (mutations have no `onError` at all), a UX-breaking form-reset that wipes unsaved credentials after any save, and two `any` casts on a security-sensitive upsert path.

---

## Surface Map

### Pages / Routes

| Route | File | Purpose |
|---|---|---|
| `settings` | `page.tsx` | Meta Lead Ads + WhatsApp Cloud API settings (admin-only) |
| `settings/portal-credentials` | `PortalCredentialsPage.tsx` | LinkedIn / Naukri / Indeed API credentials |
| `settings/calendar-integrations` | `CalendarIntegrationsPage.tsx` | Google / Microsoft calendar OAuth connect/disconnect |
| `settings/approvals` | `ApprovalWorkflowsPage.tsx` | Re-export stub → `approvals/ApprovalsWorkflowsPage` |

### API Functions (api.ts)

| Function | Method | Endpoint |
|---|---|---|
| `fetchMetaIntegrationSettings` | GET | `/integrations/meta/settings` |
| `updateMetaIntegrationSettings` | PUT | `/integrations/meta/settings` |
| `testMetaIntegration` | POST | `/integrations/meta/settings/test` |
| `fetchLatestMetaLeads` | POST | `/integrations/meta/fetch-latest` |
| `fetchWhatsappIntegrationSettings` | GET | `/integrations/whatsapp/settings` |
| `updateWhatsappIntegrationSettings` | PUT | `/integrations/whatsapp/settings` |
| `testWhatsappIntegration` | POST | `/integrations/whatsapp/settings/test` |

API functions for `PortalCredentialsPage` and `CalendarIntegrationsPage` live in `src/lib/api.ts` — outside this module.

### Hooks (hooks.ts)

| Hook | Type | Query key |
|---|---|---|
| `useMetaIntegrationSettings` | `useQuery` | `integrationKeys.meta()` |
| `useUpdateMetaIntegrationSettings` | `useMutation` | — |
| `useTestMetaIntegration` | `useMutation` | — |
| `useFetchLatestMetaLeads` | `useMutation` | — |
| `useWhatsappIntegrationSettings` | `useQuery` | `integrationKeys.whatsapp()` |
| `useUpdateWhatsappIntegrationSettings` | `useMutation` | — |
| `useTestWhatsappIntegration` | `useMutation` | — |

---

## Findings

### P1 — High severity

---

#### INT-01 — Silent save failure in PortalCredentialsPage

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:62-87`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const mutation = useMutation({
  mutationFn: (payload: any) => portalCredentialsApi.upsert(payload),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-credentials'] }),
  // no onError
});
...
const handleSave = (platform: Platform) => {
  ...
  mutation.mutate(payload)   // no inline onError either
}
```

**Why wrong:** If the API call fails (network error, 4xx/5xx), the user receives zero feedback. The button re-enables, the form looks unchanged, and credentials are silently not saved. This is especially dangerous for OAuth tokens — a failed save is indistinguishable from a successful one.

**Fix:** Add `onError` to the mutation and display a toast (Sonner is already wired in `providers.tsx`):
```tsx
import { toast } from 'sonner';

const mutation = useMutation({
  mutationFn: (payload: PortalCredentialPayload) => portalCredentialsApi.upsert(payload),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['portal-credentials'] });
    toast.success('Credentials saved.');
  },
  onError: (err: Error) => toast.error(err.message ?? 'Failed to save credentials.'),
});
```

---

#### INT-02 — Silent failure in CalendarIntegrationsPage connect/disconnect

**File:** `src/modules/integrations/CalendarIntegrationsPage.tsx:19-30`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const connectMutation = useMutation({
  mutationFn: (provider: string) => calendarApi.authorize(...),
  onSuccess: (res) => {
    const url = res.data?.authorization_url
    if (url) window.location.href = url
  },
  // no onError
})

const disconnectMutation = useMutation({
  mutationFn: (provider: string) => calendarApi.disconnect(provider),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-connections'] }),
  // no onError
})
```

**Why wrong:** If `authorize` fails or the backend returns no `authorization_url`, the user clicks "Connect" and nothing happens — no error, no redirect. The button just re-enables. Disconnect failure is equally invisible.

**Fix:**
```tsx
import { toast } from 'sonner';

const connectMutation = useMutation({
  mutationFn: (provider: string) => calendarApi.authorize(provider, `${window.location.origin}/settings/calendar-integrations`),
  onSuccess: (res) => {
    const url = res.data?.authorization_url
    if (url) { window.location.href = url; return; }
    toast.error('No authorization URL returned. Please try again.');
  },
  onError: (err: Error) => toast.error(err.message ?? 'Failed to start authorization.'),
})

const disconnectMutation = useMutation({
  mutationFn: (provider: string) => calendarApi.disconnect(provider),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-connections'] }),
  onError: (err: Error) => toast.error(err.message ?? 'Failed to disconnect calendar.'),
})
```

---

#### INT-03 — Form wipes unsaved secrets on any successful save (PortalCredentialsPage)

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:42-60`  
**Severity:** P1 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
useEffect(() => {
  const rows = data?.data ?? []
  const next: Record<Platform, CredentialForm> = {
    linkedin: emptyForm(),
    naukri: emptyForm(),
    indeed: emptyForm(),
  }
  for (const row of rows) { ... }
  setForms(next)         // ← resets ALL three platform forms
}, [data])
```

When the user saves LinkedIn credentials, `onSuccess` calls `qc.invalidateQueries`, causing the query to refetch, `data` reference to change, `useEffect` to fire, and `setForms` to rebuild ALL three platform forms from API data — wiping `client_secret`, `access_token`, and `refresh_token` fields the user may have typed into the Naukri or Indeed forms (those are intentionally not returned by the API). This is a real-world data loss scenario: a user filling multiple platforms in one session loses all typed secrets for the non-saved platforms after the first save.

**Fix:** Only reset the form for the platform that was just saved, not all platforms. Use `queryClient.setQueryData` rather than `invalidateQueries` (or merge rather than replace):
```tsx
const mutation = useMutation({
  mutationFn: (payload: PortalCredentialPayload) => portalCredentialsApi.upsert(payload),
  onSuccess: (_, variables) => {
    // Merge only the saved platform's non-secret fields back
    setForms(prev => ({
      ...prev,
      [variables.platform]: {
        ...prev[variables.platform as Platform],
        client_id: variables.client_id ?? prev[variables.platform as Platform].client_id,
        account_name: variables.account_name ?? prev[variables.platform as Platform].account_name,
        is_active: variables.is_active,
        // do NOT reset secret fields
      },
    }));
    toast.success('Credentials saved.');
  },
  onError: (err: Error) => toast.error(err.message),
});
```
Remove the `useEffect` dependency on `data` or narrow it to only hydrate on initial load (`data !== undefined && forms.linkedin.client_id === ''` guard).

---

### P2 — Medium severity

---

#### INT-04 — Two `any` casts on security-sensitive upsert payload

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:63, 76`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
mutationFn: (payload: any) => portalCredentialsApi.upsert(payload),
...
const payload: any = {
  platform,
  is_active: form.is_active,
  client_id: form.client_id || undefined,
  ...
}
```

**Why wrong:** `payload: any` disables TypeScript checking on a data structure that carries OAuth client secrets and access tokens. A typo or missing field silently passes the type checker. The `portalCredentialsApi.upsert` in `lib/api.ts` accepts `object`, so a concrete type would propagate.

**Fix:** Define and use a proper payload type:
```ts
type PortalCredentialPayload = {
  platform: Platform;
  is_active: boolean;
  client_id?: string;
  account_name?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
};
```
Update `portalCredentialsApi.upsert` signature to `(data: PortalCredentialPayload)` and move the type to `types.ts`.

---

#### INT-05 — Shared `isBusy` locks all platform Save buttons when one is pending

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:89, 169-171`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const isBusy = mutation.isPending      // single mutation instance

// inside PLATFORMS.map:
<button disabled={isBusy} ...>Save</button>
```

There is one mutation instance shared across all three platform cards. When saving LinkedIn, `mutation.isPending` becomes `true` and all three Save buttons are disabled simultaneously. The user cannot save Naukri while LinkedIn is saving, even though these are independent operations.

**Fix:** Track pending state per platform using a `savingPlatform` ref or three mutation instances:
```tsx
const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null);
const mutation = useMutation({
  mutationFn: (payload: PortalCredentialPayload) => portalCredentialsApi.upsert(payload),
  onSettled: () => setSavingPlatform(null),
  ...
});
const handleSave = (platform: Platform) => {
  setSavingPlatform(platform);
  mutation.mutate(buildPayload(platform));
};

// in render:
<button disabled={savingPlatform === platform} ...>
  {savingPlatform === platform ? 'Saving...' : 'Save'}
</button>
```

---

#### INT-06 — Shared `connectMutation.isPending` disables all Connect buttons simultaneously

**File:** `src/modules/integrations/CalendarIntegrationsPage.tsx:66-68`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<button
  disabled={connectMutation.isPending}
  onClick={() => connectMutation.mutate(provider.key)}
>
```

One `connectMutation` is shared for both Google and Microsoft. Clicking "Connect Google" disables the "Connect Microsoft" button while the request is in flight. Same applies to `disconnectMutation` across both providers.

**Fix:** Track which provider is connecting:
```tsx
const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
// then: disabled={connectingProvider === provider.key}
```

---

#### INT-07 — Inline query-key strings in CalendarIntegrationsPage and PortalCredentialsPage

**Files:**
- `src/modules/integrations/CalendarIntegrationsPage.tsx:15, 29`
- `src/modules/integrations/PortalCredentialsPage.tsx:32, 64`

**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
// CalendarIntegrationsPage.tsx:15
queryKey: ['calendar-connections'],

// PortalCredentialsPage.tsx:32
queryKey: ['portal-credentials'],
```

These inline string arrays are inconsistent with the project's established key-factory pattern (see `integrationKeys` in `hooks.ts`). A typo in the `invalidateQueries` call (e.g., `'portal-credential'` vs `'portal-credentials'`) will silently fail to invalidate the cache — the UI will show stale data after a save with no error.

**Fix:** Export key factories from the module's `hooks.ts` (or `lib/api.ts`):
```ts
// hooks.ts
export const calendarKeys = {
  connections: () => ['calendar-connections'] as const,
};
export const portalCredentialKeys = {
  all: () => ['portal-credentials'] as const,
};
```
Use these everywhere so any rename is a single-source-of-truth change.

---

#### INT-08 — Missing `staleTime` on CalendarIntegrationsPage and PortalCredentialsPage queries

**Files:**
- `src/modules/integrations/CalendarIntegrationsPage.tsx:14-17`
- `src/modules/integrations/PortalCredentialsPage.tsx:31-34`

**Severity:** P2 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['calendar-connections'],
  queryFn: () => calendarApi.listConnections().then(r => r.data),
  // no staleTime
})
```

Without `staleTime`, every time the component mounts or the window regains focus, TanStack Query will refetch. For credential/settings data that changes rarely, this causes unnecessary API calls. The `page.tsx` hooks correctly set `staleTime: 60_000`.

**Fix:** Add `staleTime: 60_000` (or higher) to both queries, matching the pattern in `hooks.ts:28, 62`.

---

#### INT-09 — Hardcoded business-specific template defaults in EMPTY_WHATSAPP_FORM

**File:** `src/modules/integrations/page.tsx:38-50`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

```tsx
const EMPTY_WHATSAPP_FORM: WhatsappIntegrationSettings = {
  ...
  templateName: "fawnix_lead_intro",    // hardcoded product name
  templateLanguage: "en_US",
  assignTemplateName: "assign_lead",
  assignTemplateLanguage: "en_US",
  ...
};
```

`"fawnix_lead_intro"` is a product-specific WhatsApp template name hardcoded as the default. When the server returns no saved settings (first-time setup), this default is silently submitted to the API. Any customer who uses a different template name will have their settings overwritten with `fawnix_lead_intro` on their first "Save". This leaks internal product nomenclature and corrupts customer settings.

**Fix:** Use empty strings as defaults. The form shows these as `placeholder` values already — the placeholder is the hint; the default value should be `""` for a new setup:
```tsx
const EMPTY_WHATSAPP_FORM: WhatsappIntegrationSettings = {
  ...
  templateName: "",
  templateLanguage: "",
  assignTemplateName: "",
  assignTemplateLanguage: "",
  ...
};
```

---

#### INT-10 — `enabled` field silently stripped from PUT payload but not reconciled in cache update

**File:** `src/modules/integrations/api.ts:37-45`  
**Severity:** P2 | **Confidence:** Med  
**Owner:** Chaitanya2872

```tsx
export async function updateMetaIntegrationSettings(
  input: MetaIntegrationSettings
): Promise<MetaIntegrationSettings> {
  const { enabled, ...payload } = input;   // 'enabled' stripped
  const response = await api.put<MetaIntegrationSettings>(
    "/integrations/meta/settings",
    payload
  );
  return response.data;                    // server response stored in cache
}
```

In `hooks.ts:39`, the mutation's `onSuccess` calls `queryClient.setQueryData(integrationKeys.meta(), data)` where `data` is the server's PUT response. If the backend does not echo `enabled` back in the PUT response (which is plausible since it was not in the request), the cache entry's `enabled` field becomes `undefined`. The status banner in `page.tsx:167` then evaluates `metaFormState.enabled` as falsy and always shows "Meta webhooks are disabled."

**Fix:** Either have the API contract document that the PUT response includes `enabled`, or merge the existing `enabled` value into the response before updating the cache:
```tsx
onSuccess: (data) => {
  // Preserve enabled from previous cache entry since it's server-controlled
  const prev = queryClient.getQueryData<MetaIntegrationSettings>(integrationKeys.meta());
  queryClient.setQueryData(integrationKeys.meta(), {
    ...data,
    enabled: data.enabled ?? prev?.enabled ?? false,
  });
},
```

---

#### INT-11 — god component: page.tsx is 608 lines with 13 useState calls

**File:** `src/modules/integrations/page.tsx:1-608`  
**Severity:** P2 | **Confidence:** High  
**Owner:** Chaitanya2872

```tsx
const [metaFormState, setMetaFormState] = useState<MetaIntegrationSettings>(EMPTY_META_FORM);
const [whatsappFormState, setWhatsappFormState] = useState<WhatsappIntegrationSettings>(EMPTY_WHATSAPP_FORM);
const [metaStatusMessage, setMetaStatusMessage] = useState<string | null>(null);
const [whatsappStatusMessage, setWhatsappStatusMessage] = useState<string | null>(null);
const [showMetaToken, setShowMetaToken] = useState(false);
const [showMetaSecret, setShowMetaSecret] = useState(false);
const [showWhatsappToken, setShowWhatsappToken] = useState(false);
const [showWhatsappSecret, setShowWhatsappSecret] = useState(false);
const [metaTestMessage, setMetaTestMessage] = useState<string | null>(null);
const [metaFetchMessage, setMetaFetchMessage] = useState<string | null>(null);
const [whatsappTestMessage, setWhatsappTestMessage] = useState<string | null>(null);
const [metaFetchLimit, setMetaFetchLimit] = useState("100");
```

13 `useState` calls and 608 lines in a single component. The Meta and WhatsApp sections are completely independent; either can be extracted into `MetaIntegrationCard.tsx` and `WhatsappIntegrationCard.tsx`. This would also resolve the test-message and status-message state co-mingling (line 105: `handleMetaSubmit` clears `metaFetchMessage` which is semantically unrelated to form submission).

**Fix:** Extract the two card sections into separate components, each owning their own state:
```
src/modules/integrations/
  MetaIntegrationCard.tsx   (lines ~155-365)
  WhatsappIntegrationCard.tsx (lines ~369-605)
  page.tsx  (< 60 lines, just layout + permission check)
```

---

### P3 — Low severity / style

---

#### INT-12 — Raw `<input type="checkbox">` bypasses the design system

**Files:**
- `src/modules/integrations/page.tsx:535-549` (WhatsApp "Use lead name" checkbox)
- `src/modules/integrations/PortalCredentialsPage.tsx:102-109` (Active toggle per platform)

**Severity:** P3 | **Confidence:** High  
**Owner:** Chaitanya2872 (page.tsx), Ravi-Shankar-ACS (PortalCredentialsPage.tsx)

```tsx
// page.tsx:535
<input
  id="wa-use-lead-name"
  type="checkbox"
  className="h-4 w-4 rounded border-slate-300"
  ...
/>

// PortalCredentialsPage.tsx:102
<input
  type="checkbox"
  checked={forms[platform].is_active}
  ...
/>
```

Both use bare `<input type="checkbox">` while the rest of the main page uses shadcn/ui `<Input>` and `<Button>`. The project has a shadcn Checkbox available via the dropdown-menu component tree. PortalCredentialsPage also has no `className` on its checkbox at all.

**Fix:** Use `@/components/ui/checkbox` (already transitively in the bundle) or keep the raw checkbox but add consistent styling matching `page.tsx`'s pattern.

---

#### INT-13 — Mixed design system usage in PortalCredentialsPage and CalendarIntegrationsPage

**Files:**
- `src/modules/integrations/PortalCredentialsPage.tsx:116, 124, 132, 141, 150, 159` — `className="input"`
- `src/modules/integrations/CalendarIntegrationsPage.tsx:65, 72` — `className="btn-primary text-xs"`

**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
<input className="input" value={forms[platform].client_id} ... />
<button className="btn-primary text-xs" ...>Connect</button>
```

`page.tsx` uses `<Input>` and `<Button>` from `@/components/ui`. The newer sub-pages use the raw global CSS utility classes (`input`, `btn-primary`, `btn-secondary` from `src/index.css:311`). This creates visual inconsistency — the two styling systems respond differently to theme changes or refactors.

**Fix:** Replace raw elements with shadcn/ui components:
```tsx
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// remove className="input" / className="btn-primary"
```

---

#### INT-14 — ApprovalWorkflowsPage is a needless re-export wrapper

**File:** `src/modules/integrations/ApprovalWorkflowsPage.tsx:1-5`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
import ApprovalsWorkflowsPage from '@/modules/approvals/ApprovalsWorkflowsPage'

export default function ApprovalWorkflowsPage() {
  return <ApprovalsWorkflowsPage />
}
```

This file exists solely to re-export a component that the router already imports directly from `src/modules/approvals/ApprovalsWorkflowsPage.tsx` (see `router.tsx:64`). The router then imports the re-export as `ApprovalWorkflowsSettingsPage` (line 80). There are now two import paths to the same component. This is dead wrapper code.

**Fix:** Delete `src/modules/integrations/ApprovalWorkflowsPage.tsx` and update `router.tsx:80` to import directly from `@/modules/approvals/ApprovalsWorkflowsPage` with the alias `ApprovalWorkflowsSettingsPage`:
```tsx
// router.tsx — remove line 80, change line 64 to:
import ApprovalWorkflowsSettingsPage from "@/modules/approvals/ApprovalsWorkflowsPage";
```

---

#### INT-15 — `isLoading` shown AFTER the form in PortalCredentialsPage

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:179-181`  
**Severity:** P3 | **Confidence:** High  
**Owner:** Ravi-Shankar-ACS

```tsx
{isLoading && (
  <div className="text-sm text-gray-400">Loading credentials...</div>
)}
```

The loading indicator renders below all three platform forms. While loading, the forms are shown with empty `emptyForm()` state, giving the impression of "no credentials configured" before data arrives. In `CalendarIntegrationsPage.tsx:45`, the same pattern occurs.

**Fix:** Show a skeleton or loading guard before rendering form content:
```tsx
if (isLoading) return <div className="text-sm text-gray-400">Loading credentials...</div>;
```

---

#### INT-16 — `CredentialForm` local type not exported or added to types.ts

**File:** `src/modules/integrations/PortalCredentialsPage.tsx:9-17`  
**Severity:** P3 | **Confidence:** Med  
**Owner:** Ravi-Shankar-ACS

```tsx
type CredentialForm = {
  client_id: string
  client_secret: string
  access_token: string
  refresh_token: string
  expires_at: string
  account_name: string
  is_active: boolean
}
```

This type is declared locally and is not exported. If `PortalCredentialsPage` is ever split into sub-components (which it should be, per INT-11 guidance), the type needs to be shared. Consistency with `types.ts` in this module would be the right home for it.

**Fix:** Move to `src/modules/integrations/types.ts` and export.

---

## Redundancy

### Clone pair 1: Inline status-message divs (5 instances in page.tsx)

`src/modules/integrations/page.tsx:270-272`, `276-278`, `281-283`, `554-556`, `560-562`

All five use identical markup:
```tsx
<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
  {someMessage}
</div>
```

**Vs.** a generic shared component that does not exist yet. Extract a `<StatusBanner message={...} />` component.

---

### Clone pair 2: Password show/hide pattern (repeated 4 times in page.tsx)

`src/modules/integrations/page.tsx:188-205` (Meta token), `244-262` (Meta secret), `381-399` (WhatsApp token), `440-459` (WhatsApp secret)

All four follow exactly the same structure: `Input` with `type={show ? "text" : "password"}` + `Button` with `onClick={() => setShow(prev => !prev)}`. Extract a `<PasswordInput>` wrapper component.

---

### Clone pair 3: Duplicate import of ApprovalsWorkflowsPage in router.tsx

`src/app/router.tsx:64` — imports `ApprovalsWorkflowsPage` from `@/modules/approvals/ApprovalsWorkflowsPage`  
`src/app/router.tsx:80` — imports `ApprovalWorkflowsSettingsPage` from `@/modules/integrations/ApprovalWorkflowsPage` (which just re-exports the same component)

Both resolve to the same module. See INT-14.

---

### Clone pair 4: Double-data-unwrap pattern in newer pages

`src/modules/integrations/CalendarIntegrationsPage.tsx:16, 32` — `.then(r => r.data)` then `data?.data`  
`src/modules/integrations/PortalCredentialsPage.tsx:33, 43` — `.then(r => r.data)` then `data?.data`

This pattern is consistent and appears intentional (the API returns a `{ data: [...] }` envelope), but neither page types the envelope shape — the inner `data` is typed as `any`. This is widescale in the codebase (same pattern in `org/setup/*`), but within this module these two pages lack typed wrappers. Define a `PaginatedResponse<T>` generic and use it in the query return type.

---

## Tests & Gaps

**Test coverage: zero.** No test files exist anywhere in the repository (confirmed by `find` across the whole project). There are no unit tests, integration tests, or Storybook stories for any component in this module.

Critical paths that are completely untested:
- `fetchMetaIntegrationSettings` fallback (the `??` default object on line 20-26 of `api.ts` is never exercised)
- `updateMetaIntegrationSettings` stripping of `enabled` field
- The `useEffect` hydration in `PortalCredentialsPage` (the form-reset-on-refetch bug in INT-03 would be caught by a simple test)
- All mutation error paths (which, per INT-01 and INT-02, have no handlers anyway)

---

## Coverage Note

**Fully inspected:** All 7 files in `src/modules/integrations/`. Git blame for authorship on each file. Router entries for all 4 routes. `src/lib/api.ts` (lines 218-229 for `portalCredentialsApi` and `calendarApi`). `src/services/api-client.ts` (interceptor shape). `src/app/providers.tsx` (Sonner Toaster presence). `src/index.css:311` (`input` class definition). All 5 inline status-message divs confirmed by grep.

**Skimmed / not fully read:** `src/modules/approvals/ApprovalsWorkflowsPage.tsx` (330 lines, out of scope — only relevant to INT-14). The wider codebase for cross-module query key collision analysis (confirmed no other module uses `'calendar-connections'` or `'portal-credentials'` keys at this time).

**Confidence overall:** High for all P0–P2 findings; they are grounded in direct code reads and confirmed line numbers. INT-10 is marked Med because it depends on the backend API contract for the PUT response shape, which was not verified against actual server code.

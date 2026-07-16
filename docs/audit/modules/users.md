# users — Module Audit

## Summary

The `users` module (`src/modules/users/`) is the centralised admin panel for managing users, roles, and permissions. It also doubles as a shared library — `PermissionSelector`, `buildPermissionModuleGroups`, `useAccessControlCatalog`, and several type utilities are imported by other modules (`access`, `task-management`). Overall health is **fair**: the data layer and types are clean, but the single page component has become a 1,237-line god component with 19 `useState` calls, three separate form lifecycles, and several correctness bugs including a silent data loss on role clone, fire-and-forget destructive mutations, and a misclassified permission in the hardcoded fallback.

---

## Surface Map

### Files

| File | Purpose | Lines |
|---|---|---|
| `api.ts` | Axios wrappers for `/users`, `/roles`, `/permissions` endpoints | 195 |
| `hooks.ts` | TanStack Query hooks (reads + mutations) | 237 |
| `types.ts` | Domain types + `getPrimaryRole`, `getRoleLabel`, `USER_LANGUAGE_OPTIONS` | 143 |
| `permissions.ts` | `buildPermissionModuleGroups`, fallback catalog, role/permission helpers | 133 |
| `PermissionSelector.tsx` | Checkbox tree component (module → page → feature) | 89 |
| `page.tsx` | Single-page god component — 3 tabs, 5+ dialogs | 1,237 |

### API Endpoints Consumed

| Method | Path | Hook |
|---|---|---|
| GET | `/users` | `useUsers` |
| GET | `/users/assignees` | `useUserAssignees` |
| GET | `/users/directory` | `useUserDirectory` |
| GET | `/users/access-control/catalog` | `useAccessControlCatalog` |
| POST | `/users` | `useCreateUser` |
| PATCH | `/users/:id` | `useUpdateUser` |
| PATCH | `/users/:id/status` | `useUpdateUserStatus` |
| DELETE | `/users/:id` | `useDeleteUser` |
| GET | `/roles` | `useRoles` |
| POST | `/roles` | `useCreateRole` |
| PATCH | `/roles/:id` | `useUpdateRole` |
| POST | `/roles/:id/clone` | `useCloneRole` |
| PATCH | `/roles/:id/status` | `useUpdateRoleStatus` |
| DELETE | `/roles/:id` | `useDeleteRole` |
| GET | `/permissions` | `usePermissions` |
| POST | `/permissions` | `useCreatePermission` |
| PATCH | `/permissions/:key` | `useUpdatePermission` |
| DELETE | `/permissions/:key` | `useDeletePermission` |

### Query Key Factory (`hooks.ts:36–43`)

```ts
usersKeys = {
  all: ["users"],
  list:        () => ["users", "list"],
  assignees:   () => ["users", "assignees"],
  directory:   () => ["users", "directory"],
  accessCatalog: () => ["users", "access-catalog"],
  roles:       () => ["users", "roles"],
  permissions: () => ["users", "permissions"],
}
```

---

## Findings

### P1 — High Impact / Correctness

---

#### USE-01 — Clone Role silently discards all permission edits

- **File:** `page.tsx:588–589` / `api.ts:90–97`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code (`page.tsx:579–599`):**
```tsx
const payload: CreateRolePayload = {
  name: roleFormState.name.trim(),
  description: roleFormState.description.trim() || undefined,
  permissions: roleFormState.permissions,   // <-- built correctly
};
try {
  if (roleCloneTarget) {
    await cloneRoleMutation.mutateAsync({ id: roleCloneTarget.id, name: payload.name }); // permissions silently dropped
  } else if (activeRole) {
    await updateRoleMutation.mutateAsync({ id: activeRole.id, payload });
  } else {
    await createRoleMutation.mutateAsync(payload);
  }
```

**Why it's wrong:** When cloning a role, the UI renders the full `PermissionSelector` and allows the user to modify permissions before clicking "Clone Role". The `payload` object is constructed with those edits in `permissions`. However, `cloneRoleMutation.mutateAsync` is called with only `{ id, name }` — the `permissions` field is never passed. The backend `cloneRole` function (`api.ts:90`) only accepts `name`. The user's permission edits are silently discarded and the original role's permissions are copied as-is by the backend.

**Fix:** Either (a) pass `permissions` to `cloneRole` and update the backend endpoint, or (b) disable the permission selector in clone mode and tell the user they can edit after cloning. If the API won't be changed, at minimum remove the `PermissionSelector` from the clone dialog so users cannot be deceived.

```ts
// api.ts — extend signature
export async function cloneRole(id: string, name: string, permissions?: string[]): Promise<RoleRecord> {
  const response = await api.post<RoleRecord>(`/roles/${id}/clone`, { name, permissions });
  return response.data;
}

// page.tsx — pass permissions
await cloneRoleMutation.mutateAsync({ id: roleCloneTarget.id, name: payload.name, permissions: payload.permissions });
```

---

#### USE-02 — Delete Role and Delete Permission fire without confirmation dialog

- **File:** `page.tsx:823–835` (deleteRole), `page.tsx:890` (deletePermission)
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
// Role delete — no dialog, no undo
onClick={() => deleteRoleMutation.mutate(role.id)}

// Permission delete — same pattern
onClick={() => deletePermissionMutation.mutate(permission.key)}
```

**Why it's wrong:** Deleting a role or permission is an irreversible, high-blast-radius action (all users assigned to that role lose permissions immediately). The User delete (`openDeleteDialog`) correctly opens a confirmation dialog before mutating. Roles and permissions skip this entirely — one misclick destroys production data.

**Fix:** Add a `deleteRoleTarget` state (same pattern as `deleteTarget`), open a confirmation dialog, and only call `deleteRoleMutation.mutate` after confirmation. Mirror this for permissions.

---

#### USE-03 — Shared `isPending` disables ALL row actions when ANY single row is mutating

- **File:** `page.tsx:817–820` (role status toggle), `page.tsx:829–832` (role delete), `page.tsx:890` (permission delete)
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
// Single shared mutation instance used as disabled gate for every row
disabled={
  updateRoleStatusMutation.isPending ||
  role.systemDefined
}
// ... in roles.map((role) => ...)
```

**Why it's wrong:** `updateRoleStatusMutation`, `deleteRoleMutation`, and `deletePermissionMutation` are each single TanStack Query mutation instances hoisted outside the `.map()`. When any one role's toggle fires, `isPending` becomes `true` for all rows, disabling every other row's buttons simultaneously. This looks broken and prevents concurrent UI interactions.

**Fix:** Move mutation calls to a per-row sub-component (preferred) or track a local `pendingId: string | null` state and compare to `role.id`.

```tsx
// Preferred: extract <RoleRow role={role} onDelete={...} /> which owns its own mutation
function RoleRow({ role }: { role: RoleRecord }) {
  const updateStatus = useUpdateRoleStatus();
  const deleteRole = useDeleteRole();
  // ...
}
```

---

#### USE-04 — `DialogFooter` used inside a `Sheet` (Edit User panel)

- **File:** `page.tsx:931–936`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
{/* Inside <Sheet> / <SheetContent> */}
<DialogFooter className="gap-2 sm:gap-0">
  <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
  <Button type="submit" disabled={updateUserMutation.isPending}>
    {updateUserMutation.isPending ? "Saving…" : "Save Changes"}
  </Button>
</DialogFooter>
```

**Why it's wrong:** `DialogFooter` is semantically and structurally designed for `<Dialog>` (modal). It is rendered inside a `<Sheet>` (slide-over panel). While it may render visually, it applies Dialog-specific layout assumptions and does not receive the correct keyboard/focus behaviour a `SheetFooter` provides. The Create User sheet (line 902) and Role sheet (line 1075) both correctly use `SheetFooter`.

**Fix:** Replace with `SheetFooter`:
```tsx
<SheetFooter className="gap-2 sm:gap-0">
  <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
  <Button type="submit" disabled={updateUserMutation.isPending}>
    {updateUserMutation.isPending ? "Saving…" : "Save Changes"}
  </Button>
</SheetFooter>
```

---

#### USE-05 — `fetchAccessControlCatalog` can return `undefined` at runtime despite `Promise<AccessControlCatalog>` return type

- **File:** `api.ts:50–58`
- **Severity:** P1 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export async function fetchAccessControlCatalog(): Promise<AccessControlCatalog> {
  try {
    await ensureApiSession();
    const response = await api.get<AccessControlCatalog>("/users/access-control/catalog");
    return response.data;   // ← no null fallback; if API returns 204 or null body, this is undefined
  } catch (error) {
    rethrowApiError(error, "Failed to load access control catalog.");
    // ← rethrowApiError is `never`, but TypeScript emits an implicit undefined path
    //   because the compiler cannot see through the function boundary.
  }
}
```

**Why it's wrong:** TypeScript infers an implicit `undefined` return from the `catch` branch because `rethrowApiError` is declared `never` but is a separate function — the compiler does not narrow the outer function's return. If the API returns a response with a `null` or empty body, `response.data` is `undefined`, making the `Promise<AccessControlCatalog>` lie. All consumers that call `.data.roles` or `.data.modules` will throw. Contrast with `fetchUsers()` which correctly uses `response.data ?? []`. The same pattern exists for `createRole` (line 74), `updateRole` (line 84), `cloneRole` (line 94), `updateRoleStatus` (line 104), `createPermission` (line 133), `updatePermission` (line 143), `createUser` (line 162), `updateUser` (line 172), `updateUserStatus` (line 182) — these all return `response.data` without a guard.

**Fix:** For read queries, add a null fallback. For mutations, keep as-is but add a guard + meaningful throw:
```ts
// Read query:
return response.data ?? { roles: [], modules: [], allPermissions: [] };

// For mutations where we must have the returned object:
const data = response.data;
if (!data) throw new Error("Unexpected empty response from server.");
return data;
```

---

### P2 — Moderate Impact

---

#### USE-06 — God component: 1,237 lines, 19 useState calls, 3 independent form lifecycles in one file

- **File:** `page.tsx:324–1237`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Why it's wrong:** `UsersPage` owns the entire user management UI — three tabs (All Users, Role Management, Permission Management), five dialogs/sheets, three form state objects, three separate sets of error states, and all event handlers. At 1,237 lines with 19 `useState` hooks, it violates the 400-line / 8-state-calls heuristic for a single component. Bugs in one section (e.g., role clone) are invisible in the sea of code. Code reviewers and junior contributors cannot reason about state interactions.

**Concrete state list (lines 345–362):**
```ts
const [activeTab, setActiveTab] = useState<Tab>("all-users");           // 1
const [isCreateOpen, setIsCreateOpen] = useState(false);                // 2
const [isEditOpen, setIsEditOpen] = useState(false);                    // 3
const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);        // 4
const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false); // 5
const [activeUser, setActiveUser] = useState<User | null>(null);        // 6
const [deleteTarget, setDeleteTarget] = useState<User | null>(null);    // 7
const [activeRole, setActiveRole] = useState<RoleRecord | null>(null);  // 8
const [activePermission, setActivePermission] = useState<PermissionRecord | null>(null); // 9
const [roleCloneTarget, setRoleCloneTarget] = useState<RoleRecord | null>(null); // 10
const [formState, setFormState] = useState<UserFormState>(EMPTY_FORM);  // 11
const [roleFormState, setRoleFormState] = useState<RoleFormState>(EMPTY_ROLE_FORM); // 12
const [permissionFormState, setPermissionFormState] = useState<PermissionFormState>(EMPTY_PERMISSION_FORM); // 13
const [formError, setFormError] = useState<string | null>(null);        // 14
const [pageError, setPageError] = useState<string | null>(null);        // 15
const [deleteError, setDeleteError] = useState<string | null>(null);    // 16
const [roleFormError, setRoleFormError] = useState<string | null>(null); // 17
const [permissionFormError, setPermissionFormError] = useState<string | null>(null); // 18
// (19th: implicit from useState<Tab> default)
```

**Fix:** Extract into separate components/files: `<UserTab>`, `<RoleTab>`, `<PermissionTab>`, plus dialog components like `<EditUserDialog>`, `<RoleDialog>`, `<DeleteRoleConfirmDialog>`. Each should own its own state. The tab selector and data queries can remain at the page level.

---

#### USE-07 — `PAGE_SALES_ORDERS` misclassified under the Inventory module in the hardcoded fallback

- **File:** `permissions.ts:28`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
{
  key: "inventory",
  label: "Inventory",
  module: { value: PERMISSIONS.MODULE_INVENTORY, label: "Inventory Module" },
  pages: [
    { value: PERMISSIONS.PAGE_INVENTORY_MANAGE, label: "Manage Inventory" },
    { value: PERMISSIONS.PAGE_INVENTORY_WAREHOUSES, label: "Warehouses" },
    { value: PERMISSIONS.PAGE_INVENTORY_TRANSACTIONS, label: "Transactions" },
    { value: PERMISSIONS.PAGE_INVENTORY_INVOICES, label: "Bills & Invoices" },
    { value: PERMISSIONS.PAGE_SALES_ORDERS, label: "Orders" },   // ← sales permission under inventory
  ],
```

**Why it's wrong:** `PAGE_SALES_ORDERS` (`"page.sales.orders"`) belongs semantically and architecturally to the Sales module (confirmed in `auth/permissions.ts:33` and route guard at line 108). Classifying it under Inventory in the fallback means that when the backend catalog is unavailable, admins who grant `MODULE_INVENTORY` page permissions to a role also inadvertently grant access to the Sales Orders page (and vice versa — revoking it removes a Sales permission from an Inventory-only role). This is a privilege escalation and access control misconfiguration in the fallback path.

**Fix:**
```ts
// Move PAGE_SALES_ORDERS into the sales group:
{
  key: "sales",
  label: "Sales",
  module: { value: PERMISSIONS.MODULE_SALES, label: "Sales Module" },
  pages: [
    { value: PERMISSIONS.PAGE_SALES, label: "Quotations" },
    { value: PERMISSIONS.PAGE_SALES_ORDERS, label: "Orders" },   // moved here
  ],
}
```

---

#### USE-08 — `updateRoleStatus` and `updateRoleStatusMutation.mutate` inline have no error feedback to user

- **File:** `page.tsx:811–820`
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
onClick={() =>
  updateRoleStatusMutation.mutate({
    id: role.id,
    active: !role.active,
  })
}
```

**Why it's wrong:** This calls `.mutate()` (fire-and-forget) without an `onError` callback or any UI feedback. If the activation/deactivation call fails (network error, permission denied, etc.) the button silently returns to its original visual state with no toast, no error banner, nothing. The user does not know the action failed. The hooks file has no `onError` handler in any mutation either.

**Fix:**
```tsx
onClick={() =>
  updateRoleStatusMutation.mutate(
    { id: role.id, active: !role.active },
    {
      onError: (err) => setPageError(err.message ?? "Failed to update role status."),
    }
  )
}
```
Or add a global `onError` handler in `useUpdateRoleStatus` in `hooks.ts`.

---

#### USE-09 — `resolveRoleLabel` is an unstable function defined inside the component, not memoized

- **File:** `page.tsx:381–384`
- **Severity:** P2 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
const resolveRoleLabel = (roleKeys: string[]) => {
  const key = roleKeys[0];
  return roleOptions.find((opt) => opt.value === key)?.label ?? getRoleLabel(roleKeys);
};
```

**Why it's wrong:** This arrow function is re-created on every render of `UsersPage`. It closes over `roleOptions` (which is a `useMemo` result, so that part is stable), but the function reference itself changes every render. While not causing an infinite loop here, passing it to any child wrapped in `React.memo` or using it in a dependency array would cause spurious re-renders. It is also applied twice in the JSX (line 722 in the table row and line 923 in the edit form) inside the map. `useCallback` is the correct primitive.

**Fix:**
```tsx
const resolveRoleLabel = useCallback(
  (roleKeys: string[]) => {
    const key = roleKeys[0];
    return roleOptions.find((opt) => opt.value === key)?.label ?? getRoleLabel(roleKeys);
  },
  [roleOptions]
);
```

---

#### USE-10 — Manual controlled inputs instead of react-hook-form; no client-side validation

- **File:** `page.tsx:207–319` (UserFormFields), `page.tsx:972–1025` (role form), `page.tsx:1121–1179` (permission form)
- **Severity:** P2 | **Confidence:** High
- **Owner:** Chaitanya2872

**Why it's wrong:** All three forms use manual `useState` + `onChange` handlers. There is no client-side validation beyond HTML `required` attributes. The codebase has `react-hook-form` installed (`src/components/ui/form.tsx` imports `Controller` and `useFormContext` from it). There is no email format validation on the email field, no phone number format validation, no minimum password length check, and no check that the `role` field is non-empty before submitting the create form. `required` on a `<select>` with an empty string default value (`""`) does not prevent submission in all browsers.

**Fix:** Migrate forms to `react-hook-form` with a Zod schema. At minimum, add explicit validation in the submit handlers before calling `mutateAsync`.

```ts
// Quick fix without full migration:
const handleCreateSubmit = async (event: FormEvent) => {
  event.preventDefault();
  setFormError(null);
  if (!formState.role) { setFormError("Role is required."); return; }
  if (!formState.email.includes("@")) { setFormError("Invalid email."); return; }
  // ...
};
```

---

### P3 — Low Impact / Style / Maintenance

---

#### USE-11 — `UserRole` type alias provides no type safety

- **File:** `types.ts:1`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export type UserRole = string;
```

**Why it's wrong:** `UserRole` is a transparent alias for `string`. Any string is assignable to it and vice versa, making it useless as a type guard. It adds cognitive noise without enforcement. The only safe use of opaque role types is `as const` enum or a branded type.

**Fix (opaque approach):**
```ts
export type UserRole = string & { readonly __brand: "UserRole" };
// Or simply remove the alias and use `string` directly.
```
Or, if role keys become known at compile time, use a union:
```ts
export type UserRole = "ROLE_ADMIN" | "ROLE_MANAGER" | string;
```

---

#### USE-12 — `as Error` casts on query error objects — will crash if error is not an Error instance

- **File:** `page.tsx:685, 689, 758, 864`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code:**
```tsx
{(accessCatalogQuery.error as Error)?.message ?? "Failed to load access control catalog."}
{(usersQuery.error as Error)?.message ?? "Failed to load users."}
{(rolesQuery.error as Error)?.message ?? "Failed to load roles."}
{(permissionsQuery.error as Error)?.message ?? "Failed to load permissions."}
```

**Why it's wrong:** TanStack Query types `error` as `Error | null` by default only when configured with `throwOnError`. The `as Error` cast suppresses TypeScript's null check and will cause a runtime error if the error is a non-Error (e.g., a network ProgressEvent or an Axios error that's not an instance of `Error`). The `?.` optional chain only guards against null/undefined, not against non-Error objects without a `.message` property.

**Fix:** Use a safe accessor:
```tsx
{(usersQuery.error instanceof Error ? usersQuery.error.message : null) ?? "Failed to load users."}
// Or import a utility:
function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}
```

---

#### USE-13 — `initials()` and `avatarColor()` helpers defined locally; `getInitials` already exists in `src/lib/utils.ts`

- **File:** `page.tsx:141–153`; duplicate: `src/lib/utils.ts:71`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code (page.tsx:141–153):**
```ts
function avatarColor(name: string): string { /* 8-colour hash */ }
function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
```

**Why it's wrong:** `getInitials` already exists at `src/lib/utils.ts:71`. The local `initials` function in `page.tsx` has a slightly different behaviour (slices to 2 words first), while `lib/utils.ts` takes all words. There are at least 6 other local `initials` implementations across the monorepo (see Redundancy section). Having a local `Avatar` component with a private colour hash is fine for now, but the `initials` function should be deleted and `getInitials` from `lib/utils.ts` imported instead.

**Fix:**
```tsx
import { getInitials } from "@/lib/utils";
// Remove local initials() function.
// Update Avatar: {getInitials(name)}
```

---

#### USE-14 — Inconsistent formatting: three forms collapsed to single lines; messy whitespace in JSX

- **File:** `page.tsx:729, 890, 902`
- **Severity:** P3 | **Confidence:** High
- **Owner:** Chaitanya2872

**Offending code (example, page.tsx:729):**
```tsx
<Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900" onClick={() => openEditDialog(user)} > <Pencil className="h-4 w-4" /> </Button> <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteDialog(user)} > <Trash2 className="h-4 w-4" /> </Button>
```

**Why it's wrong:** The Create User sheet (line 902) and Permission list actions (line 890) are also single-line blobs spanning hundreds of characters. This is likely the result of copy-paste and auto-format conflicts. It makes code review and git blame ineffective.

**Fix:** Run Prettier with the project's config on these files. If no Prettier config exists, add one.

---

#### USE-15 — `USER_LANGUAGE_OPTIONS` hardcoded in `types.ts` — non-domain logic in a type file

- **File:** `types.ts:117–121`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export const USER_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Telugu", label: "Telugu" },
  { value: "Hindi", label: "Hindi" },
];
```

**Why it's wrong:** A type file should contain only type declarations. This constant is a UI concern (dropdown options) and business data (supported languages), neither of which belongs in `types.ts`. If the backend later drives language options, this will need to be removed from the type file anyway. It also means adding a new language requires a code change and a deploy.

**Fix:** Move to `constants.ts` in the module, or (better) fetch from the backend catalog. Until then, at minimum move it to `page.tsx` or a dedicated `options.ts`.

---

#### USE-16 — `updateCreatePermission` path doesn't guard `key` immutability on edit

- **File:** `page.tsx:1123–1131` / `api.ts:139`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code (page.tsx):**
```tsx
<Input
  id="permission-key"
  value={permissionFormState.key}
  onChange={(e) => handlePermissionFormChange("key", e.target.value)}
  ...
/>
```

**Why it's wrong:** When editing an existing permission (`activePermission !== null`), the key field is left editable. The `updatePermission` API (`PATCH /permissions/:key`) sends the new `key` in the payload body (`UpdatePermissionPayload.key`) while routing via the original key in the URL. If the backend allows key changes this is an intentional design, but the UI gives no indication that changing the key is a sensitive action (it will break every role and user that references the old key string). At minimum, the key field should be read-only in edit mode, or a warning should be shown.

**Fix:**
```tsx
<Input
  id="permission-key"
  value={permissionFormState.key}
  onChange={(e) => handlePermissionFormChange("key", e.target.value)}
  readOnly={Boolean(activePermission)}
  className={activePermission ? "bg-slate-50 cursor-not-allowed" : ""}
/>
```

---

#### USE-17 — `UserAssignees` and `UserDirectory` share the same type but semantically differ; no comment distinguishing them

- **File:** `types.ts:56–61` / `api.ts:30–47`
- **Severity:** P3 | **Confidence:** Med
- **Owner:** Chaitanya2872

**Offending code:**
```ts
export type UserAssignee = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
};

// Both return UserAssignee[] but hit different endpoints:
// /users/assignees  — likely filtered by role/context
// /users/directory  — likely all active users
```

**Why it's wrong:** Two separate endpoints return the same TypeScript type. Without documentation, a junior developer does not know which to use where. The hooks `useUserAssignees` vs `useUserDirectory` are indistinguishable from their signatures.

**Fix:** Add JSDoc comments on both hooks and API functions explaining when to use each.

---

## Redundancy

The following are concrete clone pairs — same logic duplicated across files.

| # | Location A | Location B | What's Duplicated |
|---|---|---|---|
| R1 | `page.tsx:151–153` `initials(name)` | `src/lib/utils.ts:71–76` `getInitials(name)` | Name-to-initials extraction. Users module ignores the lib copy. |
| R2 | `page.tsx:151–153` `initials(name)` | `src/modules/crm/leads/lead-ui.tsx:38–40` `getInitials(name)` | Same function, different slice behaviour (slices to 2 in users, takes all in CRM). |
| R3 | `page.tsx:151–153` `initials(name)` | `src/modules/project-management/components/common.tsx:12–16` `initials(name)` | Third independent implementation; slightly different whitespace handling. |
| R4 | `page.tsx:151–153` `initials(name)` | `src/modules/project-management/pages/MeetingsPage.tsx:142` `initials(name)` | Fourth implementation inside MeetingsPage component. |
| R5 | `page.tsx:151–153` `initials(name)` | `src/modules/task-management/page.tsx:422` `initials(name?)` | Fifth implementation with null guard. |
| R6 | `page.tsx:157–166` `Avatar` component | `src/modules/crm/leads/lead-ui.tsx` avatar rendering | Local Avatar with hash colouring — at least 5 modules implement their own avatar. No shared component exists. |
| R7 | `page.tsx:168–177` `StatusDot` (active/inactive) | `src/modules/purchases/p2p/vendors/page.tsx:702` active dot | Same Tailwind pattern for active/inactive status indicator. |

**Highest-priority deduplication:** The `initials` function has 6+ copies. `src/lib/utils.ts:71` already exports `getInitials`. All modules should import from there, and the lib version should be standardised to "first 2 initials, uppercase" semantics.

---

## Tests & Gaps

- **Zero test files** exist for this module or anywhere in the monorepo (no `*.test.*` or `*.spec.*` files found).
- No coverage for:
  - `buildPermissionModuleGroups` — the fallback branch (`catalog?.modules?.length === 0`) is exercised only when the backend is unreachable; the misclassified `PAGE_SALES_ORDERS` (USE-07) would be caught by a unit test.
  - `getRoleDefaultPermissions` — returns empty array when catalog has no matching role; no test.
  - `uniquePermissions` — trivial but untested.
  - Clone role permission discard (USE-01) — would be a trivial unit test on the submit handler.
  - The shared `isPending` gate (USE-03) — a component test would catch this immediately.

---

## Coverage Note

**Fully inspected:** All 6 files in `src/modules/users/` were read line-by-line. Git blame was run per file to establish authorship. All query keys, mutation invalidation sets, API signatures, and JSX structure were reviewed.

**Cross-module checks performed:**
- `src/modules/task-management/hooks.ts` — checked query key collision with `usersKeys`.
- `src/modules/access/page.tsx` — confirmed shared use of `useAccessControlCatalog`, `PermissionSelector`, `buildPermissionModuleGroups`.
- `src/modules/auth/permissions.ts` — verified all permission constants referenced in the fallback exist.
- `src/lib/utils.ts` — confirmed `getInitials` exists as a deduplication target.
- Multiple modules checked for `initials` / `StatusDot` clones.

**Self-gaps / lower confidence areas:**
- The backend behaviour of `PATCH /roles/:id/clone` is inferred from the API call shape; if the backend already accepts `permissions` in the clone body, USE-01 severity drops to P2.
- The actual runtime behaviour of `DialogFooter` inside `SheetContent` (USE-04) was not tested in a browser — the finding is based on component design intent.
- `USER_LANGUAGE_OPTIONS` (USE-15) may be intentionally hardcoded if language options are application-defined, not backend-driven; this finding has **Medium** confidence.
- No runtime profiling was performed to quantify re-render cost of USE-09.

**Overall confidence: High** for P0–P1 findings; Med–High for P2–P3.

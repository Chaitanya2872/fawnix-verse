import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Search, X } from "lucide-react";
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from "./hooks";
import type { Account, AccountFormData } from "./types";

const PAGE_SIZE = 10;

const emptyForm: AccountFormData = {
  name: "",
  industry: "",
  website: "",
  address: "",
  ownerUserId: "",
};

function AccountDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: AccountFormData;
  onClose: () => void;
  onSave: (data: AccountFormData) => void;
  isLoading?: boolean;
}) {
  const [form, setForm] = useState<AccountFormData>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">
              {mode === "create" ? "Create Account" : "Update Account"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Keep account profiles up to date for better reporting.
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Account Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Industry</label>
            <input
              value={form.industry}
              onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
            <input
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountPreview({
  account,
  onEdit,
  onDelete,
}: {
  account: Account | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!account) {
    return (
      <div className="sticky top-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Select an account to preview details.
      </div>
    );
  }

  return (
    <div className="sticky top-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{account.name}</p>
            <p className="text-xs text-muted-foreground">{account.industry || "Industry not set"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</p>
        <p className="text-sm text-foreground">{account.website || "-"}</p>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</p>
        <p className="text-sm text-foreground">{account.address || "-"}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);

  const { data, isLoading, isError, error } = useAccounts({ search, page, pageSize: PAGE_SIZE });
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const accounts = data?.data ?? [];

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !accounts.some((account) => account.id === selectedId)) {
      setSelectedId(accounts[0].id);
    }
  }, [accounts, selectedId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  const dialogInitial: AccountFormData = dialogMode === "edit" && selectedAccount
    ? {
        name: selectedAccount.name,
        industry: selectedAccount.industry ?? "",
        website: selectedAccount.website ?? "",
        address: selectedAccount.address ?? "",
        ownerUserId: selectedAccount.ownerUserId ?? "",
      }
    : emptyForm;

  function handleSave(data: AccountFormData) {
    if (dialogMode === "edit" && selectedAccount) {
      updateAccount.mutate({ id: selectedAccount.id, data }, { onSuccess: () => setDialogMode(null) });
      return;
    }
    createAccount.mutate(data, { onSuccess: () => setDialogMode(null) });
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage company profiles and linked contacts.</p>
        </div>
        <button
          onClick={() => setDialogMode("create")}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> New Account
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search accounts..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                <p className="mt-3 text-sm text-muted-foreground">Loading accounts...</p>
              </div>
            ) : isError ? (
              <div className="py-16 text-center">
                <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Failed to load accounts."}</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No accounts found.</div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedId(account.id)}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${selectedId === account.id ? "bg-sky-50/60" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.industry || "Industry not set"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs text-muted-foreground">Page {page} of {data.totalPages}</span>
              <button
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <AccountPreview
          account={selectedAccount}
          onEdit={() => setDialogMode("edit")}
          onDelete={() => selectedAccount && deleteAccount.mutate(selectedAccount.id)}
        />
      </div>

      <AccountDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        initial={dialogInitial}
        onClose={() => setDialogMode(null)}
        onSave={handleSave}
        isLoading={dialogMode === "edit" ? updateAccount.isPending : createAccount.isPending}
      />
    </div>
  );
}

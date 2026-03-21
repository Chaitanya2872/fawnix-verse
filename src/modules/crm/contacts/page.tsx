import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Mail, Phone, Plus, Search, User, X } from "lucide-react";
import { useAccounts } from "@/modules/crm/accounts/hooks";
import type { Account } from "@/modules/crm/accounts/types";
import { useContacts, useCreateContact, useDeleteContact, useUpdateContact } from "./hooks";
import type { Contact, ContactFormData } from "./types";

const PAGE_SIZE = 10;

const emptyForm: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  title: "",
  source: "",
  accountId: "",
};

function ContactDialog({
  open,
  mode,
  initial,
  accounts,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: ContactFormData;
  accounts: Account[];
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  isLoading?: boolean;
}) {
  const [form, setForm] = useState<ContactFormData>(initial);

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
              {mode === "create" ? "Create Contact" : "Update Contact"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Keep contact profiles consistent and linked to accounts.
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
            <input
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Account</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">No Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
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

function ContactPreview({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!contact) {
    return (
      <div className="sticky top-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Select a contact to preview details.
      </div>
    );
  }

  return (
    <div className="sticky top-6 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{contact.name}</p>
          <p className="text-xs text-muted-foreground">{contact.title || "Title not set"}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
        <div className="space-y-1">
          {contact.email && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {contact.email}
            </p>
          )}
          {contact.phone && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {contact.phone}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {contact.account?.name || "No account linked"}
        </p>
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

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);

  const { data, isLoading, isError, error } = useContacts({ search, page, pageSize: PAGE_SIZE });
  const { data: accountData } = useAccounts({ search: "", page: 1, pageSize: 100 });
  const accounts = accountData?.data ?? [];

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const contacts = data?.data ?? [];

  useEffect(() => {
    if (contacts.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !contacts.some((contact) => contact.id === selectedId)) {
      setSelectedId(contacts[0].id);
    }
  }, [contacts, selectedId]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId) ?? null,
    [contacts, selectedId]
  );

  const dialogInitial: ContactFormData = dialogMode === "edit" && selectedContact
    ? {
        name: selectedContact.name,
        email: selectedContact.email ?? "",
        phone: selectedContact.phone ?? "",
        title: selectedContact.title ?? "",
        source: selectedContact.source ?? "",
        accountId: selectedContact.account?.id ?? "",
      }
    : emptyForm;

  function handleSave(data: ContactFormData) {
    if (dialogMode === "edit" && selectedContact) {
      updateContact.mutate({ id: selectedContact.id, data }, { onSuccess: () => setDialogMode(null) });
      return;
    }
    createContact.mutate(data, { onSuccess: () => setDialogMode(null) });
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage people and link them to accounts.</p>
        </div>
        <button
          onClick={() => setDialogMode("create")}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> New Contact
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
              placeholder="Search contacts..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                <p className="mt-3 text-sm text-muted-foreground">Loading contacts...</p>
              </div>
            ) : isError ? (
              <div className="py-16 text-center">
                <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Failed to load contacts."}</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No contacts found.</div>
            ) : (
              <div className="divide-y divide-border">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${selectedId === contact.id ? "bg-sky-50/60" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.account?.name || "No account"}</p>
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

        <ContactPreview
          contact={selectedContact}
          onEdit={() => setDialogMode("edit")}
          onDelete={() => selectedContact && deleteContact.mutate(selectedContact.id)}
        />
      </div>

      <ContactDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        initial={dialogInitial}
        accounts={accounts}
        onClose={() => setDialogMode(null)}
        onSave={handleSave}
        isLoading={dialogMode === "edit" ? updateContact.isPending : createContact.isPending}
      />
    </div>
  );
}

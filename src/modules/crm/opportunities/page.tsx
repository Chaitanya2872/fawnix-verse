import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, DollarSign, Loader2, Plus, Search, X } from "lucide-react";
import { useAccounts } from "@/modules/crm/accounts/hooks";
import { useContacts } from "@/modules/crm/contacts/hooks";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, LeadStatus } from "@/modules/crm/leads/types";
import { useCreateDeal, useDeals, useDeleteDeal, useUpdateDealStage, useUpdateDeal } from "./hooks";
import type { Deal, DealFormData } from "./types";

const fmt = (value?: number) =>
  value === undefined || value === null
    ? "$0"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

const emptyForm: DealFormData = {
  name: "",
  stage: LeadStatus.NEW,
  value: 0,
  probability: 0,
  expectedCloseAt: "",
  accountId: "",
  contactId: "",
};

function DealDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
  isLoading,
  accounts,
  contacts,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: DealFormData;
  onClose: () => void;
  onSave: (data: DealFormData) => void;
  isLoading?: boolean;
  accounts: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<DealFormData>(initial);

  useEffect(() => {
    if (open) {
      setForm(initial);
    }
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">
              {mode === "create" ? "Create Deal" : "Update Deal"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Track pipeline value and expected closing dates.
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Deal Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Stage</label>
            <select
              value={form.stage}
              onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {LEAD_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Value</label>
            <input
              type="number"
              value={form.value ?? 0}
              onChange={(e) => setForm((prev) => ({ ...prev, value: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Probability %</label>
            <input
              type="number"
              value={form.probability ?? 0}
              onChange={(e) => setForm((prev) => ({ ...prev, probability: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Expected Close</label>
            <input
              type="date"
              value={form.expectedCloseAt ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, expectedCloseAt: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Account</label>
            <select
              value={form.accountId ?? ""}
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
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact</label>
            <select
              value={form.contactId ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, contactId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">No Contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
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
            disabled={isLoading || !form.name?.trim()}
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

function DealCard({
  deal,
  onStageChange,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  deal: Deal;
  onStageChange: (stage: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-150 ease-out ${
        isDragging ? "opacity-60 ring-2 ring-sky-200" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{deal.name}</p>
          <p className="text-xs text-muted-foreground">{deal.account?.name || "No account"}</p>
        </div>
        <button onClick={onEdit} className="text-xs text-sky-600 hover:underline">Edit</button>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{fmt(deal.value)}</span>
          <span>{deal.probability ?? 0}%</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {deal.expectedCloseAt ? new Date(deal.expectedCloseAt).toLocaleDateString() : "No date"}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={deal.stage}
          onChange={(e) => onStageChange(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
        >
          {LEAD_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline">Delete</button>
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useDeals({ search, stage: "ALL", page: 1, pageSize: 200 });
  const { data: accounts } = useAccounts({ search: "", page: 1, pageSize: 200 });
  const { data: contacts } = useContacts({ search: "", page: 1, pageSize: 200 });

  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const updateDealStage = useUpdateDealStage();
  const deleteDeal = useDeleteDeal();

  const deals = data?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    LEAD_STATUS_ORDER.forEach((status) => {
      map[status] = [];
    });
    deals.forEach((deal) => {
      const key = map[deal.stage] ? deal.stage : LeadStatus.NEW;
      map[key].push(deal);
    });
    return map;
  }, [deals]);

  const dialogInitial: DealFormData = dialogMode === "edit" && editingDeal
    ? {
        name: editingDeal.name,
        stage: editingDeal.stage,
        value: editingDeal.value,
        probability: editingDeal.probability ?? 0,
        expectedCloseAt: editingDeal.expectedCloseAt
          ? new Date(editingDeal.expectedCloseAt).toISOString().slice(0, 10)
          : "",
        accountId: editingDeal.account?.id ?? "",
        contactId: editingDeal.contact?.id ?? "",
        leadId: editingDeal.leadId ?? "",
      }
    : emptyForm;

  function handleSave(form: DealFormData) {
    const payload = {
      ...form,
      expectedCloseAt: form.expectedCloseAt ? new Date(form.expectedCloseAt).toISOString() : undefined,
    };
    if (dialogMode === "edit" && editingDeal) {
      updateDeal.mutate({ id: editingDeal.id, data: payload }, { onSuccess: () => setDialogMode(null) });
      return;
    }
    createDeal.mutate(payload, { onSuccess: () => setDialogMode(null) });
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visualize pipeline value and stage velocity.</p>
        </div>
        <button
          onClick={() => {
            setEditingDeal(null);
            setDialogMode("create");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> New Deal
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deals..."
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading deals...</p>
        </div>
      ) : isError ? (
        <div className="py-16 text-center text-sm text-red-600">
          {error instanceof Error ? error.message : "Failed to load deals."}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LEAD_STATUS_ORDER.map((status) => (
            <div
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                setDropStage(status);
              }}
              onDragLeave={() => {
                setDropStage((current) => (current === status ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                setDropStage(null);
                setDraggingId(null);
                if (id) {
                  updateDealStage.mutate({ id, stage: status });
                }
              }}
              className={`min-w-[260px] flex-1 rounded-2xl border border-border p-4 transition-colors duration-200 ease-out ${
                dropStage === status ? "bg-sky-50/70 ring-2 ring-sky-200" : "bg-muted/30"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{LEAD_STATUS_LABELS[status]}</p>
                  <p className="text-xs text-muted-foreground">{grouped[status]?.length ?? 0} deals</p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {grouped[status]?.length ?? 0}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {(grouped[status] ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/70 p-4 text-xs text-muted-foreground">
                    No deals in this stage.
                  </div>
                ) : (
                  grouped[status].map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      isDragging={draggingId === deal.id}
                      onStageChange={(stage) => updateDealStage.mutate({ id: deal.id, stage })}
                      onEdit={() => {
                        setEditingDeal(deal);
                        setDialogMode("edit");
                      }}
                      onDelete={() => deleteDeal.mutate(deal.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", deal.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(deal.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropStage(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DealDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        initial={dialogInitial}
        accounts={(accounts?.data ?? []).map((account) => ({ id: account.id, name: account.name }))}
        contacts={(contacts?.data ?? []).map((contact) => ({ id: contact.id, name: contact.name }))}
        onClose={() => setDialogMode(null)}
        onSave={handleSave}
        isLoading={dialogMode === "edit" ? updateDeal.isPending : createDeal.isPending}
      />
    </div>
  );
}

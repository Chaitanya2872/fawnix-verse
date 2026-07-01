"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/services/api-client";
import { InventoryLayout } from "./layout";
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useUpdateWarehouse,
  useWarehouses,
} from "./hooks";
import type {
  Warehouse,
  WarehouseFilter,
  WarehouseFormData,
  WarehouseStatusFilter,
} from "./types";

const defaultFilter: WarehouseFilter = {
  search: "",
  status: "ALL",
  page: 1,
  pageSize: 10,
};

const defaultForm: WarehouseFormData = {
  code: "",
  name: "",
  type: "Main",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  managerName: "",
  contactPhone: "",
  contactEmail: "",
  capacity: 0,
  active: true,
  notes: "",
};

const warehouseTypes = ["Main", "Regional", "Project", "Transit", "Service", "Returns"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function display(value?: string | null) {
  return value?.trim() ? value : "-";
}

function WarehouseStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "muted";
}) {
  const valueClass =
    tone === "success" ? "text-emerald-700" : tone === "muted" ? "text-slate-600" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function IconAction({
  label,
  children,
  tone = "default",
  onClick,
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function WarehouseDialog({
  warehouse,
  isLoading,
  onClose,
  onSave,
}: {
  warehouse?: Warehouse | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: WarehouseFormData) => void;
}) {
  const [form, setForm] = useState<WarehouseFormData>(() =>
    warehouse
      ? {
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type ?? "Main",
          addressLine1: warehouse.addressLine1 ?? "",
          addressLine2: warehouse.addressLine2 ?? "",
          city: warehouse.city,
          state: warehouse.state ?? "",
          postalCode: warehouse.postalCode ?? "",
          country: warehouse.country || "India",
          managerName: warehouse.managerName ?? "",
          contactPhone: warehouse.contactPhone ?? "",
          contactEmail: warehouse.contactEmail ?? "",
          capacity: Number(warehouse.capacity ?? 0),
          active: warehouse.active,
          notes: warehouse.notes ?? "",
        }
      : defaultForm
  );

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  function updateField<K extends keyof WarehouseFormData>(key: K, value: WarehouseFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim() || "India",
      capacity: Number(form.capacity) || 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close warehouse dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <WarehouseIcon className="h-4 w-4" />
              Warehouse Master
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {warehouse ? "Edit Warehouse" : "Add Warehouse"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain storage locations used for receiving, staging, and dispatch planning.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Warehouse Code" required>
              <input
                required
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                className={inputClass}
                placeholder="WH-BLR-01"
              />
            </Field>
            <Field label="Warehouse Name" required>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={inputClass}
                placeholder="Bengaluru Main Warehouse"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type ?? ""}
                onChange={(event) => updateField("type", event.target.value)}
                className={inputClass}
              >
                {warehouseTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.capacity}
                onChange={(event) => updateField("capacity", Number(event.target.value) || 0)}
                className={inputClass}
              />
            </Field>
            <Field label="City" required>
              <input
                required
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className={inputClass}
                placeholder="Bengaluru"
              />
            </Field>
            <Field label="State">
              <input
                value={form.state ?? ""}
                onChange={(event) => updateField("state", event.target.value)}
                className={inputClass}
                placeholder="Karnataka"
              />
            </Field>
            <Field label="Postal Code">
              <input
                value={form.postalCode ?? ""}
                onChange={(event) => updateField("postalCode", event.target.value)}
                className={inputClass}
                placeholder="560001"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address">
                <input
                  value={form.addressLine1 ?? ""}
                  onChange={(event) => updateField("addressLine1", event.target.value)}
                  className={inputClass}
                  placeholder="Address line 1"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Address Line 2">
                <input
                  value={form.addressLine2 ?? ""}
                  onChange={(event) => updateField("addressLine2", event.target.value)}
                  className={inputClass}
                  placeholder="Address line 2"
                />
              </Field>
            </div>
            <Field label="Manager">
              <input
                value={form.managerName ?? ""}
                onChange={(event) => updateField("managerName", event.target.value)}
                className={inputClass}
                placeholder="Warehouse manager"
              />
            </Field>
            <Field label="Contact Phone">
              <input
                value={form.contactPhone ?? ""}
                onChange={(event) => updateField("contactPhone", event.target.value)}
                className={inputClass}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field label="Contact Email">
              <input
                type="email"
                value={form.contactEmail ?? ""}
                onChange={(event) => updateField("contactEmail", event.target.value)}
                className={inputClass}
                placeholder="warehouse@example.com"
              />
            </Field>
            <div className="flex items-end">
              <label className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Active warehouse
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateField("active", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  value={form.notes ?? ""}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className={`${inputClass} min-h-24 resize-y`}
                  placeholder="Operational notes, gate timing, storage constraints"
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {warehouse ? "Save Changes" : "Add Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function DeleteDialog({
  warehouse,
  isLoading,
  onClose,
  onConfirm,
}: {
  warehouse: Warehouse | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!warehouse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close delete dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Delete warehouse?</h3>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{warehouse.name}</span> will be removed from the warehouse master.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryWarehousesPage() {
  const [filter, setFilter] = useState<WarehouseFilter>(defaultFilter);
  const [addOpen, setAddOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);

  const warehousesQuery = useWarehouses(filter);
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();

  const warehouses = useMemo(() => warehousesQuery.data?.data ?? [], [warehousesQuery.data?.data]);
  const pageData = warehousesQuery.data;

  const summary = useMemo(() => {
    return warehouses.reduce(
      (current, warehouse) => {
        current.active += warehouse.active ? 1 : 0;
        current.inactive += warehouse.active ? 0 : 1;
        current.capacity += Number(warehouse.capacity ?? 0);
        return current;
      },
      { active: 0, inactive: 0, capacity: 0 }
    );
  }, [warehouses]);

  function handleCreate(data: WarehouseFormData) {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Warehouse created.");
        setAddOpen(false);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to create warehouse."));
      },
    });
  }

  function handleUpdate(data: WarehouseFormData) {
    if (!editWarehouse) return;
    updateMutation.mutate(
      { id: editWarehouse.id, data },
      {
        onSuccess: () => {
          toast.success("Warehouse updated.");
          setEditWarehouse(null);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to update warehouse."));
        },
      }
    );
  }

  function handleDelete() {
    if (!deleteWarehouse) return;
    deleteMutation.mutate(deleteWarehouse.id, {
      onSuccess: () => {
        toast.success("Warehouse deleted.");
        setDeleteWarehouse(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to delete warehouse."));
      },
    });
  }

  return (
    <>
      <InventoryLayout
        title="Warehouses"
        description="Manage inventory storage locations, operating contacts, and active warehouse capacity."
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse
          </button>
        }
      >
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Warehouse Master</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep each physical storage location discoverable for receiving, staging, and dispatch teams.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Warehouses" value={formatNumber(pageData?.total ?? warehouses.length)} />
                <MetricTile label="Visible Active" value={formatNumber(summary.active)} tone="success" />
                <MetricTile label="Visible Inactive" value={formatNumber(summary.inactive)} tone="muted" />
                <MetricTile label="Visible Capacity" value={formatNumber(summary.capacity)} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filter.search}
                  onChange={(event) =>
                    setFilter((current) => ({ ...current, search: event.target.value, page: 1 }))
                  }
                  placeholder="Search by code, name, city, manager, or contact"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <select
                value={filter.status}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    status: event.target.value as WarehouseStatusFilter,
                    page: 1,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="ALL">All Warehouses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {warehousesQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : warehousesQuery.isError ? (
              <div className="p-6 text-sm text-rose-600">
                {getApiErrorMessage(warehousesQuery.error, "Failed to load warehouses.")}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        {["Warehouse", "Location", "Manager", "Capacity", "Status", "Updated", "Actions"].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.length ? (
                        warehouses.map((warehouse) => (
                          <tr key={warehouse.id} className="border-b border-slate-100 align-top">
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                  <WarehouseIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{warehouse.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">{warehouse.code}</p>
                                  <p className="mt-1 text-xs text-slate-400">{display(warehouse.type)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {[warehouse.city, warehouse.state].filter(Boolean).join(", ")}
                                  </p>
                                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                    {display(warehouse.addressLine1)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                  <p className="font-medium text-slate-800">{display(warehouse.managerName)}</p>
                                  <p className="mt-1 text-xs text-slate-500">{display(warehouse.contactPhone)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {formatNumber(Number(warehouse.capacity ?? 0))}
                            </td>
                            <td className="px-5 py-4">
                              <WarehouseStatusBadge active={warehouse.active} />
                            </td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(warehouse.updatedAt)}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <IconAction label={`Edit ${warehouse.name}`} onClick={() => setEditWarehouse(warehouse)}>
                                  <Pencil className="h-4 w-4" />
                                </IconAction>
                                <IconAction
                                  label={`Delete ${warehouse.name}`}
                                  tone="danger"
                                  onClick={() => setDeleteWarehouse(warehouse)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconAction>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">
                            No warehouses matched your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {pageData ? (
                  <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-900">
                        {pageData.total ? (pageData.page - 1) * pageData.pageSize + 1 : 0}-
                        {Math.min(pageData.page * pageData.pageSize, pageData.total)}
                      </span>{" "}
                      of <span className="font-semibold text-slate-900">{pageData.total}</span> warehouses
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={filter.page === 1}
                        onClick={() => setFilter((current) => ({ ...current, page: current.page - 1 }))}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        Page {pageData.page} of {Math.max(pageData.totalPages, 1)}
                      </span>
                      <button
                        type="button"
                        disabled={filter.page >= pageData.totalPages}
                        onClick={() => setFilter((current) => ({ ...current, page: current.page + 1 }))}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </InventoryLayout>

      {addOpen ? (
        <WarehouseDialog
          onClose={() => setAddOpen(false)}
          onSave={handleCreate}
          isLoading={createMutation.isPending}
        />
      ) : null}
      {editWarehouse ? (
        <WarehouseDialog
          key={editWarehouse.id}
          warehouse={editWarehouse}
          onClose={() => setEditWarehouse(null)}
          onSave={handleUpdate}
          isLoading={updateMutation.isPending}
        />
      ) : null}
      <DeleteDialog
        warehouse={deleteWarehouse}
        onClose={() => setDeleteWarehouse(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from "@/modules/purchases/hooks";
import type { CreateVendorPayload, UpdateVendorPayload, Vendor } from "@/modules/purchases/types";
import { P2PCard, P2PLayout } from "../components";

const emptyVendorForm: CreateVendorPayload = {
  vendorCode: "",
  vendorName: "",
  email: "",
  phone: "",
  taxIdentifier: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

function VendorDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: CreateVendorPayload;
  onClose: () => void;
  onSave: (payload: CreateVendorPayload | UpdateVendorPayload) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<CreateVendorPayload>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {mode === "create" ? "Add Vendor" : "Edit Vendor"}
            </h3>
            <p className="text-sm text-slate-500">Keep vendor master data aligned with procurement operations.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            value={form.vendorCode}
            disabled={mode === "edit"}
            onChange={(event) => setForm((current) => ({ ...current, vendorCode: event.target.value }))}
            placeholder="Vendor code"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <input
            value={form.vendorName}
            onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))}
            placeholder="Vendor name"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Phone"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.taxIdentifier}
            onChange={(event) => setForm((current) => ({ ...current, taxIdentifier: event.target.value }))}
            placeholder="Tax ID"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            placeholder="City"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.state}
            onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
            placeholder="State"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            placeholder="Country"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.addressLine1}
            onChange={(event) => setForm((current) => ({ ...current, addressLine1: event.target.value }))}
            placeholder="Address line 1"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={form.addressLine2}
            onChange={(event) => setForm((current) => ({ ...current, addressLine2: event.target.value }))}
            placeholder="Address line 2"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={form.postalCode}
            onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
            placeholder="Postal code"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
            Cancel
          </button>
          <button
            onClick={() => onSave(mode === "create" ? form : { ...form, vendorCode: undefined } as UpdateVendorPayload)}
            disabled={isLoading || !form.vendorName.trim() || !form.vendorCode.trim() && mode === "create"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create Vendor" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function P2PVendorEvaluationPage() {
  const { data: vendors = [], isLoading, isError, error } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) =>
      [vendor.vendorName, vendor.vendorCode, vendor.email, vendor.city, vendor.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [vendors, search]);

  useEffect(() => {
    if (filteredVendors.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredVendors.some((vendor) => vendor.id === selectedId)) {
      setSelectedId(filteredVendors[0].id);
    }
  }, [filteredVendors, selectedId]);

  const selectedVendor = filteredVendors.find((vendor) => vendor.id === selectedId) ?? null;

  const dialogInitial = dialogMode === "edit" && selectedVendor
    ? {
        vendorCode: selectedVendor.vendorCode,
        vendorName: selectedVendor.vendorName,
        email: selectedVendor.email ?? "",
        phone: selectedVendor.phone ?? "",
        taxIdentifier: selectedVendor.taxIdentifier ?? "",
        addressLine1: selectedVendor.addressLine1 ?? "",
        addressLine2: selectedVendor.addressLine2 ?? "",
        city: selectedVendor.city ?? "",
        state: selectedVendor.state ?? "",
        country: selectedVendor.country ?? "",
        postalCode: selectedVendor.postalCode ?? "",
      }
    : emptyVendorForm;

  function handleSave(payload: CreateVendorPayload | UpdateVendorPayload) {
    if (dialogMode === "edit" && selectedVendor) {
      updateVendor.mutate(
        { id: selectedVendor.id, payload: payload as UpdateVendorPayload },
        { onSuccess: () => setDialogMode(null) }
      );
      return;
    }
    createVendor.mutate(payload as CreateVendorPayload, { onSuccess: () => setDialogMode(null) });
  }

  return (
    <P2PLayout
      title="Vendor Management"
      subtitle="Manage approved suppliers and keep vendor master data in sync with procurement."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <P2PCard
          title="Vendor Directory"
          description="Search, create, and maintain vendor records."
          action={
            <button
              type="button"
              onClick={() => setDialogMode("create")}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20"
            >
              <Plus className="h-4 w-4" />
              New Vendor
            </button>
          }
        >
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor name, code, or city..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading vendors...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">
              {error instanceof Error ? error.message : "Failed to load vendors."}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No vendors found.</div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => setSelectedId(vendor.id)}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left ${selectedId === vendor.id ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{vendor.vendorName}</p>
                    <p className="text-xs text-slate-500">{vendor.vendorCode} · {vendor.city || "Location pending"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </P2PCard>

        <P2PCard title="Vendor Profile" description="Review the selected supplier record.">
          {selectedVendor ? (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{selectedVendor.vendorName}</p>
                <p className="text-sm text-slate-500">{selectedVendor.vendorCode}</p>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Email:</span> {selectedVendor.email || "-"}</p>
                <p><span className="text-slate-500">Phone:</span> {selectedVendor.phone || "-"}</p>
                <p><span className="text-slate-500">Tax ID:</span> {selectedVendor.taxIdentifier || "-"}</p>
                <p>
                  <span className="text-slate-500">Address:</span>{" "}
                  {[selectedVendor.addressLine1, selectedVendor.addressLine2, selectedVendor.city, selectedVendor.state, selectedVendor.country, selectedVendor.postalCode]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDialogMode("edit")}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteVendor.mutate(selectedVendor.id)}
                  disabled={deleteVendor.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {deleteVendor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
              {deleteVendor.error instanceof Error ? (
                <p className="text-sm text-rose-600">{deleteVendor.error.message}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a vendor to review details.</p>
          )}
        </P2PCard>
      </div>

      <VendorDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        initial={dialogInitial}
        onClose={() => setDialogMode(null)}
        onSave={handleSave}
        isLoading={dialogMode === "edit" ? updateVendor.isPending : createVendor.isPending}
      />
    </P2PLayout>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  Download,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { fetchVendorDocumentContent } from "@/modules/purchases/api";
import {
  useCreateVendor,
  useDeleteVendor,
  useDeleteVendorDocument,
  useUpdateVendor,
  useUploadVendorDocument,
  useVendorDocuments,
  useVendors,
} from "@/modules/purchases/hooks";
import type { CreateVendorPayload, Vendor, VendorDocument } from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PTable } from "../components";

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

type PendingVendorDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  objectUrl: string;
};

type PreviewState = {
  title: string;
  contentType?: string | null;
  url: string;
  source: "remote" | "local";
};

type VendorEditorMode = "create" | "edit";

function fieldShellClass(disabled = false) {
  return `w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 transition focus:outline-none ${
    disabled
      ? "border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-slate-50/80 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
  }`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPreviewKind(contentType?: string | null, fileName?: string) {
  const normalized = (contentType ?? "").toLowerCase();
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized === "application/pdf" || extension === "pdf") return "pdf";
  if (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("csv") ||
    extension === "txt" ||
    extension === "csv" ||
    extension === "json" ||
    extension === "xml"
  ) {
    return "text";
  }
  return "unsupported";
}

function VendorStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          {sub ? <p className="text-[11px] text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewModal({
  preview,
  onClose,
}: {
  preview: PreviewState;
  onClose: () => void;
}) {
  const previewKind = getPreviewKind(preview.contentType, preview.title);
  const [textContent, setTextContent] = useState("");

  useEffect(() => {
    if (previewKind !== "text") {
      setTextContent("");
      return;
    }
    let cancelled = false;
    fetch(preview.url)
      .then((response) => response.text())
      .then((content) => {
        if (!cancelled) setTextContent(content);
      })
      .catch(() => {
        if (!cancelled) setTextContent("Unable to preview this text document.");
      });
    return () => {
      cancelled = true;
    };
  }, [preview.url, previewKind]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Vendor Document Preview</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{preview.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const link = document.createElement("a");
                link.href = preview.url;
                link.download = preview.title;
                link.click();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          {previewKind === "image" ? (
            <div className="flex h-full items-center justify-center">
              <img
                src={preview.url}
                alt={preview.title}
                className="max-h-full max-w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            </div>
          ) : previewKind === "pdf" ? (
            <iframe
              src={preview.url}
              title={preview.title}
              className="h-full w-full rounded-2xl border border-slate-200 bg-white"
            />
          ) : previewKind === "text" ? (
            <pre className="h-full overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {textContent || "Loading preview..."}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
              <FileText className="h-10 w-10 text-slate-400" />
              <p className="mt-4 text-base font-semibold text-slate-900">Preview not available for this file type.</p>
              <p className="mt-2 text-sm text-slate-500">
                Use Download to open the document in its native application.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentList({
  persistedDocuments,
  pendingDocuments,
  onPreviewPersisted,
  onPreviewPending,
  onRemovePersisted,
  onRemovePending,
}: {
  persistedDocuments: VendorDocument[];
  pendingDocuments: PendingVendorDocument[];
  onPreviewPersisted: (document: VendorDocument) => void;
  onPreviewPending: (document: PendingVendorDocument) => void;
  onRemovePersisted?: (documentId: string) => void;
  onRemovePending?: (documentId: string) => void;
}) {
  if (persistedDocuments.length === 0 && pendingDocuments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No vendor documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {persistedDocuments.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{document.fileName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatFileSize(document.fileSize)} · Added {formatDate(document.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreviewPersisted(document)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-3.5 w-3.5" />
              Preview
            </button>
            {onRemovePersisted ? (
              <button
                type="button"
                onClick={() => onRemovePersisted(document.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {pendingDocuments.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{document.name}</p>
            <p className="mt-1 text-xs text-slate-500">{formatFileSize(document.size)} · Pending upload</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreviewPending(document)}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Preview
            </button>
            {onRemovePending ? (
              <button
                type="button"
                onClick={() => onRemovePending(document.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function VendorEditorPanel({
  mode,
  form,
  persistedDocuments,
  pendingDocuments,
  isLoading,
  errorMessage,
  onClose,
  onFormChange,
  onDocumentsSelected,
  onRemovePersistedDocument,
  onRemovePendingDocument,
  onPreviewPersistedDocument,
  onPreviewPendingDocument,
  onSave,
}: {
  mode: VendorEditorMode;
  form: CreateVendorPayload;
  persistedDocuments: VendorDocument[];
  pendingDocuments: PendingVendorDocument[];
  isLoading: boolean;
  errorMessage?: string;
  onClose: () => void;
  onFormChange: (value: CreateVendorPayload) => void;
  onDocumentsSelected: (files: FileList | null) => void;
  onRemovePersistedDocument: (documentId: string) => void;
  onRemovePendingDocument: (documentId: string) => void;
  onPreviewPersistedDocument: (document: VendorDocument) => void;
  onPreviewPendingDocument: (document: PendingVendorDocument) => void;
  onSave: () => void;
}) {
  const updateField = <K extends keyof CreateVendorPayload>(key: K, value: CreateVendorPayload[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[50vw] lg:max-w-[860px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Vendor Management</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {mode === "create" ? "Create Vendor" : "Update Vendor"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture supplier master data, tax details, and supporting documents in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-2">
            <P2PFormField label="Vendor Code" hint="Unique supplier reference code.">
              <input
                value={form.vendorCode}
                disabled={mode === "edit"}
                onChange={(event) => updateField("vendorCode", event.target.value)}
                placeholder="VEN-001"
                className={fieldShellClass(mode === "edit")}
              />
            </P2PFormField>
            <P2PFormField label="Vendor Name" hint="Primary supplier name.">
              <input
                value={form.vendorName}
                onChange={(event) => updateField("vendorName", event.target.value)}
                placeholder="Dell Technologies"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="Email" hint="Commercial or accounts contact.">
              <input
                value={form.email ?? ""}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="vendor@example.com"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="Phone" hint="Primary phone number.">
              <input
                value={form.phone ?? ""}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+91 9876543210"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="GST / Tax Identifier" hint="Registration identifier for compliance.">
              <input
                value={form.taxIdentifier ?? ""}
                onChange={(event) => updateField("taxIdentifier", event.target.value)}
                placeholder="36ABCDE1234F1Z5"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="Postal Code" hint="Registered postal code.">
              <input
                value={form.postalCode ?? ""}
                onChange={(event) => updateField("postalCode", event.target.value)}
                placeholder="500081"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <div className="md:col-span-2">
              <P2PFormField label="Address Line 1" hint="Registered business address.">
                <input
                  value={form.addressLine1 ?? ""}
                  onChange={(event) => updateField("addressLine1", event.target.value)}
                  placeholder="Level 7, Business Park Road"
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
            <div className="md:col-span-2">
              <P2PFormField label="Address Line 2" hint="Optional suite, landmark, or floor details.">
                <input
                  value={form.addressLine2 ?? ""}
                  onChange={(event) => updateField("addressLine2", event.target.value)}
                  placeholder="Madhapur"
                  className={fieldShellClass()}
                />
              </P2PFormField>
            </div>
            <P2PFormField label="City">
              <input
                value={form.city ?? ""}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="Hyderabad"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="State">
              <input
                value={form.state ?? ""}
                onChange={(event) => updateField("state", event.target.value)}
                placeholder="Telangana"
                className={fieldShellClass()}
              />
            </P2PFormField>
            <P2PFormField label="Country">
              <input
                value={form.country ?? ""}
                onChange={(event) => updateField("country", event.target.value)}
                placeholder="India"
                className={fieldShellClass()}
              />
            </P2PFormField>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Vendor Documents</h3>
                <p className="text-xs text-slate-500">
                  Upload compliance certificates, agreements, GST registration, or banking forms.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                Upload Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => onDocumentsSelected(event.target.files)}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
              Upload PDF, image, or text documents. Files are stored against this vendor and can be previewed in-app.
            </div>

            <div className="mt-4">
              <DocumentList
                persistedDocuments={persistedDocuments}
                pendingDocuments={pendingDocuments}
                onPreviewPersisted={onPreviewPersistedDocument}
                onPreviewPending={onPreviewPendingDocument}
                onRemovePersisted={onRemovePersistedDocument}
                onRemovePending={onRemovePendingDocument}
              />
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!form.vendorCode.trim() || !form.vendorName.trim() || isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {mode === "create" ? "Create Vendor" : "Save Changes"}
            </button>
          </div>
          {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

function VendorDetailPanel({
  vendor,
  documents,
  isDocumentsLoading,
  isDeleting,
  deleteError,
  onClose,
  onEdit,
  onPreviewDocument,
  onDeleteDocument,
  onDeleteVendor,
}: {
  vendor: Vendor;
  documents: VendorDocument[];
  isDocumentsLoading: boolean;
  isDeleting: boolean;
  deleteError?: string;
  onClose: () => void;
  onEdit: () => void;
  onPreviewDocument: (document: VendorDocument) => void;
  onDeleteDocument: (documentId: string) => void;
  onDeleteVendor: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[84vw] lg:w-[46vw] lg:max-w-[780px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Vendor Record</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{vendor.vendorName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {vendor.vendorCode} · {vendor.taxIdentifier || "Tax ID pending"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{vendor.email || "Not available"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{vendor.phone || "Not available"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>
                    {[vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.country, vendor.postalCode]
                      .filter(Boolean)
                      .join(", ") || "Address not available"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profile</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">Vendor Code</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.vendorCode}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">Tax Identifier</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.taxIdentifier || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(vendor.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">Last Updated</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(vendor.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</p>
                <p className="mt-1 text-sm text-slate-500">Open compliance files, agreements, and vendor paperwork.</p>
              </div>
            </div>
            <div className="mt-4">
              {isDocumentsLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm text-slate-500">Loading documents...</p>
                </div>
              ) : (
                <DocumentList
                  persistedDocuments={documents}
                  pendingDocuments={[]}
                  onPreviewPersisted={onPreviewDocument}
                  onPreviewPending={() => undefined}
                  onRemovePersisted={onDeleteDocument}
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onDeleteVendor}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Vendor
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Vendor
            </button>
          </div>
          {deleteError ? <p className="mt-3 text-sm text-rose-600">{deleteError}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function VendorManagementPage() {
  const { data: vendors = [], isLoading, isError, error } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const uploadVendorDocument = useUploadVendorDocument();
  const deleteVendorDocument = useDeleteVendorDocument();

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<VendorEditorMode>("create");
  const [vendorForm, setVendorForm] = useState<CreateVendorPayload>(emptyVendorForm);
  const [queueSearch, setQueueSearch] = useState("");
  const [pendingDocuments, setPendingDocuments] = useState<PendingVendorDocument[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [vendors, selectedVendorId]
  );

  const { data: selectedVendorDocuments = [], isLoading: isDocumentsLoading } = useVendorDocuments(
    selectedVendorId ?? undefined
  );

  const visiblePersistedDocuments = useMemo(
    () => selectedVendorDocuments.filter((document) => !removedDocumentIds.includes(document.id)),
    [removedDocumentIds, selectedVendorDocuments]
  );

  const filteredVendors = useMemo(() => {
    const term = queueSearch.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((vendor) =>
      [
        vendor.vendorCode,
        vendor.vendorName,
        vendor.email,
        vendor.phone,
        vendor.city,
        vendor.state,
        vendor.country,
        vendor.taxIdentifier,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [queueSearch, vendors]);

  const queueStats = useMemo(
    () => ({
      total: vendors.length,
      activeCities: new Set(vendors.map((vendor) => vendor.city).filter(Boolean)).size,
      withEmail: vendors.filter((vendor) => vendor.email).length,
      withTax: vendors.filter((vendor) => vendor.taxIdentifier).length,
    }),
    [vendors]
  );

  const vendorMutationError =
    (createVendor.error instanceof Error && createVendor.error.message) ||
    (updateVendor.error instanceof Error && updateVendor.error.message) ||
    (deleteVendor.error instanceof Error && deleteVendor.error.message) ||
    undefined;

  const documentMutationError =
    (uploadVendorDocument.error instanceof Error && uploadVendorDocument.error.message) ||
    (deleteVendorDocument.error instanceof Error && deleteVendorDocument.error.message) ||
    undefined;

  useEffect(() => {
    return () => {
      pendingDocuments.forEach((document) => URL.revokeObjectURL(document.objectUrl));
      if (preview?.source === "remote") {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [pendingDocuments, preview]);

  useEffect(() => {
    if (!previewError) return undefined;
    const timer = window.setTimeout(() => setPreviewError(null), 3200);
    return () => window.clearTimeout(timer);
  }, [previewError]);

  function resetEditorState() {
    pendingDocuments.forEach((document) => URL.revokeObjectURL(document.objectUrl));
    setPendingDocuments([]);
    setRemovedDocumentIds([]);
    setVendorForm(emptyVendorForm);
  }

  function openCreatePanel() {
    resetEditorState();
    setEditorMode("create");
    setIsEditorOpen(true);
  }

  function openEditPanel(vendor: Vendor) {
    resetEditorState();
    setEditorMode("edit");
    setSelectedVendorId(vendor.id);
    setVendorForm({
      vendorCode: vendor.vendorCode,
      vendorName: vendor.vendorName,
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      taxIdentifier: vendor.taxIdentifier ?? "",
      addressLine1: vendor.addressLine1 ?? "",
      addressLine2: vendor.addressLine2 ?? "",
      city: vendor.city ?? "",
      state: vendor.state ?? "",
      country: vendor.country ?? "",
      postalCode: vendor.postalCode ?? "",
    });
    setIsEditorOpen(true);
  }

  function handleDocumentsSelected(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      objectUrl: URL.createObjectURL(file),
    }));
    setPendingDocuments((current) => [...current, ...next]);
  }

  function closePreview() {
    setPreview((current) => {
      if (current?.source === "remote") {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }

  async function previewPersistedDocument(document: VendorDocument) {
    if (!selectedVendor) return;
    try {
      closePreview();
      const blob = await fetchVendorDocumentContent(selectedVendor.id, document.id);
      const url = URL.createObjectURL(blob);
      setPreview({
        title: document.fileName,
        contentType: document.contentType,
        url,
        source: "remote",
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to preview vendor document.");
    }
  }

  function previewPendingDocument(document: PendingVendorDocument) {
    closePreview();
    setPreview({
      title: document.name,
      contentType: document.type,
      url: document.objectUrl,
      source: "local",
    });
  }

  async function handleSaveVendor() {
    try {
      const payload = {
        ...vendorForm,
        vendorCode: vendorForm.vendorCode.trim(),
        vendorName: vendorForm.vendorName.trim(),
        email: vendorForm.email?.trim() || "",
        phone: vendorForm.phone?.trim() || "",
        taxIdentifier: vendorForm.taxIdentifier?.trim() || "",
        addressLine1: vendorForm.addressLine1?.trim() || "",
        addressLine2: vendorForm.addressLine2?.trim() || "",
        city: vendorForm.city?.trim() || "",
        state: vendorForm.state?.trim() || "",
        country: vendorForm.country?.trim() || "",
        postalCode: vendorForm.postalCode?.trim() || "",
      };

      let savedVendor: Vendor;

      if (editorMode === "edit" && selectedVendor) {
        savedVendor = await updateVendor.mutateAsync({
          id: selectedVendor.id,
          payload: {
            vendorName: payload.vendorName,
            email: payload.email,
            phone: payload.phone,
            taxIdentifier: payload.taxIdentifier,
            addressLine1: payload.addressLine1,
            addressLine2: payload.addressLine2,
            city: payload.city,
            state: payload.state,
            country: payload.country,
            postalCode: payload.postalCode,
          },
        });

        for (const documentId of removedDocumentIds) {
          await deleteVendorDocument.mutateAsync({ vendorId: savedVendor.id, documentId });
        }
      } else {
        savedVendor = await createVendor.mutateAsync(payload);
      }

      for (const document of pendingDocuments) {
        await uploadVendorDocument.mutateAsync({ vendorId: savedVendor.id, file: document.file });
      }

      setSelectedVendorId(savedVendor.id);
      setIsEditorOpen(false);
      resetEditorState();
    } catch {
      // mutation hooks expose the UI error text
    }
  }

  const columns = [
    { key: "vendorCode", label: "Vendor Code" },
    { key: "vendorName", label: "Vendor Name" },
    { key: "location", label: "Location" },
    { key: "contact", label: "Contact" },
  ];

  const rows = filteredVendors.map((vendor) => ({
    id: vendor.id,
    vendorCode: <span className="font-semibold text-slate-900">{vendor.vendorCode}</span>,
    vendorName: (
      <div className="text-left">
        <p className="font-semibold text-slate-900">{vendor.vendorName}</p>
        <p className="text-xs text-slate-500">{vendor.taxIdentifier || "Tax ID pending"}</p>
      </div>
    ),
    location: [vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ") || "-",
    contact: (
      <div className="text-left">
        <p className="text-sm text-slate-700">{vendor.email || "-"}</p>
        <p className="text-xs text-slate-500">{vendor.phone || "-"}</p>
      </div>
    ),
  }));

  return (
    <>
      <P2PLayout
        title="Vendor Management"
        subtitle="Search the supplier directory, open any vendor in a detail panel, and manage compliance documents with in-app preview."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={openCreatePanel}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Vendor
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <VendorStat
            label="Vendors"
            value={queueStats.total}
            sub="supplier master records"
            icon={<Building2 className="h-4.5 w-4.5 text-blue-700" />}
            accent="bg-blue-100"
          />
          <VendorStat
            label="Cities Covered"
            value={queueStats.activeCities}
            sub="active supply locations"
            icon={<MapPin className="h-4.5 w-4.5 text-emerald-700" />}
            accent="bg-emerald-100"
          />
          <VendorStat
            label="Email On File"
            value={queueStats.withEmail}
            sub="contact-ready vendors"
            icon={<Mail className="h-4.5 w-4.5 text-amber-700" />}
            accent="bg-amber-100"
          />
          <VendorStat
            label="Tax Registered"
            value={queueStats.withTax}
            sub="GST / tax data captured"
            icon={<Globe2 className="h-4.5 w-4.5 text-violet-700" />}
            accent="bg-violet-100"
          />
        </div>

        <P2PCard
          title="Vendor Directory"
          description="Search the directory, open vendor details in a side panel, and keep records updated without leaving the page."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Vendor documents are now stored in procurement-service
            </div>
            <div className="relative w-full lg:mr-2 lg:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search vendor, code, city..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-900">No vendors match this view.</p>
              <p className="mt-2 text-sm text-slate-500">
                Adjust the search term or create a new vendor from the panel.
              </p>
            </div>
          ) : (
            <P2PTable
              columns={columns}
              rows={rows}
              className="rounded-none border-x-0 border-b-0"
              onRowClick={(rowId) => setSelectedVendorId(rowId)}
            />
          )}
        </P2PCard>
      </P2PLayout>

      {previewError ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-600 shadow-lg">
          {previewError}
        </div>
      ) : null}

      {selectedVendor ? (
        <VendorDetailPanel
          vendor={selectedVendor}
          documents={selectedVendorDocuments}
          isDocumentsLoading={isDocumentsLoading}
          isDeleting={deleteVendor.isPending || deleteVendorDocument.isPending}
          deleteError={deleteVendor.error instanceof Error ? deleteVendor.error.message : documentMutationError}
          onClose={() => setSelectedVendorId(null)}
          onEdit={() => openEditPanel(selectedVendor)}
          onPreviewDocument={previewPersistedDocument}
          onDeleteDocument={(documentId) => {
            deleteVendorDocument.mutate({ vendorId: selectedVendor.id, documentId });
          }}
          onDeleteVendor={() => {
            deleteVendor.mutate(selectedVendor.id, { onSuccess: () => setSelectedVendorId(null) });
          }}
        />
      ) : null}

      {isEditorOpen ? (
        <VendorEditorPanel
          mode={editorMode}
          form={vendorForm}
          persistedDocuments={editorMode === "edit" ? visiblePersistedDocuments : []}
          pendingDocuments={pendingDocuments}
          isLoading={
            createVendor.isPending ||
            updateVendor.isPending ||
            uploadVendorDocument.isPending ||
            deleteVendorDocument.isPending
          }
          errorMessage={vendorMutationError ?? documentMutationError}
          onClose={() => {
            setIsEditorOpen(false);
            resetEditorState();
          }}
          onFormChange={setVendorForm}
          onDocumentsSelected={handleDocumentsSelected}
          onRemovePersistedDocument={(documentId) =>
            setRemovedDocumentIds((current) =>
              current.includes(documentId) ? current : [...current, documentId]
            )
          }
          onRemovePendingDocument={(documentId) =>
            setPendingDocuments((current) => {
              const target = current.find((document) => document.id === documentId);
              if (target) URL.revokeObjectURL(target.objectUrl);
              return current.filter((document) => document.id !== documentId);
            })
          }
          onPreviewPersistedDocument={previewPersistedDocument}
          onPreviewPendingDocument={previewPendingDocument}
          onSave={handleSaveVendor}
        />
      ) : null}

      {preview ? <DocumentPreviewModal preview={preview} onClose={closePreview} /> : null}
    </>
  );
}

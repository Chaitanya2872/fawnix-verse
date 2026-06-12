import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import type {
  CreateVendorPayload,
  Vendor,
  VendorAccountType,
  VendorAddress,
  VendorBankAccount,
  VendorContactPerson,
  VendorDocument,
  VendorStatus,
} from "@/modules/purchases/types";
import { P2PCard, P2PFormField, P2PLayout, P2PTable } from "../components";

const DRAFT_KEY = "fawnix.p2p.vendor.draft";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

type VendorForm = CreateVendorPayload & {
  vendorCode?: string;
  sameAsBilling: boolean;
};

type VendorFormErrors = Record<string, string>;
type VendorEditorMode = "create" | "edit";

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

const vendorTypeOptions = ["Manufacturer", "Distributor", "Service Provider", "Consultant", "Contractor"];
const salutationOptions = ["Mr.", "Ms.", "Mrs.", "Dr.", "Mx."];
const vendorLanguageOptions = ["English", "Hindi", "Tamil", "Telugu", "Kannada"];
const accountTypeOptions: VendorAccountType[] = ["CURRENT", "SAVINGS", "OVERDRAFT", "CASH_CREDIT", "OTHER"];
const statusOptions: VendorStatus[] = ["ACTIVE", "INACTIVE"];

function createEmptyAddress(type: "BILLING" | "SHIPPING", label: string, primaryAddress = true): VendorAddress {
  return {
    addressType: type,
    label,
    attention: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    primaryAddress,
  };
}

function createEmptyContact(primaryContact = true): VendorContactPerson {
  return {
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    skypeName: "",
    designation: "",
    department: "",
    primaryContact,
  };
}

function createEmptyBank(primaryAccount = true): VendorBankAccount {
  return {
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    branchName: "",
    upiId: "",
    accountType: "CURRENT",
    primaryAccount,
  };
}

function createEmptyVendorForm(): VendorForm {
  return {
    vendorCode: "Auto generated",
    vendorType: "",
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    phone: "",
    workPhone: "",
    mobile: "",
    vendorLanguage: "English",
    gstNumber: "",
    panNumber: "",
    website: "",
    status: "ACTIVE",
    remarks: "",
    billingAddress: createEmptyAddress("BILLING", "Billing Address"),
    shippingAddresses: [createEmptyAddress("SHIPPING", "Primary Shipping", true)],
    contactPersons: [createEmptyContact(true)],
    bankAccounts: [createEmptyBank(true)],
    sameAsBilling: true,
  };
}

function cloneAddress(source?: VendorAddress | null, fallbackLabel = "Shipping Address"): VendorAddress {
  return {
    id: source?.id,
    addressType: source?.addressType ?? "SHIPPING",
    label: source?.label ?? fallbackLabel,
    attention: source?.attention ?? "",
    addressLine1: source?.addressLine1 ?? "",
    addressLine2: source?.addressLine2 ?? "",
    city: source?.city ?? "",
    state: source?.state ?? "",
    country: source?.country ?? "India",
    postalCode: source?.postalCode ?? "",
    primaryAddress: source?.primaryAddress ?? true,
  };
}

function deriveSameAsBilling(vendor: Vendor) {
  const billing = vendor.billingAddress;
  const shipping = vendor.shippingAddresses[0];
  if (!billing || !shipping) return false;
  return (
    billing.attention === shipping.attention &&
    billing.addressLine1 === shipping.addressLine1 &&
    billing.addressLine2 === shipping.addressLine2 &&
    billing.city === shipping.city &&
    billing.state === shipping.state &&
    billing.country === shipping.country &&
    billing.postalCode === shipping.postalCode
  );
}

function mapVendorToForm(vendor: Vendor): VendorForm {
  return {
    vendorCode: vendor.vendorCode,
    vendorType: vendor.vendorType ?? "",
    salutation: vendor.salutation ?? "Mr.",
    firstName: vendor.firstName ?? "",
    lastName: vendor.lastName ?? "",
    companyName: vendor.companyName ?? "",
    displayName: vendor.displayName ?? vendor.vendorName,
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    workPhone: vendor.workPhone ?? "",
    mobile: vendor.mobile ?? "",
    vendorLanguage: vendor.vendorLanguage ?? "English",
    gstNumber: vendor.gstNumber ?? vendor.taxIdentifier ?? "",
    panNumber: vendor.panNumber ?? "",
    website: vendor.website ?? "",
    status: vendor.status ?? "ACTIVE",
    remarks: vendor.remarks ?? "",
    billingAddress: cloneAddress(vendor.billingAddress, "Billing Address"),
    shippingAddresses:
      vendor.shippingAddresses.length > 0
        ? vendor.shippingAddresses.map((address, index) =>
            cloneAddress({ ...address, addressType: "SHIPPING" }, index === 0 ? "Primary Shipping" : `Shipping ${index + 1}`)
          )
        : [createEmptyAddress("SHIPPING", "Primary Shipping", true)],
    contactPersons:
      vendor.contactPersons.length > 0
        ? vendor.contactPersons.map((contact) => ({
            ...contact,
            salutation: contact.salutation ?? "Mr.",
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            email: contact.email ?? "",
            workPhone: contact.workPhone ?? "",
            mobile: contact.mobile ?? "",
            skypeName: contact.skypeName ?? "",
            designation: contact.designation ?? "",
            department: contact.department ?? "",
          }))
        : [createEmptyContact(true)],
    bankAccounts:
      vendor.bankAccounts.length > 0
        ? vendor.bankAccounts.map((account) => ({
            ...account,
            accountNumber: "",
            confirmAccountNumber: "",
            accountType: account.accountType ?? "CURRENT",
          }))
        : [createEmptyBank(true)],
    sameAsBilling: deriveSameAsBilling(vendor),
  };
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function fieldShellClass(hasError = false, disabled = false) {
  return cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition",
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
      : "hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    hasError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200"
  );
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

function sanitizeVendorPayload(form: VendorForm): CreateVendorPayload {
  return {
    vendorType: normalizeOptional(form.vendorType),
    salutation: normalizeOptional(form.salutation),
    firstName: normalizeOptional(form.firstName),
    lastName: normalizeOptional(form.lastName),
    companyName: normalizeOptional(form.companyName),
    displayName: normalizeText(form.displayName),
    email: normalizeOptional(form.email).toLowerCase(),
    phone: normalizeOptional(form.phone),
    workPhone: normalizeOptional(form.workPhone),
    mobile: normalizeOptional(form.mobile).replace(/\s+/g, ""),
    vendorLanguage: normalizeOptional(form.vendorLanguage),
    gstNumber: normalizeOptional(form.gstNumber).toUpperCase(),
    panNumber: normalizeOptional(form.panNumber).toUpperCase(),
    website: normalizeOptional(form.website),
    status: form.status ?? "ACTIVE",
    remarks: normalizeOptional(form.remarks),
    billingAddress: form.billingAddress
      ? {
          addressType: "BILLING",
          label: normalizeOptional(form.billingAddress.label) || "Billing Address",
          attention: normalizeOptional(form.billingAddress.attention),
          addressLine1: normalizeOptional(form.billingAddress.addressLine1),
          addressLine2: normalizeOptional(form.billingAddress.addressLine2),
          city: normalizeOptional(form.billingAddress.city),
          state: normalizeOptional(form.billingAddress.state),
          country: normalizeOptional(form.billingAddress.country),
          postalCode: normalizeOptional(form.billingAddress.postalCode),
          primaryAddress: true,
        }
      : undefined,
    shippingAddresses: (form.shippingAddresses ?? []).map((address, index) => ({
      addressType: "SHIPPING",
      label: normalizeOptional(address.label) || `Shipping ${index + 1}`,
      attention: normalizeOptional(address.attention),
      addressLine1: normalizeOptional(address.addressLine1),
      addressLine2: normalizeOptional(address.addressLine2),
      city: normalizeOptional(address.city),
      state: normalizeOptional(address.state),
      country: normalizeOptional(address.country),
      postalCode: normalizeOptional(address.postalCode),
      primaryAddress: Boolean(address.primaryAddress ?? index === 0),
    })),
    contactPersons: (form.contactPersons ?? []).map((contact, index) => ({
      salutation: normalizeOptional(contact.salutation),
      firstName: normalizeText(contact.firstName),
      lastName: normalizeOptional(contact.lastName),
      email: normalizeOptional(contact.email).toLowerCase(),
      workPhone: normalizeOptional(contact.workPhone),
      mobile: normalizeOptional(contact.mobile).replace(/\s+/g, ""),
      skypeName: normalizeOptional(contact.skypeName),
      designation: normalizeOptional(contact.designation),
      department: normalizeOptional(contact.department),
      primaryContact: Boolean(contact.primaryContact ?? index === 0),
    })),
    bankAccounts: (form.bankAccounts ?? []).map((account, index) => ({
      id: account.id,
      accountHolderName: normalizeText(account.accountHolderName),
      bankName: normalizeText(account.bankName),
      accountNumber: normalizeText(account.accountNumber),
      confirmAccountNumber: normalizeText(account.confirmAccountNumber ?? account.accountNumber),
      ifscCode: normalizeText(account.ifscCode).toUpperCase(),
      branchName: normalizeOptional(account.branchName),
      upiId: normalizeOptional(account.upiId),
      accountType: account.accountType ?? "CURRENT",
      primaryAccount: Boolean(account.primaryAccount ?? index === 0),
    })),
  };
}

function validateVendorForm(form: VendorForm, vendors: Vendor[], activeVendorId?: string | null): VendorFormErrors {
  const errors: VendorFormErrors = {};
  const payload = sanitizeVendorPayload(form);

  if (!payload.displayName) {
    errors.displayName = "Display name is required.";
  }

  if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
    errors.email = "Enter a valid email address.";
  }

  const duplicateEmail = vendors.find(
    (vendor) => vendor.email?.toLowerCase() === payload.email.toLowerCase() && vendor.id !== activeVendorId
  );
  if (payload.email && duplicateEmail) {
    errors.email = "This email is already mapped to another vendor.";
  }

  const duplicateMobile = vendors.find((vendor) => vendor.mobile === payload.mobile && vendor.id !== activeVendorId);
  if (payload.mobile && duplicateMobile) {
    errors.mobile = "This mobile number already exists.";
  }

  if (payload.gstNumber && !GST_PATTERN.test(payload.gstNumber)) {
    errors.gstNumber = "Enter a valid GST number.";
  }

  if (payload.panNumber && !PAN_PATTERN.test(payload.panNumber)) {
    errors.panNumber = "Enter a valid PAN number.";
  }

  if (payload.website && !/^https?:\/\//i.test(payload.website)) {
    errors.website = "Website should start with http:// or https://";
  }

  const primaryContacts = payload.contactPersons?.filter((contact) => contact.primaryContact) ?? [];
  if (primaryContacts.length > 1) {
    errors.contactPersons = "Only one primary contact is allowed.";
  }

  payload.contactPersons?.forEach((contact, index) => {
    if (!contact.firstName) {
      errors[`contactPersons.${index}.firstName`] = "First name is required.";
    }
    if (contact.email && !EMAIL_PATTERN.test(contact.email)) {
      errors[`contactPersons.${index}.email`] = "Enter a valid email.";
    }
  });

  const primaryAccounts = payload.bankAccounts?.filter((account) => account.primaryAccount) ?? [];
  if (primaryAccounts.length > 1) {
    errors.bankAccounts = "Only one primary bank account is allowed.";
  }

  payload.bankAccounts?.forEach((account, index) => {
    if (!account.accountHolderName) {
      errors[`bankAccounts.${index}.accountHolderName`] = "Account holder name is required.";
    }
    if (!account.bankName) {
      errors[`bankAccounts.${index}.bankName`] = "Bank name is required.";
    }
    if (!account.accountNumber) {
      errors[`bankAccounts.${index}.accountNumber`] = "Account number is required.";
    }
    if (account.accountNumber !== account.confirmAccountNumber) {
      errors[`bankAccounts.${index}.confirmAccountNumber`] = "Account numbers do not match.";
    }
    if (!IFSC_PATTERN.test(account.ifscCode)) {
      errors[`bankAccounts.${index}.ifscCode`] = "Enter a valid IFSC code.";
    }
  });

  return errors;
}

function SectionCard({
  title,
  hint,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint: string;
  badge?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{badge}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
      </button>
      {isOpen ? <div className="border-t border-slate-200 px-4 py-4">{children}</div> : null}
    </section>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null;
}

function DocumentPreviewModal({ preview, onClose }: { preview: PreviewState; onClose: () => void }) {
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
        if (!cancelled) setTextContent("Unable to preview this file.");
      });
    return () => {
      cancelled = true;
    };
  }, [preview.url, previewKind]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Document Preview</p>
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
              <img src={preview.url} alt={preview.title} className="max-h-full max-w-full rounded-2xl border border-slate-200 bg-white" />
            </div>
          ) : previewKind === "pdf" ? (
            <iframe src={preview.url} title={preview.title} className="h-full w-full rounded-2xl border border-slate-200 bg-white" />
          ) : previewKind === "text" ? (
            <pre className="h-full overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{textContent || "Loading..."}</pre>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
              Preview is not available for this file type.
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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        No vendor documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {persistedDocuments.map((document) => (
        <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
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
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Preview
            </button>
            {onRemovePersisted ? (
              <button
                type="button"
                onClick={() => onRemovePersisted(document.id)}
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {pendingDocuments.map((document) => (
        <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{document.name}</p>
            <p className="mt-1 text-xs text-slate-500">{formatFileSize(document.size)} · Pending upload</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreviewPending(document)}
              className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Preview
            </button>
            {onRemovePending ? (
              <button
                type="button"
                onClick={() => onRemovePending(document.id)}
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
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
  errors,
  persistedDocuments,
  pendingDocuments,
  isLoading,
  onClose,
  onFormChange,
  onDocumentsSelected,
  onRemovePersistedDocument,
  onRemovePendingDocument,
  onPreviewPersistedDocument,
  onPreviewPendingDocument,
  onSave,
  onDiscardDraft,
}: {
  mode: VendorEditorMode;
  form: VendorForm;
  errors: VendorFormErrors;
  persistedDocuments: VendorDocument[];
  pendingDocuments: PendingVendorDocument[];
  isLoading: boolean;
  onClose: () => void;
  onFormChange: (next: VendorForm) => void;
  onDocumentsSelected: (files: FileList | null) => void;
  onRemovePersistedDocument: (documentId: string) => void;
  onRemovePendingDocument: (documentId: string) => void;
  onPreviewPersistedDocument: (document: VendorDocument) => void;
  onPreviewPendingDocument: (document: PendingVendorDocument) => void;
  onSave: () => void;
  onDiscardDraft: () => void;
}) {
  const updateField = <K extends keyof VendorForm>(key: K, value: VendorForm[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  const updateBillingAddress = <K extends keyof VendorAddress>(key: K, value: VendorAddress[K]) => {
    const billingAddress = { ...(form.billingAddress ?? createEmptyAddress("BILLING", "Billing Address")), [key]: value };
    const next = { ...form, billingAddress };
    if (form.sameAsBilling) {
      next.shippingAddresses = [
        {
          ...cloneAddress(billingAddress, "Primary Shipping"),
          addressType: "SHIPPING",
          label: form.shippingAddresses?.[0]?.label ?? "Primary Shipping",
          primaryAddress: true,
        },
        ...(form.shippingAddresses?.slice(1) ?? []),
      ];
    }
    onFormChange(next);
  };

  const updateShippingAddress = (index: number, nextAddress: VendorAddress) => {
    const shippingAddresses = [...(form.shippingAddresses ?? [])];
    shippingAddresses[index] = nextAddress;
    onFormChange({ ...form, shippingAddresses });
  };

  const setPrimaryContact = (index: number) => {
    onFormChange({
      ...form,
      contactPersons: (form.contactPersons ?? []).map((contact, currentIndex) => ({
        ...contact,
        primaryContact: currentIndex === index,
      })),
    });
  };

  const setPrimaryBank = (index: number) => {
    onFormChange({
      ...form,
      bankAccounts: (form.bankAccounts ?? []).map((account, currentIndex) => ({
        ...account,
        primaryAccount: currentIndex === index,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-slate-50 shadow-2xl sm:w-[92vw] lg:w-[58vw] lg:max-w-[980px]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Vendor Master</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{mode === "create" ? "Create Vendor" : "Edit Vendor"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture supplier profile, compliance, contacts, logistics, and banking details in one flow.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mode === "create" ? (
                <button
                  type="button"
                  onClick={onDiscardDraft}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Discard Draft
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <SectionCard title="Vendor Information" hint="Core master data, statutory numbers, and communication preferences." badge={form.status}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <P2PFormField label="Vendor Code" hint="Generated after save.">
                  <input value={form.vendorCode ?? "Auto generated"} disabled className={fieldShellClass(false, true)} />
                </P2PFormField>
                <P2PFormField label="Vendor Type">
                  <select value={form.vendorType} onChange={(event) => updateField("vendorType", event.target.value)} className={fieldShellClass()}>
                    <option value="">Select type</option>
                    {vendorTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </P2PFormField>
                <P2PFormField label="Status">
                  <select value={form.status} onChange={(event) => updateField("status", event.target.value as VendorStatus)} className={fieldShellClass()}>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </P2PFormField>
                <P2PFormField label="Salutation">
                  <select value={form.salutation} onChange={(event) => updateField("salutation", event.target.value)} className={fieldShellClass()}>
                    {salutationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </P2PFormField>
                <P2PFormField label="First Name">
                  <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Last Name">
                  <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Company Name">
                  <input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <div className="md:col-span-2 xl:col-span-2">
                  <P2PFormField label="Display Name">
                    <input value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} className={fieldShellClass(Boolean(errors.displayName))} />
                    <FieldError error={errors.displayName} />
                  </P2PFormField>
                </div>
                <P2PFormField label="Email Address">
                  <input value={form.email} onChange={(event) => updateField("email", event.target.value)} className={fieldShellClass(Boolean(errors.email))} />
                  <FieldError error={errors.email} />
                </P2PFormField>
                <P2PFormField label="Phone">
                  <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Work Phone">
                  <input value={form.workPhone} onChange={(event) => updateField("workPhone", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Mobile">
                  <input value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} className={fieldShellClass(Boolean(errors.mobile))} />
                  <FieldError error={errors.mobile} />
                </P2PFormField>
                <P2PFormField label="Vendor Language">
                  <select value={form.vendorLanguage} onChange={(event) => updateField("vendorLanguage", event.target.value)} className={fieldShellClass()}>
                    {vendorLanguageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </P2PFormField>
                <P2PFormField label="GST Number">
                  <input value={form.gstNumber} onChange={(event) => updateField("gstNumber", event.target.value.toUpperCase())} className={fieldShellClass(Boolean(errors.gstNumber))} />
                  <FieldError error={errors.gstNumber} />
                </P2PFormField>
                <P2PFormField label="PAN Number">
                  <input value={form.panNumber} onChange={(event) => updateField("panNumber", event.target.value.toUpperCase())} className={fieldShellClass(Boolean(errors.panNumber))} />
                  <FieldError error={errors.panNumber} />
                </P2PFormField>
                <P2PFormField label="Website">
                  <input value={form.website} onChange={(event) => updateField("website", event.target.value)} placeholder="https://example.com" className={fieldShellClass(Boolean(errors.website))} />
                  <FieldError error={errors.website} />
                </P2PFormField>
              </div>
            </SectionCard>

            <SectionCard title="Billing Address" hint="Registered address used for invoices and statutory records.">
              <div className="grid gap-4 md:grid-cols-2">
                <P2PFormField label="Attention">
                  <input value={form.billingAddress?.attention ?? ""} onChange={(event) => updateBillingAddress("attention", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Address Label">
                  <input value={form.billingAddress?.label ?? ""} onChange={(event) => updateBillingAddress("label", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <div className="md:col-span-2">
                  <P2PFormField label="Address Line 1">
                    <input value={form.billingAddress?.addressLine1 ?? ""} onChange={(event) => updateBillingAddress("addressLine1", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                </div>
                <div className="md:col-span-2">
                  <P2PFormField label="Address Line 2">
                    <input value={form.billingAddress?.addressLine2 ?? ""} onChange={(event) => updateBillingAddress("addressLine2", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                </div>
                <P2PFormField label="City">
                  <input value={form.billingAddress?.city ?? ""} onChange={(event) => updateBillingAddress("city", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="State">
                  <input value={form.billingAddress?.state ?? ""} onChange={(event) => updateBillingAddress("state", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Country">
                  <input value={form.billingAddress?.country ?? ""} onChange={(event) => updateBillingAddress("country", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
                <P2PFormField label="Zip Code">
                  <input value={form.billingAddress?.postalCode ?? ""} onChange={(event) => updateBillingAddress("postalCode", event.target.value)} className={fieldShellClass()} />
                </P2PFormField>
              </div>
            </SectionCard>

            <SectionCard title="Shipping Address" hint="Primary logistics address today, extensible to multiple addresses." badge={`${form.shippingAddresses?.length ?? 0}`}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.sameAsBilling}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      const firstShipping = checked
                        ? {
                            ...cloneAddress(form.billingAddress, form.shippingAddresses?.[0]?.label ?? "Primary Shipping"),
                            addressType: "SHIPPING",
                            label: form.shippingAddresses?.[0]?.label ?? "Primary Shipping",
                            primaryAddress: true,
                          }
                        : form.shippingAddresses?.[0] ?? createEmptyAddress("SHIPPING", "Primary Shipping", true);
                      onFormChange({
                        ...form,
                        sameAsBilling: checked,
                        shippingAddresses: [firstShipping, ...(form.shippingAddresses?.slice(1) ?? [])],
                      });
                    }}
                  />
                  Same as billing address
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onFormChange({
                      ...form,
                      shippingAddresses: [
                        ...(form.shippingAddresses ?? []),
                        createEmptyAddress("SHIPPING", `Shipping ${(form.shippingAddresses?.length ?? 0) + 1}`, false),
                      ],
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Shipping Address
                </button>
              </div>
              <div className="space-y-4">
                {(form.shippingAddresses ?? []).map((address, index) => (
                  <div key={`${address.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{address.label || `Shipping ${index + 1}`}</p>
                        <p className="text-xs text-slate-500">{index === 0 ? "Default shipping address" : "Additional shipping address"}</p>
                      </div>
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onFormChange({
                              ...form,
                              shippingAddresses: (form.shippingAddresses ?? []).filter((_, currentIndex) => currentIndex !== index),
                            })
                          }
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <P2PFormField label="Attention">
                        <input
                          value={address.attention ?? ""}
                          disabled={form.sameAsBilling && index === 0}
                          onChange={(event) => updateShippingAddress(index, { ...address, attention: event.target.value })}
                          className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                        />
                      </P2PFormField>
                      <P2PFormField label="Address Label">
                        <input value={address.label ?? ""} onChange={(event) => updateShippingAddress(index, { ...address, label: event.target.value })} className={fieldShellClass()} />
                      </P2PFormField>
                      <div className="md:col-span-2">
                        <P2PFormField label="Address Line 1">
                          <input
                            value={address.addressLine1 ?? ""}
                            disabled={form.sameAsBilling && index === 0}
                            onChange={(event) => updateShippingAddress(index, { ...address, addressLine1: event.target.value })}
                            className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                          />
                        </P2PFormField>
                      </div>
                      <div className="md:col-span-2">
                        <P2PFormField label="Address Line 2">
                          <input
                            value={address.addressLine2 ?? ""}
                            disabled={form.sameAsBilling && index === 0}
                            onChange={(event) => updateShippingAddress(index, { ...address, addressLine2: event.target.value })}
                            className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                          />
                        </P2PFormField>
                      </div>
                      <P2PFormField label="City">
                        <input
                          value={address.city ?? ""}
                          disabled={form.sameAsBilling && index === 0}
                          onChange={(event) => updateShippingAddress(index, { ...address, city: event.target.value })}
                          className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                        />
                      </P2PFormField>
                      <P2PFormField label="State">
                        <input
                          value={address.state ?? ""}
                          disabled={form.sameAsBilling && index === 0}
                          onChange={(event) => updateShippingAddress(index, { ...address, state: event.target.value })}
                          className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                        />
                      </P2PFormField>
                      <P2PFormField label="Country">
                        <input
                          value={address.country ?? ""}
                          disabled={form.sameAsBilling && index === 0}
                          onChange={(event) => updateShippingAddress(index, { ...address, country: event.target.value })}
                          className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                        />
                      </P2PFormField>
                      <P2PFormField label="Zip Code">
                        <input
                          value={address.postalCode ?? ""}
                          disabled={form.sameAsBilling && index === 0}
                          onChange={(event) => updateShippingAddress(index, { ...address, postalCode: event.target.value })}
                          className={fieldShellClass(false, form.sameAsBilling && index === 0)}
                        />
                      </P2PFormField>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Contact Persons" hint="Multiple stakeholders with a single primary point of contact." badge={`${form.contactPersons?.length ?? 0}`}>
              <div className="space-y-4">
                {(form.contactPersons ?? []).map((contact, index) => (
                  <div key={`contact-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <input
                          type="radio"
                          checked={Boolean(contact.primaryContact)}
                          onChange={() => setPrimaryContact(index)}
                        />
                        Primary Contact
                      </label>
                      {(form.contactPersons?.length ?? 0) > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onFormChange({
                              ...form,
                              contactPersons: (form.contactPersons ?? []).filter((_, currentIndex) => currentIndex !== index),
                            })
                          }
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <P2PFormField label="Salutation">
                        <select value={contact.salutation} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, salutation: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()}>
                          {salutationOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </P2PFormField>
                      <P2PFormField label="First Name">
                        <input value={contact.firstName} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, firstName: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass(Boolean(errors[`contactPersons.${index}.firstName`]))} />
                        <FieldError error={errors[`contactPersons.${index}.firstName`]} />
                      </P2PFormField>
                      <P2PFormField label="Last Name">
                        <input value={contact.lastName ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, lastName: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="Email Address">
                        <input value={contact.email ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, email: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass(Boolean(errors[`contactPersons.${index}.email`]))} />
                        <FieldError error={errors[`contactPersons.${index}.email`]} />
                      </P2PFormField>
                      <P2PFormField label="Work Phone">
                        <input value={contact.workPhone ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, workPhone: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="Mobile">
                        <input value={contact.mobile ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, mobile: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="Skype Name / Number">
                        <input value={contact.skypeName ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, skypeName: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="Designation">
                        <input value={contact.designation ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, designation: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="Department">
                        <input value={contact.department ?? ""} onChange={(event) => {
                          const next = [...(form.contactPersons ?? [])];
                          next[index] = { ...contact, department: event.target.value };
                          onFormChange({ ...form, contactPersons: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                    </div>
                  </div>
                ))}
                <FieldError error={errors.contactPersons} />
                <button
                  type="button"
                  onClick={() => onFormChange({ ...form, contactPersons: [...(form.contactPersons ?? []), createEmptyContact(false)] })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact Person
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Bank Accounts" hint="Support multiple accounts while enforcing one primary account." badge={`${form.bankAccounts?.length ?? 0}`}>
              <div className="space-y-4">
                {(form.bankAccounts ?? []).map((account, index) => (
                  <div key={`bank-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <input type="radio" checked={Boolean(account.primaryAccount)} onChange={() => setPrimaryBank(index)} />
                        Primary Account
                      </label>
                      {(form.bankAccounts?.length ?? 0) > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onFormChange({
                              ...form,
                              bankAccounts: (form.bankAccounts ?? []).filter((_, currentIndex) => currentIndex !== index),
                            })
                          }
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <P2PFormField label="Account Holder Name">
                        <input value={account.accountHolderName} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, accountHolderName: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.accountHolderName`]))} />
                        <FieldError error={errors[`bankAccounts.${index}.accountHolderName`]} />
                      </P2PFormField>
                      <P2PFormField label="Bank Name">
                        <input value={account.bankName} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, bankName: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.bankName`]))} />
                        <FieldError error={errors[`bankAccounts.${index}.bankName`]} />
                      </P2PFormField>
                      <P2PFormField label="Account Type">
                        <select value={account.accountType ?? "CURRENT"} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, accountType: event.target.value as VendorAccountType };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass()}>
                          {accountTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </P2PFormField>
                      <P2PFormField label="Account Number">
                        <input value={account.accountNumber ?? ""} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, accountNumber: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.accountNumber`]))} />
                        <FieldError error={errors[`bankAccounts.${index}.accountNumber`]} />
                      </P2PFormField>
                      <P2PFormField label="Re-enter Account Number">
                        <input value={account.confirmAccountNumber ?? ""} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, confirmAccountNumber: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.confirmAccountNumber`]))} />
                        <FieldError error={errors[`bankAccounts.${index}.confirmAccountNumber`]} />
                      </P2PFormField>
                      <P2PFormField label="IFSC Code">
                        <input value={account.ifscCode} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, ifscCode: event.target.value.toUpperCase() };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.ifscCode`]))} />
                        <FieldError error={errors[`bankAccounts.${index}.ifscCode`]} />
                      </P2PFormField>
                      <P2PFormField label="Branch Name">
                        <input value={account.branchName ?? ""} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, branchName: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                      <P2PFormField label="UPI ID">
                        <input value={account.upiId ?? ""} onChange={(event) => {
                          const next = [...(form.bankAccounts ?? [])];
                          next[index] = { ...account, upiId: event.target.value };
                          onFormChange({ ...form, bankAccounts: next });
                        }} className={fieldShellClass()} />
                      </P2PFormField>
                    </div>
                  </div>
                ))}
                <FieldError error={errors.bankAccounts} />
                <button
                  type="button"
                  onClick={() => onFormChange({ ...form, bankAccounts: [...(form.bankAccounts ?? []), createEmptyBank(false)] })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Bank Account
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Documents & Remarks" hint="Agreements, KYC, banking proof, and operational notes.">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                    <p className="text-sm font-medium text-slate-700">Upload GST certificates, agreements, bank proof, or onboarding documents.</p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Upload className="h-4 w-4" />
                      Upload Files
                      <input type="file" multiple className="hidden" onChange={(event) => onDocumentsSelected(event.target.files)} />
                    </label>
                  </div>
                  <DocumentList
                    persistedDocuments={persistedDocuments}
                    pendingDocuments={pendingDocuments}
                    onPreviewPersisted={onPreviewPersistedDocument}
                    onPreviewPending={onPreviewPendingDocument}
                    onRemovePersisted={onRemovePersistedDocument}
                    onRemovePending={onRemovePendingDocument}
                  />
                </div>
                <div>
                  <P2PFormField label="Remarks" hint="Internal notes for procurement and finance teams.">
                    <textarea
                      value={form.remarks}
                      onChange={(event) => updateField("remarks", event.target.value)}
                      rows={12}
                      className={fieldShellClass()}
                    />
                  </P2PFormField>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {mode === "create" ? "Draft auto-saves while you work." : "Changes apply instantly after save."}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === "create" ? "Create Vendor" : "Save Changes"}
            </button>
          </div>
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
  onClose: () => void;
  onEdit: () => void;
  onPreviewDocument: (document: VendorDocument) => void;
  onDeleteDocument: (documentId: string) => void;
  onDeleteVendor: () => void;
}) {
  const primaryContact = vendor.contactPersons.find((contact) => contact.primaryContact) ?? vendor.contactPersons[0];
  const primaryBank = vendor.bankAccounts.find((account) => account.primaryAccount) ?? vendor.bankAccounts[0];
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[88vw] lg:w-[42vw] lg:max-w-[760px]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Vendor Profile</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", vendor.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700")}>
                  {vendor.status}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{vendor.displayName ?? vendor.vendorName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {vendor.vendorCode} · {vendor.gstNumber || "GST pending"} · {vendor.vendorType || "Vendor"}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Primary Contact</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName ?? ""}`.trim() : "Not available"}
                </p>
                <p>{primaryContact?.designation || "Designation not set"}</p>
                <p>{primaryContact?.email || vendor.email || "Email not available"}</p>
                <p>{primaryContact?.mobile || vendor.mobile || "Mobile not available"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Primary Bank</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{primaryBank?.bankName || "Not available"}</p>
                <p>{primaryBank?.accountNumberMasked || "Account hidden until saved"}</p>
                <p>{primaryBank?.ifscCode || "IFSC not available"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor Information</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Company", vendor.companyName || "-"],
                ["Email", vendor.email || "-"],
                ["Mobile", vendor.mobile || "-"],
                ["Work Phone", vendor.workPhone || "-"],
                ["Language", vendor.vendorLanguage || "-"],
                ["PAN", vendor.panNumber || "-"],
                ["Website", vendor.website || "-"],
                ["Updated", formatDate(vendor.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Addresses</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[vendor.billingAddress, ...(vendor.shippingAddresses ?? [])].filter(Boolean).map((address, index) => (
                <div key={`${address?.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{address?.addressType === "BILLING" ? "Billing" : address?.label || "Shipping"}</p>
                  <p className="mt-2">{[address?.attention, address?.addressLine1, address?.addressLine2, address?.city, address?.state, address?.country, address?.postalCode].filter(Boolean).join(", ") || "Address not available"}</p>
                </div>
              ))}
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
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
              Edit Vendor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  sub: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accent)}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
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
  const [editorMode, setEditorMode] = useState<VendorEditorMode>("create");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState<VendorForm>(createEmptyVendorForm());
  const [formErrors, setFormErrors] = useState<VendorFormErrors>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDocuments, setPendingDocuments] = useState<PendingVendorDocument[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [vendors, selectedVendorId]
  );

  const { data: selectedVendorDocuments = [], isLoading: isDocumentsLoading } = useVendorDocuments(selectedVendorId ?? undefined);

  const visiblePersistedDocuments = useMemo(
    () => selectedVendorDocuments.filter((document) => !removedDocumentIds.includes(document.id)),
    [removedDocumentIds, selectedVendorDocuments]
  );

  const queueStats = useMemo(
    () => ({
      total: vendors.length,
      active: vendors.filter((vendor) => vendor.status === "ACTIVE").length,
      withContacts: vendors.filter((vendor) => vendor.contactPersons.length > 0).length,
      compliant: vendors.filter((vendor) => vendor.gstNumber && vendor.bankAccounts.length > 0).length,
    }),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((vendor) =>
      [
        vendor.vendorCode,
        vendor.vendorName,
        vendor.displayName,
        vendor.companyName,
        vendor.email,
        vendor.mobile,
        vendor.city,
        vendor.state,
        vendor.country,
        vendor.gstNumber,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [searchTerm, vendors]);

  useEffect(() => {
    return () => {
      pendingDocuments.forEach((document) => URL.revokeObjectURL(document.objectUrl));
      if (preview?.source === "remote") {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [pendingDocuments, preview]);

  useEffect(() => {
    if (!isEditorOpen || editorMode !== "create") {
      return;
    }
    const { vendorCode: _vendorCode, ...persistable } = vendorForm;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
  }, [editorMode, isEditorOpen, vendorForm]);

  function resetEditorState() {
    pendingDocuments.forEach((document) => URL.revokeObjectURL(document.objectUrl));
    setPendingDocuments([]);
    setRemovedDocumentIds([]);
    setFormErrors({});
    setVendorForm(createEmptyVendorForm());
  }

  function openCreatePanel() {
    const draft = localStorage.getItem(DRAFT_KEY);
    resetEditorState();
    setEditorMode("create");
    setVendorForm(draft ? { ...createEmptyVendorForm(), ...JSON.parse(draft) } : createEmptyVendorForm());
    setIsEditorOpen(true);
  }

  function openEditPanel(vendor: Vendor) {
    resetEditorState();
    setEditorMode("edit");
    setSelectedVendorId(vendor.id);
    setVendorForm(mapVendorToForm(vendor));
    setIsEditorOpen(true);
  }

  function closePreview() {
    setPreview((current) => {
      if (current?.source === "remote") {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
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
      toast.error(err instanceof Error ? err.message : "Failed to preview vendor document.");
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
    const errors = validateVendorForm(vendorForm, vendors, editorMode === "edit" ? selectedVendor?.id : null);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the highlighted vendor details.");
      return;
    }

    try {
      const payload = sanitizeVendorPayload(vendorForm);
      let savedVendor: Vendor;

      if (editorMode === "edit" && selectedVendor) {
        savedVendor = await updateVendor.mutateAsync({ id: selectedVendor.id, payload });
        for (const documentId of removedDocumentIds) {
          await deleteVendorDocument.mutateAsync({ vendorId: savedVendor.id, documentId });
        }
        toast.success("Vendor updated successfully.");
      } else {
        savedVendor = await createVendor.mutateAsync(payload);
        localStorage.removeItem(DRAFT_KEY);
        toast.success(`Vendor ${savedVendor.vendorCode} created successfully.`);
      }

      for (const document of pendingDocuments) {
        await uploadVendorDocument.mutateAsync({ vendorId: savedVendor.id, file: document.file });
      }

      setSelectedVendorId(savedVendor.id);
      setIsEditorOpen(false);
      resetEditorState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save vendor.");
    }
  }

  const columns = [
    { key: "vendor", label: "Vendor" },
    { key: "contact", label: "Contact" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", className: "w-[120px]" },
  ];

  const rows = filteredVendors.map((vendor) => ({
    id: vendor.id,
    vendor: (
      <div>
        <p className="font-semibold text-slate-900">{vendor.displayName ?? vendor.vendorName}</p>
        <p className="text-xs text-slate-500">{vendor.vendorCode} · {vendor.gstNumber || "GST pending"}</p>
      </div>
    ),
    contact: (
      <div>
        <p className="text-sm text-slate-700">{vendor.email || "No email"}</p>
        <p className="text-xs text-slate-500">{vendor.mobile || vendor.phone || "No phone"}</p>
      </div>
    ),
    location: [vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ") || "-",
    status: (
      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", vendor.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
        {vendor.status}
      </span>
    ),
  }));

  return (
    <>
      <P2PLayout
        title="Vendor Management"
        subtitle="Maintain enterprise-grade supplier profiles with addresses, contacts, bank accounts, validation, and compliance documents."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={openCreatePanel} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              New Vendor
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <VendorStat label="Vendor Masters" value={queueStats.total} sub="supplier records" icon={<Building2 className="h-5 w-5 text-blue-700" />} accent="bg-blue-100" />
          <VendorStat label="Active Vendors" value={queueStats.active} sub="currently enabled" icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />} accent="bg-emerald-100" />
          <VendorStat label="Contact Ready" value={queueStats.withContacts} sub="with contact persons" icon={<UserRound className="h-5 w-5 text-amber-700" />} accent="bg-amber-100" />
          <VendorStat label="Finance Ready" value={queueStats.compliant} sub="GST and bank on file" icon={<Landmark className="h-5 w-5 text-violet-700" />} accent="bg-violet-100" />
        </div>

        <P2PCard
          title="Vendor Directory"
          description="Search the supplier base, review master profiles in a side panel, and open the full editor without leaving the page."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Auto-save draft is enabled for new vendor creation
            </div>
            <div className="relative w-full lg:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search vendor, GST, city, contact..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading vendors...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">{error instanceof Error ? error.message : "Failed to load vendors."}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-900">No vendors match this view.</p>
              <p className="mt-2 text-sm text-slate-500">Adjust the search or create a fresh vendor profile.</p>
            </div>
          ) : (
            <P2PTable columns={columns} rows={rows} className="rounded-none border-x-0 border-b-0" onRowClick={(rowId) => setSelectedVendorId(rowId)} />
          )}
        </P2PCard>
      </P2PLayout>

      {selectedVendor ? (
        <VendorDetailPanel
          vendor={selectedVendor}
          documents={selectedVendorDocuments}
          isDocumentsLoading={isDocumentsLoading}
          isDeleting={deleteVendor.isPending || deleteVendorDocument.isPending}
          onClose={() => setSelectedVendorId(null)}
          onEdit={() => openEditPanel(selectedVendor)}
          onPreviewDocument={previewPersistedDocument}
          onDeleteDocument={(documentId) =>
            deleteVendorDocument.mutate(
              { vendorId: selectedVendor.id, documentId },
              {
                onSuccess: () => toast.success("Document removed."),
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove document."),
              }
            )
          }
          onDeleteVendor={() =>
            deleteVendor.mutate(selectedVendor.id, {
              onSuccess: () => {
                toast.success("Vendor deleted.");
                setSelectedVendorId(null);
              },
              onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete vendor."),
            })
          }
        />
      ) : null}

      {isEditorOpen ? (
        <VendorEditorPanel
          mode={editorMode}
          form={vendorForm}
          errors={formErrors}
          persistedDocuments={editorMode === "edit" ? visiblePersistedDocuments : []}
          pendingDocuments={pendingDocuments}
          isLoading={createVendor.isPending || updateVendor.isPending || uploadVendorDocument.isPending || deleteVendorDocument.isPending}
          onClose={() => {
            setIsEditorOpen(false);
            setFormErrors({});
          }}
          onFormChange={setVendorForm}
          onDocumentsSelected={handleDocumentsSelected}
          onRemovePersistedDocument={(documentId) =>
            setRemovedDocumentIds((current) => (current.includes(documentId) ? current : [...current, documentId]))
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
          onDiscardDraft={() => {
            localStorage.removeItem(DRAFT_KEY);
            setVendorForm(createEmptyVendorForm());
            toast.success("Vendor draft discarded.");
          }}
        />
      ) : null}

      {preview ? <DocumentPreviewModal preview={preview} onClose={closePreview} /> : null}
    </>
  );
}

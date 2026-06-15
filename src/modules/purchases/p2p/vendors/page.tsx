/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Download,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Users,
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

/* ------------------------------------------------------------------ */
/* Design tokens (kept as utility builders so the system stays cohesive)
 *
 *   Primary action ........ blue-600 / blue-700 (hover)
 *   Focus ring ............ blue-500 @ 15%
 *   Surfaces .............. flat white panels, divider-separated sections
 *   Radius scale .......... controls: rounded-lg · cards: rounded-xl
 *   Micro labels .......... 11px, semibold, uppercase, tracked
 *   Status ................ emerald (active) · slate (inactive)
 *                           amber (pending) · rose (error / danger)
/* ------------------------------------------------------------------ */

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

/* ------------------------------ helpers ------------------------------ */

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

function monogram(name?: string | null) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials || "V";
}

const MONOGRAM_TONES = [
  "bg-sky-100 text-sky-700 ring-sky-600/10",
  "bg-blue-100 text-blue-700 ring-blue-600/10",
  "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
  "bg-slate-100 text-slate-600 ring-slate-500/10",
];

function monogramTone(seed?: string | null) {
  const value = seed ?? "";
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 997;
  return MONOGRAM_TONES[hash % MONOGRAM_TONES.length];
}

function fieldShellClass(hasError = false, disabled = false, translucent = false) {
  return cn(
    "w-full rounded-md border px-3.5 py-2.5 text-sm text-slate-700 outline-none transition",
    translucent ? "bg-white/50 backdrop-blur-sm" : "bg-white",
    "placeholder:text-slate-400",
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
      : hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
        : "border-slate-300 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
  );
}

type SelectOption = { value: string; label: string };

function SelectField({
  value,
  options,
  onChange,
  hasError = false,
  placeholder = "Select",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hasError?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(fieldShellClass(hasError), "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white/70 py-1 backdrop-blur-md"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || "__empty"}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50/70",
                  isSelected ? "font-semibold text-blue-700" : "text-slate-700"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const salutationSelectOptions: SelectOption[] = salutationOptions.map((option) => ({ value: option, label: option }));
const vendorTypeSelectOptions: SelectOption[] = [
  { value: "", label: "Select type" },
  ...vendorTypeOptions.map((option) => ({ value: option, label: option })),
];
const vendorLanguageSelectOptions: SelectOption[] = vendorLanguageOptions.map((option) => ({ value: option, label: option }));
const statusSelectOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];
const accountTypeSelectOptions: SelectOption[] = accountTypeOptions.map((option) => ({
  value: option,
  label: option.replaceAll("_", " "),
}));

const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
const buttonDanger =
  "inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:opacity-60";
const buttonGhostSmall =
  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
const microLabel = "text-xs font-semibold uppercase tracking-wide text-slate-400";

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

  const duplicateEmail = payload.email
    ? vendors.find((vendor) => {
        const normalizedEmail = payload.email!.toLowerCase();
        return vendor.email?.toLowerCase() === normalizedEmail && vendor.id !== activeVendorId;
      })
    : undefined;
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

/* ----------------------- editor section model ----------------------- */

const EDITOR_SECTIONS = [
  { key: "info", title: "Vendor Information", hint: "Master data, statutory numbers, communication", icon: Building2 },
  { key: "billing", title: "Billing Address", hint: "Registered address for invoices", icon: MapPin },
  { key: "shipping", title: "Shipping Addresses", hint: "Logistics and delivery locations", icon: Truck },
  { key: "contacts", title: "Contact Persons", hint: "Stakeholders and the primary contact", icon: Users },
  { key: "banks", title: "Bank Accounts", hint: "Payment accounts, one primary", icon: Landmark },
  { key: "documents", title: "Documents & Remarks", hint: "KYC, agreements, internal notes", icon: FileText },
] as const;

type EditorSectionKey = (typeof EDITOR_SECTIONS)[number]["key"];

const SECTION_ERROR_PREFIXES: Record<EditorSectionKey, string[]> = {
  info: ["displayName", "email", "mobile", "gstNumber", "panNumber", "website"],
  billing: [],
  shipping: [],
  contacts: ["contactPersons"],
  banks: ["bankAccounts"],
  documents: [],
};

function sectionHasError(errors: VendorFormErrors, key: EditorSectionKey) {
  const prefixes = SECTION_ERROR_PREFIXES[key];
  return Object.keys(errors).some((errorKey) => prefixes.some((prefix) => errorKey === prefix || errorKey.startsWith(`${prefix}.`)));
}

function sectionIsComplete(form: VendorForm, key: EditorSectionKey) {
  switch (key) {
    case "info":
      return Boolean(normalizeText(form.displayName));
    case "billing":
      return Boolean(normalizeText(form.billingAddress?.addressLine1) && normalizeText(form.billingAddress?.city));
    case "shipping":
      return Boolean(normalizeText(form.shippingAddresses?.[0]?.addressLine1));
    case "contacts":
      return Boolean(normalizeText(form.contactPersons?.[0]?.firstName));
    case "banks": {
      const account = form.bankAccounts?.[0];
      return Boolean(
        account && normalizeText(account.accountHolderName) && normalizeText(account.accountNumber) && IFSC_PATTERN.test(normalizeText(account.ifscCode).toUpperCase())
      );
    }
    case "documents":
      return false;
  }
}

/* --------------------------- UI primitives --------------------------- */

function SectionCard({
  title,
  hint,
  badge,
  isOpen,
  onToggle,
  anchorId,
  children,
}: {
  title: string;
  hint: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  anchorId: string;
  children: ReactNode;
}) {
  return (
    <section id={anchorId} className="scroll-mt-4 border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            {badge ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{badge}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen ? <div className="pb-6">{children}</div> : null}
    </section>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p> : null;
}

function StatusChip({ status }: { status?: VendorStatus | string | null }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100/70 text-sky-600">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className={microLabel}>Document preview</p>
              <h3 className="truncate text-base font-semibold text-slate-900">{preview.title}</h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const link = document.createElement("a");
                link.href = preview.url;
                link.download = preview.title;
                link.click();
              }}
              className={buttonSecondary}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-5">
          {previewKind === "image" ? (
            <div className="flex h-full items-center justify-center">
              <img src={preview.url} alt={preview.title} className="max-h-full max-w-full rounded-xl border border-slate-200 bg-white shadow-sm" />
            </div>
          ) : previewKind === "pdf" ? (
            <iframe src={preview.url} title={preview.title} className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-sm" />
          ) : previewKind === "text" ? (
            <pre className="h-full overflow-auto rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-700 shadow-sm">
              {textContent || "Loading..."}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center">
              <FileText className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500">Preview is not available for this file type. Download it to view.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  name,
  meta,
  pending = false,
  onPreview,
  onRemove,
}: {
  name: string;
  meta: string;
  pending?: boolean;
  onPreview: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          pending ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className={cn("mt-0.5 text-xs", pending ? "text-amber-600" : "text-slate-500")}>{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onPreview} className={cn(buttonGhostSmall, "text-slate-600 hover:bg-slate-100")}>
          Preview
        </button>
        {onRemove ? (
          <button type="button" onClick={onRemove} className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}>
            Remove
          </button>
        ) : null}
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
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
        <FileText className="h-5 w-5 text-slate-300" />
        <p className="text-sm text-slate-500">No documents yet. Upload GST certificates, agreements, or bank proof.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {persistedDocuments.map((document) => (
        <DocumentRow
          key={document.id}
          name={document.fileName}
          meta={`${formatFileSize(document.fileSize)} · Added ${formatDate(document.createdAt)}`}
          onPreview={() => onPreviewPersisted(document)}
          onRemove={onRemovePersisted ? () => onRemovePersisted(document.id) : undefined}
        />
      ))}
      {pendingDocuments.map((document) => (
        <DocumentRow
          key={document.id}
          name={document.name}
          meta={`${formatFileSize(document.size)} · Uploads on save`}
          pending
          onPreview={() => onPreviewPending(document)}
          onRemove={onRemovePending ? () => onRemovePending(document.id) : undefined}
        />
      ))}
    </div>
  );
}

/* ----------------------------- editor panel ----------------------------- */

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
  const [openSections, setOpenSections] = useState<Record<EditorSectionKey, boolean>>({
    info: true,
    billing: true,
    shipping: true,
    contacts: true,
    banks: true,
    documents: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<EditorSectionKey>("info");

  const errorCount = Object.keys(errors).length;

  const handleEditorScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let current: EditorSectionKey = EDITOR_SECTIONS[0].key;
    for (const section of EDITOR_SECTIONS) {
      const element = container.querySelector(`#vendor-section-${section.key}`);
      if (element && element.getBoundingClientRect().top - containerTop <= 96) {
        current = section.key;
      }
    }
    setActiveSection(current);
  };

  const jumpToSection = (key: EditorSectionKey) => {
    setOpenSections((current) => ({ ...current, [key]: true }));
    setActiveSection(key);
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(`#vendor-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleSection = (key: EditorSectionKey) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

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

  const updateContact = (index: number, patch: Partial<VendorContactPerson>) => {
    const next = [...(form.contactPersons ?? [])];
    next[index] = { ...next[index], ...patch };
    onFormChange({ ...form, contactPersons: next });
  };

  const updateBank = (index: number, patch: Partial<VendorBankAccount>) => {
    const next = [...(form.bankAccounts ?? [])];
    next[index] = { ...next[index], ...patch };
    onFormChange({ ...form, bankAccounts: next });
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

  const sectionBadges: Partial<Record<EditorSectionKey, string>> = {
    shipping: `${form.shippingAddresses?.length ?? 0}`,
    contacts: `${form.contactPersons?.length ?? 0}`,
    banks: `${form.bankAccounts?.length ?? 0}`,
    documents: `${persistedDocuments.length + pendingDocuments.length}`,
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[94vw] lg:w-[62vw] lg:max-w-[1040px] lg:border-l lg:border-slate-200">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-1", monogramTone(form.displayName || "new"))}>
                {monogram(form.displayName || "New Vendor")}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={microLabel}>Vendor master</p>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      mode === "create" ? "bg-blue-50 text-blue-700" : "bg-indigo-50 text-indigo-700"
                    )}
                  >
                    {mode === "create" ? "New" : "Editing"}
                  </span>
                </div>
                <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900">
                  {form.displayName?.trim() || (mode === "create" ? "Create vendor" : "Edit vendor")}
                </h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mode === "create" ? (
                <button type="button" onClick={onDiscardDraft} className={cn(buttonSecondary, "hidden sm:inline-flex")}>
                  Discard draft
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close editor"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body: section rail + form */}
        <div className="flex flex-1 overflow-hidden">
          <nav className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:flex">
            <p className={cn(microLabel, "px-2 pb-2")}>Sections</p>
            {EDITOR_SECTIONS.map((section) => {
              const hasError = sectionHasError(errors, section.key);
              const isComplete = !hasError && sectionIsComplete(form, section.key);
              const isActive = activeSection === section.key;
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => jumpToSection(section.key)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    isActive ? "bg-blue-50 text-blue-700" : "hover:bg-sky-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500")} />
                  <span className={cn("min-w-0 flex-1 truncate text-[13px]", isActive ? "font-semibold text-blue-700" : "font-medium text-slate-700")}>{section.title}</span>
                  {hasError ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Has issues" />
                  ) : isComplete ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="Complete" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" />
                  )}
                </button>
              );
            })}
            <div className="mt-auto rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
              {mode === "create" ? "Drafts save automatically as you type." : "Changes apply after you save."}
            </div>
          </nav>

          <div ref={scrollRef} onScroll={handleEditorScroll} className="flex-1 overflow-y-auto px-5 py-1 sm:px-8">
            <div className="mx-auto max-w-3xl">
              {/* 01 — Vendor Information */}
              <SectionCard
                title="Vendor Information"
                hint={EDITOR_SECTIONS[0].hint}
                anchorId="vendor-section-info"
                isOpen={openSections.info}
                onToggle={() => toggleSection("info")}
              >
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <P2PFormField label="Vendor Code" hint="Generated after save.">
                    <input value={form.vendorCode ?? "Auto generated"} disabled className={fieldShellClass(false, true)} />
                  </P2PFormField>
                  <div className="grid grid-cols-2 gap-4">
                    <P2PFormField label="Vendor Type">
                      <SelectField value={form.vendorType ?? ""} options={vendorTypeSelectOptions} onChange={(value) => updateField("vendorType", value)} placeholder="Select type" />
                    </P2PFormField>
                    <P2PFormField label="Status">
                      <SelectField value={form.status ?? "ACTIVE"} options={statusSelectOptions} onChange={(value) => updateField("status", value as VendorStatus)} />
                    </P2PFormField>
                  </div>

                  <div className="grid grid-cols-[88px_1fr] gap-4">
                    <P2PFormField label="Salutation">
                      <SelectField value={form.salutation ?? "Mr."} options={salutationSelectOptions} onChange={(value) => updateField("salutation", value)} />
                    </P2PFormField>
                    <P2PFormField label="First Name">
                      <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={fieldShellClass()} />
                    </P2PFormField>
                  </div>
                  <P2PFormField label="Last Name">
                    <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>

                  <P2PFormField label="Company Name">
                    <input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                  <P2PFormField label="Display Name" hint="Shown across purchase orders and reports.">
                    <input
                      value={form.displayName}
                      onChange={(event) => updateField("displayName", event.target.value)}
                      className={fieldShellClass(Boolean(errors.displayName))}
                    />
                    <FieldError error={errors.displayName} />
                  </P2PFormField>

                  <P2PFormField label="Email Address">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="vendor@company.com"
                      className={fieldShellClass(Boolean(errors.email))}
                    />
                    <FieldError error={errors.email} />
                  </P2PFormField>
                  <P2PFormField label="Mobile">
                    <input value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} className={fieldShellClass(Boolean(errors.mobile))} />
                    <FieldError error={errors.mobile} />
                  </P2PFormField>
                  <P2PFormField label="Phone">
                    <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                  <P2PFormField label="Work Phone">
                    <input value={form.workPhone} onChange={(event) => updateField("workPhone", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>

                  <P2PFormField label="GST Number">
                    <input
                      value={form.gstNumber}
                      onChange={(event) => updateField("gstNumber", event.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      className={cn(fieldShellClass(Boolean(errors.gstNumber)), "uppercase")}
                    />
                    <FieldError error={errors.gstNumber} />
                  </P2PFormField>
                  <P2PFormField label="PAN Number">
                    <input
                      value={form.panNumber}
                      onChange={(event) => updateField("panNumber", event.target.value.toUpperCase())}
                      placeholder="AAAAA0000A"
                      className={cn(fieldShellClass(Boolean(errors.panNumber)), "uppercase")}
                    />
                    <FieldError error={errors.panNumber} />
                  </P2PFormField>

                  <P2PFormField label="Vendor Language">
                    <SelectField value={form.vendorLanguage ?? "English"} options={vendorLanguageSelectOptions} onChange={(value) => updateField("vendorLanguage", value)} />
                  </P2PFormField>
                  <P2PFormField label="Website">
                    <input
                      value={form.website}
                      onChange={(event) => updateField("website", event.target.value)}
                      placeholder="https://example.com"
                      className={fieldShellClass(Boolean(errors.website))}
                    />
                    <FieldError error={errors.website} />
                  </P2PFormField>
                </div>
              </SectionCard>

              {/* 02 — Billing Address */}
              <SectionCard
                title="Billing Address"
                hint={EDITOR_SECTIONS[1].hint}
                anchorId="vendor-section-billing"
                isOpen={openSections.billing}
                onToggle={() => toggleSection("billing")}
              >
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <P2PFormField label="Attention">
                    <input value={form.billingAddress?.attention ?? ""} onChange={(event) => updateBillingAddress("attention", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                  <P2PFormField label="Address Label">
                    <input value={form.billingAddress?.label ?? ""} onChange={(event) => updateBillingAddress("label", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                  <div className="sm:col-span-2">
                    <P2PFormField label="Address Line 1">
                      <input value={form.billingAddress?.addressLine1 ?? ""} onChange={(event) => updateBillingAddress("addressLine1", event.target.value)} className={fieldShellClass()} />
                    </P2PFormField>
                  </div>
                  <div className="sm:col-span-2">
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
                  <P2PFormField label="PIN Code">
                    <input value={form.billingAddress?.postalCode ?? ""} onChange={(event) => updateBillingAddress("postalCode", event.target.value)} className={fieldShellClass()} />
                  </P2PFormField>
                </div>
              </SectionCard>

              {/* 03 — Shipping Addresses */}
              <SectionCard
                title="Shipping Addresses"
                hint={EDITOR_SECTIONS[2].hint}
                badge={sectionBadges.shipping}
                anchorId="vendor-section-shipping"
                isOpen={openSections.shipping}
                onToggle={() => toggleSection("shipping")}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                      checked={form.sameAsBilling}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        const firstShipping = checked
                          ? {
                              ...cloneAddress(form.billingAddress, form.shippingAddresses?.[0]?.label ?? "Primary Shipping"),
                              addressType: "SHIPPING" as const,
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
                    className={buttonSecondary}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add address
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.shippingAddresses ?? []).map((address, index) => {
                    const locked = form.sameAsBilling && index === 0;
                    return (
                      <div key={`shipping-${index}`} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{address.label || `Shipping ${index + 1}`}</p>
                            {index === 0 ? (
                              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">Default</span>
                            ) : null}
                            {locked ? <span className="text-[11px] text-slate-400">Mirrors billing</span> : null}
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
                              className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                          <P2PFormField label="Attention">
                            <input
                              value={address.attention ?? ""}
                              disabled={locked}
                              onChange={(event) => updateShippingAddress(index, { ...address, attention: event.target.value })}
                              className={fieldShellClass(false, locked)}
                            />
                          </P2PFormField>
                          <P2PFormField label="Address Label">
                            <input value={address.label ?? ""} onChange={(event) => updateShippingAddress(index, { ...address, label: event.target.value })} className={fieldShellClass()} />
                          </P2PFormField>
                          <div className="sm:col-span-2">
                            <P2PFormField label="Address Line 1">
                              <input
                                value={address.addressLine1 ?? ""}
                                disabled={locked}
                                onChange={(event) => updateShippingAddress(index, { ...address, addressLine1: event.target.value })}
                                className={fieldShellClass(false, locked)}
                              />
                            </P2PFormField>
                          </div>
                          <div className="sm:col-span-2">
                            <P2PFormField label="Address Line 2">
                              <input
                                value={address.addressLine2 ?? ""}
                                disabled={locked}
                                onChange={(event) => updateShippingAddress(index, { ...address, addressLine2: event.target.value })}
                                className={fieldShellClass(false, locked)}
                              />
                            </P2PFormField>
                          </div>
                          <P2PFormField label="City">
                            <input
                              value={address.city ?? ""}
                              disabled={locked}
                              onChange={(event) => updateShippingAddress(index, { ...address, city: event.target.value })}
                              className={fieldShellClass(false, locked)}
                            />
                          </P2PFormField>
                          <P2PFormField label="State">
                            <input
                              value={address.state ?? ""}
                              disabled={locked}
                              onChange={(event) => updateShippingAddress(index, { ...address, state: event.target.value })}
                              className={fieldShellClass(false, locked)}
                            />
                          </P2PFormField>
                          <P2PFormField label="Country">
                            <input
                              value={address.country ?? ""}
                              disabled={locked}
                              onChange={(event) => updateShippingAddress(index, { ...address, country: event.target.value })}
                              className={fieldShellClass(false, locked)}
                            />
                          </P2PFormField>
                          <P2PFormField label="PIN Code">
                            <input
                              value={address.postalCode ?? ""}
                              disabled={locked}
                              onChange={(event) => updateShippingAddress(index, { ...address, postalCode: event.target.value })}
                              className={fieldShellClass(false, locked)}
                            />
                          </P2PFormField>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* 04 — Contact Persons */}
              <SectionCard
                title="Contact Persons"
                hint={EDITOR_SECTIONS[3].hint}
                badge={sectionBadges.contacts}
                anchorId="vendor-section-contacts"
                isOpen={openSections.contacts}
                onToggle={() => toggleSection("contacts")}
              >
                <div className="space-y-3">
                  {(form.contactPersons ?? []).map((contact, index) => (
                    <div key={`contact-${index}`} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="radio"
                            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500/30"
                            checked={Boolean(contact.primaryContact)}
                            onChange={() => setPrimaryContact(index)}
                          />
                          Primary contact
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
                            className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div className="grid grid-cols-[88px_1fr] gap-4">
                          <P2PFormField label="Salutation">
                            <SelectField value={contact.salutation ?? "Mr."} options={salutationSelectOptions} onChange={(value) => updateContact(index, { salutation: value })} />
                          </P2PFormField>
                          <P2PFormField label="First Name">
                            <input
                              value={contact.firstName}
                              onChange={(event) => updateContact(index, { firstName: event.target.value })}
                              className={fieldShellClass(Boolean(errors[`contactPersons.${index}.firstName`]))}
                            />
                            <FieldError error={errors[`contactPersons.${index}.firstName`]} />
                          </P2PFormField>
                        </div>
                        <P2PFormField label="Last Name">
                          <input value={contact.lastName ?? ""} onChange={(event) => updateContact(index, { lastName: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="Email Address">
                          <input
                            type="email"
                            value={contact.email ?? ""}
                            onChange={(event) => updateContact(index, { email: event.target.value })}
                            className={fieldShellClass(Boolean(errors[`contactPersons.${index}.email`]))}
                          />
                          <FieldError error={errors[`contactPersons.${index}.email`]} />
                        </P2PFormField>
                        <P2PFormField label="Mobile">
                          <input value={contact.mobile ?? ""} onChange={(event) => updateContact(index, { mobile: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="Work Phone">
                          <input value={contact.workPhone ?? ""} onChange={(event) => updateContact(index, { workPhone: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="Skype Name / Number">
                          <input value={contact.skypeName ?? ""} onChange={(event) => updateContact(index, { skypeName: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="Designation">
                          <input value={contact.designation ?? ""} onChange={(event) => updateContact(index, { designation: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="Department">
                          <input value={contact.department ?? ""} onChange={(event) => updateContact(index, { department: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                      </div>
                    </div>
                  ))}
                  <FieldError error={errors.contactPersons} />
                  <button
                    type="button"
                    onClick={() => onFormChange({ ...form, contactPersons: [...(form.contactPersons ?? []), createEmptyContact(false)] })}
                    className={buttonSecondary}
                  >
                    <Plus className="h-4 w-4" />
                    Add contact person
                  </button>
                </div>
              </SectionCard>

              {/* 05 — Bank Accounts */}
              <SectionCard
                title="Bank Accounts"
                hint={EDITOR_SECTIONS[4].hint}
                badge={sectionBadges.banks}
                anchorId="vendor-section-banks"
                isOpen={openSections.banks}
                onToggle={() => toggleSection("banks")}
              >
                <div className="space-y-3">
                  {(form.bankAccounts ?? []).map((account, index) => (
                    <div key={`bank-${index}`} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="radio"
                            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500/30"
                            checked={Boolean(account.primaryAccount)}
                            onChange={() => setPrimaryBank(index)}
                          />
                          Primary account
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
                            className={cn(buttonGhostSmall, "text-rose-600 hover:bg-rose-50")}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        <P2PFormField label="Account Holder Name">
                          <input
                            value={account.accountHolderName}
                            onChange={(event) => updateBank(index, { accountHolderName: event.target.value })}
                            className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.accountHolderName`]))}
                          />
                          <FieldError error={errors[`bankAccounts.${index}.accountHolderName`]} />
                        </P2PFormField>
                        <P2PFormField label="Bank Name">
                          <input
                            value={account.bankName}
                            onChange={(event) => updateBank(index, { bankName: event.target.value })}
                            className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.bankName`]))}
                          />
                          <FieldError error={errors[`bankAccounts.${index}.bankName`]} />
                        </P2PFormField>
                        <P2PFormField label="Account Number">
                          <input
                            value={account.accountNumber ?? ""}
                            onChange={(event) => updateBank(index, { accountNumber: event.target.value })}
                            className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.accountNumber`]))}
                          />
                          <FieldError error={errors[`bankAccounts.${index}.accountNumber`]} />
                        </P2PFormField>
                        <P2PFormField label="Re-enter Account Number">
                          <input
                            value={account.confirmAccountNumber ?? ""}
                            onChange={(event) => updateBank(index, { confirmAccountNumber: event.target.value })}
                            className={fieldShellClass(Boolean(errors[`bankAccounts.${index}.confirmAccountNumber`]))}
                          />
                          <FieldError error={errors[`bankAccounts.${index}.confirmAccountNumber`]} />
                        </P2PFormField>
                        <P2PFormField label="IFSC Code">
                          <input
                            value={account.ifscCode}
                            onChange={(event) => updateBank(index, { ifscCode: event.target.value.toUpperCase() })}
                            placeholder="HDFC0001234"
                            className={cn(fieldShellClass(Boolean(errors[`bankAccounts.${index}.ifscCode`])), "uppercase")}
                          />
                          <FieldError error={errors[`bankAccounts.${index}.ifscCode`]} />
                        </P2PFormField>
                        <P2PFormField label="Account Type">
                          <SelectField
                            value={account.accountType ?? "CURRENT"}
                            options={accountTypeSelectOptions}
                            onChange={(value) => updateBank(index, { accountType: value as VendorAccountType })}
                          />
                        </P2PFormField>
                        <P2PFormField label="Branch Name">
                          <input value={account.branchName ?? ""} onChange={(event) => updateBank(index, { branchName: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                        <P2PFormField label="UPI ID">
                          <input value={account.upiId ?? ""} onChange={(event) => updateBank(index, { upiId: event.target.value })} className={fieldShellClass()} />
                        </P2PFormField>
                      </div>
                    </div>
                  ))}
                  <FieldError error={errors.bankAccounts} />
                  <button
                    type="button"
                    onClick={() => onFormChange({ ...form, bankAccounts: [...(form.bankAccounts ?? []), createEmptyBank(false)] })}
                    className={buttonSecondary}
                  >
                    <Plus className="h-4 w-4" />
                    Add bank account
                  </button>
                </div>
              </SectionCard>

              {/* 06 — Documents & Remarks */}
              <SectionCard
                title="Documents & Remarks"
                hint={EDITOR_SECTIONS[5].hint}
                badge={sectionBadges.documents}
                anchorId="vendor-section-documents"
                isOpen={openSections.documents}
                onToggle={() => toggleSection("documents")}
              >
                <div className="space-y-5">
                  <div>
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Upload GST certificates, agreements, or bank proof</span>
                      <span className="text-xs text-slate-500">Click to browse files</span>
                      <input type="file" multiple className="hidden" onChange={(event) => onDocumentsSelected(event.target.files)} />
                    </label>
                    <div className="mt-3">
                      <DocumentList
                        persistedDocuments={persistedDocuments}
                        pendingDocuments={pendingDocuments}
                        onPreviewPersisted={onPreviewPersistedDocument}
                        onPreviewPending={onPreviewPendingDocument}
                        onRemovePersisted={onRemovePersistedDocument}
                        onRemovePending={onRemovePendingDocument}
                      />
                    </div>
                  </div>
                  <P2PFormField label="Remarks" hint="Internal notes for procurement and finance teams.">
                    <textarea value={form.remarks} onChange={(event) => updateField("remarks", event.target.value)} rows={5} className={cn(fieldShellClass(), "resize-y")} />
                  </P2PFormField>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {errorCount > 0 ? (
              <p className="text-xs font-semibold text-rose-600">
                {errorCount} {errorCount === 1 ? "issue" : "issues"} to resolve before saving
              </p>
            ) : (
              <p className="text-xs text-slate-500">{mode === "create" ? "Draft auto-saves while you work." : "Changes apply instantly after save."}</p>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={buttonSecondary}>
                Cancel
              </button>
              <button type="button" onClick={onSave} disabled={isLoading} className={buttonPrimary}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {mode === "create" ? "Create vendor" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- detail panel ----------------------------- */

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-slate-900">{value}</dd>
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
  const displayName = vendor.displayName ?? vendor.vendorName;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[90vw] lg:w-[44vw] lg:max-w-[780px] lg:border-l lg:border-slate-200">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-1", monogramTone(displayName))}>
                {monogram(displayName)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-slate-900">{displayName}</h2>
                  <StatusChip status={vendor.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{vendor.vendorCode}</span>
                  <span>{vendor.vendorType || "Vendor"}</span>
                  <span className="text-slate-300">·</span>
                  <span>{vendor.gstNumber || "GST pending"}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 divide-y divide-slate-200 overflow-y-auto bg-white px-5 py-1 sm:px-6">
          <div className="grid gap-6 py-5 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-400" />
                <p className={microLabel}>Primary contact</p>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-semibold text-slate-900">
                  {primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName ?? ""}`.trim() : "Not available"}
                </p>
                <p className="text-slate-500">{primaryContact?.designation || "Designation not set"}</p>
                <p className="truncate text-slate-700">{primaryContact?.email || vendor.email || "Email not available"}</p>
                <p className="text-slate-700">{primaryContact?.mobile || vendor.mobile || "Mobile not available"}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-slate-400" />
                <p className={microLabel}>Primary bank</p>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{primaryBank?.bankName || "Not available"}</p>
                <p className="text-slate-700">{primaryBank?.accountNumberMasked || "Account hidden until saved"}</p>
                <p className="text-slate-700">{primaryBank?.ifscCode || "IFSC not available"}</p>
              </div>
            </div>
          </div>

          <div className="py-5">
            <p className={microLabel}>Vendor information</p>
            <dl className="mt-2 divide-y divide-slate-100">
              <DetailRow label="Company" value={vendor.companyName || "-"} />
              <DetailRow label="Email" value={vendor.email || "-"} />
              <DetailRow label="Mobile" value={vendor.mobile || "-"} />
              <DetailRow label="Work phone" value={vendor.workPhone || "-"} />
              <DetailRow label="Language" value={vendor.vendorLanguage || "-"} />
              <DetailRow label="PAN" value={vendor.panNumber || "-"} />
              <DetailRow
                label="Website"
                value={
                  vendor.website ? (
                    <a href={vendor.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow label="Last updated" value={formatDate(vendor.updatedAt)} />
            </dl>
          </div>

          <div className="py-5">
            <p className={microLabel}>Addresses</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[vendor.billingAddress, ...(vendor.shippingAddresses ?? [])].filter(Boolean).map((address, index) => (
                <div key={`${address?.label}-${index}`} className="py-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">
                      {address?.addressType === "BILLING" ? "Billing" : address?.label || "Shipping"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {[address?.attention, address?.addressLine1, address?.addressLine2, address?.city, address?.state, address?.country, address?.postalCode]
                      .filter(Boolean)
                      .join(", ") || "Address not available"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={microLabel}>Documents</p>
                <p className="mt-1 text-sm text-slate-500">Compliance files, agreements, and vendor paperwork.</p>
              </div>
            </div>
            <div className="mt-4">
              {isDocumentsLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-700" />
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

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={onDeleteVendor} disabled={isDeleting} className={buttonDanger}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete vendor
            </button>
            <button type="button" onClick={onEdit} className={buttonPrimary}>
              <Pencil className="h-4 w-4" />
              Edit vendor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- page ------------------------------- */

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const rows = filteredVendors.map((vendor) => {
    const displayName = vendor.displayName ?? vendor.vendorName;
    return {
      id: vendor.id,
      vendor: (
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1", monogramTone(displayName))}>
            {monogram(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">
              <span>{vendor.vendorCode}</span>
              {" · "}
              {vendor.gstNumber || "GST pending"}
            </p>
          </div>
        </div>
      ),
      contact: (
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-700">{vendor.email || "No email"}</p>
          <p className="truncate text-xs text-slate-500">{vendor.mobile || vendor.phone || "No phone"}</p>
        </div>
      ),
      location: (
        <span className="text-sm text-slate-600">{[vendor.city, vendor.state].filter(Boolean).join(", ") || vendor.country || "-"}</span>
      ),
      status: <StatusChip status={vendor.status} />,
    };
  });

  const stats = [
    { label: "Vendor masters", value: queueStats.total, sub: "supplier records", icon: Building2 },
    { label: "Active", value: queueStats.active, sub: "currently enabled", icon: ShieldCheck },
    { label: "Contact ready", value: queueStats.withContacts, sub: "with contact persons", icon: UserRound },
    { label: "Finance ready", value: queueStats.compliant, sub: "GST and bank on file", icon: Landmark },
  ];

  return (
    <>
      <P2PLayout
        title="Vendor Management"
        subtitle="Maintain supplier profiles with addresses, contacts, bank accounts, validation, and compliance documents."
        meta={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={openCreatePanel} className={buttonPrimary}>
              <Plus className="h-4 w-4" />
              New vendor
            </button>
          </div>
        }
      >
        {/* Stat band: one card, divided — quieter than four floating cards */}
        <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4 sm:divide-x">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100/70 text-sky-600">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-semibold tabular-nums leading-none text-slate-900">{stat.value}</p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="truncate text-[11px] text-slate-400">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <P2PCard
          title="Vendor Directory"
          description="Search the supplier base and open a profile or the full editor without leaving the page."
          contentClassName="-mx-6 -mb-6"
        >
          <div className="mb-4 flex flex-col gap-3 px-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold tabular-nums text-slate-700">{filteredVendors.length}</span> of{" "}
              <span className="font-semibold tabular-nums text-slate-700">{vendors.length}</span> vendors
            </p>
            <div className="relative w-full lg:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, GST, city, contact..."
                className={cn(fieldShellClass(), "pl-9")}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" />
              <p className="mt-3 text-sm text-slate-500">Loading vendors...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-rose-600">{error instanceof Error ? error.message : "Failed to load vendors."}</div>
          ) : rows.length === 0 ? (
            <div className="mx-6 mb-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-6 py-14 text-center">
              <Building2 className="h-6 w-6 text-slate-300" />
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {searchTerm ? "No vendors match this search" : "No vendors yet"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm ? "Try a different name, GST number, or city." : "Create your first vendor profile to get started."}
                </p>
              </div>
              {!searchTerm ? (
                <button type="button" onClick={openCreatePanel} className={buttonPrimary}>
                  <Plus className="h-4 w-4" />
                  New vendor
                </button>
              ) : null}
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
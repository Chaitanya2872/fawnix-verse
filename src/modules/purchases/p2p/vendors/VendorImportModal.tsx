import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadVendorImportTemplate } from "@/modules/purchases/api";
import { usePreviewVendorImport, useImportVendors } from "@/modules/purchases/hooks";
import type {
  VendorImportError,
  VendorImportPreviewResult,
  VendorImportPreviewRow,
  VendorImportResult,
  VendorImportRowStatus,
} from "@/modules/purchases/types";

type Step = "upload" | "preview" | "importing" | "results";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50";

const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function pick(data: Record<string, string | null>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value) return value;
  }
  return "-";
}

function statusTone(status: VendorImportRowStatus) {
  switch (status) {
    case "VALID":
      return { label: "New vendor", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" };
    case "DUPLICATE":
      return { label: "Will update", className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" };
    case "DUPLICATE_IN_FILE":
      return { label: "Skipped (duplicate)", className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
    case "INVALID":
    default:
      return { label: "Needs fix", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" };
  }
}

function rowDetails(row: VendorImportPreviewRow) {
  if (row.errors.length > 0) {
    return row.errors.map((error) => error.message).join(" ");
  }
  if (row.duplicateType) {
    return row.duplicateType;
  }
  return "Ready to import.";
}

function errorsToCsv(errors: VendorImportError[]) {
  const header = "Row,Field,Message\n";
  const body = errors
    .map((error) => {
      const field = (error.field ?? "").replace(/"/g, '""');
      const message = error.message.replace(/"/g, '""');
      return `${error.row},"${field}","${message}"`;
    })
    .join("\n");
  return header + body;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface VendorImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function VendorImportModal({ open, onClose }: VendorImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<VendorImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<VendorImportResult | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewImport = usePreviewVendorImport();
  const importVendors = useImportVendors();

  if (!open) {
    return null;
  }

  function resetAndClose() {
    setStep("upload");
    setFile(null);
    setIsDragging(false);
    setFileError(null);
    setPreviewResult(null);
    setImportResult(null);
    previewImport.reset();
    importVendors.reset();
    onClose();
  }

  function selectFile(candidate: File | null) {
    if (!candidate) return;
    if (!isAcceptedFile(candidate)) {
      setFileError("Please choose a .csv, .xls, or .xlsx file.");
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    try {
      const blob = await downloadVendorImportTemplate();
      triggerDownload(blob, "vendor_import_template.xlsx");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download the vendor import template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleContinue() {
    if (!file) return;
    try {
      const result = await previewImport.mutateAsync(file);
      setPreviewResult(result);
      setStep("preview");
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to validate the file.");
    }
  }

  async function handleConfirmImport() {
    if (!file) return;
    setStep("importing");
    try {
      const result = await importVendors.mutateAsync(file);
      setImportResult(result);
      setStep("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import vendors.");
      setStep("preview");
    }
  }

  function handleDownloadErrorReport() {
    if (!importResult || importResult.errors.length === 0) return;
    const blob = new Blob([errorsToCsv(importResult.errors)], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, "vendor_import_errors.csv");
  }

  const hasBlockingErrors = (previewResult?.invalid ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-in fade-in bg-slate-950/45 backdrop-blur-[2px] duration-200" onClick={resetAndClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl animate-in fade-in zoom-in-95 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Import Vendors</h2>
            <p className="text-xs text-slate-500">
              {step === "upload" && "Upload a CSV, XLS, or XLSX file of vendors."}
              {step === "preview" && "Review parsed rows before importing."}
              {step === "importing" && "Importing vendors..."}
              {step === "results" && "Import complete."}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div key={step} className="flex-1 animate-in fade-in slide-in-from-right-2 overflow-y-auto px-6 py-5 duration-200">
          {step === "upload" ? (
            <div className="space-y-4">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  isDragging ? "border-blue-400 bg-blue-50/60" : "border-slate-300 bg-slate-50/50"
                )}
              >
                <Upload className={cn("h-6 w-6 transition-transform", isDragging ? "scale-110 text-blue-500" : "text-slate-400")} />
                <p className="text-sm text-slate-600">
                  Drag and drop or{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Browse
                  </button>{" "}
                  to upload
                </p>
                <p className="text-xs text-slate-400">Supported formats: csv, xls, xlsx</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                />
              </div>

              {fileError ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {fileError}
                </div>
              ) : null}

              {file ? (
                <div className="flex animate-in fade-in items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
              >
                {isDownloadingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download Template
              </button>
            </div>
          ) : null}

          {step === "preview" && previewResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatChip label="Total rows" value={previewResult.total} tone="slate" />
                <StatChip label="Valid" value={previewResult.valid} tone="emerald" />
                <StatChip label="Duplicate" value={previewResult.duplicate} tone="sky" />
                <StatChip label="Invalid" value={previewResult.invalid} tone="rose" />
              </div>

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-800">
                Existing vendors matched by email or mobile will be <span className="font-semibold">updated</span>. New vendors will
                be <span className="font-semibold">created</span>. Rows marked "Needs fix" will not be imported until corrected.
              </div>

              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row</th>
                      <th className="px-3 py-2 font-semibold">Vendor</th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Mobile</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.rows.map((row) => {
                      const tone = statusTone(row.status);
                      return (
                        <tr key={row.row} className={row.status === "INVALID" ? "bg-rose-50/30" : undefined}>
                          <td className="px-3 py-2 text-xs font-medium text-slate-500">{row.row}</td>
                          <td className="max-w-[160px] truncate px-3 py-2 text-slate-800">
                            {pick(row.data, ["display_name", "vendor_name", "name", "supplier_name"])}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2 text-slate-600">{pick(row.data, ["email", "email_address"])}</td>
                          <td className="px-3 py-2 text-slate-600">{pick(row.data, ["mobile", "mobile_number"])}</td>
                          <td className="px-3 py-2">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", tone.className)}>
                              {tone.label}
                            </span>
                          </td>
                          <td className="max-w-[260px] px-3 py-2 text-xs text-slate-500">{rowDetails(row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === "importing" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">
                Importing {(previewResult?.valid ?? 0) + (previewResult?.duplicate ?? 0)} vendors...
              </p>
              <p className="text-xs text-slate-400">This may take a moment for larger files.</p>
            </div>
          ) : null}

          {step === "results" && importResult ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-slate-800">Import complete</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatChip label="Created" value={importResult.created} tone="emerald" />
                <StatChip label="Updated" value={importResult.updated} tone="sky" />
                <StatChip label="Skipped" value={importResult.skipped} tone="slate" />
                <StatChip label="Failed" value={importResult.failed} tone="rose" />
              </div>
              {importResult.errors.length > 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-rose-700">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {importResult.errors.length} row(s) had issues.
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download error report
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          {step === "preview" ? (
            <button type="button" onClick={() => setStep("upload")} className={buttonSecondary}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {step === "upload" ? (
              <>
                <button type="button" onClick={resetAndClose} className={buttonSecondary}>
                  Cancel
                </button>
                <button type="button" onClick={handleContinue} disabled={!file || previewImport.isPending} className={buttonPrimary}>
                  {previewImport.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Continue
                </button>
              </>
            ) : null}

            {step === "preview" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewResult(null);
                    setStep("upload");
                  }}
                  className={buttonSecondary}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Replace file
                </button>
                <button type="button" onClick={handleConfirmImport} disabled={hasBlockingErrors} className={buttonPrimary}>
                  Import Valid Vendors
                </button>
              </>
            ) : null}

            {step === "results" ? (
              <button type="button" onClick={resetAndClose} className={buttonPrimary}>
                Done
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "sky" | "rose" }) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <div className={cn("rounded-xl px-3 py-2.5 ring-1", toneClasses[tone])}>
      <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
}

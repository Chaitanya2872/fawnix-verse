"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  RotateCcw,
  Save,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WidgetSize = "compact" | "wide" | "full";

type DashboardWidget = {
  id: string;
  label: string;
  category: string;
  size: WidgetSize;
  enabled: boolean;
};

type DashboardTemplate = {
  id: string;
  name: string;
  module: string;
  description: string;
  active: boolean;
  widgets: DashboardWidget[];
};

const TEMPLATE_STORAGE_KEY = "fawnix.dashboard-templates.v1";
const WIDGET_SIZES: WidgetSize[] = ["compact", "wide", "full"];

const DEFAULT_TEMPLATES: DashboardTemplate[] = [
  {
    id: "erp-dashboard",
    name: "ERP Dashboard",
    module: "ERP",
    description: "Executive operating view across modules.",
    active: true,
    widgets: [
      { id: "erp-revenue", label: "Revenue Snapshot", category: "Metric", size: "compact", enabled: true },
      { id: "erp-open-tasks", label: "Open Tasks", category: "Metric", size: "compact", enabled: true },
      { id: "erp-alerts", label: "Approval Alerts", category: "List", size: "wide", enabled: true },
      { id: "erp-module-health", label: "Module Health", category: "Chart", size: "full", enabled: true },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    module: "Inventory",
    description: "Stock position, warehouse health, and movement controls.",
    active: true,
    widgets: [
      { id: "inventory-total", label: "Total Items", category: "Metric", size: "compact", enabled: true },
      { id: "inventory-value", label: "Inventory Value", category: "Metric", size: "compact", enabled: true },
      { id: "inventory-category", label: "Stock by Category", category: "Chart", size: "wide", enabled: true },
      { id: "inventory-health", label: "Stock Health", category: "Chart", size: "wide", enabled: true },
      { id: "inventory-low-stock", label: "Low Stock Watchlist", category: "Table", size: "full", enabled: true },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    module: "Sales",
    description: "Pipeline, orders, billing, and payment visibility.",
    active: true,
    widgets: [
      { id: "sales-quotes", label: "Open Quotations", category: "Metric", size: "compact", enabled: true },
      { id: "sales-orders", label: "Confirmed Orders", category: "Metric", size: "compact", enabled: true },
      { id: "sales-aging", label: "Receivables Aging", category: "Chart", size: "wide", enabled: true },
      { id: "sales-fulfillment", label: "Fulfillment Queue", category: "Table", size: "full", enabled: true },
    ],
  },
  {
    id: "p2p",
    name: "P2P",
    module: "P2P",
    description: "Procurement requests through payment readiness.",
    active: true,
    widgets: [
      { id: "p2p-pr", label: "Pending PRs", category: "Metric", size: "compact", enabled: true },
      { id: "p2p-vendors", label: "Vendor Score", category: "Metric", size: "compact", enabled: true },
      { id: "p2p-receipts", label: "Receipt Exceptions", category: "List", size: "wide", enabled: true },
      { id: "p2p-invoices", label: "Invoice Matching", category: "Table", size: "full", enabled: true },
    ],
  },
  {
    id: "visitor-management",
    name: "Visitor Management",
    module: "Operations",
    description: "Visitor appointments, approvals, desk check-ins, and history.",
    active: true,
    widgets: [
      { id: "vms-today", label: "Today Visitors", category: "Metric", size: "compact", enabled: true },
      { id: "vms-approvals", label: "Pending Approvals", category: "Metric", size: "compact", enabled: true },
      { id: "vms-desk", label: "Desk Activity", category: "List", size: "wide", enabled: true },
      { id: "vms-history", label: "Visitor History", category: "Table", size: "full", enabled: true },
    ],
  },
  {
    id: "project-management",
    name: "Project Management",
    module: "Projects",
    description: "Project progress, tasks, milestones, and team workload.",
    active: true,
    widgets: [
      { id: "projects-active", label: "Active Projects", category: "Metric", size: "compact", enabled: true },
      { id: "projects-overdue", label: "Overdue Tasks", category: "Metric", size: "compact", enabled: true },
      { id: "projects-milestones", label: "Milestone Timeline", category: "Chart", size: "wide", enabled: true },
      { id: "projects-kanban", label: "Kanban Summary", category: "Table", size: "full", enabled: true },
    ],
  },
];

function cloneDefaults() {
  return DEFAULT_TEMPLATES.map((template) => ({
    ...template,
    widgets: template.widgets.map((widget) => ({ ...widget })),
  }));
}

function createId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function isWidgetSize(value: unknown): value is WidgetSize {
  return typeof value === "string" && WIDGET_SIZES.includes(value as WidgetSize);
}

function normalizeWidget(value: unknown): DashboardWidget | null {
  if (!value || typeof value !== "object") return null;
  const widget = value as Partial<DashboardWidget>;
  if (typeof widget.id !== "string" || typeof widget.label !== "string") return null;
  return {
    id: widget.id,
    label: widget.label,
    category: typeof widget.category === "string" ? widget.category : "Widget",
    size: isWidgetSize(widget.size) ? widget.size : "compact",
    enabled: Boolean(widget.enabled),
  };
}

function normalizeTemplate(value: unknown): DashboardTemplate | null {
  if (!value || typeof value !== "object") return null;
  const template = value as Partial<DashboardTemplate>;
  if (
    typeof template.id !== "string" ||
    typeof template.name !== "string" ||
    typeof template.module !== "string" ||
    !Array.isArray(template.widgets)
  ) {
    return null;
  }

  const widgets = template.widgets.map(normalizeWidget).filter((widget): widget is DashboardWidget => Boolean(widget));
  return {
    id: template.id,
    name: template.name,
    module: template.module,
    description: typeof template.description === "string" ? template.description : "",
    active: Boolean(template.active),
    widgets,
  };
}

function loadTemplates() {
  if (typeof window === "undefined") return cloneDefaults();

  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaults();
    const templates = parsed.map(normalizeTemplate).filter((template): template is DashboardTemplate => Boolean(template));
    return templates.length ? templates : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

function enabledCount(template: DashboardTemplate) {
  return template.widgets.filter((widget) => widget.enabled).length;
}

function getPreviewClass(size: WidgetSize) {
  if (size === "full") return "md:col-span-4";
  if (size === "wide") return "md:col-span-2";
  return "md:col-span-1";
}

export default function DashboardTemplatesPage() {
  const [templates, setTemplates] = useState<DashboardTemplate[]>(() => loadTemplates());
  const [selectedId, setSelectedId] = useState(() => loadTemplates()[0]?.id ?? DEFAULT_TEMPLATES[0].id);
  const [saved, setSaved] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates]
  );

  const activeTemplates = templates.filter((template) => template.active).length;
  const enabledWidgets = selectedTemplate ? enabledCount(selectedTemplate) : 0;

  useEffect(() => {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  function updateSelectedTemplate(patch: Partial<DashboardTemplate>) {
    if (!selectedTemplate) return;
    setTemplates((current) =>
      current.map((template) => (template.id === selectedTemplate.id ? { ...template, ...patch } : template))
    );
  }

  function updateWidget(widgetId: string, patch: Partial<DashboardWidget>) {
    if (!selectedTemplate) return;
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              widgets: template.widgets.map((widget) => (widget.id === widgetId ? { ...widget, ...patch } : widget)),
            }
          : template
      )
    );
  }

  function moveWidget(widgetId: string, direction: -1 | 1) {
    if (!selectedTemplate) return;
    const index = selectedTemplate.widgets.findIndex((widget) => widget.id === widgetId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedTemplate.widgets.length) return;

    const nextWidgets = [...selectedTemplate.widgets];
    const [widget] = nextWidgets.splice(index, 1);
    nextWidgets.splice(nextIndex, 0, widget);
    updateSelectedTemplate({ widgets: nextWidgets });
  }

  function duplicateTemplate() {
    if (!selectedTemplate) return;
    const duplicate: DashboardTemplate = {
      ...selectedTemplate,
      id: createId(selectedTemplate.id),
      name: `${selectedTemplate.name} Copy`,
      active: false,
      widgets: selectedTemplate.widgets.map((widget) => ({ ...widget, id: createId(widget.id) })),
    };
    setTemplates((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
  }

  function resetDefaults() {
    const defaults = cloneDefaults();
    setTemplates(defaults);
    setSelectedId(defaults[0]?.id ?? DEFAULT_TEMPLATES[0].id);
    setSaved(false);
  }

  function saveTemplates() {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">Manage Templates</h1>
          <p className="mt-1 text-sm text-slate-500">Dashboard presets and widget layouts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={duplicateTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={saveTemplates}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Templates</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{templates.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{activeTemplates}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enabled Widgets</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{enabledWidgets}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Templates</p>
          </div>
          <div className="divide-y divide-slate-100">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                  selectedTemplate.id === template.id && "bg-brand-50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    selectedTemplate.id === template.id
                      ? "border-brand-200 bg-white text-brand-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{template.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {template.module} · {enabledCount(template)} widgets
                  </span>
                </span>
                {template.active ? <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" /> : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Template Name
                  </span>
                  <input
                    value={selectedTemplate.name}
                    onChange={(event) => updateSelectedTemplate({ name: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Module
                  </span>
                  <input
                    value={selectedTemplate.module}
                    onChange={(event) => updateSelectedTemplate({ module: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </span>
                  <textarea
                    value={selectedTemplate.description}
                    onChange={(event) => updateSelectedTemplate({ description: event.target.value })}
                    className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedTemplate.active}
                  onChange={(event) => updateSelectedTemplate({ active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-semibold text-slate-700">Active template</span>
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Widgets</h2>
                  <p className="mt-1 text-xs text-slate-500">{selectedTemplate.widgets.length} configured widgets</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedTemplate.widgets.map((widget, index) => (
                  <div key={widget.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_150px_120px_88px] lg:items-center">
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={widget.enabled}
                        onChange={(event) => updateWidget(widget.id, { enabled: event.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{widget.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{widget.category}</span>
                      </span>
                    </label>
                    <input
                      value={widget.label}
                      onChange={(event) => updateWidget(widget.id, { label: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    <select
                      value={widget.size}
                      onChange={(event) => updateWidget(widget.id, { size: event.target.value as WidgetSize })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold capitalize text-slate-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    >
                      {WIDGET_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => moveWidget(widget.id, -1)}
                        disabled={index === 0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                        aria-label={`Move ${widget.label} up`}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(widget.id, 1)}
                        disabled={index === selectedTemplate.widgets.length - 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                        aria-label={`Move ${widget.label} down`}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedTemplate.module}</p>
              </div>
              <Eye className="h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-1">
              {selectedTemplate.widgets
                .filter((widget) => widget.enabled)
                .map((widget) => (
                  <div
                    key={widget.id}
                    className={cn(
                      "min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3",
                      getPreviewClass(widget.size)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{widget.category}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{widget.label}</p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold capitalize text-slate-500">
                        {widget.size}
                      </span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <div className="h-2 w-2/3 rounded-full bg-brand-500" />
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

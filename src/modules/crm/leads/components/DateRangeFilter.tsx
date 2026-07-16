"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronDown, X } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

export interface LeadDateRange {
  from: string | null; // 'YYYY-MM-DD'
  to: string | null; // 'YYYY-MM-DD'
}

interface DateRangeFilterProps {
  value: LeadDateRange;
  onChange: (value: LeadDateRange) => void;
  className?: string;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

function startOfMonth() {
  const d = new Date();
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function formatShort(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRESETS: { key: string; label: string; range: () => LeadDateRange }[] = [
  { key: "today", label: "Today", range: () => ({ from: startOfDay(0), to: startOfDay(0) }) },
  { key: "7d", label: "Last 7 days", range: () => ({ from: startOfDay(-6), to: startOfDay(0) }) },
  { key: "30d", label: "Last 30 days", range: () => ({ from: startOfDay(-29), to: startOfDay(0) }) },
  { key: "month", label: "This month", range: () => ({ from: startOfMonth(), to: startOfDay(0) }) },
];

export function DateRangeFilter({ value, onChange, className = "" }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LeadDateRange>(value);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function openPopover() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(true);
  }

  const hasRange = Boolean(value.from || value.to);
  const label = hasRange
    ? value.from && value.to
      ? value.from === value.to
        ? formatShort(value.from)
        : `${formatShort(value.from)} – ${formatShort(value.to)}`
      : formatShort(value.from ?? value.to ?? "")
    : "All time";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
          hasRange
            ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        } ${className}`}
      >
        <CalendarRange className="h-3.5 w-3.5" />
        {label}
        {hasRange ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: null, to: null });
            }}
            className="rounded-full p-0.5 hover:bg-sky-100 dark:hover:bg-sky-900"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open ? (
        <div
          ref={popRef}
          style={{ position: "fixed", top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
          className="w-[300px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="border-b border-border p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick ranges
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    const range = preset.range();
                    onChange(range);
                    setOpen(false);
                  }}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950 dark:hover:text-sky-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Custom range
            </p>
            <div className="flex items-center gap-2">
              <DatePicker
                value={draft.from ?? ""}
                onChange={(v) => setDraft((p) => ({ ...p, from: v || null }))}
                placeholder="From"
                className="flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <DatePicker
                value={draft.to ?? ""}
                onChange={(v) => setDraft((p) => ({ ...p, to: v || null }))}
                placeholder="To"
                className="flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange({ from: null, to: null });
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

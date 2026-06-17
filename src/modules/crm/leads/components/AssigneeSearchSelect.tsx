import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { type AssigneeOption } from "../types";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function AssigneeSearchSelect({
  assignees,
  value,
  onChange,
  placeholder = "Select assignee",
  unassignedLabel = "Unassigned",
  disabled = false,
  className = "",
}: {
  assignees: AssigneeOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unassignedLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filteredAssignees = useMemo(() => {
    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) {
      return assignees;
    }
    return assignees.filter((assignee) => normalizeValue(assignee.name).includes(normalizedQuery));
  }, [assignees, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [open]);

  const buttonLabel = value || placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((previous) => !previous);
          }
        }}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground outline-none transition-colors hover:border-sky-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={value ? "truncate" : "truncate text-muted-foreground"}>{buttonLabel}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assignee name..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-8 text-sm text-foreground outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-accent"
            >
              <span>{unassignedLabel}</span>
              {!value ? <Check className="h-3.5 w-3.5 text-sky-600" /> : null}
            </button>

            {filteredAssignees.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No assignees found.
              </div>
            ) : (
              filteredAssignees.map((assignee) => {
                const isSelected = assignee.name === value;

                return (
                  <button
                    key={assignee.id}
                    type="button"
                    onClick={() => {
                      onChange(assignee.name);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-accent"
                  >
                    <span className="truncate">{assignee.name}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 text-sky-600" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

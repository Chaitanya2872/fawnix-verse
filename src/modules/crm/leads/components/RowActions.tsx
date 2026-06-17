import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, MoreHorizontal, Trash2, Users } from "lucide-react";
import { type AssigneeOption, type Lead, LeadStatus } from "../types";
import { getMenuStageTargets, getStageActionLabel, STATUS_CFG } from "../lead-ui";
import { AssigneeSearchSelect } from "./AssigneeSearchSelect";

export function RowActions({
  lead,
  onView,
  onEdit,
  onStatusChange,
  onAssign,
  onDelete,
  assignees,
  isAssigning,
  isDeleting,
}: {
  lead: Lead;
  onView: () => void;
  onEdit: () => void;
  onStatusChange: (s: LeadStatus) => void;
  onAssign: (assignee: AssigneeOption) => void;
  onDelete: () => void;
  assignees: AssigneeOption[];
  isAssigning: boolean;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "assign">("menu");
  const [assigneeQueryValue, setAssigneeQueryValue] = useState(lead.assignedTo ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const stageTargets = getMenuStageTargets(lead.status);

  useEffect(() => {
    function handleDocMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    document.addEventListener("mousedown", handleDocMouseDown);
    return () => document.removeEventListener("mousedown", handleDocMouseDown);
  }, []);

  function closeMenu() {
    setOpen(false);
    setMode("menu");
    setAssigneeQueryValue(lead.assignedTo ?? "");
  }

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
          setMode("menu");
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {mode === "menu" ? (
            <>
              <button onClick={() => { closeMenu(); onView(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <Users className="h-3.5 w-3.5" />
                View Details
              </button>
              <button onClick={() => { closeMenu(); onEdit(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <Check className="h-3.5 w-3.5" />
                Edit Lead
              </button>
              <button onClick={() => setMode("assign")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent">
                <Users className="h-3.5 w-3.5" />
                Assign Lead
              </button>
              <div className="mx-2 border-t border-border" />
              {stageTargets.map((s) => (
                <button
                  key={s}
                  onClick={() => { closeMenu(); onStatusChange(s); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent"
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_CFG[s].dot}`} />
                  {getStageActionLabel(s)}
                </button>
              ))}
              <div className="mx-2 border-t border-border" />
              <button
                onClick={() => { closeMenu(); onDelete(); }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting..." : "Delete Lead"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMode("menu")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to actions
              </button>
              <div className="mx-2 border-t border-border" />
              <div className="p-2">
                <AssigneeSearchSelect
                  assignees={assignees}
                  value={assigneeQueryValue}
                  disabled={isAssigning}
                  onChange={(value) => {
                    setAssigneeQueryValue(value);
                    const assignee = assignees.find((option) => option.name === value);
                    if (assignee && assignee.name !== lead.assignedTo) {
                      closeMenu();
                      onAssign(assignee);
                    }
                  }}
                  placeholder="Search assignee"
                  className="w-full"
                />
              </div>
              <div className="px-3 pb-3 text-xs text-muted-foreground">
                {assigneeQueryValue && assigneeQueryValue === lead.assignedTo
                  ? "This lead is already assigned to the selected sales rep."
                  : "Search by name and choose a sales rep to assign this lead."}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

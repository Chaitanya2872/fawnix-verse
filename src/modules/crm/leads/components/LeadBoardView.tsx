"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle } from "lucide-react";
import { type Lead, LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, type LeadStatus } from "../types";
import { fmt, fmtDate, PriorityDot, RepAvatar, STATUS_CFG } from "../lead-ui";

interface LeadBoardViewProps {
  leads: Lead[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  movingLeadId?: string | null;
  onOpenLead: (lead: Lead) => void;
  onDropStatus: (lead: Lead, status: LeadStatus) => void;
}

function LeadCard({
  lead,
  onOpen,
  disabled,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(lead)}
      disabled={disabled}
      className="flex w-full flex-col gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{lead.name}</p>
          <p className="truncate text-xs text-muted-foreground">{lead.company || "-"}</p>
        </div>
        <PriorityDot priority={lead.priority} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <RepAvatar name={lead.assignedTo || "U"} />
          <span className="truncate text-xs text-muted-foreground">{lead.assignedTo || "Unassigned"}</span>
        </div>
        {lead.estimatedValue ? (
          <span className="flex-shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {fmt(lead.estimatedValue)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmtDate(lead.createdAt)}</span>
        {lead.followUpAt ? (
          <span className="rounded-full bg-cyan-50 px-2 py-0.5 font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
            Follow-up {fmtDate(lead.followUpAt)}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function DraggableLeadCard({
  lead,
  onOpen,
  disabled,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { type: "lead", status: lead.status },
    disabled,
  });

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-40" : undefined} {...attributes} {...listeners}>
      <LeadCard lead={lead} onOpen={onOpen} disabled={disabled} />
    </div>
  );
}

function BoardColumn({
  status,
  leads,
  onOpenLead,
  movingLeadId,
}: {
  status: LeadStatus;
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  movingLeadId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "status-lane", status },
  });

  const { dot } = STATUS_CFG[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] max-w-[280px] flex-shrink-0 flex-col gap-3 rounded-2xl border p-3.5 transition ${
        isOver ? "border-sky-300 bg-sky-50/60 dark:bg-sky-950/30" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <p className="text-sm font-semibold text-foreground">{LEAD_STATUS_LABELS[status]}</p>
        </div>
        <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
          {leads.length}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-360px)] min-h-[120px] flex-col gap-2.5 overflow-y-auto pr-1">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-center text-[11px] text-muted-foreground">
            No leads in this stage
          </div>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard key={lead.id} lead={lead} onOpen={onOpenLead} disabled={movingLeadId === lead.id} />
          ))
        )}
      </div>
    </div>
  );
}

export function LeadBoardView({
  leads,
  isLoading,
  isError,
  errorMessage,
  movingLeadId,
  onOpenLead,
  onDropStatus,
}: LeadBoardViewProps) {
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500/50" />
        <p className="mt-3 text-sm font-medium text-red-600">{errorMessage ?? "Failed to load leads."}</p>
      </div>
    );
  }

  const grouped = LEAD_STATUS_ORDER.reduce<Record<LeadStatus, Lead[]>>((acc, status) => {
    acc[status] = leads.filter((lead) => lead.status === status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const draggingLead = draggingLeadId ? leads.find((lead) => lead.id === draggingLeadId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setDraggingLeadId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingLeadId(null);
    const leadId = String(event.active.id);
    const originStatus = event.active.data.current?.status as LeadStatus | undefined;
    const targetStatus = event.over?.id as LeadStatus | undefined;
    if (!originStatus || !targetStatus || originStatus === targetStatus) {
      return;
    }
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    onDropStatus(lead, targetStatus);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3.5 overflow-x-auto pb-2">
        {LEAD_STATUS_ORDER.map((status) => (
          <BoardColumn key={status} status={status} leads={grouped[status]} onOpenLead={onOpenLead} movingLeadId={movingLeadId} />
        ))}
      </div>
      <DragOverlay>
        {draggingLead ? (
          <div className="w-[280px] rotate-1 opacity-95">
            <LeadCard lead={draggingLead} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

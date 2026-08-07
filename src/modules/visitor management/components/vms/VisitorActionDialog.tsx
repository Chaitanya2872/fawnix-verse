import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { VisitorAction, VisitorRecord } from "../../types";
import { vmsTextareaClassName } from "./VmsPage";

const actionCopy: Record<VisitorAction, { title: string; label: string; description: string; tone: "default" | "destructive" }> = {
  approve: {
    title: "Approve visitor",
    label: "Approve",
    description: "Approve this visitor request and make it available for desk processing.",
    tone: "default",
  },
  reject: {
    title: "Reject visitor",
    label: "Reject",
    description: "Reject this visitor request. Add a reason for the audit trail.",
    tone: "destructive",
  },
  delete: {
    title: "Delete visitor record",
    label: "Delete",
    description: "Delete this visitor record from the workspace. This action cannot be undone.",
    tone: "destructive",
  },
  checkIn: {
    title: "Check in visitor",
    label: "Check In",
    description: "Confirm the visitor is entering the premises now.",
    tone: "default",
  },
  checkOut: {
    title: "Check out visitor",
    label: "Check Out",
    description: "Confirm the visitor has left the premises.",
    tone: "default",
  },
};

export function VisitorActionDialog({
  action,
  visitor,
  busy,
  onCancel,
  onConfirm,
}: {
  action: VisitorAction | null;
  visitor: VisitorRecord | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const copy = action ? actionCopy[action] : null;

  return (
    <Dialog open={Boolean(action && visitor)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy?.title || "Confirm action"}</DialogTitle>
          <DialogDescription>
            {copy?.description} {visitor ? `Visitor: ${visitor.name}.` : ""}
          </DialogDescription>
        </DialogHeader>

        {action === "reject" ? (
          <Label className="space-y-2 text-sm">
            <span>Rejection reason</span>
            <textarea
              ref={reasonRef}
              className={vmsTextareaClassName}
              placeholder="Optional reason visible in visitor history"
            />
          </Label>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={copy?.tone === "destructive" ? "destructive" : "default"}
            onClick={() => onConfirm(reasonRef.current?.value || "")}
            disabled={busy}
          >
            {busy ? "Working..." : copy?.label || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

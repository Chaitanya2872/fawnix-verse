import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Check,
  Download,
  Eye,
  LogIn,
  LogOut,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VMS_PATHS } from "../../routes/paths";
import flowService from "../../services/flowService";
import type { VisitorAction, VisitorRecord } from "../../types";
import {
  canApprove,
  canCheckIn,
  canCheckOut,
  canReject,
  formatDateTime,
  getInitials,
  getPurposeLabel,
  sortVisitorsNewest,
} from "../../utils/visitorWorkflow";
import { StatusPill } from "./StatusPill";

type VisitorTableProps = {
  visitors: VisitorRecord[];
  loading?: boolean;
  emptyMessage?: string;
  actionScope?: "full" | "approval" | "desk" | "history" | "readonly";
  onAction?: (action: VisitorAction, visitor: VisitorRecord) => void;
  onExport?: () => void;
  embedded?: boolean;
};

export function VisitorTable({
  visitors,
  loading = false,
  emptyMessage = "No visitors found.",
  actionScope = "full",
  onAction,
  onExport,
  embedded = false,
}: VisitorTableProps) {
  const [query, setQuery] = useState("");

  const visibleVisitors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sorted = sortVisitorsNewest(visitors);

    if (!normalizedQuery) return sorted;

    return sorted.filter((visitor) =>
      [
        visitor.name,
        visitor.visitorId,
        visitor.email,
        visitor.mobile,
        visitor.company,
        visitor.employeeToMeet,
        visitor.purpose,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [query, visitors]);

  return (
    <div className={cn("overflow-hidden bg-card text-card-foreground", embedded ? "rounded-none border-0 shadow-none" : "rounded-lg border border-border shadow-sm")}>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Label className="relative max-w-md flex-1">
          <span className="sr-only">Search visitors</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search visitor, host, company, ID"
            className="bg-muted/40 pl-9"
          />
        </Label>

        {onExport ? (
          <Button type="button" variant="outline" size="sm" onClick={onExport} disabled={visitors.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Visitor</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3">Host</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                  Loading visitors...
                </td>
              </tr>
            ) : visibleVisitors.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleVisitors.map((visitor) => (
                <tr key={visitor.id} className="align-top transition hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <div className="flex min-w-64 items-center gap-3">
                      {visitor.photo ? (
                        <img className="h-10 w-10 rounded-md object-cover" src={visitor.photo} alt={visitor.name} />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                          {getInitials(visitor.name)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link className="font-semibold text-foreground hover:text-primary" to={VMS_PATHS.visitorDetails(visitor.id)}>
                          {visitor.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{visitor.visitorId || visitor.id}</p>
                        <p className="truncate text-xs text-muted-foreground">{visitor.company || "Individual"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <div className="min-w-40">
                      <p>{formatDateTime(visitor.fromDateTime)}</p>
                      <p className="text-xs text-muted-foreground">to {formatDateTime(visitor.toDateTime)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{visitor.employeeToMeet || "-"}</td>
                  <td className="px-4 py-3 text-foreground">{getPurposeLabel(visitor.purpose)}</td>
                  <td className="px-4 py-3"><StatusPill status={visitor.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-44 flex-wrap justify-end gap-1.5">
                      <Button asChild variant="ghost" size="icon" title="View visitor">
                        <Link to={VMS_PATHS.visitorDetails(visitor.id)} aria-label={`View ${visitor.name}`}>
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      {actionScope !== "readonly" && actionScope !== "history" ? (
                        <Button asChild variant="ghost" size="icon" title="Register face">
                          <Link to={VMS_PATHS.faceRegistrationFor(visitor.id)} aria-label={`Register face for ${visitor.name}`}>
                            <Camera className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      ) : null}
                      {renderActionButtons(visitor, actionScope, onAction)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderActionButtons(
  visitor: VisitorRecord,
  scope: VisitorTableProps["actionScope"],
  onAction?: VisitorTableProps["onAction"],
) {
  if (!onAction || scope === "readonly" || scope === "history") return null;

  return (
    <>
      {(scope === "full" || scope === "approval") && canApprove(visitor) ? (
        <IconAction label={`Approve ${visitor.name}`} onClick={() => onAction("approve", visitor)}>
          <Check className="h-4 w-4" aria-hidden="true" />
        </IconAction>
      ) : null}
      {(scope === "full" || scope === "approval" || scope === "desk") && canReject(visitor) ? (
        <IconAction label={`Reject ${visitor.name}`} onClick={() => onAction("reject", visitor)}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconAction>
      ) : null}
      {(scope === "full" || scope === "desk") && canCheckIn(visitor) ? (
        <Button asChild variant="ghost" size="icon" title={`Open desk for ${visitor.name}`}>
          <Link
            to={VMS_PATHS.desk}
            aria-label={`Open desk for ${visitor.name}`}
            onClick={() => flowService.setCurrentVisitor(visitor)}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
      {(scope === "full" || scope === "desk") && canCheckOut(visitor) ? (
        <IconAction label={`Check out ${visitor.name}`} onClick={() => onAction("checkOut", visitor)}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </IconAction>
      ) : null}
      {scope === "full" ? (
        <IconAction label={`Delete ${visitor.name}`} onClick={() => onAction("delete", visitor)} destructive>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </IconAction>
      ) : null}
    </>
  );
}

function IconAction({
  label,
  children,
  destructive,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

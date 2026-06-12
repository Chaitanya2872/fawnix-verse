import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/modules/auth/hooks";
import { hasStoredSession } from "@/services/api-client";
import { accessRequestsApi } from "@/lib/api";
import { PermissionSelector } from "@/modules/users/PermissionSelector";
import { PERMISSION_GROUPS } from "@/modules/users/permissions";

type AccessRequest = {
  id: string;
  requester: {
    id: string;
    fullName: string;
    email: string;
    roles: string[];
  };
  permissions: string[];
  status: string;
  requestNote: string;
  reviewNote: string;
  reviewedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const ALL_PERMISSION_OPTIONS = PERMISSION_GROUPS.flatMap((group) => group.options);
const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className =
    normalized === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "REJECTED"
        ? "bg-rose-50 text-rose-700"
        : normalized === "CANCELLED"
          ? "bg-slate-100 text-slate-700"
          : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{normalized}</span>;
}

function permissionLabel(permission: string) {
  return ALL_PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ?? permission;
}

function RequestPanel({
  request,
  reviewNotes,
  reviewPermissions,
  setReviewNotes,
  setReviewPermissions,
  onClose,
  onEdit,
  onCancel,
  onApprove,
  onReject,
  isMaster,
  isReviewing,
  isUpdating,
}: {
  request: AccessRequest;
  reviewNotes: Record<string, string>;
  reviewPermissions: Record<string, string[]>;
  setReviewNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setReviewPermissions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onApprove: () => void;
  onReject: () => void;
  isMaster: boolean;
  isReviewing: boolean;
  isUpdating: boolean;
}) {
  const selectedPermissions = reviewPermissions[request.id] ?? request.permissions;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Access Request</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{request.requester.fullName}</h2>
              <p className="mt-1 text-sm text-slate-500">{request.requester.email}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Status</p>
                <p className="text-xs text-slate-500">Created {request.createdAt ? new Date(request.createdAt).toLocaleString() : "just now"}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            {request.requestNote ? <p className="mt-3 text-sm text-slate-700">{request.requestNote}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Requested Permissions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {request.permissions.map((permission) => (
                <span key={permission} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {permissionLabel(permission)}
                </span>
              ))}
            </div>
          </div>

          {isMaster && request.status === "PENDING" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Review & Approve</p>
              <div className="mt-3 space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.heading}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.heading}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {group.options.map((option) => (
                        <label key={`${request.id}-${option.value}`} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(option.value)}
                            onChange={() =>
                              setReviewPermissions((previous) => {
                                const current = previous[request.id] ?? request.permissions;
                                return {
                                  ...previous,
                                  [request.id]: current.includes(option.value)
                                    ? current.filter((value) => value !== option.value)
                                    : [...current, option.value],
                                };
                              })
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <textarea
                  value={reviewNotes[request.id] ?? ""}
                  onChange={(event) => setReviewNotes((previous) => ({ ...previous, [request.id]: event.target.value }))}
                  rows={4}
                  placeholder="Optional review note"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          ) : request.reviewNote || request.reviewedBy ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Review Outcome</p>
              <p className="mt-2 text-sm text-slate-700">
                {request.reviewedBy ? `Reviewed by ${request.reviewedBy.fullName}` : "Reviewed"}
                {request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleString()}` : ""}
              </p>
              {request.reviewNote ? <p className="mt-2 text-sm text-slate-600">{request.reviewNote}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {request.status === "PENDING" && !isMaster ? (
                <>
                  <Button variant="outline" onClick={onEdit} disabled={isUpdating}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={onCancel} disabled={isUpdating}>
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>
            {isMaster && request.status === "PENDING" ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={onReject} disabled={isReviewing}>
                  {isReviewing ? "Working..." : "Reject"}
                </Button>
                <Button onClick={onApprove} disabled={isReviewing || selectedPermissions.length === 0}>
                  {isReviewing ? "Working..." : "Approve"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const isMaster = currentUser?.roles?.includes("ROLE_MASTER") ?? false;

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewPermissions, setReviewPermissions] = useState<Record<string, string[]>>({});
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [masterStatusFilter, setMasterStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [page, setPage] = useState(0);
  const [masterPage, setMasterPage] = useState(0);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const myRequestsQuery = useQuery({
    queryKey: ["access-requests", "me", statusFilter, search, page],
    queryFn: () =>
      accessRequestsApi.listMine({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search,
        page,
        pageSize: 8,
      }),
    enabled: hasStoredSession(),
  });

  const allRequestsQuery = useQuery({
    queryKey: ["access-requests", "all", masterStatusFilter, masterSearch, masterPage],
    queryFn: () =>
      accessRequestsApi.listAll({
        status: masterStatusFilter === "ALL" ? undefined : masterStatusFilter,
        search: masterSearch,
        page: masterPage,
        pageSize: 8,
      }),
    enabled: isMaster,
  });

  const detailRequestQuery = useQuery({
    queryKey: ["access-requests", "detail", selectedRequestId],
    queryFn: () => accessRequestsApi.get(selectedRequestId!),
    enabled: !!selectedRequestId,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { permissions: string[]; requestNote?: string }) => accessRequestsApi.submit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      setSelectedPermissions([]);
      setRequestNote("");
      setEditingRequestId(null);
      toast.success("Access request submitted successfully.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to submit access request."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { permissions: string[]; requestNote?: string } }) =>
      accessRequestsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      queryClient.invalidateQueries({ queryKey: ["access-requests", "detail"] });
      setSelectedPermissions([]);
      setRequestNote("");
      setEditingRequestId(null);
      toast.success("Access request updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update access request."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => accessRequestsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      queryClient.invalidateQueries({ queryKey: ["access-requests", "detail"] });
      setSelectedRequestId(null);
      toast.success("Access request cancelled.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to cancel access request."),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) =>
      accessRequestsApi.review(id, {
        decision,
        permissions: decision === "APPROVE" ? reviewPermissions[id] ?? [] : undefined,
        reviewNote: reviewNotes[id] ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", "all"] });
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      queryClient.invalidateQueries({ queryKey: ["access-requests", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Request status updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to review access request."),
  });

  const myRequests = useMemo(() => (myRequestsQuery.data?.data ?? []) as AccessRequest[], [myRequestsQuery.data]);
  const allRequests = useMemo(() => (allRequestsQuery.data?.data ?? []) as AccessRequest[], [allRequestsQuery.data]);
  const selectedRequest = (detailRequestQuery.data?.data ?? null) as AccessRequest | null;

  const togglePermission = (permission: string) => {
    setSelectedPermissions((previous) =>
      previous.includes(permission) ? previous.filter((item) => item !== permission) : [...previous, permission]
    );
  };

  const isEditing = Boolean(editingRequestId);
  function startEdit(request: AccessRequest) {
    setEditingRequestId(request.id);
    setSelectedPermissions(request.permissions);
    setRequestNote(request.requestNote ?? "");
    setSelectedRequestId(null);
  }

  function submitOrUpdate() {
    const payload = {
      permissions: selectedPermissions,
      requestNote,
    };
    if (isEditing && editingRequestId) {
      updateMutation.mutate({ id: editingRequestId, payload });
      return;
    }
    submitMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Access Requests</h1>
          <p className="text-sm text-slate-500">
            Create, review, update, cancel, search, and paginate access workflows from a single screen.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          End-to-end workflow controls
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Access Request" : "Request Module Access"}</CardTitle>
          <CardDescription>
            Select the modules or pages you need. Approved permissions will be added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <PermissionSelector
              selectedPermissions={selectedPermissions}
              onTogglePermission={togglePermission}
              idPrefix="access-request-permission"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="request-note">Why do you need access?</Label>
            <textarea
              id="request-note"
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              rows={4}
              placeholder="Example: I need Purchases to manage PR approvals for my team."
              className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={submitOrUpdate} disabled={submitMutation.isPending || updateMutation.isPending || selectedPermissions.length === 0}>
              {submitMutation.isPending || updateMutation.isPending ? "Saving..." : isEditing ? "Update Access Request" : "Submit Access Request"}
            </Button>
            {isEditing ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRequestId(null);
                  setSelectedPermissions([]);
                  setRequestNote("");
                }}
              >
                Cancel Edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Track status updates, search past submissions, and edit or cancel pending requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search note, permission, or requester..."
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]);
                setPage(0);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {myRequestsQuery.isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : myRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No access requests submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedRequestId(request.id)}
                  className="w-full rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{request.permissions.map(permissionLabel).join(", ")}</p>
                      <p className="mt-1 text-xs text-slate-500">Requested {request.createdAt ? new Date(request.createdAt).toLocaleString() : "just now"}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  {request.requestNote ? <p className="mt-3 text-sm text-slate-600">{request.requestNote}</p> : null}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing page {(myRequestsQuery.data?.page ?? 0) + 1} of {Math.max(1, myRequestsQuery.data?.totalPages ?? 1)}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setPage((current) => current + 1)} disabled={page + 1 >= (myRequestsQuery.data?.totalPages ?? 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isMaster ? (
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>Filter, search, and review all access requests from master control.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={masterSearch}
                  onChange={(event) => {
                    setMasterSearch(event.target.value);
                    setMasterPage(0);
                  }}
                  placeholder="Search requester, email, or notes..."
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={masterStatusFilter}
                onChange={(event) => {
                  setMasterStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]);
                  setMasterPage(0);
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {allRequestsQuery.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : allRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No access requests found.</p>
            ) : (
              allRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.requester.fullName} ({request.requester.email})
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.permissions
                          .map(
                            (permission) =>
                              ALL_PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ?? permission
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  {request.requestNote ? (
                    <p className="mt-3 text-sm text-slate-600">{request.requestNote}</p>
                  ) : null}

                  {request.status === "PENDING" ? (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Approved Permissions
                        </p>
                        <PermissionSelector
                          selectedPermissions={reviewPermissions[request.id] ?? request.permissions}
                          onTogglePermission={(permission) =>
                            toggleReviewPermission(request.id, permission, request.permissions)
                          }
                          idPrefix={`review-${request.id}`}
                        />
                      </div>
                      <textarea
                        value={reviewNotes[request.id] ?? ""}
                        onChange={(event) =>
                          setReviewNotes((previous) => ({
                            ...previous,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional review note"
                        rows={3}
                        className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => reviewMutation.mutate({ id: request.id, decision: "APPROVE" })}
                          disabled={reviewMutation.isPending || (reviewPermissions[request.id] ?? request.permissions).length === 0}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => reviewMutation.mutate({ id: request.id, decision: "REJECT" })}
                          disabled={reviewMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-500">
                      {request.reviewedBy ? `Reviewed by ${request.reviewedBy.fullName}` : "Reviewed"}
                      {request.reviewNote ? ` - ${request.reviewNote}` : ""}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {selectedRequest ? (
        <RequestPanel
          request={selectedRequest}
          reviewNotes={reviewNotes}
          reviewPermissions={reviewPermissions}
          setReviewNotes={setReviewNotes}
          setReviewPermissions={setReviewPermissions}
          onClose={() => setSelectedRequestId(null)}
          onEdit={() => startEdit(selectedRequest)}
          onCancel={() => cancelMutation.mutate(selectedRequest.id)}
          onApprove={() => reviewMutation.mutate({ id: selectedRequest.id, decision: "APPROVE" })}
          onReject={() => reviewMutation.mutate({ id: selectedRequest.id, decision: "REJECT" })}
          isMaster={isMaster}
          isReviewing={reviewMutation.isPending}
          isUpdating={cancelMutation.isPending}
        />
      ) : null}
    </div>
  );
}

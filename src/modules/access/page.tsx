import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/modules/auth/hooks";
import { hasStoredSession } from "@/services/api-client";
import { accessRequestsApi } from "@/lib/api";
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

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className =
    normalized === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "REJECTED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {normalized}
    </span>
  );
}

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() });
  const isMaster = currentUser?.roles?.includes("ROLE_MASTER") ?? false;

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewPermissions, setReviewPermissions] = useState<Record<string, string[]>>({});

  const myRequestsQuery = useQuery({
    queryKey: ["access-requests", "me"],
    queryFn: () => accessRequestsApi.listMine(),
    enabled: hasStoredSession(),
  });

  const allRequestsQuery = useQuery({
    queryKey: ["access-requests", "all"],
    queryFn: () => accessRequestsApi.listAll(),
    enabled: isMaster,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      accessRequestsApi.submit({
        permissions: selectedPermissions,
        requestNote,
      }),
    onSuccess: () => {
      setSelectedPermissions([]);
      setRequestNote("");
      setSubmitMessage("Access request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error) => {
      setSubmitMessage(error instanceof Error ? error.message : "Failed to submit access request.");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
    }) =>
      accessRequestsApi.review(id, {
        decision,
        permissions: decision === "APPROVE" ? (reviewPermissions[id] ?? []) : undefined,
        reviewNote: reviewNotes[id] ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests", "all"] });
      queryClient.invalidateQueries({ queryKey: ["access-requests", "me"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const myRequests = useMemo(
    () => (myRequestsQuery.data?.data ?? []) as AccessRequest[],
    [myRequestsQuery.data]
  );
  const allRequests = useMemo(
    () => (allRequestsQuery.data?.data ?? []) as AccessRequest[],
    [allRequestsQuery.data]
  );

  const togglePermission = (permission: string) => {
    setSelectedPermissions((previous) =>
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission]
    );
  };

  const toggleReviewPermission = (
    requestId: string,
    permission: string,
    fallbackPermissions: string[]
  ) => {
    setReviewPermissions((previous) => {
      const current = previous[requestId] ?? fallbackPermissions;
      const next = current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission];
      return {
        ...previous,
        [requestId]: next,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Access Requests</h1>
        <p className="text-sm text-slate-500">
          Request module access after login, and let a master user approve the permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Module Access</CardTitle>
          <CardDescription>
            Select the modules or pages you need. Approved permissions will be added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.heading}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.options.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={selectedPermissions.includes(option.value)}
                      onChange={() => togglePermission(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-2">
            <Label htmlFor="request-note">Why do you need access?</Label>
            <textarea
              id="request-note"
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Example: I need Purchases to manage PR approvals for my team."
              rows={4}
              className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {submitMessage ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {submitMessage}
            </div>
          ) : null}

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || selectedPermissions.length === 0}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Access Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Track your pending, approved, and rejected permission requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {myRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No access requests submitted yet.</p>
          ) : (
            myRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {request.permissions
                        .map(
                          (permission) =>
                            ALL_PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ?? permission
                        )
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested {request.createdAt ? new Date(request.createdAt).toLocaleString() : "just now"}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                {request.requestNote ? (
                  <p className="mt-3 text-sm text-slate-600">{request.requestNote}</p>
                ) : null}
                {request.reviewNote ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Review note: {request.reviewNote}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isMaster ? (
        <Card>
          <CardHeader>
            <CardTitle>Approve Requests</CardTitle>
            <CardDescription>Review incoming access requests and grant permissions from here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allRequests.length === 0 ? (
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
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={`${request.id}-${group.heading}`} className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {group.heading}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {group.options.map((option) => {
                                const selected = reviewPermissions[request.id] ?? request.permissions;
                                return (
                                  <label
                                    key={`${request.id}-${option.value}`}
                                    className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-slate-300"
                                      checked={selected.includes(option.value)}
                                      onChange={() =>
                                        toggleReviewPermission(request.id, option.value, request.permissions)
                                      }
                                    />
                                    <span>{option.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
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
    </div>
  );
}

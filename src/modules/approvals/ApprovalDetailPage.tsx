import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, CornerUpLeft, XCircle } from 'lucide-react'
import { approvalsApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'
import { useCurrentUser } from '@/modules/auth/hooks'

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const [comment, setComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['approval-request', id],
    enabled: Boolean(id),
    queryFn: () => approvalsApi.getRequest(id!).then(r => r.data),
  })

  const approval = data?.data ?? data

  const isRequester = approval && currentUser?.id === approval.requester_id
  const canAct = approval?.can_act
  const canResubmit = approval && isRequester && ['changes_requested', 'draft'].includes(approval.status)
  const canCancel = approval && isRequester && ['pending', 'in_review'].includes(approval.status)

  const actionMutation = useMutation({
    mutationFn: (payload: { action: string; comment?: string }) => approvalsApi.act(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-request', id] })
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['approvals-kpis'] })
      setComment('')
    },
  })

  const contextData = useMemo(() => {
    if (!approval?.payload_snapshot) return null
    try {
      return JSON.parse(approval.payload_snapshot)
    } catch {
      return null
    }
  }, [approval?.payload_snapshot])

  const entityLink = useMemo(() => {
    if (!approval?.module || !approval?.entity_type || !approval?.entity_id) return null
    if (approval.module === 'recruitment' && approval.entity_type === 'hiring_request') {
      return `/recruitment/hiring-requests/${approval.entity_id}`
    }
    if (approval.module === 'recruitment' && approval.entity_type === 'offer') {
      return `/recruitment/offers`
    }
    return null
  }, [approval])

  if (!id) {
    return <div className="text-sm text-gray-500">Missing approval request id.</div>
  }

  return (
    <div className="max-w-5xl animate-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/approvals" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">{approval?.title || 'Approval Detail'}</h1>
          <p className="page-subtitle">Approval request details and actions</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <p className="text-sm">Loading approval...</p>
        </div>
      )}

      {!isLoading && approval && (
        <>
          <div className="card p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={cn('badge mt-1', STATUS_COLORS[approval.status] || 'badge-gray')}>
                {approval.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Priority</p>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{approval.priority || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requester</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{approval.requester_name || approval.requester_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requested</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {approval.requested_at ? formatDate(approval.requested_at) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Module</p>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{approval.module}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entity</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{approval.entity_type}</p>
              <p className="text-xs text-gray-500">{approval.entity_id}</p>
              {entityLink && (
                <Link className="text-xs text-brand-600 hover:underline" to={entityLink}>Open related item</Link>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Stages</h2>
            <div className="space-y-3">
              {(approval.stages || []).length === 0 && (
                <p className="text-sm text-gray-500">No stages found.</p>
              )}
              {(approval.stages || []).map((stage: any) => (
                <div key={stage.id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Stage {stage.stage_order}</p>
                      <p className="text-xs text-gray-500">{stage.action_label || stage.role || 'Approver'}</p>
                    </div>
                    <span className={cn('badge', STATUS_COLORS[stage.status] || 'badge-gray')}>
                      {stage.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500">
                    <div>Due: {stage.due_at ? formatDate(stage.due_at) : '-'}</div>
                    <div>Requires all: {stage.requires_all ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="mt-3">
                    {(stage.assignments || []).length === 0 ? (
                      <p className="text-xs text-gray-400">No assignments</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {stage.assignments.map((assign: any) => (
                          <span key={assign.id} className={cn('badge', STATUS_COLORS[assign.status] || 'badge-gray')}>
                            {assign.assignee_type}: {assign.assignee_value} · {assign.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(canAct || canResubmit || canCancel) && (
              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Comment</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment (optional)"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {canAct && (
                    <>
                      <button
                        className="btn-primary"
                        onClick={() => actionMutation.mutate({ action: 'approved', comment })}
                        disabled={actionMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => actionMutation.mutate({ action: 'rejected', comment })}
                        disabled={actionMutation.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => actionMutation.mutate({ action: 'request_changes', comment })}
                        disabled={actionMutation.isPending}
                      >
                        <CornerUpLeft className="w-4 h-4" />
                        Request Changes
                      </button>
                    </>
                  )}
                  {canCancel && (
                    <button
                      className="btn-secondary"
                      onClick={() => actionMutation.mutate({ action: 'cancel', comment })}
                      disabled={actionMutation.isPending}
                    >
                      Cancel
                    </button>
                  )}
                  {canResubmit && (
                    <button
                      className="btn-primary"
                      onClick={() => actionMutation.mutate({ action: 'resubmit', comment })}
                      disabled={actionMutation.isPending}
                    >
                      Resubmit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity</h2>
            <div className="space-y-3">
              {(approval.actions || []).length === 0 && (
                <p className="text-sm text-gray-500">No actions recorded yet.</p>
              )}
              {(approval.actions || []).map((action: any) => (
                <div key={action.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{action.action_type}</p>
                    <p className="text-xs text-gray-500">Actor: {action.actor_id || 'system'}</p>
                    {action.comment && <p className="text-xs text-gray-600 mt-1">{action.comment}</p>}
                  </div>
                  <div className="text-xs text-gray-400">{action.created_at ? formatDate(action.created_at) : '-'}</div>
                </div>
              ))}
            </div>
          </div>

          {contextData && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Context Snapshot</h2>
              <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto">
                {JSON.stringify(contextData, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

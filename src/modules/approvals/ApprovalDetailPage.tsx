import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { recruitmentApi, offersApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

type Params = { entityType?: string; entityId?: string }

export default function ApprovalDetailPage() {
  const { entityType, entityId } = useParams<Params>()
  const qc = useQueryClient()
  const [comment, setComment] = useState('')

  const isHiringRequest = entityType === 'hiring_request'
  const isOffer = entityType === 'offer'

  const { data, isLoading } = useQuery({
    queryKey: ['approval-detail', entityType, entityId],
    enabled: Boolean(entityType && entityId),
    queryFn: () => {
      if (isHiringRequest) return recruitmentApi.getHiringRequest(entityId!).then(r => r.data)
      if (isOffer) return offersApi.get(entityId!).then(r => r.data)
      return Promise.resolve(null)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') => {
      if (isHiringRequest) return recruitmentApi.approveHiringRequest(entityId!, { status, comments: comment || undefined })
      return offersApi.approve(entityId!, { status, comments: comment || undefined })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-detail'] })
      qc.invalidateQueries({ queryKey: ['approval-hiring-requests'] })
      qc.invalidateQueries({ queryKey: ['approval-offers'] })
      setComment('')
    },
  })

  const title = useMemo(() => {
    if (!data) return 'Approval Detail'
    if (isHiringRequest) return data.job_title || 'Hiring Request'
    if (isOffer) return data.candidate_name ? `Offer for ${data.candidate_name}` : 'Offer'
    return 'Approval Detail'
  }, [data, isHiringRequest, isOffer])

  if (!entityType || !entityId) {
    return <div className="text-sm text-gray-500">Missing approval reference.</div>
  }

  return (
    <div className="max-w-4xl animate-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/approvals" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Approval details and actions</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <p className="text-sm">Loading approval...</p>
        </div>
      )}

      {data && (
        <>
          <div className="card p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={cn('badge mt-1', STATUS_COLORS[data.status] || 'badge-gray')}>
                {data.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{data.created_at ? formatDate(data.created_at) : '-'}</p>
            </div>
            {isOffer && (
              <>
                <div>
                  <p className="text-xs text-gray-500">Candidate</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{data.candidate_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{data.position_title || '-'}</p>
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Approval Stages</h2>
            <div className="space-y-3">
              {(data.approvals || []).length === 0 && (
                <p className="text-sm text-gray-500">No approvals found.</p>
              )}
              {(data.approvals || []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Stage {a.level}</p>
                    <p className="text-xs text-gray-500">{a.role || a.approver_id || 'Approver'}</p>
                    {a.comments && <p className="text-xs text-gray-600 mt-1">{a.comments}</p>}
                  </div>
                  <div className="text-right">
                    <span className={cn('badge', STATUS_COLORS[a.status] || 'badge-gray')}>
                      {a.status}
                    </span>
                    {a.decided_at && (
                      <p className="text-xs text-gray-400 mt-1">{formatDate(a.decided_at)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(data.status === 'pending' || data.status === 'pending_approval') && (
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
                <div className="flex items-center gap-3">
                  <button
                    className="btn-primary"
                    onClick={() => approveMutation.mutate('approved')}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => approveMutation.mutate('rejected')}
                    disabled={approveMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

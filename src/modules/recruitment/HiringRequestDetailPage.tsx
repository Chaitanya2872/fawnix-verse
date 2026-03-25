import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

export default function HiringRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['hiring-request', id],
    enabled: Boolean(id),
    queryFn: () => recruitmentApi.getHiringRequest(id!).then(r => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: ({ status }: { status: 'approved' | 'rejected' }) =>
      recruitmentApi.approveHiringRequest(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hiring-request', id] })
      qc.invalidateQueries({ queryKey: ['hiring-requests'] })
    },
  })

  if (!id) {
    return (
      <div className="text-sm text-gray-500">Missing hiring request id.</div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <p className="text-sm">Loading request...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <p className="text-sm">Request not found.</p>
      </div>
    )
  }

  const approvals = [...(data.approvals || [])].sort((a: any, b: any) => a.level - b.level)
  const departmentLabel = data.department_name || data.department_id || 'N/A'

  return (
    <div className="max-w-4xl animate-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/recruitment/hiring-requests" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Hiring Request</h1>
          <p className="page-subtitle">{data.job_title}</p>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <span className={cn('badge mt-1', STATUS_COLORS[data.status] || 'badge-gray')}>
            {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500">Priority</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {data.priority?.charAt(0).toUpperCase() + data.priority?.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Department</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{departmentLabel}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Headcount</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{data.headcount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Current Stage</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{data.current_stage || 'Complete'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Created</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(data.created_at)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Position Status</p>
          {data.position_id ? (
            <p className="text-sm font-medium text-gray-900 mt-1">
              Created ({data.position_status})
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Not created</p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Approvals</h2>
          <Link to={`/approvals/hiring_request/${id}`} className="text-xs text-brand-600 hover:underline">Open in Approvals</Link>
        </div>
        <div className="space-y-3">
          {approvals.length === 0 && (
            <p className="text-sm text-gray-500">No approvals for this request.</p>
          )}
          {approvals.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Stage {a.level}</p>
                <p className="text-xs text-gray-500">{a.role || 'User'}</p>
                {a.comments && (
                  <p className="text-xs text-gray-600 mt-1">{a.comments}</p>
                )}
              </div>
              <div className="text-right">
                <span className={cn('badge', STATUS_COLORS[a.status] || 'badge-gray')}>
                  {a.status?.charAt(0).toUpperCase() + a.status?.slice(1)}
                </span>
                {a.decided_at && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(a.decided_at)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {data.can_approve && data.status === 'pending' && (
          <div className="mt-4 flex items-center gap-3">
            <button
              className="btn-primary"
              onClick={() => approveMutation.mutate({ status: 'approved' })}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              className="btn-secondary"
              onClick={() => approveMutation.mutate({ status: 'rejected' })}
              disabled={approveMutation.isPending}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

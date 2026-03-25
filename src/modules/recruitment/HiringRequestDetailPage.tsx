import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

export default function HiringRequestDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['hiring-request', id],
    enabled: Boolean(id),
    queryFn: () => recruitmentApi.getHiringRequest(id!).then(r => r.data),
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

  const departmentLabel = data.department_name || data.department_id || 'N/A'
  const approvalLink = data.approval_request_id ? `/approvals/requests/${data.approval_request_id}` : null

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
          <p className="text-xs text-gray-500">Approval Status</p>
          <span className={cn('badge mt-1', STATUS_COLORS[data.approval_status] || 'badge-gray')}>
            {data.approval_status || 'not sent'}
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Approvals</h2>
          {approvalLink ? (
            <Link to={approvalLink} className="text-xs text-brand-600 hover:underline">Open in Approvals</Link>
          ) : (
            <span className="text-xs text-gray-400">No approval request yet</span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Use the approvals module to review stages, take actions, or view history.
        </p>
      </div>
    </div>
  )
}

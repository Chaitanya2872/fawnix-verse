import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Clock, Users, Building2, AlertCircle } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-gray-600 bg-gray-100',
}

export default function HiringRequestsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['hiring-requests', statusFilter],
    queryFn: () => recruitmentApi.getHiringRequests(statusFilter === 'all' ? {} : { status: statusFilter })
      .then(r => r.data),
  })

  const requests = data?.data ?? []
  const filtered = requests.filter((r: any) =>
    r.job_title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Hiring Requests</h1>
          <p className="page-subtitle">Manage workforce requirements and approvals</p>
        </div>
        <Link to="/recruitment/hiring-requests/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search requests..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'pending', 'approved', 'rejected', 'draft'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                statusFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Job Title</th>
              <th className="table-header text-left">Department</th>
              <th className="table-header text-left">Headcount</th>
              <th className="table-header text-left">Priority</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Approval</th>
              <th className="table-header text-left">Date</th>
              <th className="table-header text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req: any) => (
              <tr key={req.id} className="table-row">
                <td className="table-cell">
                  <span className="font-medium text-gray-900">{req.job_title}</span>
                </td>
                <td className="table-cell">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />
                    {req.department_name || req.department_id || 'N/A'}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {req.headcount}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('badge text-xs font-medium', PRIORITY_COLORS[req.priority])}>
                    {req.priority?.charAt(0).toUpperCase() + req.priority?.slice(1)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[req.status] || 'badge-gray')}>
                    {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                  </span>
                </td>
                <td className="table-cell text-xs text-gray-500">
                  {req.approval_status || 'Not sent'}
                </td>
                <td className="table-cell text-gray-400 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(req.created_at)}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                    <Link to={`/recruitment/hiring-requests/${req.id}`} className="text-gray-600 hover:text-gray-800 text-xs font-medium">
                      Review
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">Loading hiring requests...</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">No hiring requests found</p>
          </div>
        )}
      </div>
    </div>
  )
}

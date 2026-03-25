import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Filter, Search, XCircle } from 'lucide-react'
import { recruitmentApi, offersApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

type ApprovalItem = {
  id: string
  entityType: 'hiring_request' | 'offer'
  title: string
  status: string
  requestedAt?: string | null
  slaDays?: number | null
  currentStage?: string | null
  assignedTo?: string | null
  entityId: string
}

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected']
const ENTITY_OPTIONS = ['all', 'hiring_request', 'offer']

export default function ApprovalsInboxPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [entityFilter, setEntityFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: hiringData } = useQuery({
    queryKey: ['approval-hiring-requests'],
    queryFn: () => recruitmentApi.getHiringRequests({ limit: 200 }).then(r => r.data),
  })

  const { data: offersData } = useQuery({
    queryKey: ['approval-offers'],
    queryFn: () => offersApi.list().then(r => r.data),
  })

  const approvals = useMemo(() => {
    const items: ApprovalItem[] = []

    const hiringRequests = hiringData?.data ?? []
    hiringRequests.forEach((req: any) => {
      const approvalsList = req.approvals || []
      const rejected = approvalsList.find((a: any) => a.status === 'rejected')
      const pending = approvalsList.find((a: any) => a.status === 'pending')
      const approved = approvalsList.length > 0 && approvalsList.every((a: any) => a.status === 'approved')
      const status = rejected ? 'rejected' : approved ? 'approved' : 'pending'

      const slaDays = req.created_at ? Math.ceil((new Date(req.created_at).getTime() + 3 * 86400000 - Date.now()) / 86400000) : null
      items.push({
        id: `hr_${req.id}`,
        entityType: 'hiring_request',
        title: req.job_title || 'Hiring Request',
        status,
        requestedAt: req.created_at,
        slaDays,
        currentStage: pending ? `Stage ${pending.level}` : req.current_stage,
        assignedTo: pending?.role || 'N/A',
        entityId: req.id,
      })
    })

    const offers = offersData?.data ?? []
    offers.forEach((offer: any) => {
      const approvalsList = offer.approvals || []
      const rejected = approvalsList.find((a: any) => a.status === 'rejected')
      const pending = approvalsList.find((a: any) => a.status === 'pending')
      const approved = approvalsList.length > 0 && approvalsList.every((a: any) => a.status === 'approved')
      const status = rejected ? 'rejected' : approved ? 'approved' : (pending ? 'pending' : offer.status || 'pending')

      const slaDays = offer.created_at ? Math.ceil((new Date(offer.created_at).getTime() + 3 * 86400000 - Date.now()) / 86400000) : null
      items.push({
        id: `offer_${offer.id}`,
        entityType: 'offer',
        title: offer.candidate_name ? `Offer: ${offer.candidate_name}` : 'Offer',
        status,
        requestedAt: offer.created_at,
        slaDays,
        currentStage: pending ? `Stage ${pending.level}` : null,
        assignedTo: pending?.approver_id || 'N/A',
        entityId: offer.id,
      })
    })

    return items
  }, [hiringData, offersData])

  const filtered = approvals.filter(item => {
    const statusMatch = statusFilter === 'all' || item.status === statusFilter
    const entityMatch = entityFilter === 'all' || item.entityType === entityFilter
    const searchMatch = !search.trim() || item.title.toLowerCase().includes(search.toLowerCase())
    return statusMatch && entityMatch && searchMatch
  })

  const stats = {
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="animate-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Approvals Inbox</h1>
          <p className="page-subtitle">Review and act on pending approvals across modules.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: stats.pending, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, cls: 'text-red-500 bg-red-50' },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', card.cls)}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-display font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        <select className="input text-sm py-1.5 w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="input text-sm py-1.5 w-44" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          {ENTITY_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Entities' : s.replace('_', ' ')}</option>
          ))}
        </select>
        <div className="relative ml-auto w-56">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm py-1.5"
            placeholder="Search approvals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Item</th>
              <th className="table-header text-left">Entity</th>
              <th className="table-header text-left">Stage</th>
              <th className="table-header text-left">Assigned</th>
              <th className="table-header text-left">SLA</th>
              <th className="table-header text-left">Requested</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="table-row">
                <td className="table-cell font-medium text-gray-900">{item.title}</td>
                <td className="table-cell text-gray-500">
                  {item.entityType === 'hiring_request' ? 'Hiring Request' : 'Offer'}
                </td>
                <td className="table-cell text-gray-500">{item.currentStage || '-'}</td>
                <td className="table-cell text-gray-500">{item.assignedTo || '-'}</td>
                <td className="table-cell text-gray-500">
                  {item.slaDays !== null && item.slaDays !== undefined ? `${item.slaDays}d` : '-'}
                </td>
                <td className="table-cell text-gray-500">{item.requestedAt ? formatDate(item.requestedAt) : '-'}</td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[item.status] || 'badge-gray')}>
                    {item.status}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={() => navigate(`/approvals/${item.entityType}/${item.entityId}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No approvals match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

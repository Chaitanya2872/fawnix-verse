import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock, History, Inbox, Search, Send, XCircle } from 'lucide-react'
import { approvalsApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

export type ApprovalScope = 'inbox' | 'outbox' | 'history'

type Props = {
  scope: ApprovalScope
  title: string
  subtitle: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'action_required', label: 'Action Required' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const MODULE_OPTIONS = [
  { value: 'all', label: 'All modules' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'org', label: 'Organization' },
  { value: 'forms', label: 'Forms' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'notifications', label: 'Notifications' },
]

export default function ApprovalsListPage({ scope, title, subtitle }: Props) {
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    setPage(0)
  }, [status, priority, moduleFilter, overdueOnly, query])

  const listParams = useMemo(() => {
    const params: Record<string, any> = { skip: page * limit, limit }
    if (status !== 'all') params.status = status
    if (priority !== 'all') params.priority = priority
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (overdueOnly) params.overdue = true
    if (query.trim()) params.q = query.trim()
    return params
  }, [status, priority, moduleFilter, overdueOnly, query, page])

  const kpiParams = useMemo(() => {
    const params: Record<string, any> = {}
    if (priority !== 'all') params.priority = priority
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (query.trim()) params.q = query.trim()
    return params
  }, [priority, moduleFilter, query])

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', scope, listParams],
    queryFn: () => {
      if (scope === 'outbox') return approvalsApi.outbox(listParams).then(r => r.data)
      if (scope === 'history') return approvalsApi.history(listParams).then(r => r.data)
      return approvalsApi.inbox(listParams).then(r => r.data)
    },
  })

  const { data: kpiData } = useQuery({
    queryKey: ['approvals-kpis', scope, kpiParams],
    queryFn: () => approvalsApi.kpis(scope, kpiParams).then(r => r.data?.data ?? r.data),
  })

  const approvals = data?.data ?? []
  const total = data?.total ?? 0
  const kpis = kpiData ?? {}

  const cards = useMemo(() => {
    if (scope === 'outbox') {
      return [
        { key: 'sent', label: 'Sent', value: kpis.sent ?? 0, icon: Send, cls: 'text-indigo-600 bg-indigo-50' },
        { key: 'pending', label: 'Pending', value: kpis.pending ?? 0, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
        { key: 'approved', label: 'Approved', value: kpis.approved ?? 0, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
        { key: 'rejected', label: 'Rejected', value: kpis.rejected ?? 0, icon: XCircle, cls: 'text-red-500 bg-red-50' },
        { key: 'overdue', label: 'Overdue', value: kpis.overdue ?? 0, icon: AlertTriangle, cls: 'text-rose-600 bg-rose-50' },
      ]
    }
    if (scope === 'history') {
      return [
        { key: 'total', label: 'Total', value: kpis.total ?? 0, icon: History, cls: 'text-slate-600 bg-slate-50' },
        { key: 'approved', label: 'Approved', value: kpis.approved ?? 0, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
        { key: 'rejected', label: 'Rejected', value: kpis.rejected ?? 0, icon: XCircle, cls: 'text-red-500 bg-red-50' },
        { key: 'changes_requested', label: 'Changes', value: kpis.changes_requested ?? 0, icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50' },
        { key: 'cancelled', label: 'Cancelled', value: kpis.cancelled ?? 0, icon: XCircle, cls: 'text-gray-500 bg-gray-100' },
      ]
    }
    return [
      { key: 'action_required', label: 'Action Required', value: kpis.action_required ?? 0, icon: Inbox, cls: 'text-indigo-600 bg-indigo-50' },
      { key: 'pending', label: 'Pending', value: kpis.pending ?? 0, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
      { key: 'approved', label: 'Approved', value: kpis.approved ?? 0, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
      { key: 'rejected', label: 'Rejected', value: kpis.rejected ?? 0, icon: XCircle, cls: 'text-red-500 bg-red-50' },
      { key: 'overdue', label: 'Overdue', value: kpis.overdue ?? 0, icon: AlertTriangle, cls: 'text-rose-600 bg-rose-50' },
    ]
  }, [scope, kpis])

  const activeCard = overdueOnly
    ? 'overdue'
    : status !== 'all'
      ? status
      : scope === 'history' && status === 'all'
        ? 'total'
        : scope === 'outbox'
          ? 'sent'
          : 'action_required'

  const handleCardClick = (key: string) => {
    if (key === 'overdue') {
      setOverdueOnly(true)
      setStatus('all')
      return
    }
    setOverdueOnly(false)
    if (key === 'total' || key === 'sent') {
      setStatus('all')
      return
    }
    if (key === 'action_required') {
      setStatus('action_required')
      return
    }
    setStatus(key)
  }

  return (
    <div className="animate-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden sm:inline">Scope:</span>
          <span className="badge-gray capitalize">{scope}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        {[
          { to: '/approvals', label: 'Inbox' },
          { to: '/approvals/outbox', label: 'Outbox' },
          { to: '/approvals/history', label: 'History' },
        ].map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn('px-3 py-1.5 rounded-lg border border-gray-200', isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(card => (
          <button
            key={card.key}
            className={cn('stat-card text-left transition-shadow',
              activeCard === card.key && 'ring-2 ring-brand-200')}
            onClick={() => handleCardClick(card.key)}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', card.cls)}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-display font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          Filters
        </div>
        <select className="input text-sm py-1.5 w-40" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select className="input text-sm py-1.5 w-44" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          {MODULE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select className="input text-sm py-1.5 w-44" value={priority} onChange={e => setPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          className={cn('text-xs px-3 py-1.5 rounded-lg border border-gray-200', overdueOnly && 'bg-rose-50 text-rose-600 border-rose-200')}
          onClick={() => setOverdueOnly(prev => !prev)}
        >
          Overdue
        </button>
        <div className="relative ml-auto w-56">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm py-1.5"
            placeholder="Search approvals..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Title</th>
              <th className="table-header text-left">Module</th>
              <th className="table-header text-left">Entity</th>
              <th className="table-header text-left">Stage</th>
              <th className="table-header text-left">Requested</th>
              <th className="table-header text-left">Due</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="table-cell text-center text-gray-400">Loading approvals...</td>
              </tr>
            )}
            {!isLoading && approvals.map((item: any) => (
              <tr key={item.id} className="table-row">
                <td className="table-cell">
                  <div className="font-medium text-gray-900">{item.title}</div>
                  {item.summary && <div className="text-xs text-gray-500 mt-0.5">{item.summary}</div>}
                  {item.can_act && (
                    <span className="badge badge-purple mt-2">Action required</span>
                  )}
                </td>
                <td className="table-cell text-gray-500 capitalize">{item.module || '-'}</td>
                <td className="table-cell text-gray-500">
                  <div className="text-xs uppercase text-gray-400">{item.entity_type}</div>
                  <div className="text-xs text-gray-500">{item.entity_id}</div>
                </td>
                <td className="table-cell text-gray-500">{item.current_stage || '-'}</td>
                <td className="table-cell text-gray-500">{item.requested_at ? formatDate(item.requested_at) : '-'}</td>
                <td className="table-cell text-gray-500">{item.due_at ? formatDate(item.due_at) : '-'}</td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[item.status] || 'badge-gray')}>
                    {item.status}
                  </span>
                  {item.overdue && <span className="badge badge-red ml-2">Overdue</span>}
                </td>
                <td className="table-cell text-right">
                  <Link className="text-xs text-brand-600 hover:underline" to={`/approvals/requests/${item.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No approvals match the selected filters.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {approvals.length} of {total} approvals</span>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </button>
          <span>Page {page + 1}</span>
          <button
            className="btn-secondary text-xs"
            onClick={() => setPage(p => ((p + 1) * limit < total ? p + 1 : p))}
            disabled={(page + 1) * limit >= total}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

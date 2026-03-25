import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, Eye, Plus, X, Search, Layers } from 'lucide-react'
import { approvalFlowsApi, departmentsApi, recruitmentApi, usersApi } from '@/lib/api'
import { formsApi } from '@/lib/formsApi'
import { cn, STATUS_COLORS } from '@/lib/utils'
import { useCurrentUser } from '@/modules/auth/hooks'
import { hasStoredSession } from '@/services/api-client'

type Position = {
  id: string
  title: string
  status: string
  department_id?: string | null
  department_name?: string | null
  assigned_recruiter_id?: string | null
  hiring_manager_id?: string | null
  level?: string | null
  headcount?: number | null
  target_start_date?: string | null
  budget?: string | null
  approval_flow_id?: string | null
  application_form_id?: string | null
  interview_rounds?: InterviewRound[]
  recruiter_name?: string | null
  candidates_count?: number
  posting_status?: string | null
}

type InterviewRound = {
  round_number: number
  name: string
  type: string
  duration_minutes: number
  panel_roles: string[]
  panel_users: string[]
  scorecard_template_id?: string
}

const STATUS_OPTIONS = ['open', 'paused', 'closed', 'archived']
export default function OpenPositionsPage() {
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() })
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [form, setForm] = useState({
    title: '',
    department_id: '',
    assigned_recruiter_id: '',
    hiring_manager_id: '',
    level: '',
    headcount: '',
    target_start_date: '',
    budget: '',
    approval_flow_id: '',
    application_form_id: '',
    status: 'open',
  })
  const [rounds, setRounds] = useState<InterviewRound[]>([])

  const { data: positionsData, isLoading } = useQuery({
    queryKey: ['positions', statusFilter],
    queryFn: () =>
      recruitmentApi.getPositions(statusFilter === 'all' ? {} : { status: statusFilter }).then(r => r.data),
  })

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => r.data),
  })

  const { data: flowsData } = useQuery({
    queryKey: ['approval-flows'],
    queryFn: () => approvalFlowsApi.list().then(r => r.data),
  })

  const { data: formsData } = useQuery({
    queryKey: ['forms-list'],
    queryFn: () => formsApi.listForms({ module: 'recruitment' }).then(r => r.data),
  })

  const currentRole = currentUser?.roles?.[0]?.replace('ROLE_', '').toLowerCase()
  const canLoadUsers = currentRole === 'admin' || currentRole === 'hr_manager'
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: canLoadUsers,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editing ? recruitmentApi.updatePosition(editing.id, payload) : recruitmentApi.createPosition(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      setModalOpen(false)
      setEditing(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => recruitmentApi.updatePosition(id, { status: 'archived' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['positions'] }),
  })

  const positions: Position[] = positionsData?.data ?? []
  const departments = deptData?.data ?? []
  const flows = flowsData?.data ?? []
  const forms = formsData ?? []
  const recruiters = canLoadUsers
    ? (usersData?.data ?? []).filter((u: any) => u.role === 'recruiter')
    : currentRole === 'recruiter'
      ? [{ id: currentUser?.id, full_name: currentUser?.name, role: currentRole }]
      : []
  const managers = canLoadUsers
    ? (usersData?.data ?? []).filter((u: any) => ['hiring_manager', 'hr_manager'].includes(u.role))
    : []

  const filteredPositions = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return positions
    return positions.filter((p) => {
      return (
        (p.title || '').toLowerCase().includes(needle) ||
        (p.department_name || p.department_id || '').toLowerCase().includes(needle) ||
        (p.recruiter_name || '').toLowerCase().includes(needle)
      )
    })
  }, [positions, search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const openCreate = () => {
    const defaultRecruiter = currentRole === 'recruiter' ? currentUser?.id ?? '' : ''
    setEditing(null)
    setForm({
      title: '',
      department_id: '',
      assigned_recruiter_id: defaultRecruiter,
      hiring_manager_id: '',
      level: '',
      headcount: '',
      target_start_date: '',
      budget: '',
      approval_flow_id: '',
      application_form_id: '',
      status: 'open',
    })
    setRounds([])
    setModalOpen(true)
  }

  const openEdit = (pos: Position) => {
    setEditing(pos)
    setForm({
      title: pos.title || '',
      department_id: pos.department_id || '',
      assigned_recruiter_id: pos.assigned_recruiter_id || '',
      hiring_manager_id: pos.hiring_manager_id || '',
      level: pos.level || '',
      headcount: pos.headcount ? String(pos.headcount) : '',
      target_start_date: pos.target_start_date ? String(pos.target_start_date).slice(0, 10) : '',
      budget: pos.budget ? String(pos.budget) : '',
      approval_flow_id: pos.approval_flow_id || '',
      application_form_id: pos.application_form_id || '',
      status: pos.status || 'open',
    })
    setRounds(pos.interview_rounds || [])
    setModalOpen(true)
  }

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const payload = {
      title: form.title.trim(),
      department_id: form.department_id || undefined,
      assigned_recruiter_id: form.assigned_recruiter_id || undefined,
      hiring_manager_id: form.hiring_manager_id || undefined,
      level: form.level || undefined,
      headcount: form.headcount ? Number(form.headcount) : undefined,
      target_start_date: form.target_start_date || undefined,
      budget: form.budget || undefined,
      approval_flow_id: form.approval_flow_id || undefined,
      application_form_id: form.application_form_id || undefined,
      interview_rounds: rounds.length ? rounds : undefined,
      status: form.status,
    }
    saveMutation.mutate(payload)
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Open Positions</h1><p className="page-subtitle">All approved job openings</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />New Position</button>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        {['all', ...STATUS_OPTIONS].map(s => (
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
        <div className="relative w-full md:w-64 md:ml-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            placeholder="Search positions..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50/70 border-b border-gray-100">
            <th className="table-header text-left">Position</th>
            <th className="table-header text-left">Department</th>
            <th className="table-header text-left">Recruiter</th>
            <th className="table-header text-left">Candidates</th>
            <th className="table-header text-left">Status</th>
            <th className="table-header text-left">Posting</th>
            <th className="table-header text-left"></th>
          </tr></thead>
          <tbody>
            {filteredPositions.map(p => (
              <tr key={p.id} className="table-row">
                <td className="table-cell font-medium text-gray-900">{p.title}</td>
                <td className="table-cell">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />
                    {p.department_name || p.department_id || 'N/A'}
                  </span>
                </td>
                <td className="table-cell text-gray-500">{p.recruiter_name || 'Unassigned'}</td>
                <td className="table-cell">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {p.candidates_count ?? 0}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[p.status] || 'badge-gray')}>
                    {p.status}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[p.posting_status || ''] || 'badge-gray')}>
                    {p.posting_status || 'none'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                      onClick={() => openEdit(p)}
                    >
                      <Eye className="w-3.5 h-3.5" />Edit
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:text-red-600"
                      onClick={() => archiveMutation.mutate(p.id)}
                      disabled={archiveMutation.isPending}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">Loading positions...</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editing ? 'Edit Position' : 'New Position'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Level</label>
                <input
                  className="input"
                  value={form.level}
                  onChange={e => handleChange('level', e.target.value)}
                  placeholder="L3 / Senior"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Department</label>
                <select
                  className="input"
                  value={form.department_id}
                  onChange={e => handleChange('department_id', e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Recruiter</label>
                <select
                  className="input"
                  value={form.assigned_recruiter_id}
                  onChange={e => handleChange('assigned_recruiter_id', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {recruiters.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Hiring Manager</label>
                <select
                  className="input"
                  value={form.hiring_manager_id}
                  onChange={e => handleChange('hiring_manager_id', e.target.value)}
                >
                  <option value="">Select manager</option>
                  {managers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Headcount</label>
                <input
                  className="input"
                  type="number"
                  value={form.headcount}
                  onChange={e => handleChange('headcount', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Start Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.target_start_date}
                  onChange={e => handleChange('target_start_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Budget</label>
                <input
                  className="input"
                  value={form.budget}
                  onChange={e => handleChange('budget', e.target.value)}
                  placeholder="Annual budget"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={e => handleChange('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Approval Flow</label>
                <select
                  className="input"
                  value={form.approval_flow_id}
                  onChange={e => handleChange('approval_flow_id', e.target.value)}
                >
                  <option value="">Select approval flow</option>
                  {flows.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Application Form</label>
                <select
                  className="input"
                  value={form.application_form_id}
                  onChange={e => handleChange('application_form_id', e.target.value)}
                >
                  <option value="">Select form</option>
                  {forms.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Interview Rounds
                </h3>
                <button
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => setRounds(prev => ([
                    ...prev,
                    {
                      round_number: prev.length + 1,
                      name: `Round ${prev.length + 1}`,
                      type: 'technical',
                      duration_minutes: 60,
                      panel_roles: [],
                      panel_users: [],
                    }
                  ]))}
                >
                  + Add Round
                </button>
              </div>
              <div className="space-y-3">
                {rounds.length === 0 && (
                  <p className="text-xs text-gray-500">No interview rounds configured yet.</p>
                )}
                {rounds.map((round, idx) => (
                  <div key={idx} className="p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Round Name</label>
                        <input
                          className="input"
                          value={round.name}
                          onChange={e => {
                            const value = e.target.value
                            setRounds(prev => prev.map((r, i) => i === idx ? { ...r, name: value } : r))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Type</label>
                        <select
                          className="input"
                          value={round.type}
                          onChange={e => {
                            const value = e.target.value
                            setRounds(prev => prev.map((r, i) => i === idx ? { ...r, type: value } : r))
                          }}
                        >
                          <option value="technical">Technical</option>
                          <option value="hr">HR</option>
                          <option value="managerial">Managerial</option>
                          <option value="final">Final</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Duration (mins)</label>
                        <input
                          className="input"
                          type="number"
                          value={round.duration_minutes}
                          onChange={e => {
                            const value = Number(e.target.value)
                            setRounds(prev => prev.map((r, i) => i === idx ? { ...r, duration_minutes: value } : r))
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Panel Roles</label>
                        <input
                          className="input"
                          value={round.panel_roles.join(', ')}
                          onChange={e => {
                            const value = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                            setRounds(prev => prev.map((r, i) => i === idx ? { ...r, panel_roles: value } : r))
                          }}
                          placeholder="e.g. Hiring Manager, Interviewer"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Panel Users (IDs)</label>
                        <input
                          className="input"
                          value={round.panel_users.join(', ')}
                          onChange={e => {
                            const value = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                            setRounds(prev => prev.map((r, i) => i === idx ? { ...r, panel_users: value } : r))
                          }}
                          placeholder="comma-separated user IDs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => setRounds(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, round_number: i + 1 })))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!form.title.trim() || saveMutation.isPending}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

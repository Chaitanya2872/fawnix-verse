import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FileText, Search, UserCheck, UserX } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, STATUS_COLORS, timeAgo } from '@/lib/utils'
import { useCurrentUser } from '@/modules/auth/hooks'
import { hasStoredSession } from '@/services/api-client'

type IntakeRow = {
  id: string
  vacancy_id: string
  form_submission_id?: string | null
  form_id?: string | null
  candidate_name?: string | null
  email?: string | null
  phone?: string | null
  resume_url?: string | null
  source?: string | null
  status?: string | null
  reviewer_id?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  duplicate_of_intake_id?: string | null
}

const STATUS_OPTIONS = ['new', 'reviewed', 'shortlisted', 'rejected']

export default function IntakePage() {
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser({ enabled: hasStoredSession() })
  const [selectedVacancy, setSelectedVacancy] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => recruitmentApi.getPositions({}).then(r => r.data),
  })

  useEffect(() => {
    if (!selectedVacancy && positionsData?.data?.length) {
      setSelectedVacancy(positionsData.data[0].id)
    }
  }, [positionsData, selectedVacancy])

  const params = useMemo(() => ({
    vacancy_id: selectedVacancy || undefined,
    status: statusFilter || undefined,
  }), [selectedVacancy, statusFilter])

  const { data: intakeData, isLoading } = useQuery({
    queryKey: ['intake', params],
    queryFn: () => recruitmentApi.listIntake(params).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      recruitmentApi.updateIntake(id, { status, reviewerId: currentUser?.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intake'] }),
  })

  const shortlistMutation = useMutation({
    mutationFn: (id: string) => recruitmentApi.shortlistIntake(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intake'] }),
  })

  const intakes: IntakeRow[] = intakeData?.data ?? []
  const positions = positionsData?.data ?? []

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return intakes
    return intakes.filter(i =>
      (i.candidate_name || '').toLowerCase().includes(needle) ||
      (i.email || '').toLowerCase().includes(needle)
    )
  }, [intakes, search])

  const positionMap = useMemo(() => {
    const map: Record<string, string> = {}
    positions.forEach((p: any) => { map[p.id] = p.title })
    return map
  }, [positions])

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Candidate Intake</h1>
          <p className="page-subtitle">Review new applicants before they enter the pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 text-sm py-1.5 w-52"
              placeholder="Search name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="input text-sm py-1.5 pr-8 w-44"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative">
            <select
              className="input text-sm py-1.5 pr-8 w-56"
              value={selectedVacancy}
              onChange={e => setSelectedVacancy(e.target.value)}
            >
              <option value="">All vacancies</option>
              {positions.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Candidate</th>
              <th className="table-header text-left">Vacancy</th>
              <th className="table-header text-left">Source</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Submitted</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(intake => (
              <tr key={intake.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                      {(intake.candidate_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{intake.candidate_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{intake.email || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-sm text-gray-600">
                  {positionMap[intake.vacancy_id] || intake.vacancy_id}
                </td>
                <td className="table-cell text-sm text-gray-600">{intake.source || '-'}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <span className={cn('badge', STATUS_COLORS[intake.status || 'new'] || 'badge-gray')}>
                      {(intake.status || 'new').replace('_', ' ')}
                    </span>
                    {intake.duplicate_of_intake_id && (
                      <span className="badge badge-red">Duplicate</span>
                    )}
                  </div>
                </td>
                <td className="table-cell text-sm text-gray-600">
                  {intake.created_at ? timeAgo(intake.created_at) : '-'}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                      onClick={() => updateMutation.mutate({ id: intake.id, status: 'reviewed' })}
                      disabled={updateMutation.isPending}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Mark Reviewed
                    </button>
                    <button
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                      onClick={() => shortlistMutation.mutate(intake.id)}
                      disabled={shortlistMutation.isPending || Boolean(intake.duplicate_of_intake_id)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Shortlist
                    </button>
                    <button
                      className="text-xs text-red-500 hover:underline flex items-center gap-1"
                      onClick={() => updateMutation.mutate({ id: intake.id, status: 'rejected' })}
                      disabled={updateMutation.isPending}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">Loading intake...</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">No intake records found.</div>
        )}
      </div>
    </div>
  )
}

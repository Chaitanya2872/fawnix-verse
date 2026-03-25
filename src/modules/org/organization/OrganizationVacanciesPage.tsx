import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { orgApi, type Vacancy } from '@/lib/orgApi'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<Vacancy['status'], string> = {
  open: 'badge-green',
  closed: 'badge-gray',
}

export default function OrganizationVacanciesPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const { data } = useQuery({
    queryKey: ['org-vacancies'],
    queryFn: () => orgApi.listVacancies().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vacancy['status'] }) => orgApi.updateVacancyStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-vacancies'] }),
  })

  const vacancies: Vacancy[] = data ?? []

  const filteredVacancies = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return vacancies
    return vacancies.filter(v =>
      v.role.toLowerCase().includes(needle) || v.department.toLowerCase().includes(needle)
    )
  }, [vacancies, search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Vacancy Management</h1>
          <p className="page-subtitle">Track headcount vs actual and open roles</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            placeholder="Search vacancies..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Department</th>
              <th className="table-header text-left">Headcount</th>
              <th className="table-header text-left">Filled</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filteredVacancies.map(v => (
              <tr key={v.id} className="table-row">
                <td className="table-cell text-gray-900">{v.role}</td>
                <td className="table-cell text-gray-600">{v.department}</td>
                <td className="table-cell text-gray-600">{v.headcount}</td>
                <td className="table-cell text-gray-600">{v.filled}</td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[v.status])}>{v.status}</span>
                </td>
                <td className="table-cell">
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1"
                    value={v.status}
                    onChange={e => updateMutation.mutate({ id: v.id, status: e.target.value as Vacancy['status'] })}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVacancies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No vacancies found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

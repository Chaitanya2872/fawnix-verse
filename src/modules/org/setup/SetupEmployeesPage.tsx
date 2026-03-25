import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { setupApi, type SetupEmployee } from '@/lib/setupApi'

export default function SetupEmployeesPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['setup-employees'],
    queryFn: () => setupApi.listEmployees().then(r => r.data),
  })

  const [draft, setDraft] = useState({ name: '', email: '', department: '', role: '', manager: '' })

  const addMutation = useMutation({
    mutationFn: () => setupApi.addEmployee(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-employees'] })
      qc.invalidateQueries({ queryKey: ['setup-progress'] })
      setDraft({ name: '', email: '', department: '', role: '', manager: '' })
    },
  })

  const importMutation = useMutation({
    mutationFn: () => setupApi.importEmployees(),
  })

  const employees: SetupEmployee[] = data ?? []

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Employee Creation</h1>
          <p className="page-subtitle">Add or import employees with structured data</p>
        </div>
        <button className="btn-secondary" onClick={() => importMutation.mutate()}>
          <Upload className="w-4 h-4" /> Import CSV
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Add Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input" placeholder="Name" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
          <input className="input" placeholder="Email" value={draft.email} onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))} />
          <input className="input" placeholder="Department" value={draft.department} onChange={e => setDraft(prev => ({ ...prev, department: e.target.value }))} />
          <input className="input" placeholder="Role" value={draft.role} onChange={e => setDraft(prev => ({ ...prev, role: e.target.value }))} />
          <input className="input" placeholder="Manager" value={draft.manager} onChange={e => setDraft(prev => ({ ...prev, manager: e.target.value }))} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => addMutation.mutate()} disabled={!draft.name.trim() || !draft.email.trim()}>
            Add Employee
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Employee</th>
              <th className="table-header text-left">Department</th>
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Manager</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="table-row">
                <td className="table-cell text-gray-900">
                  <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                  <div className="text-xs text-gray-400">{emp.email}</div>
                </td>
                <td className="table-cell text-gray-600">{emp.department}</td>
                <td className="table-cell text-gray-600">{emp.role}</td>
                <td className="table-cell text-gray-600">{emp.manager}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No employees added yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

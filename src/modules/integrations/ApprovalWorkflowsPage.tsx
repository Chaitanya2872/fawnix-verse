import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { approvalFlowsApi, usersApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'employee', label: 'Employee' },
  { value: 'admin', label: 'Admin' },
]

type Stage = {
  order: number
  type: 'role' | 'user'
  role?: string
  approver_user_id?: string
  action_label?: string
}

export default function ApprovalWorkflowsPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stages, setStages] = useState<Stage[]>([
    { order: 1, type: 'role', role: 'hr_manager', action_label: 'Approve' },
  ])

  const { data: flowData } = useQuery({
    queryKey: ['approval-flows'],
    queryFn: () => approvalFlowsApi.list().then(r => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => approvalFlowsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-flows'] })
      setName('')
      setDescription('')
      setStages([{ order: 1, type: 'role', role: 'hr_manager', action_label: 'Approve' }])
    }
  })

  const flows = flowData?.data ?? []
  const users = usersData?.data ?? []

  const addStage = () => {
    setStages(prev => ([
      ...prev,
      { order: prev.length + 1, type: 'role', role: 'hr_manager', action_label: 'Approve' }
    ]))
  }

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const updateStage = (idx: number, patch: Partial<Stage>) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  const handleCreate = () => {
    const payload = {
      name,
      description,
      stages: stages.map(s => ({
        order: s.order,
        role: s.type === 'role' ? s.role : undefined,
        approver_user_id: s.type === 'user' ? s.approver_user_id : undefined,
        action_label: s.action_label,
      }))
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="max-w-4xl animate-in space-y-6">
      <div>
        <h1 className="page-title">Approval Workflows</h1>
        <p className="page-subtitle">Create reusable approval flows with ordered stages.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Create Flow</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Flow Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <div key={idx} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Stage {stage.order}</span>
                {stages.length > 1 && (
                  <button className="text-gray-400 hover:text-red-500" onClick={() => removeStage(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Approver Type</label>
                  <select
                    className="input"
                    value={stage.type}
                    onChange={e => updateStage(idx, { type: e.target.value as 'role' | 'user' })}
                  >
                    <option value="role">Role</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role / User</label>
                  {stage.type === 'role' ? (
                    <select
                      className="input"
                      value={stage.role}
                      onChange={e => updateStage(idx, { role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="input"
                      value={stage.approver_user_id || ''}
                      onChange={e => updateStage(idx, { approver_user_id: e.target.value })}
                    >
                      <option value="">Select user</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Action Label</label>
                  <input
                    className="input"
                    value={stage.action_label || ''}
                    onChange={e => updateStage(idx, { action_label: e.target.value })}
                    placeholder="Approve"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="btn-secondary" onClick={addStage}>
            <Plus className="w-4 h-4" />
            Add Stage
          </button>
          <button className={cn('btn-primary', createMutation.isPending && 'opacity-70')} onClick={handleCreate}>
            Create Flow
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Existing Flows</h2>
        <div className="space-y-3">
          {flows.length === 0 && (
            <p className="text-sm text-gray-500">No approval flows created yet.</p>
          )}
          {flows.map((flow: any) => (
            <div key={flow.id} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{flow.name}</p>
                  <p className="text-xs text-gray-500">{flow.description || 'No description'}</p>
                </div>
                <span className={cn('badge', flow.is_active ? 'badge-green' : 'badge-gray')}>
                  {flow.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {flow.stages.map((s: any) => (
                  <span key={s.id} className="badge-blue">
                    Stage {s.order}: {s.role || 'User'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

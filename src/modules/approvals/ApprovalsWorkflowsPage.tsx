import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { approvalFlowsApi, usersApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/modules/auth/hooks'

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
  requires_all?: boolean
  sla_days?: number | ''
}

const EMPTY_STAGE: Stage = { order: 1, type: 'role', role: 'hr_manager', action_label: 'Approve', requires_all: true, sla_days: '' }

export default function ApprovalsWorkflowsPage() {
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const canManage = currentUser?.roles?.includes('ROLE_ADMIN') || currentUser?.roles?.includes('ROLE_HR_MANAGER')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('v1.0')
  const [active, setActive] = useState(true)
  const [stages, setStages] = useState<Stage[]>([EMPTY_STAGE])

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
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => approvalFlowsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-flows'] })
      resetForm()
    }
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => approvalFlowsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approval-flows'] })
  })

  const flows = flowData?.data ?? []
  const users = usersData?.data ?? []

  const addStage = () => {
    setStages(prev => ([
      ...prev,
      { ...EMPTY_STAGE, order: prev.length + 1 }
    ]))
  }

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const updateStage = (idx: number, patch: Partial<Stage>) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setVersion('v1.0')
    setActive(true)
    setStages([EMPTY_STAGE])
  }

  const handleEdit = (flow: any) => {
    setEditingId(flow.id)
    setName(flow.name || '')
    setDescription(flow.description || '')
    setVersion(flow.version || 'v1.0')
    setActive(Boolean(flow.is_active))
    setStages(
      (flow.stages || []).map((stage: any) => ({
        order: stage.order,
        type: stage.approver_user_id ? 'user' : 'role',
        role: stage.role || 'hr_manager',
        approver_user_id: stage.approver_user_id || '',
        action_label: stage.action_label || 'Approve',
        requires_all: stage.requires_all ?? true,
        sla_days: stage.sla_days ?? '',
      }))
    )
  }

  const handleSave = () => {
    if (!name.trim()) return
    const payload = {
      name,
      description,
      version,
      is_active: active,
      stages: stages.map(s => ({
        order: s.order,
        role: s.type === 'role' ? s.role : undefined,
        approver_user_id: s.type === 'user' ? s.approver_user_id : undefined,
        action_label: s.action_label,
        requires_all: s.requires_all ?? true,
        sla_days: s.sla_days === '' ? undefined : s.sla_days,
      }))
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  const helperText = useMemo(() => {
    if (editingId) return 'Update the flow details and stages.'
    return 'Create a reusable approval flow with ordered stages.'
  }, [editingId])

  return (
    <div className="max-w-5xl animate-in space-y-6">
      <div>
        <h1 className="page-title">Approval Workflows</h1>
        <p className="page-subtitle">{helperText}</p>
      </div>

      {!canManage && (
        <div className="card p-4 text-sm text-gray-500">
          You have view-only access to approval flows.
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">{editingId ? 'Edit Flow' : 'Create Flow'}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Flow Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} disabled={!canManage} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} disabled={!canManage} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Version</label>
            <input className="input" value={version} onChange={e => setVersion(e.target.value)} disabled={!canManage} />
          </div>
          <div className="flex items-center gap-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Active</label>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} disabled={!canManage} />
          </div>
        </div>

        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <div key={idx} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Stage {stage.order}</span>
                {stages.length > 1 && canManage && (
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
                    disabled={!canManage}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
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
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Requires All</label>
                  <select
                    className="input"
                    value={stage.requires_all ? 'all' : 'any'}
                    onChange={e => updateStage(idx, { requires_all: e.target.value === 'all' })}
                    disabled={!canManage}
                  >
                    <option value="all">All approvers</option>
                    <option value="any">Any approver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SLA Days</label>
                  <input
                    type="number"
                    className="input"
                    value={stage.sla_days}
                    onChange={e => updateStage(idx, { sla_days: e.target.value ? Number(e.target.value) : '' })}
                    disabled={!canManage}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="btn-secondary" onClick={addStage} disabled={!canManage}>
            <Plus className="w-4 h-4" />
            Add Stage
          </button>
          <button className={cn('btn-primary', isBusy && 'opacity-70')} onClick={handleSave} disabled={!canManage}>
            {editingId ? 'Update Flow' : 'Create Flow'}
          </button>
          {editingId && (
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
          )}
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
                  <p className="text-xs text-gray-400 mt-1">Version {flow.version || 'v1.0'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('badge', flow.is_active ? 'badge-green' : 'badge-gray')}>
                    {flow.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {canManage && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => handleEdit(flow)}>
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      {flow.is_active && (
                        <button className="btn-secondary text-xs" onClick={() => deactivateMutation.mutate(flow.id)}>
                          Deactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
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

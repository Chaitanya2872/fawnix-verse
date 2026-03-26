import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setupApi, type WorkflowConfig } from '@/lib/setupApi'

export default function SetupWorkflowsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['setup-workflows'],
    queryFn: () => setupApi.listWorkflows().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; description: string }) =>
      setupApi.updateWorkflow(payload.id, { description: payload.description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-workflows'] })
      qc.invalidateQueries({ queryKey: ['setup-progress'] })
    },
  })

  const workflows: WorkflowConfig[] = data ?? []

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="page-title">Approval Workflows</h1>
        <p className="page-subtitle">Define approval chains for HR actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map(flow => (
          <div key={flow.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{flow.name}</h3>
              <Link to="/settings/approval-workflows" className="text-xs text-brand-600 hover:underline">
                Configure
              </Link>
            </div>
            <p className="text-xs text-gray-500">{flow.description}</p>
            <div className="text-xs text-gray-400">Approvers: {flow.approvers.join(' > ')}</div>
            <div className="pt-2">
              <button
                className="btn-secondary text-xs"
                onClick={() => updateMutation.mutate({ id: flow.id, description: `${flow.description} (updated)` })}
              >
                Mark Reviewed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

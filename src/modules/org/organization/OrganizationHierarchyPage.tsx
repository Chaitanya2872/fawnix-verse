import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, type OrgNode } from '@/lib/orgApi'

export default function OrganizationHierarchyPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['org-hierarchy'],
    queryFn: () => orgApi.listOrgNodes().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ nodeId, managerId }: { nodeId: string; managerId?: string }) => orgApi.updateManager(nodeId, managerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-hierarchy'] }),
  })

  const nodes: OrgNode[] = data ?? []

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="page-title">Hierarchy Editor</h1>
        <p className="page-subtitle">Adjust reporting lines and simulate drag-and-drop changes</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Employee</th>
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Manager</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(node => (
              <tr key={node.id} className="table-row">
                <td className="table-cell text-gray-900">{node.name}</td>
                <td className="table-cell text-gray-600">{node.role}</td>
                <td className="table-cell">
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1"
                    value={node.manager_id || ''}
                    onChange={e => updateMutation.mutate({ nodeId: node.id, managerId: e.target.value || undefined })}
                  >
                    <option value="">No manager</option>
                    {nodes.filter(n => n.id !== node.id).map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </td>
                <td className="table-cell text-gray-500 text-xs">Drag to reorder (placeholder)</td>
              </tr>
            ))}
          </tbody>
        </table>
        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No hierarchy data found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

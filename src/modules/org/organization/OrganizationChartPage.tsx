import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orgApi, type OrgNode } from '@/lib/orgApi'

export default function OrganizationChartPage() {
  const { data } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => orgApi.listOrgNodes().then(r => r.data),
  })

  const nodes: OrgNode[] = data ?? []
  const topLevel = useMemo(() => nodes.filter(n => !n.manager_id).length, [nodes])

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Org Chart</h1>
          <p className="page-subtitle">Visual hierarchy of reporting relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <span className="text-xs text-gray-500">Top-level leaders</span>
          <div className="text-xl font-semibold text-gray-900">{topLevel}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-500">Total nodes</span>
          <div className="text-xl font-semibold text-gray-900">{nodes.length}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-500">Departments</span>
          <div className="text-xl font-semibold text-gray-900">{new Set(nodes.map(n => n.department)).size}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Employee</th>
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Department</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(node => (
              <tr key={node.id} className="table-row">
                <td className="table-cell">
                  <div style={{ paddingLeft: `${node.level * 18}px` }} className="text-sm font-medium text-gray-900">
                    {node.name}
                  </div>
                  {node.manager_id && (
                    <div className="text-xs text-gray-400" style={{ paddingLeft: `${node.level * 18}px` }}>
                      Reports to {nodes.find(n => n.id === node.manager_id)?.name || 'Manager'}
                    </div>
                  )}
                </td>
                <td className="table-cell text-gray-600">{node.role}</td>
                <td className="table-cell text-gray-600">{node.department}</td>
                <td className="table-cell">
                  <button className="text-xs text-brand-600 hover:underline">View profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No org chart data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

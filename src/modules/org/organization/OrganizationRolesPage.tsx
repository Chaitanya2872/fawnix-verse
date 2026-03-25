import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, type RoleMapping } from '@/lib/orgApi'

export default function OrganizationRolesPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['org-role-mappings'],
    queryFn: () => orgApi.listRoleMappings().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, department }: { id: string; department: string }) => orgApi.updateRoleMapping(id, department),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-role-mappings'] }),
  })

  const mappings: RoleMapping[] = data ?? []
  const departments = Array.from(new Set(mappings.map(m => m.department)))

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="page-title">Role Mapping</h1>
        <p className="page-subtitle">Map positions to departments and organizational structure</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Department</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(mapping => (
              <tr key={mapping.id} className="table-row">
                <td className="table-cell text-gray-900">{mapping.role}</td>
                <td className="table-cell">
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1"
                    value={mapping.department}
                    onChange={e => updateMutation.mutate({ id: mapping.id, department: e.target.value })}
                  >
                    {departments.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </td>
                <td className="table-cell text-gray-500 text-xs">Updated instantly</td>
              </tr>
            ))}
          </tbody>
        </table>
        {mappings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No roles mapped yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

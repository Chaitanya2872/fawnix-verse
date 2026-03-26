import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { setupApi, type SetupPolicy } from '@/lib/setupApi'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<SetupPolicy['status'], string> = {
  configured: 'badge-green',
  not_configured: 'badge-yellow',
}

export default function SetupPoliciesPage() {
  const { data } = useQuery({
    queryKey: ['setup-policies'],
    queryFn: () => setupApi.listPolicies().then(r => r.data),
  })

  const policies: SetupPolicy[] = data ?? []

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="page-title">Policies & Configuration</h1>
        <p className="page-subtitle">Link external systems and configure payroll policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policies.map(policy => (
          <div key={policy.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{policy.name}</h3>
              <span className={cn('badge', STATUS_COLORS[policy.status])}>{policy.status.replace('_', ' ')}</span>
            </div>
            <p className="text-xs text-gray-500">Owner: {policy.owner}</p>
            {policy.name.includes('Payroll') && (
              <Link to="/payroll/settings" className="text-xs text-brand-600 hover:underline">Open Payroll Settings</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

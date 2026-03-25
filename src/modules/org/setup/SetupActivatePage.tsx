import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { setupApi } from '@/lib/setupApi'
import { cn } from '@/lib/utils'

const modules = [
  { name: 'Recruitment', href: '/recruitment/pipeline' },
  { name: 'Pre-Onboarding', href: '/preboarding' },
  { name: 'Onboarding', href: '/onboarding' },
  { name: 'Core HR', href: '/core-hr/employees' },
  { name: 'Organization', href: '/organization/chart' },
  { name: 'Payroll', href: '/payroll' },
  { name: 'Learning', href: '/learning/courses' },
  { name: 'ESS', href: '/ess' },
  { name: 'Exit', href: '/exit' },
]

export default function SetupActivatePage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['setup-progress'],
    queryFn: () => setupApi.getProgress().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: () => setupApi.activate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setup-progress'] }),
  })

  const progress = data

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="page-title">Module Activation</h1>
        <p className="page-subtitle">Enable modules after foundation setup is complete</p>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Setup Status</div>
          <div className="text-lg font-semibold text-gray-900">
            {progress?.activate ? 'All modules activated' : 'Activation pending'}
          </div>
        </div>
        <button className="btn-primary" onClick={() => updateMutation.mutate()}>
          Mark Setup Complete
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map(mod => (
          <div key={mod.name} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{mod.name}</h3>
              <span className={cn('badge', progress?.activate ? 'badge-green' : 'badge-gray')}>
                {progress?.activate ? 'Ready' : 'Not Ready'}
              </span>
            </div>
            <Link to={mod.href} className="text-xs text-brand-600 hover:underline">Go to module</Link>
          </div>
        ))}
      </div>
    </div>
  )
}

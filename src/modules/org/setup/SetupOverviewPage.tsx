import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { setupApi, type SetupProgress } from '@/lib/setupApi'
import { cn } from '@/lib/utils'

const steps = [
  { key: 'company', label: 'Company Setup', href: '/setup/company' },
  { key: 'users', label: 'User Management', href: '/setup/users' },
  { key: 'organization', label: 'Organization Structure', href: '/organization/structure' },
  { key: 'locations', label: 'Locations & Designations', href: '/organization/structure' },
  { key: 'employees', label: 'Employee Creation', href: '/setup/employees' },
  { key: 'hierarchy', label: 'Org Hierarchy', href: '/organization/hierarchy' },
  { key: 'policies', label: 'Policies & Config', href: '/setup/policies' },
  { key: 'workflows', label: 'Workflows', href: '/setup/workflows' },
  { key: 'activate', label: 'Module Activation', href: '/setup/activate' },
] as const

export default function SetupOverviewPage() {
  const { data } = useQuery({
    queryKey: ['setup-progress'],
    queryFn: () => setupApi.getProgress().then(r => r.data),
  })

  const progress = data
  const completed = progress ? Object.values(progress).filter(Boolean).length : 0
  const total = steps.length

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Setup Overview</h1>
          <p className="page-subtitle">Complete the foundation before enabling HR modules</p>
        </div>
        <Link to="/setup/wizard" className="btn-primary">Start Wizard</Link>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Progress</div>
          <div className="text-lg font-semibold text-gray-900">{completed}/{total} steps completed</div>
        </div>
        <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600" style={{ width: `${(completed / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(step => {
          const isDone = Boolean(progress && progress[step.key as keyof SetupProgress])
          return (
            <Link key={step.key} to={step.href} className="card p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{step.label}</h3>
                  <p className="text-xs text-gray-400">Configure {step.label.toLowerCase()}</p>
                </div>
                <span className={cn('badge', isDone ? 'badge-green' : 'badge-gray')}>
                  {isDone ? 'Done' : 'Pending'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

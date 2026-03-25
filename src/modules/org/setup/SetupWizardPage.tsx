import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { setupApi, type SetupProgress } from '@/lib/setupApi'
import { cn } from '@/lib/utils'

const steps = [
  { key: 'company', label: 'Company Info', href: '/setup/company' },
  { key: 'users', label: 'Create Users', href: '/setup/users' },
  { key: 'organization', label: 'Organization Structure', href: '/organization/structure' },
  { key: 'locations', label: 'Locations & Designations', href: '/organization/structure' },
  { key: 'employees', label: 'Add Employees', href: '/setup/employees' },
  { key: 'hierarchy', label: 'Assign Managers', href: '/organization/hierarchy' },
  { key: 'policies', label: 'Policies & Config', href: '/setup/policies' },
  { key: 'workflows', label: 'Approval Workflows', href: '/setup/workflows' },
  { key: 'activate', label: 'Module Activation', href: '/setup/activate' },
] as const

export default function SetupWizardPage() {
  const [current, setCurrent] = useState(0)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['setup-progress'],
    queryFn: () => setupApi.getProgress().then(r => r.data),
  })

  const progress = data
  const step = steps[current]

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="page-title">Setup Wizard</h1>
        <p className="page-subtitle">Step-by-step configuration for your HRMS</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Step {current + 1} of {steps.length}</div>
          <div className="text-xs text-gray-500">{step.label}</div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">{step.label}</h3>
        <p className="text-xs text-gray-500">Complete the step in {step.label.toLowerCase()} and mark it done.</p>
        <Link className="btn-secondary" to={step.href}>Open {step.label}</Link>
        <div className="flex items-center justify-between">
          <span className={cn('badge', progress && progress[step.key as keyof SetupProgress] ? 'badge-green' : 'badge-gray')}>
            {progress && progress[step.key as keyof SetupProgress] ? 'Completed' : 'Pending'}
          </span>
          <button className="btn-primary" onClick={() => refetch()} disabled={isFetching}>
            Refresh Status
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-secondary" onClick={() => setCurrent(prev => Math.max(prev - 1, 0))}>
          Previous
        </button>
        <button className="btn-primary" onClick={() => setCurrent(prev => Math.min(prev + 1, steps.length - 1))}>
          Next
        </button>
      </div>
    </div>
  )
}

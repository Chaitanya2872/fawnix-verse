import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setupApi, type CompanyProfile } from '@/lib/setupApi'

export default function SetupCompanyPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['setup-company'],
    queryFn: () => setupApi.getCompany().then(r => r.data),
  })

  const [form, setForm] = useState<CompanyProfile | null>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => setupApi.updateCompany(form as CompanyProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setup-progress'] }),
  })

  if (!form) {
    return <div className="card p-6 text-sm text-gray-500">Loading company profile...</div>
  }

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="page-title">Company Setup</h1>
        <p className="page-subtitle">Define tenant and legal entity details</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Company name"
            value={form.name}
            onChange={e => setForm(prev => prev && ({ ...prev, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Legal entity"
            value={form.legal_entity}
            onChange={e => setForm(prev => prev && ({ ...prev, legal_entity: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Country"
            value={form.country}
            onChange={e => setForm(prev => prev && ({ ...prev, country: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Timezone"
            value={form.timezone}
            onChange={e => setForm(prev => prev && ({ ...prev, timezone: e.target.value }))}
          />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => updateMutation.mutate()}>Save Company</button>
        </div>
      </div>
    </div>
  )
}

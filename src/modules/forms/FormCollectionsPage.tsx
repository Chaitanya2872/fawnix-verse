import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { formsApi } from '@/lib/formsApi'
import type { Form, FormCollection, FormModule } from '@/lib/formsApi'

export default function FormCollectionsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedForms, setSelectedForms] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    module: 'preboarding' as FormModule,
    owner: 'HR Operations',
  })

  const { data: collectionsData } = useQuery({
    queryKey: ['form-collections'],
    queryFn: () => formsApi.listCollections().then(r => r.data),
  })

  const { data: formsData } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.listForms().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => formsApi.createCollection({
      name: form.name,
      description: form.description,
      module: form.module,
      owner: form.owner,
      form_ids: selectedForms,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form-collections'] })
      setCreateOpen(false)
      setSelectedForms([])
      setForm({ name: '', description: '', module: 'preboarding', owner: 'HR Operations' })
    },
  })

  const collections: FormCollection[] = collectionsData ?? []
  const forms: Form[] = formsData ?? []

  const formMap = useMemo(() => {
    return forms.reduce<Record<string, Form>>((acc, f) => {
      acc[f.id] = f
      return acc
    }, {})
  }, [forms])

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Form Collections</h1>
          <p className="page-subtitle">Bundle forms together for consistent onboarding workflows</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collections.map(col => (
          <div key={col.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{col.name}</h3>
                {col.description && <p className="text-xs text-gray-500">{col.description}</p>}
                <p className="text-xs text-gray-400 mt-1">Module: {col.module} · Owner: {col.owner}</p>
              </div>
              <span className="badge-blue">{col.form_ids.length} forms</span>
            </div>
            <div className="mt-3 space-y-2">
              {col.form_ids.map(id => (
                <div key={id} className="text-xs text-gray-600">• {formMap[id]?.name || id}</div>
              ))}
              {col.form_ids.length === 0 && <div className="text-xs text-gray-400">No forms assigned.</div>}
            </div>
          </div>
        ))}
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Create Collection</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input className="input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Module</label>
                <select className="input" value={form.module} onChange={e => setForm(prev => ({ ...prev, module: e.target.value as FormModule }))}>
                  {['preboarding', 'recruitment', 'internal', 'general'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                <input className="input" value={form.owner} onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Forms in Collection</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-3">
                  {forms.map(f => (
                    <label key={f.id} className="flex items-center justify-between text-sm text-gray-700">
                      <span>{f.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedForms.includes(f.id)}
                        onChange={() => {
                          setSelectedForms(prev => prev.includes(f.id)
                            ? prev.filter(id => id !== f.id)
                            : [...prev, f.id]
                          )
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!form.name.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

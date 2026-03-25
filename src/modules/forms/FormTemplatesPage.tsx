import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Star } from 'lucide-react'
import { formsApi, type FormField, type FormTemplate } from '@/lib/formsApi'
import { cn } from '@/lib/utils'

const defaultFields: FormField[] = [
  { field_key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { field_key: 'email', label: 'Email', type: 'email', required: true },
]

export default function FormTemplatesPage() {
  const qc = useQueryClient()
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () => formsApi.listTemplates().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => formsApi.createTemplate({
      name: form.name,
      description: form.description,
      fields: defaultFields,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form-templates'] })
      setCreateOpen(false)
      setForm({ name: '', description: '' })
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => formsApi.toggleTemplateFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-templates'] }),
  })

  const templates: FormTemplate[] = data ?? []

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Form Templates</h1>
          <p className="page-subtitle">Reusable form building blocks across modules</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <div key={tpl.id} className="card p-4 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
                {tpl.description && <p className="text-xs text-gray-500">{tpl.description}</p>}
              </div>
              <button onClick={() => favoriteMutation.mutate(tpl.id)}>
                <Star className={cn('w-4 h-4', tpl.is_favorite ? 'text-yellow-400' : 'text-gray-300')} />
              </button>
            </div>
            <div className="text-xs text-gray-400 mb-4">{tpl.fields.length} fields</div>
            <div className="mt-auto flex items-center gap-2">
              <button className="btn-secondary" onClick={() => setPreviewTemplate(tpl)}>
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">{previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="space-y-2">
              {previewTemplate.fields.map((field, idx) => (
                <div key={`${field.field_key}-${idx}`} className="p-3 rounded-lg border border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{field.label}</p>
                  <p className="text-xs text-gray-500">{field.type} {field.required ? '· Required' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Create Template</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Template Name</label>
                <input className="input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
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

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, ChevronUp, ChevronDown, Trash2, Star, QrCode, X } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import QRCode from 'react-qr-code'
import { formsApi, type FieldType, type FormField, type FormVisibility, type FormModule } from '@/lib/formsApi'
import { recruitmentApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type Field = FormField & { id: string }

type TemplateRow = {
  id: string
  name: string
  description?: string
  fields: FormField[]
  is_favorite?: boolean
}

type CollectionRow = {
  id: string
  name: string
  module: FormModule
}

type PositionRow = {
  id: string
  title: string
}

const FIELD_LIBRARY: { label: string; type: FieldType; defaultLabel: string }[] = [
  { label: 'Short Text', type: 'text', defaultLabel: 'Short Text' },
  { label: 'Paragraph', type: 'textarea', defaultLabel: 'Paragraph' },
  { label: 'Email', type: 'email', defaultLabel: 'Email' },
  { label: 'Phone', type: 'phone', defaultLabel: 'Phone' },
  { label: 'Number', type: 'number', defaultLabel: 'Number' },
  { label: 'Date', type: 'date', defaultLabel: 'Date' },
  { label: 'Select', type: 'select', defaultLabel: 'Dropdown' },
  { label: 'Multi Select', type: 'multiselect', defaultLabel: 'Multi Select' },
  { label: 'Checkbox', type: 'checkbox', defaultLabel: 'Checkbox' },
  { label: 'File Upload', type: 'file', defaultLabel: 'File Upload' },
  { label: 'Section Title', type: 'section', defaultLabel: 'Section' },
]

const visibilityOptions: { value: FormVisibility; label: string }[] = [
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'manager', label: 'Manager' },
  { value: 'candidate', label: 'Candidate' },
]

const moduleOptions: { value: FormModule; label: string }[] = [
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'preboarding', label: 'Pre-Onboarding' },
  { value: 'internal', label: 'Internal' },
  { value: 'general', label: 'General' },
]

const createId = () => Math.random().toString(36).slice(2, 10)

const defaultCoreFields = (): Field[] => ([
  {
    id: createId(),
    field_key: 'full_name',
    label: 'Full Name',
    type: 'text',
    required: true,
  },
  {
    id: createId(),
    field_key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
  },
])

export default function ApplicationFormBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id

  const [formMeta, setFormMeta] = useState({
    name: '',
    description: '',
    collection_id: '',
    position_id: '',
    status: 'draft',
    public_slug: '',
    owner: 'HR Operations',
    visibility: ['hr', 'manager'] as FormVisibility[],
    tags: '',
    module: 'general' as FormModule,
  })
  const [fields, setFields] = useState<Field[]>(defaultCoreFields())
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')
  const [mode, setMode] = useState<'build' | 'preview' | 'submissions'>('build')
  const [qrOpen, setQrOpen] = useState(false)

  const { data: collectionsData } = useQuery({
    queryKey: ['form-collections'],
    queryFn: () => formsApi.listCollections().then(r => r.data),
  })

  const { data: templateData } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () => formsApi.listTemplates().then(r => r.data),
  })

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => recruitmentApi.getPositions().then(r => r.data),
  })

  const { data: formData } = useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsApi.getForm(id as string).then(r => r.data),
    enabled: !!id,
  })

  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['form-submissions', id],
    queryFn: () => formsApi.getFormSubmissions(id as string),
    enabled: !!id && mode === 'submissions',
  })

  useEffect(() => {
    if (!formData) return
    setFormMeta({
      name: formData.name || '',
      description: formData.description || '',
      collection_id: formData.collection_id || '',
      position_id: formData.position_id || '',
      status: formData.status || 'draft',
      public_slug: formData.public_slug || '',
      owner: formData.owner || 'HR Operations',
      visibility: formData.visibility || ['hr'],
      tags: (formData.tags || []).join(', '),
      module: formData.module || 'general',
    })
    const loadedFields = (formData.fields || []).map((f: any) => ({
      id: createId(),
      field_key: f.field_key,
      label: f.label,
      type: f.type,
      required: !!f.required,
      options: f.options || [],
      config: f.config || {},
    }))
    setFields(loadedFields.length ? loadedFields : defaultCoreFields())
  }, [formData])

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isNew ? formsApi.createForm(payload) : formsApi.updateForm(id as string, payload),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      if (isNew) {
        navigate(`/forms/${res.data.id}`)
      }
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => formsApi.publishForm(id as string),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      setFormMeta(prev => ({ ...prev, status: 'published', public_slug: res.data.public_slug }))
    },
  })

  const templateMutation = useMutation({
    mutationFn: (payload: any) => formsApi.createTemplate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form-templates'] })
      setTemplateName('')
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (templateId: string) => formsApi.toggleTemplateFavorite(templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-templates'] }),
  })

  const collections: CollectionRow[] = collectionsData ?? []
  const templates: TemplateRow[] = templateData ?? []
  const positions: PositionRow[] = positionsData?.data ?? []

  const filteredLibrary = FIELD_LIBRARY.filter(item =>
    item.label.toLowerCase().includes(fieldSearch.toLowerCase())
  )

  const selectedField = useMemo(
    () => fields.find(f => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  )

  const addField = (type: FieldType, label: string) => {
    const baseKey = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    let key = baseKey || `field_${fields.length + 1}`
    let counter = 1
    while (fields.some(f => f.field_key === key)) {
      key = `${baseKey}_${counter++}`
    }
    const newField: Field = {
      id: createId(),
      field_key: key,
      label,
      type,
      required: false,
      options: type === 'select' || type === 'multiselect' ? ['Option 1'] : [],
      config: {},
    }
    setFields(prev => [...prev, newField])
    setSelectedFieldId(newField.id)
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === fieldId)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= prev.length) return prev
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = copy[swapIdx]
      copy[swapIdx] = temp
      return copy
    })
  }

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }

  const updateField = (fieldId: string, changes: Partial<Field>) => {
    setFields(prev => prev.map(f => (f.id === fieldId ? { ...f, ...changes } : f)))
  }

  const handleSave = () => {
    if (!formMeta.name.trim()) return
    const tags = formMeta.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    const payload = {
      name: formMeta.name.trim(),
      description: formMeta.description || undefined,
      collection_id: formMeta.collection_id || undefined,
      position_id: formMeta.module === 'recruitment' ? (formMeta.position_id || undefined) : undefined,
      owner: formMeta.owner || 'HR Operations',
      visibility: formMeta.visibility,
      tags,
      module: formMeta.module,
      fields: fields.map((f, index) => ({
        field_key: f.field_key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options || undefined,
        config: f.config || {},
        order: index,
      })),
    }
    saveMutation.mutate(payload)
  }

  const handleTemplateSave = () => {
    if (!templateName.trim()) return
    templateMutation.mutate({
      name: templateName.trim(),
      fields: fields.map((f, index) => ({
        field_key: f.field_key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options || undefined,
        config: f.config || {},
        order: index,
      })),
    })
  }

  const applyTemplate = (template: TemplateRow) => {
    const tplFields = (template.fields || []).map((f) => ({
      id: createId(),
      field_key: f.field_key,
      label: f.label,
      type: f.type,
      required: !!f.required,
      options: f.options || [],
      config: f.config || {},
    }))
    setFields(tplFields.length ? tplFields : defaultCoreFields())
    setSelectedFieldId(null)
  }

  const publicLink = formMeta.module === 'recruitment' && formMeta.public_slug
    ? `${window.location.origin}/apply/${formMeta.public_slug}`
    : ''
  const submissionRows = submissionsData?.data ?? []
  const submissionTotal = submissionsData?.total ?? 0
  const submissionLast7 = submissionsData?.last_7_days ?? 0

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex(f => f.id === active.id)
    const newIndex = fields.findIndex(f => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setFields(arrayMove(fields, oldIndex, newIndex))
  }

  const buildButtonClass = (value: string) =>
    cn('px-3 py-1.5 text-xs font-medium rounded-md', mode === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')

  const updateVisibility = (value: FormVisibility) => {
    setFormMeta(prev => {
      const exists = prev.visibility.includes(value)
      return {
        ...prev,
        visibility: exists ? prev.visibility.filter(v => v !== value) : [...prev.visibility, value],
      }
    })
  }

  function SortableFieldCard({ field }: { field: Field }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'border rounded-lg p-3 bg-white hover:border-brand-300',
          selectedFieldId === field.id && 'border-brand-500 ring-1 ring-brand-200'
        )}
        onClick={() => setSelectedFieldId(field.id)}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            <span className="text-xs text-gray-400 ml-2">{field.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up') }}>
              <ChevronUp className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down') }}>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); removeField(field.id) }}>
              <Trash2 className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-gray-700" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
              <span className="text-xs">::</span>
            </button>
          </div>
        </div>
        {field.type !== 'section' && (
          <div className="mt-2">
            <div className="h-9 rounded-md border border-gray-200 bg-gray-50" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{isNew ? 'New Form' : formMeta.name || 'Edit Form'}</h1>
          <p className="page-subtitle">Design reusable forms for recruitment and pre-onboarding workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/forms" className="btn-secondary">Back</Link>
          {id && (
            <button className="btn-secondary" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              Publish
            </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
            Save Form
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className={buildButtonClass('build')} onClick={() => setMode('build')}>Build</button>
        <button className={buildButtonClass('preview')} onClick={() => setMode('preview')}>Preview</button>
        {id && <button className={buildButtonClass('submissions')} onClick={() => setMode('submissions')}>Submissions</button>}
      </div>

      <div className="grid grid-cols-[260px_1fr_320px] gap-4">
        <div className="card p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Field Library</p>
            <input
              className="input mt-3 text-xs"
              placeholder="Search field..."
              value={fieldSearch}
              onChange={e => setFieldSearch(e.target.value)}
            />
            <div className="mt-3 space-y-2">
              {filteredLibrary.map(item => (
                <button
                  key={item.type}
                  className="w-full text-left px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm"
                  onClick={() => addField(item.type, item.defaultLabel)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Templates</p>
            <div className="mt-2 space-y-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="border border-gray-200 rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <button className="text-sm font-medium text-gray-900" onClick={() => applyTemplate(tpl)}>
                      {tpl.name}
                    </button>
                    <button onClick={() => favoriteMutation.mutate(tpl.id)}>
                      <Star className={cn('w-4 h-4', tpl.is_favorite ? 'text-yellow-400' : 'text-gray-300')} />
                    </button>
                  </div>
                  {tpl.description && <p className="text-xs text-gray-400">{tpl.description}</p>}
                </div>
              ))}
              {templates.length === 0 && <p className="text-xs text-gray-400">No templates yet.</p>}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <input
              className="input text-lg font-semibold"
              placeholder="Form name"
              value={formMeta.name}
              onChange={e => setFormMeta(prev => ({ ...prev, name: e.target.value }))}
            />
            <textarea
              className="input mt-2"
              placeholder="Add a short description"
              value={formMeta.description}
              onChange={e => setFormMeta(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {mode === 'build' && (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <SortableFieldCard key={field.id} field={field} />
                  ))}

                  <button
                    className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center gap-2"
                    onClick={() => addField('text', 'New Field')}
                  >
                    <Plus className="w-4 h-4" />Add Field
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {mode === 'preview' && (
            <div className="space-y-4">
              {fields.map(field => (
                <div key={field.id}>
                  {field.type === 'section' ? (
                    <h3 className="text-base font-semibold text-gray-900">{field.label}</h3>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="h-9 rounded-md border border-gray-200 bg-gray-50" />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === 'submissions' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm text-gray-600">Total: <span className="font-semibold">{submissionTotal}</span></div>
                <div className="text-sm text-gray-600">Last 7 days: <span className="font-semibold">{submissionLast7}</span></div>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <th className="table-header text-left">Candidate</th>
                      <th className="table-header text-left">Email</th>
                      <th className="table-header text-left">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionRows.map((s: any) => (
                      <tr key={s.id} className="table-row">
                        <td className="table-cell">{s.candidate_name || '—'}</td>
                        <td className="table-cell text-gray-500">{s.candidate_email || '—'}</td>
                        <td className="table-cell text-gray-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {submissionsLoading && <div className="p-4 text-xs text-gray-400">Loading submissions...</div>}
              </div>
            </div>
          )}
        </div>

        <div className="card p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Form Settings</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Collection</label>
                <select
                  className="input"
                  value={formMeta.collection_id}
                  onChange={e => {
                    const selected = collections.find(c => c.id === e.target.value)
                    setFormMeta(prev => {
                      const nextModule = selected?.module || prev.module
                      return {
                        ...prev,
                        collection_id: e.target.value,
                        module: nextModule,
                        position_id: nextModule === 'recruitment' ? prev.position_id : '',
                      }
                    })
                  }}
                >
                  <option value="">Select collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Module</label>
                <select
                  className="input"
                  value={formMeta.module}
                  onChange={e => {
                    const next = e.target.value as FormModule
                    setFormMeta(prev => ({
                      ...prev,
                      module: next,
                      position_id: next === 'recruitment' ? prev.position_id : '',
                    }))
                  }}
                >
                  {moduleOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                <input
                  className="input"
                  value={formMeta.owner}
                  onChange={e => setFormMeta(prev => ({ ...prev, owner: e.target.value }))}
                />
              </div>
              {formMeta.module === 'recruitment' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Position</label>
                  <select
                    className="input"
                    value={formMeta.position_id}
                    onChange={e => setFormMeta(prev => ({ ...prev, position_id: e.target.value }))}
                  >
                    <option value="">Select position</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Visibility</label>
                <div className="flex flex-wrap gap-2">
                  {visibilityOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={formMeta.visibility.includes(opt.value)}
                        onChange={() => updateVisibility(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label>
                <input
                  className="input"
                  placeholder="preboarding, internal"
                  value={formMeta.tags}
                  onChange={e => setFormMeta(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <input className="input" value={formMeta.status} disabled />
              </div>
              {publicLink && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Public Link</label>
                  <div className="flex items-center gap-2">
                    <input className="input" value={publicLink} readOnly />
                    <button className="btn-secondary" onClick={() => setQrOpen(true)}>
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {formData?.created_at && (
                <div className="text-xs text-gray-400">
                  Created {new Date(formData.created_at).toLocaleDateString()} · Updated {new Date(formData.updated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Field Settings</p>
            {!selectedField && (
              <p className="text-xs text-gray-400 mt-3">Select a field to edit its settings.</p>
            )}
            {selectedField && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Label</label>
                  <input
                    className="input"
                    value={selectedField.label}
                    onChange={e => updateField(selectedField.id, { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Field Key</label>
                  <input
                    className="input"
                    value={selectedField.field_key}
                    onChange={e => updateField(selectedField.id, { field_key: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                  <select
                    className="input"
                    value={selectedField.type}
                    onChange={e => updateField(selectedField.id, { type: e.target.value as FieldType })}
                  >
                    {FIELD_LIBRARY.map(item => (
                      <option key={item.type} value={item.type}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={e => updateField(selectedField.id, { required: e.target.checked })}
                  />
                  <span className="text-xs text-gray-700">Required</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Placeholder</label>
                  <input
                    className="input"
                    value={selectedField.config?.placeholder || ''}
                    onChange={e =>
                      updateField(selectedField.id, {
                        config: { ...selectedField.config, placeholder: e.target.value },
                      })
                    }
                  />
                </div>
                {(selectedField.type === 'select' || selectedField.type === 'multiselect') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Options (one per line)</label>
                    <textarea
                      className="input min-h-[100px]"
                      value={(selectedField.options || []).join('\n')}
                      onChange={e =>
                        updateField(selectedField.id, {
                          options: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Template</p>
            <div className="mt-2 space-y-2">
              <input
                className="input"
                placeholder="Template name"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
              <button className="btn-secondary w-full" onClick={handleTemplateSave} disabled={!templateName.trim()}>
                Save as Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {qrOpen && publicLink && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Public Form QR</h2>
              <button onClick={() => setQrOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <QRCode value={publicLink} size={200} />
              <input className="input text-xs" value={publicLink} readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

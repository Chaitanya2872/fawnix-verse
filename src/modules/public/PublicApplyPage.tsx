import { useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { publicFormsApi } from '@/lib/api'

type Field = {
  field_key: string
  label: string
  type: string
  required: boolean
  options?: string[]
  config?: { placeholder?: string }
}

export default function PublicApplyPage() {
  const { slug } = useParams()
  const location = useLocation()
  const linkSlug = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const link = params.get('link')
    return link ?? undefined
  }, [location.search])
  const [values, setValues] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)
  const idempotencyKeyRef = useRef<string>()
  if (!idempotencyKeyRef.current) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      idempotencyKeyRef.current = crypto.randomUUID()
    } else {
      idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
  }
  const idempotencyKey = idempotencyKeyRef.current

  const { data, isLoading } = useQuery({
    queryKey: ['public-form', slug, linkSlug],
    queryFn: () => publicFormsApi.getForm(slug as string, linkSlug).then(r => r.data),
    enabled: !!slug,
  })

  const mutation = useMutation({
    mutationFn: (payload: FormData) => publicFormsApi.submitForm(slug as string, payload, idempotencyKey, linkSlug),
    onSuccess: () => setSubmitted(true),
  })

  const form = data
  const fields: Field[] = form?.fields ?? []

  const handleChange = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = new FormData()
    fields.forEach(field => {
      const value = values[field.field_key]
      if (field.type === 'file') {
        if (value) payload.append(field.field_key, value)
        return
      }
      if (Array.isArray(value)) {
        value.forEach(v => payload.append(field.field_key, v))
      } else if (value !== undefined && value !== null) {
        payload.append(field.field_key, value)
      }
    })
    mutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading form...
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Form not found.
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900">Application Submitted</h1>
          <p className="text-sm text-gray-500 mt-2">
            Thanks for applying. We’ll review your application soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-gray-900">{form.name}</h1>
          {form.description && <p className="text-sm text-gray-500 mt-2">{form.description}</p>}
          {form.position_title && (
            <div className="mt-3 text-xs text-gray-400">Position: {form.position_title}</div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {fields.map(field => (
              <div key={field.field_key}>
                {field.type === 'section' ? (
                  <div className="pt-2">
                    <h3 className="text-base font-semibold text-gray-900">{field.label}</h3>
                  </div>
                ) : (
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {field.type === 'textarea' && (
                  <textarea
                    className="input min-h-[100px]"
                    placeholder={field.config?.placeholder || ''}
                    value={values[field.field_key] || ''}
                    onChange={e => handleChange(field.field_key, e.target.value)}
                    required={field.required}
                  />
                )}
                {field.type === 'select' && (
                  <select
                    className="input"
                    value={values[field.field_key] || ''}
                    onChange={e => handleChange(field.field_key, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'multiselect' && (
                  <select
                    className="input"
                    multiple
                    value={values[field.field_key] || []}
                    onChange={e =>
                      handleChange(
                        field.field_key,
                        Array.from(e.target.selectedOptions).map(o => o.value)
                      )
                    }
                  >
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!values[field.field_key]}
                      onChange={e => handleChange(field.field_key, e.target.checked ? 'yes' : '')}
                    />
                    <span className="text-sm text-gray-600">Yes</span>
                  </div>
                )}
                {field.type === 'file' && (
                  <input
                    type="file"
                    className="input"
                    onChange={e => handleChange(field.field_key, e.target.files?.[0] || null)}
                    required={field.required}
                  />
                )}
                {!['textarea', 'select', 'multiselect', 'checkbox', 'file', 'section'].includes(field.type) && (
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    className="input"
                    placeholder={field.config?.placeholder || ''}
                    value={values[field.field_key] || ''}
                    onChange={e => handleChange(field.field_key, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <button className="btn-primary w-full" type="submit" disabled={mutation.isPending}>
              Submit Application
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

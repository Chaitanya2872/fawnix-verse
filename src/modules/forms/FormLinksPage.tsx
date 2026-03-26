import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Copy, Send, Slash } from 'lucide-react'
import { formsApi } from '@/lib/formsApi'
import type { FormLink } from '@/lib/formsApi'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  active: 'badge-green',
  expired: 'badge-red',
  disabled: 'badge-gray',
}

export default function FormLinksPage() {
  const qc = useQueryClient()
  const { data: formsData } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.listForms().then(r => r.data),
  })
  const forms = formsData ?? []
  const [formId, setFormId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxSubmissions, setMaxSubmissions] = useState<string>('')
  const [accessType, setAccessType] = useState('public')
  const { data } = useQuery({
    queryKey: ['form-links'],
    queryFn: () => formsApi.listLinks().then(r => r.data),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => formsApi.resendLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-links'] }),
  })

  const expireMutation = useMutation({
    mutationFn: (id: string) => formsApi.expireLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-links'] }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      formsApi.createLink({
        form_id: formId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        module: 'recruitment',
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        max_submissions: maxSubmissions ? Number(maxSubmissions) : undefined,
        access_type: accessType,
      }),
    onSuccess: () => {
      setFormId('')
      setCandidateName('')
      setCandidateEmail('')
      setExpiresAt('')
      setMaxSubmissions('')
      setAccessType('public')
      qc.invalidateQueries({ queryKey: ['form-links'] })
    },
  })

  const links: FormLink[] = data ?? []

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">External Link Manager</h1>
          <p className="page-subtitle">Manage candidate-facing form links and expiry rules</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Form</label>
            <select className="input" value={formId} onChange={e => setFormId(e.target.value)}>
              <option value="">Select form</option>
              {forms.map((form: any) => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Candidate Name</label>
            <input className="input" value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Candidate name" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Candidate Email</label>
            <input className="input" value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} placeholder="Candidate email" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Expiry</label>
            <input className="input" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Max Submissions</label>
            <input className="input" type="number" min="1" value={maxSubmissions} onChange={e => setMaxSubmissions(e.target.value)} placeholder="e.g. 10" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Access</label>
            <select className="input" value={accessType} onChange={e => setAccessType(e.target.value)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button
            className="btn-primary"
            onClick={() => createMutation.mutate()}
            disabled={!formId || !candidateEmail || createMutation.isPending}
          >
            Create Link
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Form</th>
              <th className="table-header text-left">Slug</th>
              <th className="table-header text-left">Candidate</th>
              <th className="table-header text-left">Module</th>
              <th className="table-header text-left">Access</th>
              <th className="table-header text-left">Usage</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Expiry</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {links.map(link => (
              <tr key={link.id} className="table-row">
                <td className="table-cell">
                  <div className="text-sm font-medium text-gray-900">{link.form_name}</div>
                  <div className="text-xs text-gray-400">{link.url}</div>
                </td>
                <td className="table-cell text-gray-500">{link.slug || '—'}</td>
                <td className="table-cell text-gray-700">{link.candidate_name}</td>
                <td className="table-cell text-gray-500">{link.module}</td>
                <td className="table-cell text-gray-500">{link.access_type || 'public'}</td>
                <td className="table-cell text-gray-500">
                  {link.current_submissions ?? 0}/{link.max_submissions ?? '8'}
                </td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[link.status])}>{link.status}</span>
                </td>
                <td className="table-cell text-gray-500">
                  {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : '—'}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-brand-600 hover:underline flex items-center gap-1" onClick={() => handleCopy(link.url)}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1" onClick={() => resendMutation.mutate(link.id)}>
                      <Send className="w-3.5 h-3.5" /> Resend
                    </button>
                    <button className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1" onClick={() => expireMutation.mutate(link.id)}>
                      <Slash className="w-3.5 h-3.5" /> Disable
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No links created yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}


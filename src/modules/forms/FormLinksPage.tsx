import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Send, Slash } from 'lucide-react'
import { formsApi, type FormLink } from '@/lib/formsApi'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  active: 'badge-green',
  expired: 'badge-red',
  disabled: 'badge-gray',
}

export default function FormLinksPage() {
  const qc = useQueryClient()
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

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Form</th>
              <th className="table-header text-left">Candidate</th>
              <th className="table-header text-left">Module</th>
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
                <td className="table-cell text-gray-700">{link.candidate_name}</td>
                <td className="table-cell text-gray-500">{link.module}</td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[link.status])}>{link.status}</span>
                </td>
                <td className="table-cell text-gray-500">{new Date(link.expires_at).toLocaleDateString()}</td>
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

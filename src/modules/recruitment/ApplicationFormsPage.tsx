import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, Copy, FileText, Link2, Layers, Plus, QrCode, Search } from 'lucide-react'
import QRCode from 'react-qr-code'
import { formsApi } from '@/lib/formsApi'
import type { Form, FormCollection } from '@/lib/formsApi'
import { cn, STATUS_COLORS } from '@/lib/utils'

type Filters = {
  search: string
  status: string
  module: string
  collection_id: string
}

export default function ApplicationFormsPage() {
  const qc = useQueryClient()
  const [qrSlug, setQrSlug] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    module: '',
    collection_id: '',
  })

  const { data } = useQuery({
    queryKey: ['forms', filters],
    queryFn: () => formsApi.listForms(filters).then(r => r.data),
  })

  const { data: collectionsData } = useQuery({
    queryKey: ['form-collections'],
    queryFn: () => formsApi.listCollections().then(r => r.data),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => formsApi.publishForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => formsApi.archiveForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })

  const forms: Form[] = data ?? []
  const collections: FormCollection[] = collectionsData ?? []

  const collectionMap = useMemo(() => {
    return collections.reduce<Record<string, FormCollection>>((acc, c) => {
      acc[c.id] = c
      return acc
    }, {})
  }, [collections])

  const handleCopy = (slug?: string | null) => {
    if (!slug) return
    const link = `${window.location.origin}/apply/${slug}`
    navigator.clipboard.writeText(link)
  }

  const qrLink = qrSlug ? `${window.location.origin}/apply/${qrSlug}` : ''

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Forms Library</h1>
          <p className="page-subtitle">Reusable forms across recruitment, pre-onboarding, and internal workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/forms/templates" className="btn-secondary">
            <FileText className="w-4 h-4" />Templates
          </Link>
          <Link to="/forms/collections" className="btn-secondary">
            <Layers className="w-4 h-4" />Collections
          </Link>
          <Link to="/forms/analytics" className="btn-secondary">
            <BarChart3 className="w-4 h-4" />Analytics
          </Link>
          <Link to="/forms/links" className="btn-secondary">
            <Link2 className="w-4 h-4" />Links
          </Link>
          <Link to="/forms/new" className="btn-primary">
            <Plus className="w-4 h-4" />New Form
          </Link>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-9"
                placeholder="Form name, description"
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Collection</label>
            <select
              className="input"
              value={filters.collection_id}
              onChange={e => setFilters({ ...filters, collection_id: e.target.value })}
            >
              <option value="">All</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Form</th>
              <th className="table-header text-left">Collection</th>
              <th className="table-header text-left">Owner</th>
              <th className="table-header text-left">Visibility</th>
              <th className="table-header text-left">Version</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Public Link</th>
              <th className="table-header text-left">Last Updated</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {forms.map(f => {
              const collection = f.collection_id ? collectionMap[f.collection_id] : null
              return (
                <tr key={f.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">{f.name}</div>
                    {f.description && <div className="text-xs text-gray-400">{f.description}</div>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {f.tags.map(tag => (
                        <span key={tag} className="badge-gray">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">
                    {collection ? collection.name : '—'}
                    {collection && (
                      <div className="text-[11px] text-gray-400">{collection.module}</div>
                    )}
                  </td>
                  <td className="table-cell text-gray-500">{f.owner}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {f.visibility.map(v => (
                        <span key={v} className="badge-blue">{v}</span>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{f.version}</td>
                  <td className="table-cell">
                    <span className={cn('badge', STATUS_COLORS[f.status] || 'badge-gray')}>{f.status}</span>
                  </td>
                  <td className="table-cell">
                    {f.module === 'recruitment' ? (
                      f.public_slug ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                            onClick={() => handleCopy(f.public_slug)}
                          >
                            <Copy className="w-3.5 h-3.5" />Copy
                          </button>
                          <button
                            className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                            onClick={() => setQrSlug(f.public_slug || null)}
                          >
                            <QrCode className="w-3.5 h-3.5" />QR
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not published</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">Not applicable</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-500">
                    {new Date(f.updated_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link to={`/forms/${f.id}`} className="text-xs text-brand-600 hover:underline">
                        Edit
                      </Link>
                      {(f.status === 'draft' || f.status === 'archived') && (
                        <button
                          className="text-xs text-emerald-600 hover:underline"
                          onClick={() => publishMutation.mutate(f.id)}
                          disabled={publishMutation.isPending}
                        >
                          Publish
                        </button>
                      )}
                      {f.status === 'published' && (
                        <button
                          className="text-xs text-gray-500 hover:text-red-600"
                          onClick={() => archiveMutation.mutate(f.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {forms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No forms found.</p>
          </div>
        )}
      </div>

      {qrSlug && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Public Form QR</h2>
              <button onClick={() => setQrSlug(null)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <QRCode value={qrLink} size={200} />
              <input className="input text-xs" value={qrLink} readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

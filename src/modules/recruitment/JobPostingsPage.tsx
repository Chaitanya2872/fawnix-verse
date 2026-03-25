import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, ExternalLink, X, Search } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, STATUS_COLORS, formatDate } from '@/lib/utils'

const PLATFORMS = ['linkedin', 'naukri', 'indeed'] as const
type Platform = typeof PLATFORMS[number]

type Posting = {
  id: string
  title: string
  location?: string | null
  job_type?: string | null
  status: string
  deadline?: string | null
  position_id?: string | null
  position_title?: string | null
  platforms?: Array<{ platform: string; status: string; external_url?: string | null }>
}

export default function JobPostingsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [editing, setEditing] = useState<Posting | null>(null)
  const [publishTarget, setPublishTarget] = useState<Posting | null>(null)
  const [publishPlatforms, setPublishPlatforms] = useState<Platform[]>(['linkedin', 'naukri', 'indeed'])
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const [form, setForm] = useState({
    title: '',
    position_id: '',
    location: '',
    job_type: '',
    work_mode: '',
    requirements: '',
    description: '',
    salary_range: '',
    deadline: '',
  })

  const { data: postingsData, isLoading } = useQuery({
    queryKey: ['postings'],
    queryFn: () => recruitmentApi.getPostings().then(r => r.data),
  })

  const { data: positionsData } = useQuery({
    queryKey: ['positions', 'for-posting'],
    queryFn: () => recruitmentApi.getPositions({}).then(r => r.data),
  })

  const postings: Posting[] = postingsData?.data ?? []
  const positions = positionsData?.data ?? []

  const filteredPostings = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return postings
    return postings.filter((p) => {
      return (
        (p.title || '').toLowerCase().includes(needle) ||
        (p.position_title || '').toLowerCase().includes(needle) ||
        (p.location || '').toLowerCase().includes(needle)
      )
    })
  }, [postings, search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editing ? recruitmentApi.updatePosting(editing.id, payload) : recruitmentApi.createPosting(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postings'] })
      setModalOpen(false)
      setEditing(null)
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, platforms }: { id: string; platforms: Platform[] }) =>
      recruitmentApi.publishPosting(id, { platforms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postings'] })
      setPublishOpen(false)
      setPublishTarget(null)
    },
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => recruitmentApi.closePosting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['postings'] }),
  })

  const openCreate = () => {
    setEditing(null)
    setForm({
      title: '',
      position_id: '',
      location: '',
      job_type: '',
      work_mode: '',
      requirements: '',
      description: '',
      salary_range: '',
      deadline: '',
    })
    setModalOpen(true)
  }

  const openEdit = (posting: Posting) => {
    setEditing(posting)
    setForm({
      title: posting.title || '',
      position_id: posting.position_id || '',
      location: posting.location || '',
      job_type: posting.job_type || '',
      work_mode: '',
      requirements: '',
      description: '',
      salary_range: '',
      deadline: posting.deadline ? String(posting.deadline).slice(0, 10) : '',
    })
    setModalOpen(true)
  }

  const openPublish = (posting: Posting) => {
    setPublishTarget(posting)
    const existing = (posting.platforms || []).map(p => p.platform as Platform)
    setPublishPlatforms(existing.length ? existing : ['linkedin', 'naukri', 'indeed'])
    setPublishOpen(true)
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.position_id) return
    saveMutation.mutate({
      title: form.title.trim(),
      position_id: form.position_id,
      location: form.location || undefined,
      job_type: form.job_type || undefined,
      work_mode: form.work_mode || undefined,
      requirements: form.requirements || undefined,
      description: form.description || undefined,
      salary_range: form.salary_range || undefined,
      deadline: form.deadline || undefined,
    })
  }

  return (
    <div className="animate-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Job Postings</h1>
          <p className="page-subtitle">Manage and publish job advertisements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input pl-9"
              placeholder="Search postings..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />Create Posting
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">Title</th>
              <th className="table-header text-left">Location</th>
              <th className="table-header text-left">Type</th>
              <th className="table-header text-left">Platforms</th>
              <th className="table-header text-left">Deadline</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPostings.map(p => (
              <tr key={p.id} className="table-row">
                <td className="table-cell font-medium text-gray-900">{p.title}</td>
                <td className="table-cell text-gray-500">{p.location || 'N/A'}</td>
                <td className="table-cell text-gray-500">{p.job_type || 'N/A'}</td>
                <td className="table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {(p.platforms || []).map(pl => {
                      const badge = (
                        <span className={cn('badge inline-flex items-center gap-1', STATUS_COLORS[pl.status] || 'badge-gray')}>
                          {pl.platform}
                          {pl.external_url && pl.status === 'published' && <ExternalLink className="w-3 h-3" />}
                        </span>
                      )
                      if (pl.external_url && pl.status === 'published') {
                        return (
                          <a
                            key={pl.platform}
                            href={pl.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:opacity-80"
                          >
                            {badge}
                          </a>
                        )
                      }
                      return (
                        <span key={pl.platform}>
                          {badge}
                        </span>
                      )
                    })}
                    {(p.platforms || []).length === 0 && (
                      <span className="text-xs text-gray-400">Not published</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {p.deadline ? formatDate(p.deadline) : 'N/A'}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('badge', STATUS_COLORS[p.status] || 'badge-gray')}>{p.status}</span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    {(p.status === 'draft' || p.status === 'failed') && (
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                    )}
                    {(p.status === 'draft' || p.status === 'failed') && (
                      <button className="text-xs text-emerald-600 hover:underline" onClick={() => openPublish(p)}>
                        Publish
                      </button>
                    )}
                    {p.status === 'published' && (
                      <button
                        className="text-xs text-gray-500 hover:text-red-600"
                        onClick={() => closeMutation.mutate(p.id)}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">Loading postings...</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editing ? 'Edit Posting' : 'Create Posting'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Position *</label>
                <select className="input" value={form.position_id} onChange={e => setForm(prev => ({ ...prev, position_id: e.target.value }))}>
                  <option value="">Select position</option>
                  {positions.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
                <input className="input" value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Job Type</label>
                <input className="input" value={form.job_type} onChange={e => setForm(prev => ({ ...prev, job_type: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Work Mode</label>
                <input className="input" value={form.work_mode} onChange={e => setForm(prev => ({ ...prev, work_mode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Salary Range</label>
                <input className="input" value={form.salary_range} onChange={e => setForm(prev => ({ ...prev, salary_range: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Deadline</label>
                <input type="date" className="input" value={form.deadline} onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Requirements</label>
                <textarea className="input min-h-[80px]" value={form.requirements} onChange={e => setForm(prev => ({ ...prev, requirements: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>Save</button>
            </div>
          </div>
        </div>
      )}

      {publishOpen && publishTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Publish to Platforms</h2>
              <button onClick={() => setPublishOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={publishPlatforms.includes(platform)}
                    onChange={(e) => {
                      setPublishPlatforms(prev =>
                        e.target.checked ? [...prev, platform] : prev.filter(p => p !== platform)
                      )
                    }}
                  />
                  {platform}
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setPublishOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => publishMutation.mutate({ id: publishTarget.id, platforms: publishPlatforms })}
                disabled={publishMutation.isPending || publishPlatforms.length === 0}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

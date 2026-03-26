import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn, getInitials, STATUS_COLORS, STATUS_LABELS, timeAgo } from '@/lib/utils'
import {
  Search, Download, MapPin, Briefcase, Star, Mail, Phone, ChevronDown
} from 'lucide-react'
import { candidatesApi, recruitmentApi } from '@/lib/api'

const STATUS_OPTIONS = [
  'applied',
  'shortlisted',
  'hr_screening',
  'interview_scheduled',
  'interview_completed',
  'selected',
  'rejected',
  'offer_sent',
  'offer_accepted',
  'offer_declined',
  'hired',
  'talent_pool',
]

type ApplicationRow = {
  submission_id: string
  application_id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  candidate_location?: string | null
  skills: string[]
  experience_years?: number | null
  status: string
  notes?: string | null
  source?: string | null
  submitted_at?: string | null
  form_id: string
  form_name: string
  position_id: string
  position_title: string
  resume_url?: string | null
}

export default function CandidatesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedForm, setSelectedForm] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [minExperience, setMinExperience] = useState('')
  const [maxExperience, setMaxExperience] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteValue, setNoteValue] = useState('')
  const [noteTarget, setNoteTarget] = useState<ApplicationRow | null>(null)

  const { data: formsData } = useQuery({
    queryKey: ['application-forms'],
    queryFn: () => recruitmentApi.getForms().then(r => r.data),
  })

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => recruitmentApi.getPositions({}).then(r => r.data),
  })

  const params = useMemo(() => ({
    search: search || undefined,
    status: selectedStatuses.length ? selectedStatuses.join(',') : undefined,
    form_id: selectedForm || undefined,
    position_id: selectedPosition || undefined,
    source: selectedSource || undefined,
    skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
    min_experience: minExperience ? Number(minExperience) : undefined,
    max_experience: maxExperience ? Number(maxExperience) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [
    search, selectedStatuses, selectedForm, selectedPosition, selectedSource,
    selectedSkills, minExperience, maxExperience, dateFrom, dateTo,
  ])

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['applications', params],
    queryFn: () => candidatesApi.listApplications(params).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      candidatesApi.updateStatus(id, { status, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  })

  const applications: ApplicationRow[] = appsData?.data ?? []
  const forms = formsData?.data ?? []
  const positions = positionsData?.data ?? []

  const skillOptions = useMemo(() => {
    const set = new Set<string>()
    applications.forEach(app => (app.skills || []).forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [applications])

  const sourceOptions = useMemo(() => {
    const set = new Set<string>()
    applications.forEach(app => app.source && set.add(app.source))
    return Array.from(set)
  }, [applications])

  const clearFilters = () => {
    setSearch('')
    setSelectedStatuses([])
    setSelectedForm('')
    setSelectedPosition('')
    setSelectedSource('')
    setSelectedSkills([])
    setMinExperience('')
    setMaxExperience('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex gap-5 animate-in h-full">
      {/* Filters sidebar */}
      <aside className="w-56 shrink-0">
        <div className="card p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              <button className="text-xs text-brand-600 hover:underline" onClick={clearFilters}>Clear all</button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Search Keywords</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name, email..."
                  className="input pl-8 text-xs py-1.5"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(s => (
                <label key={s} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-brand-600"
                      checked={selectedStatuses.includes(s)}
                      onChange={e => {
                        if (e.target.checked) setSelectedStatuses([...selectedStatuses, s])
                        else setSelectedStatuses(selectedStatuses.filter(st => st !== s))
                      }}
                    />
                    <span className="text-xs text-gray-600">{STATUS_LABELS[s] || s}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Form</label>
            <select className="input text-xs" value={selectedForm} onChange={e => setSelectedForm(e.target.value)}>
              <option value="">All forms</option>
              {forms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Position</label>
            <select className="input text-xs" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}>
              <option value="">All positions</option>
              {positions.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Source</label>
            <select className="input text-xs" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
              <option value="">All sources</option>
              {sourceOptions.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Skill</label>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {skillOptions.map(skill => (
                <label key={skill} className="flex items-center justify-between cursor-pointer mb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-brand-600"
                      checked={selectedSkills.includes(skill)}
                      onChange={e => {
                        if (e.target.checked) setSelectedSkills([...selectedSkills, skill])
                        else setSelectedSkills(selectedSkills.filter(s => s !== skill))
                      }}
                    />
                    <span className="text-xs text-gray-600">{skill}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Experience (years)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input text-xs"
                placeholder="Min"
                value={minExperience}
                onChange={e => setMinExperience(e.target.value)}
              />
              <input
                type="number"
                className="input text-xs"
                placeholder="Max"
                value={maxExperience}
                onChange={e => setMaxExperience(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Date range</label>
            <div className="flex flex-col gap-2">
              <input type="date" className="input text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" className="input text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-title">Applications</h1>
            <p className="page-subtitle">Review applications submitted through public forms</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {appsData?.total ?? applications.length} applications
            </span>
            {selectedSkills.map(s => (
              <span key={s} className="badge badge-blue">
                Skills: {s}
                <button
                  className="ml-1 opacity-60 hover:opacity-100"
                  onClick={() => setSelectedSkills(selectedSkills.filter(skill => skill !== s))}
                  type="button"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Application list */}
        <div className="space-y-3">
          {applications.map(app => (
            <div key={app.submission_id} className="card p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-4">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 accent-brand-600" />

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {getInitials(app.candidate_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{app.candidate_name}</h3>
                        <span className={cn('badge', STATUS_COLORS[app.status] || 'badge-gray')}>
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                        <button className="text-gray-300 hover:text-amber-400">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {app.position_title} - {app.form_name || app.form_id || 'Form'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.candidate_location || '-'}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{app.experience_years ?? '-'} yrs</span>
                    <span className="text-xs text-gray-400">Source: {app.source || '-'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(app.skills || []).slice(0, 4).map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{skill}</span>
                    ))}
                    {(app.skills || []).length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">+{(app.skills || []).length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Submitted: <span className="text-gray-700">{app.submitted_at ? timeAgo(app.submitted_at) : '-'}</span></span>
                      {app.resume_url && (
                        <a className="text-brand-600 hover:underline" href={app.resume_url} target="_blank" rel="noreferrer">
                          Resume
                        </a>
                      )}
                      {app.notes && (
                        <span className="text-gray-500">Note: {app.notes.slice(0, 40)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/recruitment/candidates/${app.candidate_id}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                        View Profile
                      </Link>
                      <span className="text-gray-200">|</span>
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setNoteTarget(app)
                          setNoteValue(app.notes || '')
                          setNoteOpen(true)
                        }}
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {isLoading && <div className="text-sm text-gray-400 mt-4">Loading applications...</div>}
      </div>

      {noteOpen && noteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Screening Note</h2>
              <button onClick={() => setNoteOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <textarea
              className="input min-h-[120px]"
              value={noteValue}
              onChange={e => setNoteValue(e.target.value)}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setNoteOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  updateMutation.mutate({ id: noteTarget.application_id, status: noteTarget.status, notes: noteValue })
                  setNoteOpen(false)
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

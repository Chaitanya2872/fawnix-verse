import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Clock, Video, MapPin, Users, Plus, Search,
  CheckCircle2, XCircle, AlertCircle, ChevronRight
} from 'lucide-react'
import { interviewsApi } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  technical: 'badge-blue', hr: 'badge-purple',
  managerial: 'badge-yellow', final: 'badge-green', cultural_fit: 'badge-gray',
}
const TYPE_LABELS: Record<string, string> = {
  technical: 'Technical', hr: 'HR', managerial: 'Managerial', final: 'Final', cultural_fit: 'Culture Fit',
}
const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  hire: { label: 'Hire', cls: 'text-emerald-600 bg-emerald-50' },
  reject: { label: 'Reject', cls: 'text-red-600 bg-red-50' },
  next_round: { label: 'Next Round', cls: 'text-blue-600 bg-blue-50' },
}

type Tab = 'scheduled' | 'completed' | 'cancelled' | 'feedback_submitted'

export default function InterviewsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('scheduled')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<any | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    technical_score: 4,
    communication_score: 4,
    cultural_score: 4,
    overall_score: 4,
    strengths: '',
    weaknesses: '',
    notes: '',
    recommendation: 'hire',
  })

  const { data } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.list().then(r => r.data),
  })

  const interviews = data?.data ?? []

  const counts = {
    scheduled: interviews.filter((i: any) => i.status === 'scheduled').length,
    completed: interviews.filter((i: any) => i.status === 'completed').length,
    cancelled: interviews.filter((i: any) => i.status === 'cancelled').length,
    feedback_submitted: interviews.filter((i: any) => i.status === 'feedback_submitted').length,
  }

  const todayCount = interviews.filter((i: any) => i.status === 'scheduled' && i.scheduled_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length

  const filtered = interviews.filter((iv: any) => {
    const matchTab = iv.status === tab
    const matchSearch = (iv.candidate_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (iv.position_title || '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || iv.interview_type === typeFilter
    return matchTab && matchSearch && matchType
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ interviewId, payload }: { interviewId: string; payload: any }) =>
      interviewsApi.addFeedback(interviewId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      setFeedbackOpen(false)
    },
  })

  const handleFeedback = () => {
    if (!feedbackTarget) return
    feedbackMutation.mutate({ interviewId: feedbackTarget.id, payload: { interviewer_id: '', ...feedbackForm } })
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Interviews</h1><p className="page-subtitle">Schedule and manage all interview rounds</p></div>
        <button className="btn-primary" disabled>
          <Plus className="w-4 h-4" />Schedule Interview
        </button>
      </div>

      {todayCount > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">You have <span className="font-semibold">{todayCount} interview{todayCount > 1 ? 's' : ''}</span> scheduled today.</p>
          <button className="ml-auto text-xs font-medium text-amber-700 hover:underline flex items-center gap-1">View today <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Scheduled', value: counts.scheduled, icon: Calendar, cls: 'text-brand-600 bg-brand-50' },
          { label: 'Today', value: todayCount, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Feedback', value: counts.feedback_submitted, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Cancelled', value: counts.cancelled, icon: XCircle, cls: 'text-red-500 bg-red-50' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.cls)}><s.icon className="w-4 h-4" /></div>
            <div className="mt-2"><p className="text-2xl font-display font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['scheduled', 'feedback_submitted', 'completed', 'cancelled'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t.replace('_', ' ')} <span className="ml-1 text-gray-400">({counts[t]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search..." className="input pl-9 text-sm py-1.5 w-48" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm py-1.5 pr-8 w-36" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
            <option value="managerial">Managerial</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0
          ? <div className="card p-12 flex flex-col items-center text-gray-400"><Calendar className="w-8 h-8 mb-2" /><p className="text-sm font-medium text-gray-600">No interviews</p></div>
          : filtered.map((iv: any) => (
            <div key={iv.id} className="card p-4 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{iv.candidate_name || 'Candidate'}</h3>
                    <span className={cn('badge', TYPE_COLORS[iv.interview_type] || 'badge-gray')}>{TYPE_LABELS[iv.interview_type] || iv.interview_type}</span>
                    <span className="badge-gray">Round {iv.round_number}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{iv.position_title || '-'} · {iv.mode}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{iv.scheduled_at ? formatDate(iv.scheduled_at) : 'Unscheduled'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{iv.duration_minutes || 60} min</span>
                    {iv.mode === 'online'
                      ? <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5 text-blue-400" />Online</span>
                      : <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{iv.location}</span>
                    }
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{(iv.interviewers || []).length} panel</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => { setFeedbackTarget(iv); setFeedbackOpen(true) }}>
                    Add Feedback
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {feedbackOpen && feedbackTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Interview Feedback</h2>
              <button onClick={() => setFeedbackOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Technical</label>
                <input type="number" className="input" value={feedbackForm.technical_score} onChange={e => setFeedbackForm(prev => ({ ...prev, technical_score: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Communication</label>
                <input type="number" className="input" value={feedbackForm.communication_score} onChange={e => setFeedbackForm(prev => ({ ...prev, communication_score: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Culture</label>
                <input type="number" className="input" value={feedbackForm.cultural_score} onChange={e => setFeedbackForm(prev => ({ ...prev, cultural_score: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Overall</label>
                <input type="number" className="input" value={feedbackForm.overall_score} onChange={e => setFeedbackForm(prev => ({ ...prev, overall_score: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Strengths</label>
                <input className="input" value={feedbackForm.strengths} onChange={e => setFeedbackForm(prev => ({ ...prev, strengths: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Weaknesses</label>
                <input className="input" value={feedbackForm.weaknesses} onChange={e => setFeedbackForm(prev => ({ ...prev, weaknesses: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea className="input min-h-[90px]" value={feedbackForm.notes} onChange={e => setFeedbackForm(prev => ({ ...prev, notes: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Recommendation</label>
                <select className="input" value={feedbackForm.recommendation} onChange={e => setFeedbackForm(prev => ({ ...prev, recommendation: e.target.value }))}>
                  <option value="hire">Hire</option>
                  <option value="reject">Reject</option>
                  <option value="next_round">Next Round</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setFeedbackOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleFeedback} disabled={feedbackMutation.isPending}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase,
  Download, Calendar, Plus
} from 'lucide-react'
import { candidatesApi, interviewsApi, recruitmentApi } from '@/lib/api'
import { cn, formatDate, getInitials, STATUS_COLORS } from '@/lib/utils'

export default function CandidateProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<any | null>(null)
  const [scheduleError, setScheduleError] = useState('')

  const [scheduleForm, setScheduleForm] = useState({
    round_number: 1,
    interview_type: 'technical',
    mode: 'online',
    date: '',
    time: '',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    calendar_provider: 'google',
    panel_users: '',
    panel_roles: '',
  })

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

  const { data: candidateData } = useQuery({
    queryKey: ['candidate', id],
    enabled: Boolean(id),
    queryFn: () => candidatesApi.get(id!).then(r => r.data),
  })

  const { data: appsData } = useQuery({
    queryKey: ['candidate-apps', id],
    enabled: Boolean(id),
    queryFn: () => candidatesApi.listApplications({ candidate_id: id }).then(r => r.data),
  })

  const application = (appsData?.data ?? [])[0]

  const { data: positionData } = useQuery({
    queryKey: ['position', application?.position_id],
    enabled: Boolean(application?.position_id),
    queryFn: () => recruitmentApi.getPosition(application.position_id).then(r => r.data),
  })

  const { data: interviewsData } = useQuery({
    queryKey: ['interviews', application?.application_id],
    queryFn: () => interviewsApi.list().then(r => r.data),
  })

  const interviews = useMemo(() => {
    const list = interviewsData?.data ?? []
    if (!application?.application_id) return list
    return list.filter((i: any) => i.application_id === application.application_id)
  }, [interviewsData, application])

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => candidatesApi.updateStatus(application.application_id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate-apps', id] }),
  })

  const scheduleMutation = useMutation({
    mutationFn: (payload: any) => interviewsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      setScheduleOpen(false)
    },
    onError: (err: any) => {
      const message = err?.response?.data || 'Failed to schedule interview'
      setScheduleError(message)
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ interviewId, payload }: { interviewId: string; payload: any }) =>
      interviewsApi.addFeedback(interviewId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      setFeedbackOpen(false)
    },
  })

  if (!id) {
    return <div className="text-sm text-gray-500">Missing candidate id.</div>
  }

  const candidate = candidateData || {}
  const position = positionData || {}

  const rounds = position?.interview_rounds || []

  const handleSchedule = () => {
    if (!application?.application_id) return
    const scheduledAt = scheduleForm.date && scheduleForm.time
      ? new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString()
      : undefined

    const panelUsers = scheduleForm.panel_users
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
    const panelRoles = scheduleForm.panel_roles
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)

    scheduleMutation.mutate({
      application_id: application.application_id,
      round_number: scheduleForm.round_number,
      interview_type: scheduleForm.interview_type,
      mode: scheduleForm.mode,
      scheduled_at: scheduledAt,
      duration_minutes: scheduleForm.duration_minutes,
      location: scheduleForm.location || undefined,
      meeting_link: scheduleForm.meeting_link || undefined,
      calendar_provider: scheduleForm.calendar_provider || undefined,
      interviewers: panelUsers.map((id, index) => ({
        interviewer_id: id,
        role: panelRoles[index] || 'Interviewer',
      })),
    })
  }

  const handleFeedback = () => {
    if (!feedbackTarget) return
    feedbackMutation.mutate({
      interviewId: feedbackTarget.id,
      payload: {
        interviewer_id: '',
        ...feedbackForm,
      },
    })
  }

  const canUpdateStatus = Boolean(application?.application_id)

  return (
    <div className="max-w-5xl animate-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="page-title">Candidate Profile</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left */}
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
              {getInitials(candidate.full_name || 'C')}
            </div>
            <h2 className="font-display font-semibold text-gray-900">{candidate.full_name || 'Candidate'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{candidate.current_title || '-'}</p>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className={cn('badge', STATUS_COLORS[application?.status] || 'badge-gray')}>{application?.status || 'new'}</span>
              {candidate.ai_match_score && <span className="badge-green">{candidate.ai_match_score}% match</span>}
            </div>
            <div className="mt-4 space-y-2 text-xs text-gray-500 text-left">
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{candidate.email || '-'}</p>
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{candidate.phone || '-'}</p>
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{candidate.location || '-'}</p>
              <p className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" />{candidate.experience_years || 0} years exp.</p>
            </div>
            <div className="mt-4 space-y-2">
              <button className="btn-primary w-full justify-center text-sm" onClick={() => { setScheduleError(''); setScheduleOpen(true) }}>
                <Calendar className="w-4 h-4" />Schedule Interview
              </button>
              <button className="btn-secondary w-full justify-center text-sm">
                <Download className="w-4 h-4" />Download Resume
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Decision</h3>
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center text-sm" onClick={() => updateStatusMutation.mutate('selected')} disabled={!canUpdateStatus}>Mark Selected</button>
              <button className="btn-secondary w-full justify-center text-sm" onClick={() => updateStatusMutation.mutate('talent_pool')} disabled={!canUpdateStatus}>Move to Talent Pool</button>
              <button className="btn-secondary w-full justify-center text-sm" onClick={() => updateStatusMutation.mutate('rejected')} disabled={!canUpdateStatus}>Reject</button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {(candidate.skills || []).map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="col-span-2 space-y-4">
          <div className="card">
            <div className="px-5 py-3 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Application</h3>
            </div>
            <div className="p-5 text-sm text-gray-600 space-y-1">
              <p>Position: <span className="text-gray-900 font-medium">{application?.position_title || position?.title || '-'}</span></p>
              <p>Applied: <span className="text-gray-900 font-medium">{application?.submitted_at ? formatDate(application.submitted_at) : '-'}</span></p>
              <p>Status: <span className="text-gray-900 font-medium">{application?.status || '-'}</span></p>
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Interview History</h3>
              <button className="btn-secondary text-xs py-1" onClick={() => { setScheduleError(''); setScheduleOpen(true) }}>
                <Plus className="w-3.5 h-3.5" />Schedule
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {interviews.length === 0 && (
                <div className="p-5 text-center text-sm text-gray-400">No interviews scheduled yet</div>
              )}
              {interviews.map((iv: any) => (
                <div key={iv.id} className="p-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Round {iv.round_number} · {iv.interview_type}</p>
                    <p className="text-xs text-gray-500 mt-1">{iv.scheduled_at ? formatDate(iv.scheduled_at) : 'Unscheduled'} · {iv.mode}</p>
                    <div className="mt-2 text-xs text-gray-500">Status: {iv.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => { setFeedbackTarget(iv); setFeedbackOpen(true) }}>
                      Add Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {scheduleOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Schedule Interview</h2>
              <button onClick={() => setScheduleOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Round</label>
                <select
                  className="input"
                  value={scheduleForm.round_number}
                  onChange={e => setScheduleForm(prev => ({ ...prev, round_number: Number(e.target.value) }))}
                >
                  {rounds.length > 0
                    ? rounds.map((r: any) => (
                      <option key={r.round_number} value={r.round_number}>{r.name}</option>
                    ))
                    : [1, 2, 3].map(n => (
                      <option key={n} value={n}>Round {n}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  className="input"
                  value={scheduleForm.interview_type}
                  onChange={e => setScheduleForm(prev => ({ ...prev, interview_type: e.target.value }))}
                >
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="managerial">Managerial</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                <input type="date" className="input" value={scheduleForm.date} onChange={e => setScheduleForm(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Time</label>
                <input type="time" className="input" value={scheduleForm.time} onChange={e => setScheduleForm(prev => ({ ...prev, time: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration (mins)</label>
                <input type="number" className="input" value={scheduleForm.duration_minutes} onChange={e => setScheduleForm(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Mode</label>
                <select className="input" value={scheduleForm.mode} onChange={e => setScheduleForm(prev => ({ ...prev, mode: e.target.value }))}>
                  <option value="online">Online</option>
                  <option value="offline">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Calendar</label>
                <select className="input" value={scheduleForm.calendar_provider} onChange={e => setScheduleForm(prev => ({ ...prev, calendar_provider: e.target.value }))}>
                  <option value="google">Google Calendar</option>
                  <option value="microsoft">Microsoft Outlook</option>
                  <option value="none">No Sync</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting Link / Location</label>
                <input className="input" value={scheduleForm.meeting_link} onChange={e => setScheduleForm(prev => ({ ...prev, meeting_link: e.target.value }))} placeholder="https://meet.google.com/..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Panel Users (IDs)</label>
                <input className="input" value={scheduleForm.panel_users} onChange={e => setScheduleForm(prev => ({ ...prev, panel_users: e.target.value }))} placeholder="comma-separated user IDs" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Panel Roles</label>
                <input className="input" value={scheduleForm.panel_roles} onChange={e => setScheduleForm(prev => ({ ...prev, panel_roles: e.target.value }))} placeholder="comma-separated roles" />
              </div>
            </div>
            {scheduleError && (
              <div className="mt-3 text-xs text-red-600">{scheduleError}</div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setScheduleOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSchedule} disabled={scheduleMutation.isPending}>Schedule</button>
            </div>
          </div>
        </div>
      )}

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


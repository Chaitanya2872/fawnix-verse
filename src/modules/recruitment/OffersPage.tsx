import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Plus, Search, Clock, CheckCircle2, XCircle, Send,
  DollarSign, Calendar, AlertCircle
} from 'lucide-react'
import { approvalFlowsApi, candidatesApi, offersApi } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:            { label: 'Draft',            cls: 'badge-gray'   },
  pending_approval: { label: 'Pending Approval', cls: 'badge-yellow' },
  approved:         { label: 'Approved',         cls: 'badge-green'  },
  sent:             { label: 'Offer Sent',        cls: 'badge-blue'   },
  accepted:         { label: 'Accepted',          cls: 'badge-green'  },
  declined:         { label: 'Declined',          cls: 'badge-red'    },
}

function formatSalary(value?: number | string) {
  if (!value) return '-'
  const num = typeof value === 'string' ? Number(value) : value
  return `?${(num / 100000).toFixed(1)}L`
}

export default function OffersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    application_id: '',
    approval_flow_id: '',
    base_salary: '',
    bonus: '',
    equity: '',
    benefits: '',
    joining_date: '',
    offer_expiry: '',
    terms: '',
  })

  const { data: offersData } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offersApi.list().then(r => r.data),
  })

  const { data: appsData } = useQuery({
    queryKey: ['offer-apps'],
    queryFn: () => candidatesApi.listApplications({ limit: 100 }).then(r => r.data),
  })

  const { data: flowsData } = useQuery({
    queryKey: ['approval-flows'],
    queryFn: () => approvalFlowsApi.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => offersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
      setModalOpen(false)
      setForm({
        application_id: '', approval_flow_id: '', base_salary: '', bonus: '', equity: '', benefits: '',
        joining_date: '', offer_expiry: '', terms: '',
      })
    },
  })

  const sendForApproval = useMutation({
    mutationFn: (id: string) => offersApi.sendForApproval(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => offersApi.updateStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  })

  const offers = offersData?.data ?? []
  const applications = appsData?.data ?? []
  const flows = flowsData?.data ?? []

  const filtered = offers.filter((o: any) => {
    const matchTab = tab === 'all' || o.status === tab
    const matchSearch = (o.candidate_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.position_title || '').toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const stats = {
    sent: offers.filter((o: any) => o.status === 'sent').length,
    accepted: offers.filter((o: any) => o.status === 'accepted').length,
    declined: offers.filter((o: any) => o.status === 'declined').length,
    pending: offers.filter((o: any) => o.status === 'pending_approval').length,
  }

  const TABS = [
    { key: 'all', label: 'All' }, { key: 'draft', label: 'Draft' },
    { key: 'pending_approval', label: 'Pending' }, { key: 'sent', label: 'Sent' },
    { key: 'accepted', label: 'Accepted' }, { key: 'declined', label: 'Declined' },
  ]

  const handleCreate = () => {
    if (!form.application_id) return
    createMutation.mutate({
      application_id: form.application_id,
      approval_flow_id: form.approval_flow_id || undefined,
      base_salary: form.base_salary || undefined,
      bonus: form.bonus || undefined,
      equity: form.equity || undefined,
      benefits: form.benefits || undefined,
      joining_date: form.joining_date || undefined,
      offer_expiry: form.offer_expiry || undefined,
      terms: form.terms || undefined,
    })
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Offers</h1><p className="page-subtitle">Manage offer letters and track candidate responses</p></div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" />Create Offer</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Offer Sent', value: stats.sent, icon: Send, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Declined', value: stats.declined, icon: XCircle, cls: 'text-red-500 bg-red-50' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.cls)}><s.icon className="w-4 h-4" /></div>
            <div className="mt-2"><p className="text-2xl font-display font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search candidate, position..." className="input pl-9 text-sm py-1.5 w-56"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0
          ? <div className="card p-12 flex flex-col items-center text-gray-400"><Gift className="w-8 h-8 mb-2" /><p className="text-sm font-medium text-gray-600">No offers found</p></div>
          : filtered.map((offer: any) => {
            const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft
            return (
              <div key={offer.id} className="card p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{offer.candidate_name || 'Candidate'}</h3>
                      <span className={cn('badge', cfg.cls)}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{offer.position_title || '-'}</p>
                    <div className="flex items-center gap-5 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-6 h-6 rounded bg-brand-50 flex items-center justify-center">
                          <DollarSign className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-gray-400">Base</p>
                          <p className="font-semibold text-gray-900">{formatSalary(offer.base_salary)}<span className="font-normal text-gray-400">/yr</span></p>
                        </div>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-400">Bonus</p>
                        <p className="font-semibold text-gray-900">{formatSalary(offer.bonus)}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-400">Joining</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1"><Calendar className="w-3 h-3" />{offer.joining_date ? formatDate(offer.joining_date) : '-'}</p>
                      </div>
                      <div className="text-xs">
                        <p className="text-gray-400">Expires</p>
                        <p className="font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{offer.offer_expiry ? formatDate(offer.offer_expiry) : '-'}</p>
                      </div>
                    </div>
                    {offer.approvals && offer.approvals.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-400">Approvals:</span>
                        {offer.approvals.map((ap: any) => (
                          <span key={ap.id} className="badge-blue">Stage {ap.level}: {ap.status}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.status === 'draft' && (
                      <button className="btn-secondary text-xs" onClick={() => sendForApproval.mutate(offer.id)}>
                        <Send className="w-3.5 h-3.5" /> Send for Approval
                      </button>
                    )}
                    {offer.status === 'approved' && (
                      <button className="btn-primary text-xs" onClick={() => updateStatus.mutate({ id: offer.id, status: 'sent' })}>
                        <Send className="w-3.5 h-3.5" /> Send Offer
                      </button>
                    )}
                    {offer.status === 'sent' && (
                      <button className="btn-secondary text-xs" onClick={() => updateStatus.mutate({ id: offer.id, status: 'accepted' })}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Accepted
                      </button>
                    )}
                    {offer.status === 'sent' && (
                      <button className="btn-secondary text-xs" onClick={() => updateStatus.mutate({ id: offer.id, status: 'declined' })}>
                        <AlertCircle className="w-3.5 h-3.5" /> Mark Declined
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Create Offer</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Application</label>
                <select className="input" value={form.application_id} onChange={e => setForm(prev => ({ ...prev, application_id: e.target.value }))}>
                  <option value="">Select application</option>
                  {applications.map((app: any) => (
                    <option key={app.application_id} value={app.application_id}>
                      {app.candidate_name} · {app.position_title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Approval Flow</label>
                <select className="input" value={form.approval_flow_id} onChange={e => setForm(prev => ({ ...prev, approval_flow_id: e.target.value }))}>
                  <option value="">Select approval flow</option>
                  {flows.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Base Salary</label>
                <input className="input" value={form.base_salary} onChange={e => setForm(prev => ({ ...prev, base_salary: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Bonus</label>
                <input className="input" value={form.bonus} onChange={e => setForm(prev => ({ ...prev, bonus: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Joining Date</label>
                <input type="date" className="input" value={form.joining_date} onChange={e => setForm(prev => ({ ...prev, joining_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Offer Expiry</label>
                <input type="date" className="input" value={form.offer_expiry} onChange={e => setForm(prev => ({ ...prev, offer_expiry: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Terms</label>
                <textarea className="input min-h-[90px]" value={form.terms} onChange={e => setForm(prev => ({ ...prev, terms: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={createMutation.isPending || !form.application_id}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


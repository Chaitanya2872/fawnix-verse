import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Target, Users, Award } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type AnalyticsResponse = {
  summary?: {
    intake_total?: number
    shortlisted?: number
    interview?: number
    decisions?: number
    approved?: number
    rejected?: number
  }
  conversion_rates?: {
    intake_to_shortlist?: number
    shortlist_to_interview?: number
    interview_to_decision?: number
    decision_to_approved?: number
  }
  stage_velocity_days?: {
    intake_to_decision?: number | null
    decision_to_approved?: number | null
  }
  generated_at?: string
}

function MetricCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.FC<any>; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['recruitment-analytics'],
    queryFn: () => recruitmentApi.getRecruitmentAnalytics().then(r => r.data),
  })

  const summary = data?.summary || {}
  const rates = data?.conversion_rates || {}
  const velocity = data?.stage_velocity_days || {}

  const conversionRows = useMemo(() => ([
    { label: 'Intake → Shortlist', value: rates.intake_to_shortlist },
    { label: 'Shortlist → Interview', value: rates.shortlist_to_interview },
    { label: 'Interview → Decision', value: rates.interview_to_decision },
    { label: 'Decision → Approved', value: rates.decision_to_approved },
  ]), [rates])

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Recruitment Analytics</h1>
          <p className="page-subtitle">Process metrics based on live intake and pipeline data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Intake"
          value={`${summary.intake_total ?? 0}`}
          icon={Users}
          sub="All submitted applications"
        />
        <MetricCard
          label="Shortlisted"
          value={`${summary.shortlisted ?? 0}`}
          icon={Target}
          sub="Moved into pipeline"
        />
        <MetricCard
          label="Decisions Requested"
          value={`${summary.decisions ?? 0}`}
          icon={Award}
          sub="Decision approvals"
        />
        <MetricCard
          label="Avg. Intake → Decision"
          value={velocity.intake_to_decision ? `${velocity.intake_to_decision.toFixed(1)} days` : '—'}
          icon={Clock}
          sub="Based on completed decisions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Stage Conversions</h3>
          <div className="space-y-3">
            {conversionRows.map(row => {
              const pct = Math.round((row.value || 0) * 100)
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{row.label}</span>
                    <span className="text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <div className="text-xs text-gray-400">Interviews in progress</div>
              <div className="text-lg font-semibold text-gray-900">{summary.interview ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Approved decisions</div>
              <div className="text-lg font-semibold text-gray-900">{summary.approved ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Rejected</div>
              <div className={cn('text-lg font-semibold', (summary.rejected ?? 0) > 0 ? 'text-red-600' : 'text-gray-900')}>
                {summary.rejected ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            {data?.generated_at ? `Generated at ${new Date(data.generated_at).toLocaleString()}` : 'Updated on refresh'}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400 mt-4">Loading analytics...</div>
      )}
    </div>
  )
}

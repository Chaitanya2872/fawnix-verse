import { useQuery } from '@tanstack/react-query'
import { BarChart3, Clock, FileText, TrendingUp, Target } from 'lucide-react'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formsApi } from '@/lib/formsApi'
import type { FormAnalytics } from '@/lib/formsApi'

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.FC<any> }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function FormAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['forms-analytics'],
    queryFn: () => formsApi.listAnalytics().then(r => r.data),
  })

  const analytics: FormAnalytics | undefined = data

  const formatMetric = (value: number | null | undefined, suffix = '') => {
    if (value === null || value === undefined) return '—'
    return `${value}${suffix}`
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Forms Analytics</h1>
          <p className="page-subtitle">Submission trends and completion performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Forms" value={analytics ? String(analytics.total_forms) : '—'} icon={FileText} />
        <StatCard label="Submissions (7d)" value={analytics ? String(analytics.submissions_last_7) : '—'} icon={TrendingUp} />
        <StatCard label="Completion Rate" value={formatMetric(analytics?.completion_rate, '%')} icon={Target} />
        <StatCard label="Avg Completion" value={formatMetric(analytics?.avg_completion_time_days, ' days')} icon={Clock} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Submission Trend</h3>
            <p className="text-xs text-gray-400">Weekly submissions vs completions</p>
          </div>
          <BarChart3 className="w-4 h-4 text-gray-300" />
        </div>
        {isLoading && <div className="py-6 text-sm text-gray-400">Loading analytics...</div>}
        {!isLoading && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics?.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} dot={false} name="Submissions" />
            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}


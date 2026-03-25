// AnalyticsPage.tsx
import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Clock, Target, Award, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type Period = '7d' | '30d' | '90d' | '1y'

const hiringTrend = [
  { month: 'Jan', applications: 38, shortlisted: 18, interviewed: 12, hired: 4 },
  { month: 'Feb', applications: 52, shortlisted: 24, interviewed: 16, hired: 7 },
  { month: 'Mar', applications: 45, shortlisted: 20, interviewed: 13, hired: 5 },
  { month: 'Apr', applications: 71, shortlisted: 33, interviewed: 22, hired: 10 },
  { month: 'May', applications: 63, shortlisted: 28, interviewed: 18, hired: 9 },
  { month: 'Jun', applications: 88, shortlisted: 41, interviewed: 27, hired: 14 },
]

const sourceData = [
  { name: 'LinkedIn', value: 42, hires: 6, color: '#6366f1' },
  { name: 'Naukri', value: 28, hires: 4, color: '#8b5cf6' },
  { name: 'Referral', value: 16, hires: 5, color: '#06b6d4' },
  { name: 'Direct', value: 9, hires: 2, color: '#10b981' },
  { name: 'Other', value: 5, hires: 1, color: '#f59e0b' },
]

const departmentData = [
  { dept: 'Engineering', openings: 8, filled: 5, time_to_hire: 28 },
  { dept: 'Design', openings: 3, filled: 2, time_to_hire: 22 },
  { dept: 'Product', openings: 2, filled: 2, time_to_hire: 18 },
  { dept: 'Marketing', openings: 4, filled: 2, time_to_hire: 20 },
  { dept: 'DevOps', openings: 2, filled: 1, time_to_hire: 35 },
  { dept: 'Data', openings: 3, filled: 1, time_to_hire: 30 },
]

const pipelineFunnel = [
  { stage: 'Applications', count: 357, pct: 100 },
  { stage: 'Shortlisted', count: 164, pct: 46 },
  { stage: 'HR Screened', count: 98, pct: 27 },
  { stage: 'Interviewed', count: 68, pct: 19 },
  { stage: 'Selected', count: 31, pct: 9 },
  { stage: 'Hired', count: 49, pct: 14 },
]

const recruiterPerf = [
  { name: 'Sohan Talukder', roles_filled: 12, avg_time: 24, offer_accept_rate: 87, active_roles: 4 },
  { name: 'Priya Mehta', roles_filled: 9, avg_time: 28, offer_accept_rate: 78, active_roles: 5 },
  { name: 'Anjali Rao', roles_filled: 7, avg_time: 31, offer_accept_rate: 85, active_roles: 3 },
  { name: 'Rohit Dev', roles_filled: 5, avg_time: 35, offer_accept_rate: 72, active_roles: 6 },
]

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#22c55e']

function MetricCard({ label, value, change, positive, icon: Icon, sub }: {
  label: string; value: string; change: string; positive: boolean; icon: React.FC<any>; sub?: string
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
        <span className={cn('text-xs font-medium flex items-center gap-0.5', positive ? 'text-emerald-600' : 'text-red-500')}>
          {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {change}
        </span>
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
  const [period, setPeriod] = useState<Period>('30d')

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Recruitment Analytics</h1>
          <p className="page-subtitle">Hiring performance insights and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {p}
              </button>
            ))}
          </div>
          <button className="btn-secondary"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Time to Hire" value="26 days" change="-3 days" positive={true} icon={Clock} sub="vs. last period" />
        <MetricCard label="Total Hires" value="49" change="+14%" positive={true} icon={Users} sub="this period" />
        <MetricCard label="Offer Accept Rate" value="82%" change="+5%" positive={true} icon={Award} sub="of offers sent" />
        <MetricCard label="Conversion Rate" value="13.7%" change="-2.1%" positive={false} icon={Target} sub="applied → hired" />
      </div>

      {/* Row 1: Hiring trend + Source */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Hiring Trend</h3>
              <p className="text-xs text-gray-400">Applications → Hired over 6 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-gray-300" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hiringTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false} name="Applications" />
              <Line type="monotone" dataKey="shortlisted" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Shortlisted" />
              <Line type="monotone" dataKey="interviewed" stroke="#06b6d4" strokeWidth={2} dot={false} name="Interviewed" />
              <Line type="monotone" dataKey="hired" stroke="#10b981" strokeWidth={2} dot={false} name="Hired" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Source of Hire</h3>
          <p className="text-xs text-gray-400 mb-4">Where successful hires come from</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3}>
                {sourceData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {sourceData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span>{s.value}%</span>
                  <span className="text-emerald-600 font-medium">{s.hires} hired</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline funnel + Dept breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Pipeline funnel */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Pipeline Funnel</h3>
          <p className="text-xs text-gray-400 mb-5">Conversion at each stage</p>
          <div className="space-y-2">
            {pipelineFunnel.map((stage, i) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{stage.stage}</span>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium text-gray-900">{stage.count}</span>
                    <span>({stage.pct}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stage.pct}%`, background: STAGE_COLORS[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department breakdown */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Department Breakdown</h3>
              <p className="text-xs text-gray-400">Openings filled and avg. time to hire</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={departmentData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="openings" fill="#e0e7ff" radius={[3, 3, 0, 0]} name="Openings" />
              <Bar dataKey="filled" fill="#6366f1" radius={[3, 3, 0, 0]} name="Filled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recruiter performance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recruiter Performance</h3>
          <button className="text-xs text-brand-600 hover:underline">Full Report</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="table-header text-left">Recruiter</th>
              <th className="table-header text-left">Roles Filled</th>
              <th className="table-header text-left">Avg. Time to Hire</th>
              <th className="table-header text-left">Offer Accept Rate</th>
              <th className="table-header text-left">Active Roles</th>
            </tr>
          </thead>
          <tbody>
            {recruiterPerf.map((r, i) => (
              <tr key={r.name} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                      {r.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium text-gray-900">{r.name}</span>
                    {i === 0 && <span className="badge-green text-[10px]">Top</span>}
                  </div>
                </td>
                <td className="table-cell font-semibold text-gray-900">{r.roles_filled}</td>
                <td className="table-cell">
                  <span className={cn('font-medium', r.avg_time <= 25 ? 'text-emerald-600' : r.avg_time <= 30 ? 'text-amber-600' : 'text-red-500')}>
                    {r.avg_time} days
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${r.offer_accept_rate}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{r.offer_accept_rate}%</span>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="badge-blue">{r.active_roles} active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

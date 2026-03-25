import { useState } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { Plus, MoreHorizontal, Search, Filter, ChevronDown } from 'lucide-react'

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-gray-400', count: 24 },
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-400', count: 12 },
  { id: 'hr_screening', label: 'HR Screening', color: 'bg-amber-400', count: 8 },
  { id: 'interview_scheduled', label: 'Interview', color: 'bg-violet-400', count: 6 },
  { id: 'selected', label: 'Selected', color: 'bg-emerald-400', count: 4 },
  { id: 'offer_sent', label: 'Offer', color: 'bg-teal-400', count: 3 },
]

const mockCards: Record<string, any[]> = {
  applied: [
    { id: '1', name: 'Emily Rodriguez', role: 'Sr. Frontend Dev', score: 92, time: '2h ago', source: 'LinkedIn' },
    { id: '2', name: 'Marcus Chen', role: 'Full Stack Eng', score: 88, time: '5h ago', source: 'Referral' },
    { id: '3', name: 'Priya Sharma', role: 'Product Designer', score: 80, time: '1d ago', source: 'LinkedIn' },
  ],
  shortlisted: [
    { id: '4', name: 'Arjun Patel', role: 'DevOps Engineer', score: 85, time: '1d ago', source: 'Naukri' },
    { id: '5', name: 'Sneha Reddy', role: 'Data Engineer', score: 79, time: '2d ago', source: 'LinkedIn' },
  ],
  hr_screening: [
    { id: '6', name: 'Rohit Kumar', role: 'Backend Dev', score: 82, time: '3d ago', source: 'Direct' },
  ],
  interview_scheduled: [
    { id: '7', name: 'Anjali Singh', role: 'QA Lead', score: 77, time: '4d ago', source: 'Referral' },
    { id: '8', name: 'Vikram Mehta', role: 'Android Dev', score: 84, time: '2d ago', source: 'Naukri' },
  ],
  selected: [
    { id: '9', name: 'Kavya Nair', role: 'ML Engineer', score: 91, time: '5d ago', source: 'LinkedIn' },
  ],
  offer_sent: [
    { id: '10', name: 'Suresh Iyer', role: 'Solution Architect', score: 96, time: '1w ago', source: 'Direct' },
  ],
}

function CandidateCard({ candidate }: { candidate: any }) {
  return (
    <div className="kanban-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
            {getInitials(candidate.name)}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{candidate.name}</p>
            <p className="text-[11px] text-gray-400">{candidate.role}</p>
          </div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${candidate.score}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-gray-600">{candidate.score}%</span>
        </div>
        <span className="text-[10px] text-gray-400">{candidate.time}</span>
      </div>
      <div className="mt-2">
        <span className="badge-blue text-[10px]">{candidate.source}</span>
      </div>
    </div>
  )
}

export default function CandidatePipelinePage() {
  const [cards, setCards] = useState(mockCards)
  const [dragOver, setDragOver] = useState<string | null>(null)

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Candidate Pipeline</h1>
          <p className="page-subtitle">Visual overview of your hiring funnel</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search candidates..." className="input pl-9 text-sm py-1.5 w-52" />
          </div>
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            All Jobs
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pipeline board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map(stage => {
            const stageCandidates = cards[stage.id] || []
            return (
              <div
                key={stage.id}
                className={cn(
                  'w-60 flex flex-col gap-2',
                  dragOver === stage.id && 'opacity-80'
                )}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                    <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded-full">
                      {stageCandidates.length}
                    </span>
                  </div>
                  <button className="text-gray-300 hover:text-gray-500">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className={cn('kanban-col rounded-xl p-2 min-h-[120px]', dragOver === stage.id ? 'bg-brand-50' : 'bg-gray-50/50')}>
                  {stageCandidates.map(c => (
                    <div key={c.id} draggable>
                      <CandidateCard candidate={c} />
                    </div>
                  ))}
                  {stageCandidates.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
                      Drop candidates here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mt-6 card p-4">
        <div className="flex items-center gap-8">
          {STAGES.map(stage => (
            <div key={stage.id} className="text-center">
              <div className="text-lg font-display font-bold text-gray-900">
                {(mockCards[stage.id] || []).length}
              </div>
              <div className="text-xs text-gray-500">{stage.label}</div>
            </div>
          ))}
          <div className="text-center ml-auto">
            <div className="text-lg font-display font-bold text-brand-600">
              {Object.values(mockCards).flat().length}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>
    </div>
  )
}

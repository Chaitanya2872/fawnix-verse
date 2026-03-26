import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ChevronDown, Filter, Search } from 'lucide-react'
import { recruitmentApi } from '@/lib/api'
import { cn, getInitials, timeAgo, STATUS_COLORS } from '@/lib/utils'

type PipelineStage = {
  id: string
  name: string
  order_index: number
  is_terminal: boolean
  is_active: boolean
  category?: string | null
}

type PipelineCard = {
  application_id: string
  candidate_id: string
  candidate_name: string
  current_title?: string | null
  skills?: string[]
  applied_at?: string | null
  status?: string | null
}

type PipelineResponse = {
  stages: PipelineStage[]
  cards: Record<string, PipelineCard[]>
}

function CandidateCard({ candidate }: { candidate: PipelineCard }) {
  return (
    <div className="kanban-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
            {getInitials(candidate.candidate_name || 'C')}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{candidate.candidate_name || 'Candidate'}</p>
            <p className="text-[11px] text-gray-400">{candidate.current_title || '—'}</p>
          </div>
        </div>
        {candidate.status && (
          <span className={cn('badge text-[10px]', STATUS_COLORS[candidate.status] || 'badge-gray')}>
            {candidate.status.replace('_', ' ')}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${Math.min(100, (candidate.skills?.length || 0) * 10)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-gray-600">{candidate.skills?.length || 0} skills</span>
        </div>
        <span className="text-[10px] text-gray-400">
          {candidate.applied_at ? timeAgo(candidate.applied_at) : '—'}
        </span>
      </div>
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.skills.slice(0, 2).map(skill => (
            <span key={skill} className="badge-blue text-[10px]">{skill}</span>
          ))}
          {candidate.skills.length > 2 && (
            <span className="badge-gray text-[10px]">+{candidate.skills.length - 2}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function CandidatePipelinePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedVacancy, setSelectedVacancy] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ applicationId: string; fromStageId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => recruitmentApi.getPositions({}).then(r => r.data),
  })

  useEffect(() => {
    if (!selectedVacancy && positionsData?.data?.length) {
      setSelectedVacancy(positionsData.data[0].id)
    }
  }, [positionsData, selectedVacancy])

  const { data: pipelineData, isLoading } = useQuery<PipelineResponse>({
    queryKey: ['pipeline', selectedVacancy],
    enabled: Boolean(selectedVacancy),
    queryFn: () => recruitmentApi.getPipeline(selectedVacancy).then(r => r.data),
  })

  const moveMutation = useMutation({
    mutationFn: (payload: { applicationId: string; toStageId: string; reason?: string }) =>
      recruitmentApi.movePipeline(payload),
    onSuccess: () => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['pipeline', selectedVacancy] })
    },
    onError: (err: any) => {
      const message = err?.response?.data || 'Unable to move candidate'
      setError(typeof message === 'string' ? message : 'Unable to move candidate')
    },
  })

  const stages = pipelineData?.stages ?? []
  const cardsByStage = pipelineData?.cards ?? {}

  const filteredCards = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return cardsByStage
    const next: Record<string, PipelineCard[]> = {}
    stages.forEach(stage => {
      const list = cardsByStage[stage.id] || []
      next[stage.id] = list.filter(card =>
        (card.candidate_name || '').toLowerCase().includes(needle) ||
        (card.current_title || '').toLowerCase().includes(needle)
      )
    })
    return next
  }, [search, cardsByStage, stages])

  const positions = positionsData?.data ?? []

  const handleDrop = (stageId: string) => {
    setDragOver(null)
    if (!dragging || dragging.fromStageId === stageId) return
    moveMutation.mutate({ applicationId: dragging.applicationId, toStageId: stageId })
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Candidate Pipeline</h1>
          <p className="page-subtitle">Drag candidates through the hiring workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search candidates..."
              className="input pl-9 text-sm py-1.5 w-52"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="input pl-9 text-sm py-1.5 pr-8 w-56"
              value={selectedVacancy}
              onChange={e => setSelectedVacancy(e.target.value)}
            >
              <option value="">Select vacancy</option>
              {positions.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!selectedVacancy && (
        <div className="card p-6 text-sm text-gray-500">
          Select a vacancy to load the pipeline.
        </div>
      )}

      {selectedVacancy && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map(stage => {
              const stageCandidates = filteredCards[stage.id] || []
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'w-64 flex flex-col gap-2',
                    dragOver === stage.id && 'opacity-80'
                  )}
                  onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                      <span className="text-xs font-semibold text-gray-700">{stage.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded-full">
                        {stageCandidates.length}
                      </span>
                    </div>
                  </div>

                  <div className={cn('kanban-col rounded-xl p-2 min-h-[140px]', dragOver === stage.id ? 'bg-brand-50' : 'bg-gray-50/50')}>
                    {stageCandidates.map(c => (
                      <div
                        key={c.application_id}
                        draggable
                        onDragStart={() => setDragging({ applicationId: c.application_id, fromStageId: stage.id })}
                        onDragEnd={() => setDragging(null)}
                      >
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
            {stages.length === 0 && !isLoading && (
              <div className="card p-6 text-sm text-gray-500">
                No pipeline stages configured yet for this vacancy.
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-gray-400 mt-4">Loading pipeline...</div>
      )}
    </div>
  )
}

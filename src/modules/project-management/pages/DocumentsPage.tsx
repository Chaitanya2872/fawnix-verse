import { useMemo, useState } from 'react'
import { FileText, FileBadge2 } from 'lucide-react'
import { useProjectsContext } from '../context'

export default function ProjectsDocumentsPage() {
  const { projects } = useProjectsContext()
  const [projectFilter, setProjectFilter] = useState('ALL')

  const allDocs = useMemo(() =>
    projects
      .filter((p) => projectFilter === 'ALL' || p.id === projectFilter)
      .flatMap((p) => {
        const items = []
        if (p.requirementDocument) {
          items.push({ ...p.requirementDocument, projectName: p.name, projectCode: p.projectCode, type: 'Requirement' as const })
        }
        for (const att of (p.attachments ?? [])) {
          items.push({ ...att, projectName: p.name, projectCode: p.projectCode, type: 'Attachment' as const })
        }
        return items
      }),
  [projects, projectFilter])

  const totalByProject = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of projects) {
      map[p.id] = (p.requirementDocument ? 1 : 0) + (p.attachments?.length ?? 0)
    }
    return map
  }, [projects])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <FileBadge2 className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Documents</h1>
            <p className="text-sm text-slate-400">{allDocs.length} files across {projects.length} projects</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="ALL">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({totalByProject[p.id] ?? 0})</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-400">{allDocs.length} documents</span>
        </div>

        {allDocs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
            <FileBadge2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No documents attached to any project yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 lg:grid lg:grid-cols-[2fr_1fr_80px_1fr_100px] lg:gap-4">
              {['File', 'Project', 'Type', 'Uploaded By', 'Size'].map((h) => (
                <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {allDocs.map((doc, idx) => (
                <div key={doc.id ?? `doc-${idx}`}
                  className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-slate-50 lg:grid lg:grid-cols-[2fr_1fr_80px_1fr_100px] lg:items-center lg:gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.name}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-600">{doc.projectName}</p>
                    <p className="text-[10px] text-slate-400">{doc.projectCode}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold
                    ${doc.type === 'Requirement' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    {doc.type}
                  </span>
                  <p className="text-xs text-slate-500">{doc.uploadedBy}</p>
                  <p className="text-xs text-slate-400">{doc.size}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

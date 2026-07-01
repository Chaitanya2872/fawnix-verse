import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, X } from 'lucide-react'

/* ── Color presets ───────────────────────────────────────────────────────── */
const COLORS: Record<string, { bg: string; text: string; border: string; dotBg: string }> = {
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-200',     dotBg: 'bg-sky-400'     },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-200',  dotBg: 'bg-violet-400'  },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-200',  dotBg: 'bg-indigo-400'  },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dotBg: 'bg-emerald-400' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-200',  dotBg: 'bg-purple-400'  },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-200',  dotBg: 'bg-orange-400'  },
  slate:   { bg: 'bg-slate-200',   text: 'text-slate-700',   border: 'border-slate-300',   dotBg: 'bg-slate-400'   },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-200',    dotBg: 'bg-rose-400'    },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200',   dotBg: 'bg-amber-400'   },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-200',    dotBg: 'bg-cyan-400'    },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-200',    dotBg: 'bg-teal-400'    },
}

const CYCLE = ['sky', 'violet', 'emerald', 'orange', 'rose', 'amber', 'cyan', 'purple', 'indigo', 'teal', 'slate']

function preset(name: string) {
  return COLORS[name] ?? COLORS.slate
}

/* ── Props ───────────────────────────────────────────────────────────────── */
export interface ComboSelectProps {
  value: string[]
  options: string[]
  onChange: (v: string[]) => void
  onCreateOption?: (label: string) => void
  placeholder?: string
  multi?: boolean
  colorMap?: Record<string, string>
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function ComboSelect({
  value,
  options,
  onChange,
  onCreateOption,
  placeholder = 'Select…',
  multi = true,
  colorMap = {},
}: ComboSelectProps) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 260,
  })

  const triggerRef = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  const resolveColor = (opt: string) => {
    const mapped = colorMap[opt]
    if (mapped) return preset(mapped)
    const idx = options.indexOf(opt)
    return preset(CYCLE[Math.max(idx, 0) % CYCLE.length])
  }

  const calcPos = () => {
    if (!triggerRef.current) return
    const rect   = triggerRef.current.getBoundingClientRect()
    const viewH  = window.innerHeight
    const estH   = Math.min((options.length + 2) * 36 + 56, 300)
    const flipUp = rect.bottom + estH > viewH - 8 && rect.top > estH + 8
    setDropPos({
      top:   flipUp ? rect.top - estH - 4 : rect.bottom + 6,
      left:  rect.left,
      width: Math.max(rect.width, 260),
    })
  }

  const openDrop = () => {
    calcPos()
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  /*
   * Close when the PAGE scrolls behind the panel — but NOT when the dropdown's
   * own list scrolls (re-render as user types changes list height which can
   * trigger a scroll event on the list element itself).
   */
  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      // If the scroll originated inside the dropdown, ignore it
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setQuery('')
    }
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  const filtered  = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
  const trimmed   = query.trim()
  const canCreate = !!onCreateOption && !!trimmed &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === trimmed.toLowerCase())

  const toggle = (opt: string) => {
    if (multi) {
      onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
    } else {
      onChange([opt])
      setOpen(false)
      setQuery('')
    }
  }

  const create = () => {
    if (!canCreate) return
    onCreateOption!(trimmed)
    onChange(multi ? [...value, trimmed] : [trimmed])
    setQuery('')
    if (!multi) setOpen(false)
  }

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        tabIndex={0}
        onClick={openDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? setOpen(false) : openDrop() }
        }}
        className={[
          'inline-flex min-h-[42px] w-full flex-wrap cursor-pointer items-center gap-1.5',
          'rounded-2xl border bg-white px-3 py-2 transition outline-none',
          open
            ? 'border-sky-400 ring-2 ring-sky-400/20'
            : 'border-slate-200 hover:border-slate-300 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/20',
        ].join(' ')}
      >
        {value.length === 0 ? (
          <span className="text-sm text-slate-400">{placeholder}</span>
        ) : (
          value.map((v) => {
            const c = resolveColor(v)
            return (
              <span
                key={v}
                className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[12px] font-medium ${c.bg} ${c.text}`}
              >
                {v}
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)) }}
                  className="ml-0.5 rounded-sm opacity-50 transition-opacity hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* ── Notion-style dropdown ────────────────────────────────────────── */}
      {open && (
        <div
          ref={dropRef}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          style={{
            position:  'fixed',
            top:       dropPos.top,
            left:      dropPos.left,
            width:     dropPos.width,
            zIndex:    9999,
            boxShadow: '0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)',
          }}
        >
          {/* Search row */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={onCreateOption ? 'Search or create option…' : 'Filter options…'}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (canCreate) create()
                  else if (filtered.length === 1) toggle(filtered[0])
                }
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
              }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-2.5 text-[13px] text-slate-400">No options match.</p>
            )}

            {filtered.map((opt) => {
              const isSelected = value.includes(opt)
              const c = resolveColor(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={[
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-100',
                  ].join(' ')}
                >
                  {/* Colored chip — Notion puts the tag inline in the row */}
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium ${c.bg} ${c.text}`}>
                    {opt}
                  </span>

                  {/* Checkmark for selected */}
                  {isSelected && (
                    <Check className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                  )}
                </button>
              )
            })}

            {/* Create new option */}
            {canCreate && (
              <button
                type="button"
                onClick={create}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300">
                  <Plus className="h-3 w-3 text-slate-400" />
                </span>
                Create <span className="font-semibold text-slate-900">"{trimmed}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

/* ── Constants ───────────────────────────────────────────────────────────── */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS  = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }

function firstWeekday(y: number, m: number) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1   // Mon=0 … Sun=6
}

function getToday() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function parseValue(s: string | undefined) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m - 1, day: d }
}

function fmtDisplay(s: string) {
  const p = parseValue(s)
  if (!p) return ''
  return `${String(p.day).padStart(2, '0')} ${MONTH_SHORT[p.month]} ${p.year}`
}

type Cell = { day: number; str: string; type: 'prev' | 'curr' | 'next' }

function buildCells(year: number, month: number): Cell[] {
  const cells: Cell[] = []
  const first  = firstWeekday(year, month)
  const curr   = daysInMonth(year, month)
  const prevM  = month === 0 ? 11 : month - 1
  const prevY  = month === 0 ? year - 1 : year
  const nextM  = month === 11 ? 0 : month + 1
  const nextY  = month === 11 ? year + 1 : year
  const pad    = (n: number) => String(n).padStart(2, '0')

  for (let i = first - 1; i >= 0; i--) {
    const d = daysInMonth(prevY, prevM) - i
    cells.push({ day: d, type: 'prev', str: `${prevY}-${pad(prevM + 1)}-${pad(d)}` })
  }
  for (let d = 1; d <= curr; d++) {
    cells.push({ day: d, type: 'curr', str: `${year}-${pad(month + 1)}-${pad(d)}` })
  }
  let nd = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: nd, type: 'next', str: `${nextY}-${pad(nextM + 1)}-${pad(nd)}` })
    nd++
  }
  return cells
}

/* ── Props ───────────────────────────────────────────────────────────────── */
export interface DatePickerProps {
  value?: string           // 'YYYY-MM-DD'
  onChange: (v: string) => void
  placeholder?: string
  className?: string       // applied to the trigger button
  disabled?: boolean
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Pick a date',
  className = '',
  disabled = false,
}: DatePickerProps) {
  const now    = new Date()
  const tStr   = getToday()
  const parsed = parseValue(value)

  const [open, setOpen]           = useState(false)
  const [mode, setMode]           = useState<'cal' | 'month'>('cal')
  const [viewYear, setViewYear]   = useState(parsed?.year  ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth())
  const [dropPos, setDropPos]     = useState({ top: 0, left: 0, width: 290 })

  const trigRef = useRef<HTMLButtonElement>(null)
  const popRef  = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    if (disabled) return
    if (trigRef.current) {
      const r    = trigRef.current.getBoundingClientRect()
      const estH = 340
      const flip = r.bottom + estH > window.innerHeight - 8 && r.top > estH + 8
      setDropPos({ top: flip ? r.top - estH - 4 : r.bottom + 4, left: r.left, width: Math.max(r.width, 290) })
    }
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month) }
    setMode('cal')
    setOpen(true)
  }

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (!trigRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  /* Navigation */
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const cells = buildCells(viewYear, viewMonth)

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        ref={trigRef}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={`inline-flex items-center gap-2 text-left ${className}`}
      >
        {value
          ? <span className="flex-1 truncate">{fmtDisplay(value)}</span>
          : <span className="flex-1 truncate text-slate-400">{placeholder}</span>
        }
        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
      </button>

      {/* ── Popover ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width, boxShadow: '0 0 0 1px rgba(15,15,15,0.05), 0 4px 12px rgba(15,15,15,0.12), 0 16px 40px rgba(15,15,15,0.18)' }}
          className="min-w-[276px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          {mode === 'cal' ? (
            <>
              {/* Calendar header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode('month')}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day-of-week labels */}
              <div className="grid grid-cols-7 border-b border-slate-100 px-2 pb-2">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="text-center text-[11px] font-medium text-slate-400">{d}</span>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-0.5 px-2 py-2">
                {cells.map((cell, i) => {
                  const isSel     = value === cell.str
                  const isToday   = tStr === cell.str
                  const isOutside = cell.type !== 'curr'
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { onChange(cell.str); setOpen(false) }}
                      className="flex flex-col items-center gap-0.5 py-0.5"
                    >
                      <span
                        className={[
                          'flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] transition-colors',
                          isSel
                            ? 'bg-sky-500 font-semibold text-white'
                            : isToday && !isOutside
                            ? 'font-semibold text-sky-600 hover:bg-sky-50'
                            : isOutside
                            ? 'text-slate-300 hover:bg-slate-50'
                            : 'text-slate-700 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        {cell.day}
                      </span>
                      {isToday && !isSel
                        ? <span className="h-1 w-1 rounded-full bg-sky-500" />
                        : <span className="h-1 w-1" />
                      }
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Month-picker header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[13px] font-semibold text-slate-800">{viewYear}</span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                {MONTH_SHORT.map((m, i) => {
                  const isCurrMo = i === now.getMonth() && viewYear === now.getFullYear()
                  const isSelMo  = !!(parsed && i === parsed.month && viewYear === parsed.year)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setViewMonth(i); setMode('cal') }}
                      className={[
                        'rounded-xl py-2.5 text-[12.5px] font-medium transition-colors',
                        isSelMo
                          ? 'bg-sky-500 text-white'
                          : isCurrMo
                          ? 'font-semibold text-sky-600 hover:bg-slate-100'
                          : 'text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

const AVATAR_BG = [
  'bg-sky-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-blue-500', 'bg-indigo-500', 'bg-teal-500',
]

function avatarBg(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_BG[h % AVATAR_BG.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZE_CLS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-10 w-10 text-[13px]',
}

export function Avatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (!name) return null
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white ${SIZE_CLS[size]} ${avatarBg(name)}`}
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarGroup({
  names,
  max = 3,
  size = 'sm',
}: {
  names: string[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const visible = names.slice(0, max)
  const overflow = names.length - max

  return (
    <div className="flex">
      {visible.map((name, i) => (
        <span
          key={name + i}
          className={`inline-flex items-center justify-center rounded-full font-bold text-white ring-2 ring-background ${i > 0 ? '-ml-1.5' : ''} ${SIZE_CLS[size]} ${avatarBg(name)}`}
          title={name}
        >
          {initials(name)}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-slate-400 font-bold text-white ring-2 ring-background -ml-1.5 ${SIZE_CLS[size]}`}
          title={names.slice(max).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

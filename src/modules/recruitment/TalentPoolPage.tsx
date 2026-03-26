// TalentPoolPage.tsx
import { useState } from 'react'
import {
  Database, Search, Filter, Plus, Star, MapPin, Briefcase,
  Mail, Phone, Tag, ChevronDown, MoreHorizontal, Zap, BookmarkCheck
} from 'lucide-react'
import { cn, getInitials, timeAgo } from '@/lib/utils'

type SortBy = 'recent' | 'score' | 'name'

const POOL_TAGS = ['All', 'Frontend', 'Backend', 'Design', 'DevOps', 'Data', 'Mobile', 'Leadership']

const mockPool = [
  {
    id: '1', name: 'Emily Rodriguez', title: 'Senior Frontend Developer',
    email: 'emily@email.com', phone: '+1 555 0101', location: 'San Francisco, CA',
    experience_years: 7, skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    tags: ['Frontend', 'Remote OK'], score: 92, source: 'LinkedIn',
    added_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    last_contacted: new Date(Date.now() - 5 * 86400000).toISOString(),
    previous_positions: ['Senior Dev at TechCorp', 'Frontend Lead at StartupX'],
    notes: 'Strong candidate. Declined offer due to timing. Follow up in Q3.',
    availability: 'Open to opportunities',
  },
  {
    id: '2', name: 'Kavya Nair', title: 'ML Engineer',
    email: 'kavya@email.com', phone: '+91 98765 43210', location: 'Bangalore, IN',
    experience_years: 5, skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'AWS'],
    tags: ['Data', 'AI/ML'], score: 91, source: 'Referral',
    added_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    last_contacted: new Date(Date.now() - 3 * 86400000).toISOString(),
    previous_positions: ['ML Engineer at Google', 'Data Scientist at Flipkart'],
    notes: 'Top performer in technical rounds. Interested in leadership roles.',
    availability: 'Actively looking',
  },
  {
    id: '3', name: 'Marcus Chen', title: 'Full Stack Engineer',
    email: 'marcus@email.com', phone: '+1 555 0202', location: 'New York, NY',
    experience_years: 5, skills: ['React', 'Python', 'AWS', 'Docker', 'PostgreSQL'],
    tags: ['Frontend', 'Backend'], score: 88, source: 'LinkedIn',
    added_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    last_contacted: new Date(Date.now() - 12 * 86400000).toISOString(),
    previous_positions: ['Full Stack at Meta', 'Engineer at Stripe'],
    notes: 'Good culture fit. Waiting for senior role opening.',
    availability: 'Passively looking',
  },
  {
    id: '4', name: 'Rohit Kumar', title: 'Senior Backend Developer',
    email: 'rohit@email.com', phone: '+91 99887 66554', location: 'Hyderabad, IN',
    experience_years: 6, skills: ['Java', 'Spring Boot', 'Kafka', 'Redis', 'Kubernetes'],
    tags: ['Backend', 'DevOps'], score: 84, source: 'Naukri',
    added_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_contacted: new Date(Date.now() - 8 * 86400000).toISOString(),
    previous_positions: ['Backend Lead at PayTM', 'Sr. Engineer at Infosys'],
    notes: 'Strong Java profile. Prefers product companies over services.',
    availability: 'Open to opportunities',
  },
  {
    id: '5', name: 'Anjali Singh', title: 'Product Designer',
    email: 'anjali@email.com', phone: '+91 91234 56789', location: 'Pune, IN',
    experience_years: 4, skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    tags: ['Design'], score: 81, source: 'LinkedIn',
    added_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    last_contacted: new Date(Date.now() - 20 * 86400000).toISOString(),
    previous_positions: ['Product Designer at Swiggy', 'UX at Zomato'],
    notes: 'Great portfolio. Salary expectations slightly above budget.',
    availability: 'Not actively looking',
  },
]

const AVAILABILITY_CONFIG: Record<string, { cls: string }> = {
  'Actively looking':      { cls: 'badge-green' },
  'Open to opportunities': { cls: 'badge-blue' },
  'Passively looking':     { cls: 'badge-yellow' },
  'Not actively looking':  { cls: 'badge-gray' },
}

function PoolCard({ candidate }: { candidate: typeof mockPool[0] }) {
  const [expanded, setExpanded] = useState(false)
  const avCfg = AVAILABILITY_CONFIG[candidate.availability] || { cls: 'badge-gray' }

  return (
    <div className="card p-4 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {getInitials(candidate.name)}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">{candidate.name}</h3>
                <span className={cn('badge', avCfg.cls)}>{candidate.availability}</span>
                <div className="flex items-center gap-1">
                  <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${candidate.score}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-brand-600">{candidate.score}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{candidate.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button className="btn-primary text-xs py-1 px-2.5"><Zap className="w-3.5 h-3.5" />Quick Apply</button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>
            <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{candidate.experience_years} yrs</span>
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{candidate.email}</span>
            <span className="text-gray-300">·</span>
            <span>Added {timeAgo(candidate.added_at)}</span>
            <span className="text-gray-300">·</span>
            <span>Contacted {timeAgo(candidate.last_contacted)}</span>
          </div>

          {/* Skills */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {candidate.skills.slice(0, 5).map(s => (
              <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{s}</span>
            ))}
            {candidate.skills.length > 5 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-md">+{candidate.skills.length - 5}</span>
            )}
            <div className="ml-1 flex gap-1">
              {candidate.tags.map(t => (
                <span key={t} className="badge-purple flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{t}</span>
              ))}
            </div>
          </div>

          {/* Notes preview */}
          <p className="text-xs text-gray-400 italic mt-2 truncate">"{candidate.notes}"</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-3">
            <button className="text-xs text-brand-600 hover:underline">View Profile</button>
            <span className="text-gray-200">|</span>
            <button className="text-xs text-gray-500 hover:text-gray-700">Send Email</button>
            <span className="text-gray-200">|</span>
            <button className="text-xs text-gray-500 hover:text-gray-700">Add Note</button>
            <span className="text-gray-200">|</span>
            <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <BookmarkCheck className="w-3.5 h-3.5" />Remove from Pool
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TalentPoolPage() {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [sortBy, setSortBy] = useState<SortBy>('score')

  const filtered = mockPool
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
      const matchTag = activeTag === 'All' || c.tags.includes(activeTag)
      return matchSearch && matchTag
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    })

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Talent Pool</h1>
          <p className="page-subtitle">Curated candidates for future opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" />Filters</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />Add to Pool</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total in Pool', value: mockPool.length, color: 'text-brand-600 bg-brand-50', icon: Database },
          { label: 'Actively Looking', value: mockPool.filter(c => c.availability === 'Actively looking').length, color: 'text-emerald-600 bg-emerald-50', icon: Zap },
          { label: 'Avg Match Score', value: `${Math.round(mockPool.reduce((s, c) => s + c.score, 0) / mockPool.length)}%`, color: 'text-violet-600 bg-violet-50', icon: Star },
          { label: 'Tagged', value: mockPool.filter(c => c.tags.length > 0).length, color: 'text-amber-600 bg-amber-50', icon: Tag },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.color)}><s.icon className="w-4 h-4" /></div>
            <div className="mt-2"><p className="text-2xl font-display font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Tag filters + Search */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {POOL_TAGS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)}
              className={cn('px-3 py-1 text-xs font-medium rounded-full transition-colors border',
                activeTag === tag ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300')}>
              {tag}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Name, skill, location..." className="input pl-9 text-sm py-1.5 w-52"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm py-1.5 pr-8 w-36" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
            <option value="score">Sort: Score</option>
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500 mb-3">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''} in pool</p>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0
          ? <div className="card p-12 flex flex-col items-center text-gray-400"><Database className="w-8 h-8 mb-2" /><p className="text-sm font-medium text-gray-600">No candidates in pool</p></div>
          : filtered.map(c => <PoolCard key={c.id} candidate={c} />)
        }
      </div>
    </div>
  )
}
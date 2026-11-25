import { useMemo, useState } from 'react'
import { Users2 } from 'lucide-react'
import { useData } from '../hooks/useData'
import { EmptyState, SearchInput, Select } from '../components/ui/primitives'
import { ClubCard } from '../components/clubs/ClubCard'
import { ClubDetail } from '../components/clubs/ClubDetail'
import { budgetOf, healthByClub } from '../lib/derive'
import type { Club } from '../types'

type StatusFilter = 'all' | 'Healthy' | 'Watch' | 'At risk'
type SortKey = 'name' | 'health-asc' | 'health-desc' | 'members' | 'budget'

export default function Clubs() {
  const { clubs, events, volunteers, health, errors } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('name')
  const [open, setOpen] = useState<Club | null>(null)

  const hmap = useMemo(() => healthByClub(health), [health])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = clubs.filter((c) => {
      if (needle && !`${c.name} ${c.description ?? ''} ${c.skills_offered ?? ''} ${c.skills_needed ?? ''}`.toLowerCase().includes(needle)) return false
      if (status !== 'all' && hmap.get(c.id)?.status !== status) return false
      return true
    })
    const score = (c: Club) => hmap.get(c.id)?.score ?? -1
    out.sort((a, b) => {
      switch (sort) {
        case 'health-asc': return score(a) - score(b)
        case 'health-desc': return score(b) - score(a)
        case 'members': return (b.member_count ?? 0) - (a.member_count ?? 0)
        case 'budget': return budgetOf(b).remaining - budgetOf(a).remaining
        default: return a.name.localeCompare(b.name)
      }
    })
    return out
  }, [clubs, q, status, sort, hmap])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search clubs, skills…" />
        <Select<StatusFilter>
          label="Filter by health"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All health states' },
            { value: 'Healthy', label: 'Healthy' },
            { value: 'Watch', label: 'Watch' },
            { value: 'At risk', label: 'At risk' },
          ]}
        />
        <Select<SortKey>
          label="Sort clubs"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Sort: Name' },
            { value: 'health-asc', label: 'Sort: Health (lowest first)' },
            { value: 'health-desc', label: 'Sort: Health (highest first)' },
            { value: 'members', label: 'Sort: Members' },
            { value: 'budget', label: 'Sort: Budget remaining' },
          ]}
        />
      </div>

      {errors.health && (
        <p className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">Health scores unavailable: {errors.health}</p>
      )}

      {list.length === 0 ? (
        <EmptyState icon={Users2} title={clubs.length ? 'No clubs match your filters' : 'No clubs found'} hint={clubs.length ? 'Try clearing the search or health filter.' : 'The backend returned no clubs.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <ClubCard key={c.id} club={c} health={hmap.get(c.id)} onOpen={() => setOpen(c)} />
          ))}
        </div>
      )}

      <ClubDetail club={open} health={open ? hmap.get(open.id) : undefined} events={events} volunteers={volunteers} onClose={() => setOpen(null)} />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, HandHeart, Sparkles } from 'lucide-react'
import { useData } from '../hooks/useData'
import { Badge, EmptyState, SearchInput, SectionCard, Select } from '../components/ui/primitives'
import { assignedCount, isUpcoming, volunteerAssigned } from '../lib/derive'
import { fmtDate, splitList, todayISO } from '../lib/format'

type Assign = 'all' | 'assigned' | 'unassigned'

export default function Volunteers() {
  const { volunteers, events } = useData()
  const [q, setQ] = useState('')
  const [club, setClub] = useState('all')
  const [skill, setSkill] = useState('all')
  const [assign, setAssign] = useState<Assign>('all')

  const today = todayISO()
  const clubs = useMemo(() => [...new Set(volunteers.map((v) => v.club_name).filter(Boolean) as string[])].sort(), [volunteers])
  const skills = useMemo(() => [...new Set(volunteers.flatMap((v) => splitList(v.skills).map((s) => s.toLowerCase())))].sort(), [volunteers])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return volunteers.filter((v) => {
      if (needle && !`${v.name} ${v.skills ?? ''} ${v.club_name ?? ''}`.toLowerCase().includes(needle)) return false
      if (club !== 'all' && v.club_name !== club) return false
      if (skill !== 'all' && !splitList(v.skills).map((s) => s.toLowerCase()).includes(skill)) return false
      const n = volunteerAssigned(v).length
      if (assign === 'assigned' && n === 0) return false
      if (assign === 'unassigned' && n > 0) return false
      return true
    })
  }, [volunteers, q, club, skill, assign])

  // Availability overview: how many volunteers marked each upcoming date as available.
  const availability = useMemo(() => {
    const m = new Map<string, number>()
    volunteers.forEach((v) => splitList(v.available_dates).forEach((d) => d >= today && m.set(d, (m.get(d) ?? 0) + 1)))
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => ({ date: d, label: fmtDate(d, { day: 'numeric', month: 'short' }), available: n }))
  }, [volunteers, today])

  const staffing = useMemo(
    () =>
      events
        .filter(isUpcoming)
        .map((e) => ({ e, count: assignedCount(e.id, volunteers) }))
        .filter(({ e, count }) => e.volunteers_needed > count)
        .map(({ e, count }) => ({ e, count, gap: e.volunteers_needed - count })),
    [events, volunteers],
  )

  if (volunteers.length === 0) {
    return <EmptyState icon={HandHeart} title="No volunteers found" hint="The backend returned no volunteer records." />
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard title="Availability overview" subtitle="Volunteers marked available on each upcoming date" className="lg:col-span-3">
          {availability.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No upcoming availability recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={availability} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EBE4D6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#725F54' }} tickLine={false} axisLine={{ stroke: '#EBE4D6' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#725F54' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DDD7C9', fontSize: 12 }} cursor={{ fill: 'rgba(217,165,20,.10)' }} />
                <Bar dataKey="available" name="Available volunteers" fill="#7F4413" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Staffing gaps" subtitle="Upcoming events needing more volunteers" className="lg:col-span-2">
          {staffing.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Every upcoming event with a volunteer requirement is fully staffed.</p>
          ) : (
            <ul className="space-y-2.5">
              {staffing.map(({ e, count, gap }) => (
                <li key={e.id} className="rounded-lg border border-line bg-paper p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="text-xs text-muted">
                        {fmtDate(e.event_date)} · {count}/{e.volunteers_needed} assigned
                      </p>
                    </div>
                    <Badge tone="warn">{gap} needed</Badge>
                  </div>
                  <Link to={`/assistant?q=${encodeURIComponent(`Find ${gap} replacement volunteers for ${e.title}.`)}`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                    Ask AI for suggested volunteers <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, skill or club…" />
        <Select label="Club filter" value={club} onChange={setClub} options={[{ value: 'all', label: 'All clubs' }, ...clubs.map((c) => ({ value: c, label: c }))]} />
        <Select label="Skill filter" value={skill} onChange={setSkill} options={[{ value: 'all', label: 'All skills' }, ...skills.map((s) => ({ value: s, label: s }))]} />
        <Select<Assign>
          label="Assignment filter"
          value={assign}
          onChange={setAssign}
          options={[
            { value: 'all', label: 'All volunteers' },
            { value: 'assigned', label: 'Assigned to events' },
            { value: 'unassigned', label: 'Not assigned' },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={HandHeart} title="No volunteers match your filters" hint="Try clearing a filter or the search box." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const assigned = volunteerAssigned(v)
            const dates = splitList(v.available_dates).filter((d) => d >= today)
            return (
              <article key={v.id} className="card animate-up p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-chip font-display font-bold text-brand-dark">
                    {v.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold">{v.name}</h3>
                    <p className="truncate text-xs text-muted">{v.club_name ?? 'No club'}</p>
                  </div>
                  <Badge tone={assigned.length ? 'ok' : 'neutral'}>{assigned.length ? `${assigned.length} assigned` : 'Unassigned'}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {splitList(v.skills).map((s) => (
                    <Badge key={s} tone="brand">
                      {s}
                    </Badge>
                  ))}
                  {!splitList(v.skills).length && <span className="text-xs text-muted">No skills listed</span>}
                </div>

                <div className="mt-3 space-y-2 border-t border-line pt-3 text-[13px]">
                  <div>
                    <p className="label mb-1">Assignments</p>
                    {assigned.length === 0 ? (
                      <p className="text-xs text-muted">Not assigned to any event.</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {assigned.map((a) => (
                          <li key={a.event_id} className="flex justify-between gap-2">
                            <span className="truncate font-medium">{a.event_title}</span>
                            <span className="shrink-0 text-xs text-muted">{fmtDate(a.event_date, { day: 'numeric', month: 'short' })}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="label mb-1">Available</p>
                    <p className="text-xs text-muted">{dates.length ? dates.map((d) => fmtDate(d, { day: 'numeric', month: 'short' })).join(' · ') : 'No upcoming availability recorded.'}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Sparkles size={13} /> Replacement suggestions come from the assistant's find_replacements tool — use "Ask AI" on a staffing gap above.
      </p>
    </div>
  )
}

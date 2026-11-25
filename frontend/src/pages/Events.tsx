import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CalendarRange, List } from 'lucide-react'
import { useData } from '../hooks/useData'
import { Badge, EmptyState, Segmented, SearchInput, Select } from '../components/ui/primitives'
import { EventCalendar } from '../components/events/EventCalendar'
import { EventDetail, statusTone } from '../components/events/EventDetail'
import { assignedCount, clashIndex, isPast, isUpcoming } from '../lib/derive'
import { fmtDate, fmtTime } from '../lib/format'
import type { CampusEvent } from '../types'

type When = 'all' | 'upcoming' | 'past'
type View = 'list' | 'calendar'

export default function Events() {
  const { events, volunteers, clashes, clashReason, errors } = useData()
  const [q, setQ] = useState('')
  const [when, setWhen] = useState<When>('all')
  const [status, setStatus] = useState('all')
  const [club, setClub] = useState('all')
  const [view, setView] = useState<View>('list')
  const [open, setOpen] = useState<CampusEvent | null>(null)

  const clashMap = useMemo(() => clashIndex(clashes), [clashes])
  const clashIds = useMemo(() => new Set(clashMap.keys()), [clashMap])
  const clubs = useMemo(() => [...new Set(events.map((e) => e.club_name))].sort(), [events])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      if (needle && !`${e.title} ${e.club_name} ${e.venue_name}`.toLowerCase().includes(needle)) return false
      if (when === 'upcoming' && !isUpcoming(e)) return false
      if (when === 'past' && !isPast(e)) return false
      if (status !== 'all' && e.status !== status) return false
      if (club !== 'all' && e.club_name !== club) return false
      return true
    })
  }, [events, q, when, status, club])

  const upcomingFirst = useMemo(() => (when === 'past' ? [...list].reverse() : list), [list, when])

  return (
    <div className="space-y-5">
      {clashes && (clashes.venue_clashes.length > 0 || clashes.volunteer_double_bookings.length > 0) && (
        <div className="rounded-xl border border-bad/30 bg-bad/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-bad">
            <AlertTriangle size={16} /> {clashReason}
          </p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {clashes.venue_clashes.map((c) => (
              <li key={c.date + c.venue}>
                <b>{c.venue}</b> on {fmtDate(c.date)}: {c.events.map((e) => e.title).join(' vs ')}
              </li>
            ))}
            {clashes.volunteer_double_bookings.map((d) => (
              <li key={d.date + d.volunteer_id}>
                <b>{d.volunteer}</b> is double-booked on {fmtDate(d.date)}: {d.events}
              </li>
            ))}
          </ul>
        </div>
      )}
      {errors.clashes && <p className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">Clash detection unavailable: {errors.clashes}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search events, clubs, venues…" />
        <Select<When>
          label="Time filter"
          value={when}
          onChange={setWhen}
          options={[
            { value: 'all', label: 'All events' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
        <Select label="Status filter" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Any status' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
        <Select label="Club filter" value={club} onChange={setClub} options={[{ value: 'all', label: 'All clubs' }, ...clubs.map((c) => ({ value: c, label: c }))]} />
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List', icon: List },
            { value: 'calendar', label: 'Calendar', icon: CalendarRange },
          ]}
        />
      </div>

      {view === 'calendar' ? (
        <EventCalendar events={list} clashIds={clashIds} onOpen={setOpen} />
      ) : upcomingFirst.length === 0 ? (
        <EmptyState icon={CalendarDays} title={events.length ? 'No events match your filters' : 'No events found'} hint={events.length ? 'Try a different time range or clear the search.' : 'The backend returned no events.'} />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_.9fr_.8fr] gap-3 border-b border-line bg-paper px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted md:grid">
            <span>Event</span>
            <span>Club</span>
            <span>Venue</span>
            <span>Date</span>
            <span>Volunteers</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-line">
            {upcomingFirst.map((e) => {
              const clash = clashMap.has(e.id)
              const count = assignedCount(e.id, volunteers)
              return (
                <li key={e.id}>
                  <button onClick={() => setOpen(e)} className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left transition hover:bg-chip/50 md:grid-cols-[1.6fr_1fr_1fr_1fr_.9fr_.8fr] md:items-center md:gap-3">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{e.title}</span>
                      {clash && (
                        <Badge tone="bad">
                          <AlertTriangle size={10} /> Clash
                        </Badge>
                      )}
                    </span>
                    <span className="truncate text-[13px] text-muted">{e.club_name}</span>
                    <span className="truncate text-[13px] text-muted">{e.venue_name}</span>
                    <span className="text-[13px]">
                      {fmtDate(e.event_date)}
                      {fmtTime(e.start_time) && <span className="text-muted"> · {fmtTime(e.start_time)}</span>}
                    </span>
                    <span className="text-[13px]">
                      {e.volunteers_needed > 0 ? (
                        <span className={count < e.volunteers_needed ? 'font-semibold text-warn' : 'text-ok'}>
                          {count}/{e.volunteers_needed}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </span>
                    <span>
                      <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <EventDetail event={open} clash={open ? clashMap.get(open.id) : undefined} volunteers={volunteers} onClose={() => setOpen(null)} />
    </div>
  )
}

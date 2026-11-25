import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CampusEvent } from '../../types'
import { Button } from '../ui/primitives'
import { cx, todayISO } from '../../lib/format'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function EventCalendar({ events, clashIds, onOpen }: { events: CampusEvent[]; clashIds: Set<number>; onOpen: (e: CampusEvent) => void }) {
  const today = todayISO()
  // Start on the month of the next upcoming event (or today) so the calendar opens on something useful.
  const initial = () => {
    const next = events.find((e) => e.event_date >= today && e.status === 'scheduled')
    const iso = next?.event_date ?? today
    return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 }
  }
  const [cur, setCur] = useState(initial)
  useEffect(() => setCur(initial()), [events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(cur.y, cur.m, 1)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const days = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells: Array<number | null> = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const iso = (d: number) => `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const move = (delta: number) => {
    const d = new Date(cur.y, cur.m + delta, 1)
    setCur({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setCur({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}>
            Today
          </Button>
          <Button size="sm" onClick={() => move(-1)} aria-label="Previous month" icon={ChevronLeft} />
          <Button size="sm" onClick={() => move(1)} aria-label="Next month" icon={ChevronRight} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
          {DOW.map((d) => (
            <div key={d} className="py-1 text-center text-[11px] font-bold uppercase text-muted">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <div key={i} />
            const day = iso(d)
            const list = events.filter((e) => e.event_date === day)
            return (
              <div key={i} className={cx('min-h-[88px] rounded-lg border bg-white p-1.5', day === today ? 'border-gold ring-1 ring-gold/50' : 'border-line')}>
                <div className={cx('mb-1 text-[11px] font-bold', day === today ? 'text-brand' : 'text-muted')}>{d}</div>
                <div className="space-y-1">
                  {list.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onOpen(e)}
                      title={`${e.title} — ${e.club_name}`}
                      className={cx(
                        'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold leading-snug transition hover:brightness-95',
                        clashIds.has(e.id)
                          ? 'bg-bad/15 text-bad'
                          : e.status === 'cancelled'
                            ? 'bg-chip text-muted line-through'
                            : e.status === 'completed'
                              ? 'bg-ok/15 text-ok'
                              : 'bg-chip text-brand-dark',
                      )}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
        <Legend color="bg-chip" label="Scheduled" />
        <Legend color="bg-ok/30" label="Completed" />
        <Legend color="bg-bad/30" label="Venue clash" />
      </div>
    </div>
  )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={cx('h-2.5 w-2.5 rounded-sm', color)} /> {label}
  </span>
)

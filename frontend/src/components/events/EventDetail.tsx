import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react'
import type { CampusEvent, VenueClash, Volunteer } from '../../types'
import { Badge, ProgressBar } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { assignedCount } from '../../lib/derive'
import { fmtDate, fmtTime, pct, splitList } from '../../lib/format'

export const statusTone = (s: string) => (s === 'completed' ? 'ok' : s === 'cancelled' ? 'bad' : 'warn') as 'ok' | 'bad' | 'warn'

export function EventDetail({ event, clash, volunteers, onClose }: { event: CampusEvent | null; clash?: VenueClash; volunteers: Volunteer[]; onClose: () => void }) {
  if (!event) return null
  const assigned = volunteers.filter((v) => v.assignments.some((a) => a.event_id === event.id && a.status === 'assigned'))
  const count = assignedCount(event.id, volunteers)
  const gap = Math.max(0, event.volunteers_needed - count)
  const other = clash?.events.filter((e) => e.id !== event.id) ?? []

  return (
    <Modal open onClose={onClose} title={event.title} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(event.status)}>{event.status}</Badge>
          {clash && (
            <Badge tone="bad">
              <AlertTriangle size={11} /> Venue clash
            </Badge>
          )}
          <span className="text-sm text-muted">{event.club_name}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={CalendarDays} label="Date & time" value={`${fmtDate(event.event_date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}${fmtTime(event.start_time) ? ' · ' + fmtTime(event.start_time) : ''}`} />
          <Info icon={MapPin} label="Venue" value={event.venue_name} />
          <Info icon={Users} label="Attendance" value={event.actual_attendance != null ? `${event.actual_attendance} actual / ${event.expected_attendance ?? '—'} expected` : `${event.expected_attendance ?? '—'} expected`} />
          <Info icon={Users} label="Volunteers" value={`${count} assigned of ${event.volunteers_needed} needed`} />
        </div>

        {clash && other.length > 0 && (
          <div className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-[13px]">
            <p className="font-bold text-bad">Same-day booking at {clash.venue}</p>
            <p className="mt-1 text-ink">
              Also booked: {other.map((o) => `${o.title} (${o.club}${fmtTime(o.start_time) ? ', ' + fmtTime(o.start_time) : ''})`).join('; ')}.
            </p>
            <p className="mt-1 text-xs text-muted">The backend has no event duration, so same-day same-venue bookings are conservatively flagged as clashes.</p>
          </div>
        )}

        {event.volunteers_needed > 0 && (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-base font-bold">Volunteer staffing</h4>
              {gap > 0 ? <Badge tone="warn">{gap} more needed</Badge> : <Badge tone="ok">Fully staffed</Badge>}
            </div>
            <ProgressBar value={pct(count, event.volunteers_needed)} tone={gap ? 'warn' : 'ok'} />
            {assigned.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-[13px]">
                {assigned.map((v) => (
                  <li key={v.id} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium">{v.name}</span>
                    <span className="text-muted">{v.assignments.find((a) => a.event_id === event.id)?.role || 'volunteer'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {splitList(event.skills_needed).length > 0 && (
          <section>
            <h4 className="mb-2 text-base font-bold">Skills needed</h4>
            <div className="flex flex-wrap gap-1.5">
              {splitList(event.skills_needed).map((s) => (
                <Badge key={s} tone="brand">
                  {s}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {event.status === 'scheduled' && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <AskLink q={`Is ${event.title} feasible? Check the existing venue and volunteer conflicts.`} label="Check feasibility" />
            {gap > 0 && <AskLink q={`Find ${gap} replacement volunteers for ${event.title}.`} label="Find volunteers" />}
            {clash && <AskLink q={`How can we resolve the venue clash for ${event.title}?`} label="Resolve clash" />}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-paper p-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="label">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function AskLink({ q, label }: { q: string; label: string }) {
  return (
    <Link to={`/assistant?q=${encodeURIComponent(q)}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium transition hover:border-gold hover:bg-chip">
      <Sparkles size={14} className="text-gold" /> {label}
    </Link>
  )
}

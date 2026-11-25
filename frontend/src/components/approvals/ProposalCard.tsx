import { ArrowRight, CalendarClock, Check, UserPlus, X } from 'lucide-react'
import type { CampusEvent, DecisionLogEntry, ProposalAction, Volunteer } from '../../types'
import { Badge, Button, type Tone } from '../ui/primitives'
import { fmtDate, fmtTimestamp, titleCase } from '../../lib/format'

export const statusTone = (s: string): Tone => (s === 'approved' ? 'ok' : s === 'rejected' ? 'bad' : s === 'pending' ? 'warn' : 'neutral')

function Changes({ a, events, volunteers }: { a: ProposalAction; events: CampusEvent[]; volunteers: Volunteer[] }) {
  const p = a.payload
  if (!p) return <p className="text-[13px] text-bad">The stored payload could not be read.</p>
  const ev = events.find((e) => e.id === p.event_id)

  if (a.action_type === 'move_event') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <CalendarClock size={15} className="text-brand" />
        <span className="font-semibold">{ev?.title ?? `Event #${p.event_id}`}</span>
        {ev && <span className="text-muted">({ev.club_name})</span>}
        <span className="rounded bg-chip px-2 py-0.5">{ev ? fmtDate(ev.event_date) : 'current date'}</span>
        <ArrowRight size={14} className="text-gold" />
        <span className="rounded bg-gold/20 px-2 py-0.5 font-semibold text-brand-dark">{fmtDate(p.new_date)}</span>
      </div>
    )
  }
  if (a.action_type === 'assign_volunteers') {
    const names = (p.volunteer_ids ?? []).map((id) => volunteers.find((v) => v.id === id)?.name ?? `Volunteer #${id}`)
    return (
      <div className="space-y-1.5 text-[13px]">
        <div className="flex items-center gap-2">
          <UserPlus size={15} className="text-brand" />
          <span>
            Assign to <b>{ev?.title ?? `Event #${p.event_id}`}</b>
            {ev && <span className="text-muted"> · {fmtDate(ev.event_date)}</span>}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-6">
          {names.map((n) => (
            <Badge key={n} tone="brand">
              {n}
            </Badge>
          ))}
        </div>
      </div>
    )
  }
  return <pre className="overflow-x-auto rounded bg-paper p-2 font-mono text-xs">{JSON.stringify(p, null, 2)}</pre>
}

export function ProposalCard({
  action,
  events,
  volunteers,
  decision,
  failure,
  onApprove,
  onReject,
}: {
  action: ProposalAction
  events: CampusEvent[]
  volunteers: Volunteer[]
  decision?: DecisionLogEntry
  /** Backend error from the last attempt (e.g. stale: venue now booked). */
  failure?: string
  onApprove?: () => void
  onReject?: () => void
}) {
  const pending = action.status === 'pending'
  return (
    <article className={`card animate-up overflow-hidden ${failure ? 'border-bad/40' : pending ? 'border-l-4 border-l-gold' : ''}`}>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted">#{action.action_id}</span>
          <Badge tone="brand">{titleCase(action.action_type)}</Badge>
          <Badge tone={failure ? 'bad' : statusTone(action.status)}>{failure ? 'Failed · still pending' : titleCase(action.status)}</Badge>
          <span className="ml-auto text-xs text-muted">Proposed {fmtTimestamp(action.created_at)}</span>
        </div>

        <p className="text-[15px] font-medium leading-snug">{action.description}</p>

        <div className="rounded-lg border border-line bg-paper p-3">
          <p className="label mb-1.5">Proposed changes</p>
          <Changes a={action} events={events} volunteers={volunteers} />
        </div>

        {failure && (
          <p role="alert" className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-[13px] text-bad">
            <b>Backend refused this action:</b> {failure} The proposal is unchanged and still pending — it may be stale and worth rejecting.
          </p>
        )}

        {decision?.reason && (
          <p className="text-[13px] text-muted">
            <b className="text-ink">Reason:</b> {decision.reason}
          </p>
        )}
        {decision && (
          <p className="text-xs text-muted">
            {titleCase(decision.decision)} on {fmtTimestamp(decision.timestamp)}
          </p>
        )}
      </div>

      {pending && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3">
          <Button variant="danger" icon={X} onClick={onReject}>
            Reject
          </Button>
          <Button variant="primary" icon={Check} onClick={onApprove}>
            Approve
          </Button>
        </div>
      )}
    </article>
  )
}

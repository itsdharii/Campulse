import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import type { CampusEvent, Club, ClubHealth, Volunteer } from '../../types'
import { Badge, ProgressBar } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { budgetOf, healthColor, healthTone } from '../../lib/derive'
import { fmtDate, money, pct, splitList } from '../../lib/format'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <p className="label">{label}</p>
      <p className="num mt-0.5 text-xl">{value}</p>
    </div>
  )
}

export function ClubDetail({
  club,
  health,
  events,
  volunteers,
  onClose,
}: {
  club: Club | null
  health?: ClubHealth
  events: CampusEvent[]
  volunteers: Volunteer[]
  onClose: () => void
}) {
  if (!club) return null
  const b = budgetOf(club)
  const clubEvents = events.filter((e) => e.club_id === club.id)
  const clubVols = volunteers.filter((v) => v.club_id === club.id)

  return (
    <Modal open onClose={onClose} title={club.name} wide>
      <div className="space-y-5">
        <p className="text-sm text-muted">{club.description || 'No description provided.'}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Members" value={club.member_count ?? '—'} />
          <Stat label="Active (30d)" value={club.active_members_30d ?? '—'} />
          <Stat label="Volunteers" value={clubVols.length} />
          <Stat label="Events" value={clubEvents.length} />
        </div>

        <section>
          <h4 className="mb-2 text-base font-bold">Budget</h4>
          {b.hasBudget ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Allocated" value={money(b.allocated, club.currency)} />
                <Stat label="Spent" value={money(b.spent, club.currency)} />
                <Stat label="Reserved" value={money(b.reserved, club.currency)} />
                <Stat label="Remaining" value={money(b.remaining, club.currency)} />
              </div>
              <div className="mt-3">
                <ProgressBar
                  segments={[
                    { pct: pct(b.spent, b.allocated), color: '#7F4413', label: 'Spent' },
                    { pct: pct(b.reserved, b.allocated), color: '#D9A514', label: 'Reserved' },
                  ]}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No budget record exists for this club.</p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-base font-bold">Health score</h4>
            {health && (
              <span className="flex items-center gap-2">
                <span className="num text-2xl" style={{ color: healthColor(health.status) }}>
                  {health.score}
                  <span className="text-sm font-semibold text-muted">/100</span>
                </span>
                <Badge tone={healthTone(health.status)}>{health.status}</Badge>
              </span>
            )}
          </div>
          {health ? (
            <>
              <ul className="space-y-3">
                {health.parts.map((p) => (
                  <li key={p.name}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-muted">
                        {p.points}/{p.max}
                      </span>
                    </div>
                    <ProgressBar value={pct(p.points, p.max)} tone={p.points < 0.6 * p.max ? 'bad' : 'ok'} />
                    <p className="mt-1 text-xs text-muted">{p.detail}</p>
                  </li>
                ))}
              </ul>
              {health.suggestions.length > 0 && (
                <div className="mt-4 rounded-lg border border-gold/50 bg-gold/10 p-3">
                  <p className="label mb-1 text-brand-dark">Suggestions</p>
                  <ul className="list-disc space-y-1 pl-5 text-[13px]">
                    {health.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Health score unavailable (the backend did not return one for this club).</p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-base font-bold">Skills offered</h4>
            <div className="flex flex-wrap gap-1.5">
              {splitList(club.skills_offered).map((s) => (
                <Badge key={s} tone="ok">
                  {s}
                </Badge>
              ))}
              {!splitList(club.skills_offered).length && <span className="text-sm text-muted">None listed</span>}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-base font-bold">Skills needed</h4>
            <div className="flex flex-wrap gap-1.5">
              {splitList(club.skills_needed).map((s) => (
                <Badge key={s} tone="warn">
                  {s}
                </Badge>
              ))}
              {!splitList(club.skills_needed).length && <span className="text-sm text-muted">None listed</span>}
            </div>
          </div>
        </section>

        {club.unfulfilled_plans > 0 && (
          <p className="rounded-lg border border-line bg-paper p-3 text-[13px]">
            <b>{club.unfulfilled_plans} unfulfilled plan(s):</b> {club.unfulfilled_plans_note || 'no note recorded.'}
          </p>
        )}

        <section>
          <h4 className="mb-2 text-base font-bold">Events</h4>
          {clubEvents.length === 0 ? (
            <p className="text-sm text-muted">No events for this club.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {clubEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate font-medium">{e.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-muted">
                    {fmtDate(e.event_date)}
                    <Badge tone={e.status === 'completed' ? 'ok' : e.status === 'cancelled' ? 'bad' : 'warn'}>{e.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          to={`/assistant?q=${encodeURIComponent(`How is the ${club.name} performing?`)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-side hover:bg-brand-deeper"
        >
          <Sparkles size={15} /> Ask the assistant about this club
        </Link>
      </div>
    </Modal>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarClock, CalendarDays, Coins, HandHeart, Lightbulb, Users2 } from 'lucide-react'
import { useData } from '../hooks/useData'
import { Badge, EmptyState, ProgressBar, SectionCard, StatCard } from '../components/ui/primitives'
import { BudgetUtilisation, ClubActivity, EventsOverTime, VolunteerParticipation } from '../components/dashboard/Charts'
import { budgetOf, clashIndex, healthTone, healthColor, isUpcoming, shortClub, volunteerAssigned } from '../lib/derive'
import { compactMoney, fmtDate, fmtTime, pct, timeAgo, titleCase } from '../lib/format'

export default function Dashboard() {
  const { clubs, events, volunteers, health, healthReason, clashes, clashReason, pending, actions, errors } = useData()
  const nav = useNavigate()

  const upcoming = events.filter(isUpcoming)
  const clashMap = clashIndex(clashes)
  const clashCount = (clashes?.venue_clashes.length ?? 0) + (clashes?.volunteer_double_bookings.length ?? 0)

  const totals = clubs.reduce(
    (a, c) => {
      const b = budgetOf(c)
      a.allocated += b.allocated
      a.spent += b.spent
      a.reserved += b.reserved
      return a
    },
    { allocated: 0, spent: 0, reserved: 0 },
  )
  const activeVolunteers = volunteers.filter((v) => volunteerAssigned(v).length > 0).length
  const atRisk = health.filter((h) => h.status === 'At risk')

  // Insights come from the backend's deterministic analysis tools (health + clash detection).
  const insights: Array<{ tone: 'bad' | 'warn' | 'brand'; text: string; ask: string }> = []
  if (clashes && clashCount > 0) insights.push({ tone: 'bad', text: clashReason, ask: 'Find scheduling conflicts and suggest how to resolve them.' })
  atRisk.forEach((h) =>
    insights.push({
      tone: 'warn',
      text: `${h.club} is At risk (${h.score}/100). ${h.suggestions[0] ?? ''}`.trim(),
      ask: `How is the ${h.club} performing and what should we do?`,
    }),
  )

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold border-l-4 bg-gold/10 px-4 py-3.5">
          <AlertTriangle size={18} className="text-warn" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand-dark">Waiting for your approval</p>
            <p className="truncate text-[13px] text-ink">
              #{pending[0].action_id} · {pending[0].description}
              {pending.length > 1 && ` (+${pending.length - 1} more)`}
            </p>
          </div>
          <Link to="/approvals" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-side hover:bg-brand-deeper">
            Review <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total clubs" value={clubs.length} icon={Users2} hint={`${clubs.reduce((s, c) => s + (c.member_count ?? 0), 0)} members`} />
        <StatCard
          label="Total events"
          value={events.length}
          icon={CalendarDays}
          hint={`${events.filter((e) => e.status === 'completed').length} completed · ${events.filter((e) => e.status === 'scheduled').length} scheduled`}
        />
        <StatCard label="Active volunteers" value={activeVolunteers} icon={HandHeart} hint={`assigned to events · ${volunteers.length} registered`} />
        <StatCard
          label="Allocated budget"
          value={compactMoney(totals.allocated)}
          icon={Coins}
          hint={`${pct(totals.spent, totals.allocated)}% spent · ${pct(totals.reserved, totals.allocated)}% reserved`}
        />
        <StatCard
          label="Upcoming events"
          value={upcoming.length}
          icon={CalendarClock}
          tone={clashCount ? 'bad' : 'brand'}
          hint={clashCount ? `${clashCount} clash${clashCount > 1 ? 'es' : ''} detected` : 'no clashes detected'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Events over time" subtitle="Events per month by status">
          <EventsOverTime events={events} />
        </SectionCard>
        <SectionCard title="Club activity comparison" subtitle="Backend health score vs. share of members active in the last 30 days">
          <ClubActivity clubs={clubs} events={events} health={health} />
        </SectionCard>
        <SectionCard title="Budget utilisation" subtitle="Spent, reserved and remaining per club">
          <BudgetUtilisation clubs={clubs} />
        </SectionCard>
        <SectionCard title="Volunteer participation" subtitle="Volunteers per club: previous vs. last 90 days">
          <VolunteerParticipation clubs={clubs} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Upcoming events"
          className="lg:col-span-2"
          action={
            <Link to="/events" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" hint="Scheduled events dated today or later appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-chip text-center leading-none text-brand-dark">
                    <div>
                      <div className="font-display text-lg font-bold">{fmtDate(e.event_date, { day: 'numeric' })}</div>
                      <div className="text-[10px] font-bold uppercase">{fmtDate(e.event_date, { month: 'short' })}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="truncate text-xs text-muted">
                      {e.club_name} · {e.venue_name}
                      {fmtTime(e.start_time) && ` · ${fmtTime(e.start_time)}`}
                    </p>
                  </div>
                  {clashMap.has(e.id) && <Badge tone="bad">Clash</Badge>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Pending approvals" action={<Badge tone={pending.length ? 'warn' : 'ok'}>{pending.length} open</Badge>}>
          {pending.length === 0 ? (
            <EmptyState icon={Users2} title="All clear" hint="No AI proposals are waiting for a decision." />
          ) : (
            <ul className="space-y-2.5">
              {pending.slice(0, 4).map((p) => (
                <li key={p.action_id}>
                  <button onClick={() => nav('/approvals')} className="w-full rounded-lg border border-line p-3 text-left transition hover:border-gold hover:bg-chip/50">
                    <div className="mb-1 flex items-center justify-between">
                      <Badge tone="brand">{titleCase(p.action_type)}</Badge>
                      <span className="text-[11px] text-muted">#{p.action_id}</span>
                    </div>
                    <p className="line-clamp-2 text-[13px]">{p.description}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Club health overview" subtitle="Scored by the backend (explainable, 0–100)" className="lg:col-span-1">
          {errors.health ? (
            <p className="text-sm text-bad">Couldn't load health scores: {errors.health}</p>
          ) : health.length === 0 ? (
            <EmptyState title="No health data" />
          ) : (
            <ul className="space-y-3.5">
              {health.map((h) => (
                <li key={h.club_id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{shortClub(h.club)}</span>
                    <span className="flex items-center gap-2">
                      <span className="num text-base" style={{ color: healthColor(h.status) }}>
                        {h.score}
                      </span>
                      <Badge tone={healthTone(h.status)}>{h.status}</Badge>
                    </span>
                  </div>
                  <ProgressBar value={h.score} tone={healthTone(h.status)} />
                </li>
              ))}
            </ul>
          )}
          {healthReason && <p className="mt-4 hidden text-[11px] text-muted">{healthReason}</p>}
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="AI proposals and human decisions">
          {actions.length === 0 ? (
            <EmptyState title="No activity yet" hint="Proposals created by the assistant will show up here." />
          ) : (
            <ol className="relative space-y-3.5 border-l border-line pl-4">
              {actions.slice(0, 6).map((a) => (
                <li key={a.action_id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white"
                    style={{ background: a.status === 'approved' ? '#4E7F58' : a.status === 'rejected' ? '#D40924' : '#D9A514' }}
                  />
                  <p className="line-clamp-2 text-[13px]">{a.description}</p>
                  <p className="text-[11px] text-muted">
                    #{a.action_id} · {titleCase(a.status)} · {timeAgo(a.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard title="Insights" subtitle="From the backend's analysis tools">
          {insights.length === 0 ? (
            <EmptyState icon={Lightbulb} title="Nothing needs attention" hint="No clashes or at-risk clubs were found." />
          ) : (
            <ul className="space-y-2.5">
              {insights.slice(0, 5).map((i, idx) => (
                <li key={idx} className="rounded-lg border border-line bg-paper p-3">
                  <p className="flex gap-2 text-[13px]">
                    <Lightbulb size={15} className={i.tone === 'bad' ? 'mt-0.5 shrink-0 text-bad' : 'mt-0.5 shrink-0 text-warn'} />
                    {i.text}
                  </p>
                  <Link to={`/assistant?q=${encodeURIComponent(i.ask)}`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                    Ask the assistant <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

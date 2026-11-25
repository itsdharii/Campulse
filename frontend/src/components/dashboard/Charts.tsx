import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import type { CampusEvent, Club, ClubHealth } from '../../types'
import { budgetOf, eventsByMonth, healthColor, shortClub } from '../../lib/derive'
import { compactMoney, money } from '../../lib/format'
import { EmptyState } from '../ui/primitives'
import { BarChart3 } from 'lucide-react'

const AXIS = { fontSize: 11, fill: '#725F54' }
const GRID = '#EBE4D6'
const tip = {
  contentStyle: { borderRadius: 10, border: '1px solid #DDD7C9', boxShadow: '0 6px 20px rgba(89,45,8,.12)', fontSize: 12, background: '#fff' },
  cursor: { fill: 'rgba(217,165,20,.10)' },
}
const legend = { iconType: 'circle' as const, iconSize: 8, wrapperStyle: { fontSize: 12, color: '#725F54' } }

function Empty() {
  return <EmptyState icon={BarChart3} title="No data yet" hint="This chart fills in as soon as the backend returns records." />
}

export function EventsOverTime({ events }: { events: CampusEvent[] }) {
  const data = eventsByMonth(events)
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tip} />
        <Legend {...legend} />
        <Bar dataKey="completed" name="Completed" stackId="a" fill="#7F4413" radius={[0, 0, 0, 0]} />
        <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#D9A514" />
        <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#D40924" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ClubActivity({ clubs, events, health }: { clubs: Club[]; events: CampusEvent[]; health: ClubHealth[] }) {
  const hmap = new Map(health.map((h) => [h.club_id, h]))
  const data = clubs.map((c) => ({
    name: shortClub(c.name),
    events: events.filter((e) => e.club_id === c.id && e.status !== 'cancelled').length,
    active: c.member_count ? Math.round(((c.active_members_30d ?? 0) / c.member_count) * 100) : 0,
    score: hmap.get(c.id)?.score ?? null,
    status: hmap.get(c.id)?.status,
  }))
  if (!data.length) return <Empty />
  const hasScore = data.some((d) => d.score != null)
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={84} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tip}
          formatter={(v: number, n: string) => [n === 'Health score' ? `${v}/100` : `${v}%`, n]}
        />
        <Legend {...legend} />
        {hasScore && (
          <Bar dataKey="score" name="Health score" radius={[0, 4, 4, 0]} barSize={10}>
            {data.map((d, i) => (
              <Cell key={i} fill={healthColor(d.status)} />
            ))}
          </Bar>
        )}
        <Bar dataKey="active" name="Members active (30d)" fill="#D9A514" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BudgetUtilisation({ clubs }: { clubs: Club[] }) {
  const data = clubs
    .filter((c) => c.allocated_amount != null)
    .map((c) => {
      const b = budgetOf(c)
      return { name: shortClub(c.name), spent: b.spent, reserved: b.reserved, remaining: Math.max(0, b.remaining) }
    })
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tickFormatter={compactMoney} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tip} formatter={(v: number, n: string) => [money(v), n]} />
        <Legend {...legend} />
        <Bar dataKey="spent" name="Spent" stackId="b" fill="#7F4413" />
        <Bar dataKey="reserved" name="Reserved" stackId="b" fill="#D9A514" />
        <Bar dataKey="remaining" name="Remaining" stackId="b" fill="#DDD7C9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function VolunteerParticipation({ clubs }: { clubs: Club[] }) {
  const data = clubs.map((c) => ({
    name: shortClub(c.name),
    prev: c.volunteers_prev_90d ?? 0,
    last: c.volunteers_last_90d ?? 0,
  }))
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={3}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tip} />
        <Legend {...legend} />
        <Bar dataKey="prev" name="Previous 90 days" fill="#DDD7C9" radius={[4, 4, 0, 0]} />
        <Bar dataKey="last" name="Last 90 days" fill="#7F4413" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

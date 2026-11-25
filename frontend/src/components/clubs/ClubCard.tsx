import { Users, Wallet } from 'lucide-react'
import type { Club, ClubHealth } from '../../types'
import { Badge, ProgressBar } from '../ui/primitives'
import { budgetOf, healthColor, healthTone } from '../../lib/derive'
import { money, pct, splitList } from '../../lib/format'

export function ClubCard({ club, health, onOpen }: { club: Club; health?: ClubHealth; onOpen: () => void }) {
  const b = budgetOf(club)
  const members = club.member_count ?? 0
  const active = club.active_members_30d ?? 0
  return (
    <button onClick={onOpen} className="card group flex animate-up flex-col gap-3 p-5 text-left transition hover:-translate-y-0.5 hover:border-gold">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-bold">{club.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] text-muted">{club.description || 'No description provided.'}</p>
        </div>
        {health ? (
          <div className="shrink-0 text-right">
            <div className="num text-3xl leading-none" style={{ color: healthColor(health.status) }}>
              {health.score}
            </div>
            <Badge tone={healthTone(health.status)} className="mt-1.5">
              {health.status}
            </Badge>
          </div>
        ) : (
          <Badge>No score</Badge>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Users size={13} /> {active} of {members} members active
          </span>
          <span>{pct(active, members)}%</span>
        </div>
        <ProgressBar value={pct(active, members)} tone="gold" />
      </div>

      {b.hasBudget ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Wallet size={13} /> {money(b.remaining, club.currency)} remaining
            </span>
            <span>of {money(b.allocated, club.currency)}</span>
          </div>
          <ProgressBar
            segments={[
              { pct: pct(b.spent, b.allocated), color: '#7F4413', label: 'Spent' },
              { pct: pct(b.reserved, b.allocated), color: '#D9A514', label: 'Reserved' },
            ]}
          />
        </div>
      ) : (
        <p className="text-xs text-muted">No budget record.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {splitList(club.skills_offered)
          .slice(0, 3)
          .map((s) => (
            <Badge key={s} tone="brand">
              {s}
            </Badge>
          ))}
      </div>
    </button>
  )
}

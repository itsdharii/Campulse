// Frontend-calculated display metrics. Everything here is derived from rows the
// backend returned; no scoring logic is re-implemented (health scores come from /api/club-health).
import type { CampusEvent, Clashes, Club, ClubHealth, Volunteer, VenueClash } from '../types'
import type { Tone } from '../components/ui/primitives'
import { parseDay, todayISO } from './format'

export const shortClub = (n: string) => n.replace(/ Club$/i, '')

export const healthTone = (status?: string): Tone => (status === 'Healthy' ? 'ok' : status === 'Watch' ? 'warn' : status === 'At risk' ? 'bad' : 'neutral')
export const healthColor = (status?: string) => (status === 'Healthy' ? '#4E7F58' : status === 'Watch' ? '#A66A16' : status === 'At risk' ? '#D40924' : '#725F54')

export const isUpcoming = (e: CampusEvent) => e.status === 'scheduled' && e.event_date >= todayISO()
export const isPast = (e: CampusEvent) => e.status === 'completed' || e.event_date < todayISO()

export function budgetOf(c: Club) {
  const allocated = c.allocated_amount ?? 0
  const spent = c.spent_amount ?? 0
  const reserved = c.reserved_amount ?? 0
  const remaining = allocated - spent - reserved
  return { allocated, spent, reserved, remaining, hasBudget: c.allocated_amount != null }
}

export function eventsByMonth(events: CampusEvent[]) {
  const map = new Map<string, { key: string; label: string; completed: number; scheduled: number; cancelled: number }>()
  for (const e of events) {
    const key = e.event_date.slice(0, 7)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: parseDay(e.event_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        completed: 0,
        scheduled: 0,
        cancelled: 0,
      })
    }
    map.get(key)![e.status] += 1
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function assignedCount(eventId: number, volunteers: Volunteer[]): number {
  return volunteers.filter((v) => v.assignments.some((a) => a.event_id === eventId && a.status === 'assigned')).length
}

export function volunteerAssigned(v: Volunteer) {
  return v.assignments.filter((a) => a.status === 'assigned')
}

/** Maps event id -> same-day, same-venue clash reported by the backend's find_clashes tool. */
export function clashIndex(clashes: Clashes | null): Map<number, VenueClash> {
  const m = new Map<number, VenueClash>()
  clashes?.venue_clashes.forEach((c) => c.events.forEach((e) => m.set(e.id, c)))
  return m
}

export const healthByClub = (health: ClubHealth[]): Map<number, ClubHealth> => new Map(health.map((h) => [h.club_id, h]))

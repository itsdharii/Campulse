// Shapes returned by the Campulse FastAPI backend (api.py).

export interface Club {
  id: number
  name: string
  description: string | null
  skills_offered: string | null
  skills_needed: string | null
  member_count: number | null
  active_members_30d: number | null
  volunteers_prev_90d: number | null
  volunteers_last_90d: number | null
  unfulfilled_plans: number
  unfulfilled_plans_note: string | null
  allocated_amount: number | null
  spent_amount: number | null
  reserved_amount: number | null
  currency: string | null
}

export type EventStatus = 'scheduled' | 'completed' | 'cancelled'

export interface CampusEvent {
  id: number
  club_id: number
  venue_id: number
  title: string
  event_date: string
  start_time: string
  status: EventStatus
  expected_attendance: number | null
  actual_attendance: number | null
  volunteers_needed: number
  skills_needed: string | null
  club_name: string
  venue_name: string
}

export interface VolunteerAssignment {
  volunteer_id: number
  event_id: number
  role: string | null
  status: 'assigned' | 'cancelled'
  event_title: string
  event_date: string
}

export interface Volunteer {
  id: number
  name: string
  club_id: number | null
  club_name: string | null
  skills: string | null
  available_dates: string | null
  assignments: VolunteerAssignment[]
}

export interface HealthPart {
  name: string
  points: number
  max: number
  detail: string
}

export interface ClubHealth {
  club_id: number
  club: string
  score: number
  status: 'Healthy' | 'Watch' | 'At risk'
  parts: HealthPart[]
  weak_areas: string[]
  suggestions: string[]
}

export interface ToolEnvelope<T> {
  result: T | null
  reason: string
  error?: string
}

export interface ClashEvent {
  id: number
  title: string
  club: string
  start_time: string
}
export interface VenueClash {
  date: string
  venue: string
  events: ClashEvent[]
}
export interface VolunteerDoubleBooking {
  date: string
  volunteer_id: number
  volunteer: string
  events: string
  event_count: number
}
export interface Clashes {
  venue_clashes: VenueClash[]
  volunteer_double_bookings: VolunteerDoubleBooking[]
}

export type ActionStatus = 'pending' | 'approved' | 'rejected'
export type ActionType = 'move_event' | 'assign_volunteers' | string

export interface ProposalAction {
  action_id: number
  action_type: ActionType
  description: string | null
  status: ActionStatus
  created_at: string
  payload: { event_id?: number; new_date?: string; volunteer_ids?: number[] } | null
}

export interface DecisionLogEntry {
  id: number
  timestamp: string
  action: string
  decision: string
  reason: string | null
  pending_action_id: number | null
  description: string | null
  action_type: string | null
}

export interface DecisionResult {
  action_id: number
  status: ActionStatus
  executed: boolean
  result?: Record<string, unknown>
}

export interface ToolCallDetail {
  name: string
  arguments: string
  ok: boolean
}

export interface ChatResponse {
  ok: boolean
  message: string
  tool_calls: number
  tool_call_details: ToolCallDetail[]
  session_id: string
  limit_reached?: boolean
}

export interface HealthStatus {
  status: string
  project: string
  ai_enabled?: boolean
  ai_error?: string | null
}

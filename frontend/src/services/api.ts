import type {
  Clashes,
  ChatResponse,
  Club,
  ClubHealth,
  CampusEvent,
  DecisionLogEntry,
  DecisionResult,
  HealthStatus,
  ProposalAction,
  ToolEnvelope,
  Volunteer,
} from '../types'

/** Single configurable backend URL (see .env.example). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(`Cannot reach the Campulse backend at ${API_BASE_URL}. Is it running?`)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
      else if (Array.isArray(body?.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join('; ')
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status)
  }
  return res.json() as Promise<T>
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  health: () => request<HealthStatus>('/api/health'),
  clubs: () => request<Club[]>('/api/clubs'),
  events: () => request<CampusEvent[]>('/api/events'),
  volunteers: () => request<Volunteer[]>('/api/volunteers'),
  clubHealth: () => request<ToolEnvelope<ClubHealth[]>>('/api/club-health'),
  clashes: () => request<ToolEnvelope<Clashes>>('/api/clashes'),
  pending: () => request<ProposalAction[]>('/api/pending'),
  actions: () => request<ProposalAction[]>('/api/actions'),
  decisions: () => request<DecisionLogEntry[]>('/api/decisions'),
  chat: (message: string, session_id: string) => post<ChatResponse>('/api/chat', { message, session_id }),
  approve: (id: number, reason = '') => post<DecisionResult>(`/api/approve/${id}`, { reason }),
  reject: (id: number, reason = '') => post<DecisionResult>(`/api/reject/${id}`, { reason }),
}

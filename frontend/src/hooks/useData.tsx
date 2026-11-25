import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type {
  Clashes,
  Club,
  ClubHealth,
  CampusEvent,
  DecisionLogEntry,
  HealthStatus,
  ProposalAction,
  Volunteer,
} from '../types'

interface DataState {
  clubs: Club[]
  events: CampusEvent[]
  volunteers: Volunteer[]
  health: ClubHealth[]
  healthReason: string
  clashes: Clashes | null
  clashReason: string
  pending: ProposalAction[]
  actions: ProposalAction[]
  decisions: DecisionLogEntry[]
  backend: HealthStatus | null
}

interface DataContextValue extends DataState {
  loading: boolean
  loaded: boolean
  /** Set when the backend cannot be reached at all. */
  connectionError: string | null
  /** Per-resource failures (e.g. optional endpoints on an older backend). */
  errors: Record<string, string>
  reload: () => Promise<void>
}

const empty: DataState = {
  clubs: [],
  events: [],
  volunteers: [],
  health: [],
  healthReason: '',
  clashes: null,
  clashReason: '',
  pending: [],
  actions: [],
  decisions: [],
  backend: null,
}

const Ctx = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(empty)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const mine = ++seq.current
    setLoading(true)
    const jobs = {
      backend: api.health(),
      clubs: api.clubs(),
      events: api.events(),
      volunteers: api.volunteers(),
      health: api.clubHealth(),
      clashes: api.clashes(),
      pending: api.pending(),
      actions: api.actions(),
      decisions: api.decisions(),
    }
    const keys = Object.keys(jobs) as Array<keyof typeof jobs>
    const settled = await Promise.allSettled(keys.map((k) => jobs[k]))
    if (mine !== seq.current) return

    const next: DataState = { ...empty }
    const errs: Record<string, string> = {}
    settled.forEach((r, i) => {
      const k = keys[i]
      if (r.status === 'rejected') {
        errs[k] = r.reason instanceof Error ? r.reason.message : String(r.reason)
        return
      }
      const v = r.value as never
      switch (k) {
        case 'backend': next.backend = v; break
        case 'clubs': next.clubs = v; break
        case 'events': next.events = v; break
        case 'volunteers': next.volunteers = v; break
        case 'health': {
          const env = v as { result: ClubHealth[] | null; reason: string }
          next.health = env.result ?? []
          next.healthReason = env.reason
          break
        }
        case 'clashes': {
          const env = v as { result: Clashes | null; reason: string }
          next.clashes = env.result
          next.clashReason = env.reason
          break
        }
        case 'pending': next.pending = v; break
        case 'actions': next.actions = v; break
        case 'decisions': next.decisions = v; break
      }
    })
    // "Connection error" = core endpoints all failed.
    const coreFailed = ['backend', 'clubs', 'events'].every((k) => k in errs)
    setConnectionError(coreFailed ? errs.backend : null)
    setErrors(errs)
    setState(next)
    setLoaded(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<DataContextValue>(
    () => ({ ...state, loading, loaded, connectionError, errors, reload }),
    [state, loading, loaded, connectionError, errors, reload],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside <DataProvider>')
  return v
}

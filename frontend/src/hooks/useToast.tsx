import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cx } from '../lib/format'

type Kind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: Kind
  text: string
}
interface ToastApi {
  success: (t: string) => void
  error: (t: string) => void
  info: (t: string) => void
}

const Ctx = createContext<ToastApi | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = nextId++
      setToasts((t) => [...t.slice(-3), { id, kind, text }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (t) => push('success', t),
      error: (t) => push('error', t),
      info: (t) => push('info', t),
    }),
    [push],
  )

  const icon = { success: CheckCircle2, error: XCircle, info: Info }
  const tone = {
    success: 'border-ok/40 text-ok',
    error: 'border-bad/40 text-bad',
    info: 'border-gold/60 text-warn',
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icon[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              className={cx('pointer-events-auto flex animate-up items-start gap-3 rounded-xl border bg-white p-3 shadow-pop', tone[t.kind])}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm text-ink">{t.text}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used inside <ToastProvider>')
  return v
}

import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RefreshCw, Search } from 'lucide-react'
import { cx } from '../../lib/format'

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ElementType
}
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-side border-brand hover:bg-brand-deeper hover:border-brand-deeper',
  secondary: 'bg-white text-ink border-line hover:border-gold hover:bg-chip',
  ghost: 'bg-transparent text-muted border-transparent hover:bg-chip hover:text-ink',
  danger: 'bg-white text-bad border-bad/40 hover:bg-bad/10 hover:border-bad',
}
export function Button({ variant = 'secondary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  )
}

/* ---------- Badge ---------- */
export type Tone = 'ok' | 'warn' | 'bad' | 'brand' | 'neutral'
const tones: Record<Tone, string> = {
  ok: 'text-ok bg-ok/10 border-ok/30',
  warn: 'text-warn bg-gold/15 border-gold/50',
  bad: 'text-bad bg-bad/10 border-bad/30',
  brand: 'text-brand-dark bg-chip border-line',
  neutral: 'text-muted bg-white border-line',
}
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Progress bar ---------- */
export function ProgressBar({ value, tone = 'brand', segments }: { value?: number; tone?: Tone | 'gold'; segments?: Array<{ pct: number; color: string; label?: string }> }) {
  const colors: Record<string, string> = { ok: '#4E7F58', warn: '#A66A16', bad: '#D40924', brand: '#7F4413', neutral: '#725F54', gold: '#D9A514' }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={Math.round(value ?? 0)} aria-valuemin={0} aria-valuemax={100}>
      {segments ? (
        <div className="flex h-full">
          {segments.map((s, i) => (
            <div key={i} title={s.label} style={{ width: `${Math.min(100, Math.max(0, s.pct))}%`, background: s.color }} className="h-full transition-all duration-500" />
          ))}
        </div>
      ) : (
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: colors[tone] }} />
      )}
    </div>
  )
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx('relative overflow-hidden rounded-lg bg-chip/70', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}
export function SkeletonCards({ count = 6, className = 'h-44' }: { count?: number; className?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

/* ---------- Empty / error states ---------- */
export function EmptyState({ title, hint, icon: Icon = Inbox, action }: { title: string; hint?: string; icon?: ElementType; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-chip text-brand">
        <Icon size={20} />
      </div>
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-2 border-bad/30 px-6 py-12 text-center">
      <div className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-bad/10 text-bad">
        <AlertTriangle size={20} />
      </div>
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="max-w-lg text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="primary" icon={RefreshCw} onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  )
}

/* ---------- Search input ---------- */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}

export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label: string }) {
  return (
    <select className="input w-auto min-w-[130px] cursor-pointer pr-8" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; icon?: ElementType }> }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
            value === o.value ? 'bg-chip text-brand shadow-[inset_0_-2px_0_#D9A514]' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon && <o.icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Section / stat ---------- */
export function SectionCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand' }: { label: string; value: ReactNode; hint?: string; icon: ElementType; tone?: 'brand' | 'bad' | 'ok' | 'warn' }) {
  const color = { brand: 'text-brand', bad: 'text-bad', ok: 'text-ok', warn: 'text-warn' }[tone]
  return (
    <div className="card animate-up p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-chip text-brand">
          <Icon size={15} />
        </span>
      </div>
      <div className={cx('num mt-1.5 text-[32px] leading-tight', color)}>{value}</div>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export const splitList = (v: string | null | undefined): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function money(n: number | null | undefined, currency: string | null = 'INR'): string {
  if (n == null) return '—'
  const sym = !currency || currency === 'INR' ? '₹' : currency + ' '
  return sym + Math.round(n).toLocaleString('en-IN')
}

export function compactMoney(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}k`
  return `₹${n}`
}

export const todayISO = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD as a local date (avoids UTC off-by-one). */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const fmtDate = (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string =>
  iso ? parseDay(iso).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fmtTime = (start: string | null | undefined): string => {
  const m = /(\d{1,2}:\d{2})/.exec(start ?? '')
  return m ? m[1] : ''
}

export function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(ts: string): string {
  const d = new Date(ts).getTime()
  if (isNaN(d)) return ts
  const s = Math.max(0, (Date.now() - d) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0)

export const cx = (...c: Array<string | false | null | undefined>): string => c.filter(Boolean).join(' ')

export const titleCase = (s: string): string => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronDown, RotateCcw, Sparkles, Wrench, XCircle } from 'lucide-react'
import type { ToolCallDetail } from '../../types'
import { Markdown } from './Markdown'
import { Button } from '../ui/primitives'
import { cx } from '../../lib/format'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  error?: boolean
  tools?: ToolCallDetail[]
  limitReached?: boolean
}

function prettyArgs(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function ToolActivity({ tools }: { tools: ToolCallDetail[] }) {
  const [open, setOpen] = useState(false)
  const proposals = tools.filter((t) => t.name.startsWith('propose_') && t.ok)
  return (
    <div className="mt-3 space-y-2">
      {proposals.length > 0 && (
        <Link to="/approvals" className="flex items-center gap-2 rounded-lg border border-gold bg-gold/15 px-3 py-2 text-[13px] font-semibold text-brand-dark hover:bg-gold/25">
          <CheckCircle2 size={15} /> {proposals.length} proposal{proposals.length > 1 ? 's' : ''} created — nothing has changed yet. Review in Approvals →
        </Link>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink" aria-expanded={open}>
        <Wrench size={12} /> Tool activity ({tools.length})
        <ChevronDown size={12} className={cx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="space-y-1.5">
          {tools.map((t, i) => (
            <li key={i} className="rounded-lg border border-line bg-paper px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                {t.ok ? <CheckCircle2 size={13} className="text-ok" /> : <XCircle size={13} className="text-bad" />}
                <span className="font-mono">{t.name}</span>
                <span className="font-normal text-muted">{t.ok ? 'succeeded' : 'returned an error'}</span>
              </div>
              {t.arguments && t.arguments !== '{}' && <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-muted">{prettyArgs(t.arguments)}</pre>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MessageBubble({ m, onRetry }: { m: ChatMessage; onRetry?: () => void }) {
  if (m.role === 'user') {
    return (
      <div className="flex animate-up justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[14px] leading-relaxed text-side sm:max-w-[75%]">{m.text}</div>
      </div>
    )
  }
  return (
    <div className="flex animate-up gap-3">
      <div className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', m.error ? 'bg-bad/10 text-bad' : 'bg-chip text-brand')}>
        {m.error ? <AlertCircle size={16} /> : <Sparkles size={16} />}
      </div>
      <div className={cx('min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border px-4 py-3 sm:max-w-[82%]', m.error ? 'border-bad/30 bg-bad/5' : 'border-line bg-white shadow-card')}>
        {m.error ? (
          <>
            <p className="text-[14px] font-semibold text-bad">The assistant couldn't answer</p>
            <p className="mt-0.5 text-[13px] text-ink">{m.text}</p>
            {onRetry && (
              <Button size="sm" icon={RotateCcw} onClick={onRetry} className="mt-2.5">
                Retry
              </Button>
            )}
          </>
        ) : (
          <Markdown text={m.text} />
        )}
        {m.limitReached && <p className="mt-2 text-xs text-warn">The tool-call limit was reached, so findings may be incomplete. Try a narrower question.</p>}
        {m.tools && m.tools.length > 0 && <ToolActivity tools={m.tools} />}
      </div>
    </div>
  )
}

export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex animate-up gap-3" aria-live="polite">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-chip text-brand">
        <Sparkles size={16} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3 shadow-card">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 animate-dot rounded-full bg-gold" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  )
}

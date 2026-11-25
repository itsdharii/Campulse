import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowUp, Plus, Sparkles } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useData } from '../hooks/useData'
import { MessageBubble, TypingIndicator } from '../components/assistant/MessageBubble'
import { Button } from '../components/ui/primitives'

const SUGGESTIONS = [
  'How is the Literary Club performing?',
  'Which clubs are currently underperforming?',
  'Find scheduling conflicts this week.',
  'Suggest volunteers for the upcoming technical event.',
  'Can we afford an additional ₹10,000 expense for the Coding Club?',
  'Which clubs could collaborate on an upcoming event?',
]

export default function Assistant() {
  const { messages, sending, sessionId, send, retry, reset } = useChat()
  const { backend } = useData()
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState(() => params.get('q') ?? '')
  const bottom = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  // Prefill coming from "Ask AI" links elsewhere in the app, then clean the URL.
  useEffect(() => {
    if (params.has('q')) {
      setDraft(params.get('q') ?? '')
      setParams({}, { replace: true })
      box.current?.focus()
    }
  }, [params, setParams])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [draft])

  const aiDown = backend?.ai_enabled === false
  const submit = () => {
    if (!draft.trim() || sending) return
    const t = draft
    setDraft('')
    void send(t)
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="card flex h-[calc(100vh-150px)] min-h-[480px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${aiDown ? 'bg-bad' : 'bg-ok'}`} />
          <span>
            Session <code className="font-mono text-[11px]">{sessionId}</code>
          </span>
        </div>
        <Button size="sm" icon={Plus} onClick={reset} disabled={sending || messages.length === 0}>
          New conversation
        </Button>
      </div>

      {aiDown && (
        <div className="flex items-start gap-2 border-b border-bad/20 bg-bad/5 px-4 py-2.5 text-[13px] text-bad">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            The backend reports the AI assistant is not configured ({backend?.ai_error?.replace(/\.$/, '')}). Add <code className="font-mono">GROQ_API_KEY</code> to the backend <code className="font-mono">.env</code> and restart it.
          </span>
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && !sending ? (
          <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-chip text-brand">
              <Sparkles size={26} />
            </div>
            <h2 className="text-2xl font-extrabold">What should we look into?</h2>
            <p className="mt-1.5 text-sm text-muted">Ask about clubs, events, volunteers or budgets. Anything consequential is only proposed — a human approves it in Approvals.</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  disabled={sending}
                  className="rounded-xl border border-line bg-white px-3.5 py-3 text-left text-[13px] leading-snug transition hover:-translate-y-0.5 hover:border-gold hover:bg-chip/60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <MessageBubble key={m.id} m={m} onRetry={i === messages.length - 1 && m.error ? retry : undefined} />
            ))}
            {sending && <TypingIndicator label="Campulse is checking the data…" />}
          </>
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line bg-side p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2 transition focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/25">
          <textarea
            ref={box}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Ask Campulse…  (Enter to send, Shift+Enter for a new line)"
            aria-label="Message"
            className="max-h-[180px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted/70 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-side transition hover:bg-brand-deeper disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

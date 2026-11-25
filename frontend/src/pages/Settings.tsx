import { useState, type ReactNode } from 'react'
import { CheckCircle2, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useToast } from '../hooks/useToast'
import { getSessionId } from '../hooks/useChat'
import { API_BASE_URL } from '../services/api'
import { Button, SectionCard } from '../components/ui/primitives'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  )
}

const Status = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
  <span className={`inline-flex items-center gap-1.5 ${ok ? 'text-ok' : 'text-bad'}`}>
    {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
    {ok ? yes : no}
  </span>
)

export default function Settings() {
  const { backend, connectionError, reload, loading, errors, clubs, events, volunteers } = useData()
  const toast = useToast()
  const [sid] = useState(getSessionId)

  const clearLocal = () => {
    try {
      sessionStorage.removeItem('campulse.messages')
      sessionStorage.removeItem('campulse.session')
      localStorage.removeItem('campulse.sidebar')
    } catch {
      /* ignore */
    }
    toast.success('Local chat history and preferences cleared.')
  }

  const failed = Object.entries(errors)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard
        title="Backend connection"
        subtitle="Read from the FastAPI service"
        action={
          <Button size="sm" icon={RefreshCw} loading={loading} onClick={() => void reload()}>
            Re-check
          </Button>
        }
      >
        <Row label="API base URL">
          <code className="font-mono text-xs">{API_BASE_URL}</code>
        </Row>
        <Row label="Backend">
          <Status ok={!connectionError} yes={`Online${backend ? ` · ${backend.project}` : ''}`} no="Unreachable" />
        </Row>
        <Row label="AI assistant">
          {backend?.ai_enabled === undefined ? <span className="text-muted">Unknown</span> : <Status ok={backend.ai_enabled} yes="Configured" no="Not configured" />}
        </Row>
        {backend?.ai_enabled === false && backend.ai_error && <p className="mt-2 rounded-lg border border-bad/30 bg-bad/5 p-3 text-[13px] text-bad">{backend.ai_error}</p>}
        <Row label="Records loaded">
          {clubs.length} clubs · {events.length} events · {volunteers.length} volunteers
        </Row>
        {failed.length > 0 && (
          <div className="mt-3 rounded-lg border border-bad/30 bg-bad/5 p-3 text-[13px]">
            <p className="mb-1 font-bold text-bad">Endpoints that failed</p>
            <ul className="space-y-0.5">
              {failed.map(([k, v]) => (
                <li key={k}>
                  <code className="font-mono">{k}</code>: {v}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard title="This browser session" subtitle="Stored only in your browser">
        <Row label="Chat session ID">
          <code className="font-mono text-xs">{sid}</code>
        </Row>
        <p className="py-3 text-[13px] text-muted">The session ID keeps the assistant's conversation memory on the backend. Starting a new conversation in the assistant creates a new ID.</p>
        <Button variant="danger" icon={Trash2} onClick={clearLocal}>
          Clear local chat &amp; preferences
        </Button>
      </SectionCard>

      <SectionCard title="Security model" className="lg:col-span-2">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed">
          <li>The browser never holds the AI key and never calls the model directly. Every AI request goes through <code className="font-mono">POST /api/chat</code> on the backend.</li>
          <li>The assistant can only <b>propose</b> changes. A proposal changes nothing until a human approves it on the Approvals page.</li>
          <li>Approval re-validates venue and volunteer constraints in a database transaction and blocks duplicate decisions.</li>
          <li>There is no login yet: the backend has no authentication, so anyone who can reach it can approve proposals. Keep it on a trusted network.</li>
        </ul>
      </SectionCard>
    </div>
  )
}

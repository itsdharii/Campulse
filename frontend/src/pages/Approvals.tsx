import { useState } from 'react'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import { Badge, EmptyState, Segmented } from '../components/ui/primitives'
import { ConfirmDialog } from '../components/ui/Modal'
import { ProposalCard } from '../components/approvals/ProposalCard'
import type { ProposalAction } from '../types'

type Tab = 'pending' | 'history'

export default function Approvals() {
  const { pending, actions, decisions, events, volunteers, reload } = useData()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('pending')
  const [target, setTarget] = useState<{ action: ProposalAction; kind: 'approve' | 'reject' } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<Record<number, string>>({})

  const history = actions.filter((a) => a.status !== 'pending')
  const decisionFor = (id: number) => decisions.find((d) => d.pending_action_id === id)

  const open = (action: ProposalAction, kind: 'approve' | 'reject') => {
    setTarget({ action, kind })
    setReason('')
  }

  const confirm = async () => {
    if (!target) return
    const { action, kind } = target
    setBusy(true)
    try {
      // Always goes through the approval endpoints — the frontend never executes anything itself.
      const res = kind === 'approve' ? await api.approve(action.action_id, reason.trim()) : await api.reject(action.action_id, reason.trim())
      setFailures((f) => {
        const { [action.action_id]: _gone, ...rest } = f
        return rest
      })
      toast.success(kind === 'approve' ? `Proposal #${action.action_id} approved and executed.` : `Proposal #${action.action_id} rejected. Nothing was changed.`)
      if (kind === 'approve' && res.executed === false) toast.info('The backend reports this action was not executed.')
      setTarget(null)
      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setFailures((f) => ({ ...f, [action.action_id]: msg }))
      toast.error(`Could not ${kind} #${action.action_id}: ${msg}`)
      setTarget(null)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `Pending (${pending.length})` },
            { value: 'history', label: `History (${history.length})` },
          ]}
        />
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="text-brand" /> Approving re-validates the change against current data before it runs.
        </p>
      </div>

      {tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No pending proposals" hint="When the AI assistant proposes an event move or volunteer assignment, it appears here and waits for a human decision." />
        ) : (
          <div className="space-y-4">
            {pending.map((a) => (
              <ProposalCard key={a.action_id} action={a} events={events} volunteers={volunteers} failure={failures[a.action_id]} onApprove={() => open(a, 'approve')} onReject={() => open(a, 'reject')} />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <EmptyState title="No decisions yet" hint="Approved and rejected proposals are listed here." />
      ) : (
        <div className="space-y-4">
          {history.map((a) => (
            <ProposalCard key={a.action_id} action={a} events={events} volunteers={volunteers} decision={decisionFor(a.action_id)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        busy={busy}
        title={target?.kind === 'approve' ? `Approve proposal #${target.action.action_id}?` : `Reject proposal #${target?.action.action_id}?`}
        confirmLabel={target?.kind === 'approve' ? 'Approve & execute' : 'Reject proposal'}
        tone={target?.kind === 'approve' ? 'primary' : 'danger'}
        onCancel={() => setTarget(null)}
        onConfirm={() => void confirm()}
      >
        {target && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{target.action.description}</p>
            {target.kind === 'approve' ? (
              <p className="rounded-lg border border-gold/50 bg-gold/10 p-3 text-[13px]">
                This will <b>change real data</b>. The backend checks venue, volunteer availability and conflicts one more time and refuses if anything is stale.
              </p>
            ) : (
              <p className="text-[13px] text-muted">Nothing will be changed. The rejection is recorded in the decision log.</p>
            )}
            <label className="block">
              <span className="label">{target.kind === 'reject' ? 'Reason (optional)' : 'Note (optional)'}</span>
              <textarea className="input mt-1 min-h-[72px] resize-y" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={target.kind === 'reject' ? 'Why is this being rejected?' : 'Anything the log should remember?'} />
            </label>
            <div className="flex">
              <Badge tone="brand">{target.action.action_type.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import type { ChatMessage } from '../components/assistant/MessageBubble'
import { useData } from './useData'

const SID_KEY = 'campulse.session'
const MSG_KEY = 'campulse.messages'

const newSessionId = () => `frontend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function read<T>(key: string, fallback: T): T {
  try {
    const v = sessionStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: chat still works for this page view */
  }
}

export function getSessionId(): string {
  let sid = ''
  try {
    sid = sessionStorage.getItem(SID_KEY) ?? ''
  } catch {
    /* ignore */
  }
  if (!sid) {
    sid = newSessionId()
    try {
      sessionStorage.setItem(SID_KEY, sid)
    } catch {
      /* ignore */
    }
  }
  return sid
}

export function useChat() {
  const { reload } = useData()
  const [messages, setMessages] = useState<ChatMessage[]>(() => read<ChatMessage[]>(MSG_KEY, []))
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(getSessionId)
  const lastPrompt = useRef('')

  useEffect(() => write(MSG_KEY, messages), [messages])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || sending) return
      lastPrompt.current = message
      setMessages((m) => [...m.filter((x) => !x.error), { id: crypto.randomUUID(), role: 'user', text: message }])
      setSending(true)
      try {
        const res = await api.chat(message, sessionId)
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: res.message,
            error: !res.ok,
            tools: res.tool_call_details,
            limitReached: res.limit_reached,
          },
        ])
        // A proposal may have been created: refresh the approvals queue.
        if (res.tool_call_details?.some((t) => t.name.startsWith('propose_') && t.ok)) void reload()
      } catch (e) {
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text: e instanceof Error ? e.message : 'Unknown error', error: true }])
      } finally {
        setSending(false)
      }
    },
    [sending, sessionId, reload],
  )

  const retry = useCallback(() => {
    // Drop the failed answer and the user message that caused it, then resend.
    const prompt = lastPrompt.current
    setMessages((m) => {
      const copy = [...m]
      if (copy.at(-1)?.error) copy.pop()
      if (copy.at(-1)?.role === 'user') copy.pop()
      return copy
    })
    if (prompt) window.setTimeout(() => void send(prompt), 0)
  }, [send])

  /** Starts a fresh conversation (new session id => new server-side memory). */
  const reset = useCallback(() => {
    const sid = newSessionId()
    try {
      sessionStorage.setItem(SID_KEY, sid)
    } catch {
      /* ignore */
    }
    setSessionId(sid)
    setMessages([])
  }, [])

  return { messages, sending, sessionId, send, retry, reset }
}

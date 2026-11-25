"""Bounded in-memory conversation history, separated by session ID."""
from __future__ import annotations

from collections import defaultdict, deque
from copy import deepcopy
import threading


class SessionMemory:
    """Process-local memory suitable for a single-process hackathon prototype.

    Only user and assistant text is retained. Tool messages are used within the
    current request's orchestration loop and are summarized in the final answer.
    """

    def __init__(self, max_messages: int = 20):
        if isinstance(max_messages, bool) or int(max_messages) < 2:
            raise ValueError("max_messages must be at least 2")
        self.max_messages = int(max_messages)
        self._sessions = defaultdict(lambda: deque(maxlen=self.max_messages))
        self._lock = threading.RLock()

    def get(self, session_id: str) -> list[dict]:
        with self._lock:
            return deepcopy(list(self._sessions[str(session_id)]))

    def add(self, session_id: str, role: str, content: str) -> None:
        if role not in {"user", "assistant"}:
            raise ValueError("Only user and assistant messages can be persisted")
        if not isinstance(content, str):
            raise TypeError("content must be a string")
        with self._lock:
            self._sessions[str(session_id)].append({"role": role, "content": content})

    def reset(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(str(session_id), None)

    def clear(self) -> None:
        with self._lock:
            self._sessions.clear()

    def session_ids(self) -> list[str]:
        with self._lock:
            return list(self._sessions.keys())

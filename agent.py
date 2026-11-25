"""OpenAI Responses API agent with bounded multi-step tool orchestration."""
from __future__ import annotations

import os
import json
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from memory import SessionMemory
from prompts import SYSTEM_PROMPT
from tool_registry import execute_tool, get_tool_definitions


class AgentError(Exception):
    """Raised for local agent configuration or input errors."""


class CrewSyncAgent:
    """Agent wrapper using OpenAI's Responses API function-calling loop.

    Pass ``client`` to inject a mock or a configured OpenAI-compatible client
    during testing. No API call is made during construction when a client is
    supplied.
    """

    def __init__(
        self,
        client: Any = None,
        model: str | None = None,
        memory: SessionMemory | None = None,
        max_tool_calls: int | None = None,
    ):
        self.model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        try:
            self.max_tool_calls = int(
                max_tool_calls if max_tool_calls is not None
                else os.getenv("CREWSYNC_MAX_TOOL_CALLS", "8")
            )
            history_limit = int(os.getenv("CREWSYNC_MAX_HISTORY_MESSAGES", "20"))
        except (TypeError, ValueError):
            raise AgentError("Tool-call and history limits must be integers")
        if not 1 <= self.max_tool_calls <= 30:
            raise AgentError("CREWSYNC_MAX_TOOL_CALLS must be between 1 and 30")
        if history_limit < 2:
            raise AgentError("CREWSYNC_MAX_HISTORY_MESSAGES must be at least 2")
        self.memory = memory or SessionMemory(max_messages=history_limit)

        if client is not None:
            self.client = client
        else:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise AgentError("GROQ_API_KEY is missing. Add your Groq key to .env.")
            try:
                from openai import OpenAI
            except ImportError as exc:
                raise AgentError("OpenAI SDK is not installed. Run: pip install -r requirements.txt") from exc
            self.client = OpenAI(api_key=api_key, 
                                 base_url="https://api.groq.com/openai/v1")

        if not hasattr(self.client, "responses"):
            raise AgentError("The supplied client must support the OpenAI Responses API (client.responses.create).")

    @staticmethod
    def _response_items(response: Any) -> list[Any]:
        items = getattr(response, "output", None)
        return list(items or [])

    @staticmethod
    def _item_to_input(item: Any) -> dict:
        """Convert an SDK output item back to an accepted Responses input item."""
        if hasattr(item, "model_dump"):
            return item.model_dump(exclude_none=True)
        if isinstance(item, dict):
            return item
        # Simple fallback for test doubles and SDK-like objects.
        fields = getattr(item, "__dict__", {})
        return {key: value for key, value in fields.items() if not key.startswith("_")}

    @staticmethod
    def _output_text(response: Any) -> str:
        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
        for item in CrewSyncAgent._response_items(response):
            if getattr(item, "type", None) == "message":
                for part in getattr(item, "content", []) or []:
                    if getattr(part, "type", None) == "output_text":
                        value = getattr(part, "text", None)
                        if isinstance(value, str) and value.strip():
                            return value.strip()
        return "I couldn't produce a response. Please try rephrasing your request."

    def _request(self, input_items: list[dict], tool_choice: str = "auto"):
        # Put standing instructions in the first developer input item. This
        # keeps the instructions part of the managed transcript on each turn.
        return self.client.responses.create(
            model=self.model,
            input=input_items,
            tools=get_tool_definitions(include_proposals=True),
            tool_choice=tool_choice,
            parallel_tool_calls=False,
        )

    def chat(self, message: str, session_id: str = "default") -> dict:
        """Process a user turn, execute registered calls, then return final text."""
        if not isinstance(message, str) or not message.strip():
            raise ValueError("message must be a non-empty string")
        session_id = str(session_id).strip()
        if not session_id:
            raise ValueError("session_id must be a non-empty string")

        self.memory.add(session_id, "user", message.strip())
        input_items = [{"role": "developer", "content": SYSTEM_PROMPT}]
        input_items.extend(self.memory.get(session_id))
        calls_made = 0
        call_details = []

        while True:
            try:
                response = self._request(input_items, "auto")
            except Exception as exc:
                error_text = f"OpenAI API request failed: {exc}"
                self.memory.add(session_id, "assistant", error_text)
                return {
                    "ok": False, "message": error_text, "tool_calls": calls_made,
                    "tool_call_details": call_details, "session_id": session_id,
                }

            output_items = self._response_items(response)
            function_calls = [item for item in output_items if getattr(item, "type", None) == "function_call"]
            if not function_calls:
                final_text = self._output_text(response)
                self.memory.add(session_id, "assistant", final_text)
                return {
                    "ok": True, "message": final_text, "tool_calls": calls_made,
                    "tool_call_details": call_details, "session_id": session_id,
                }

            # The Responses function-calling cycle requires the model's output
            # items (including its function_call) to be passed back alongside
            # function_call_output items correlated by call_id.
            input_items.extend(self._item_to_input(item) for item in output_items)
            limit_hit = False
            for call in function_calls:
                name = getattr(call, "name", "")
                call_id = getattr(call, "call_id", None)
                raw_arguments = getattr(call, "arguments", "{}") or "{}"
                if calls_made >= self.max_tool_calls:
                    result = {
                        "error": f"The configured limit of {self.max_tool_calls} tool calls has been reached.",
                        "result": None,
                        "reason": "The run was stopped safely.",
                    }
                    limit_hit = True
                else:
                    calls_made += 1
                    try:
                        arguments = json.loads(raw_arguments)
                        result = execute_tool(name, arguments)
                    except (ValueError, TypeError) as exc:
                        result = {"error": f"Invalid tool-call arguments: {exc}", "result": None}
                call_details.append({"name": name, "arguments": raw_arguments, "ok": "error" not in result})
                input_items.append({
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(result, ensure_ascii=False, default=str),
                })

            if limit_hit:
                try:
                    final_response = self._request(input_items, "none")
                    final_text = self._output_text(final_response)
                except Exception:
                    final_text = (
                        "I stopped because the configured tool-call limit was reached. "
                        "The available findings may be incomplete; please narrow the request."
                    )
                self.memory.add(session_id, "assistant", final_text)
                return {
                    "ok": True, "message": final_text, "tool_calls": calls_made,
                    "tool_call_details": call_details, "limit_reached": True,
                    "session_id": session_id,
                }

    def reset_session(self, session_id: str) -> None:
        self.memory.reset(session_id)


def chat(message: str, session_id: str = "default") -> dict:
    """Convenience single-agent wrapper for simple scripts."""
    global _default_agent
    if "_default_agent" not in globals():
        _default_agent = CrewSyncAgent()
    return _default_agent.chat(message, session_id=session_id)

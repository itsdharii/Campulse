"""Allow-listed OpenAI function tools for Crew Sync.

Only functions registered in this module can be called by the model. The model
never gets direct access to Python, SQL, the filesystem, or arbitrary imports.
"""
from __future__ import annotations

import inspect
import json
import math
from typing import Any

import tools as phase2


def _function(name: str, description: str, properties: dict, required: list[str] | None = None) -> dict:
    return {
        "type": "function",
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required or [],
            "additionalProperties": False,
        },
        # Keep schemas non-strict because some optional Phase 2 parameters use
        # defaults and because we perform authoritative validation locally.
        "strict": False,
    }


_STRING_OR_INTEGER = {"anyOf": [{"type": "string"}, {"type": "integer"}]}

PHASE2_TOOL_DEFINITIONS = [
    _function("find_clashes", "Find same-day venue clashes and volunteers double-booked across events.", {}),
    _function("club_health", "Calculate the explainable health score and weak indicators for one club. club_id may be its name or numeric ID.", {"club_id": _STRING_OR_INTEGER}, ["club_id"]),
    _function("all_club_health", "Calculate and rank the health scores of all clubs.", {}),
    _function("match_clubs", "Find possible inter-club collaborations based on complementary skills.", {}),
    _function("simulate_move", "Read-only simulation of moving an event to an ISO date. It does not change the database.", {"event_id": _STRING_OR_INTEGER, "new_date": {"type": "string", "description": "Target date in YYYY-MM-DD format"}}, ["event_id", "new_date"]),
    _function("find_replacements", "Recommend available volunteers for an event. This does not create assignments.", {"event_id": _STRING_OR_INTEGER, "n_needed": {"type": "integer", "minimum": 0, "maximum": 100}, "skill": {"type": ["string", "null"]}}, ["event_id", "n_needed"]),
    _function("budget_guard", "Check whether a proposed expense fits a club's remaining budget. This does not spend money.", {"club_id": _STRING_OR_INTEGER, "proposed_amount": {"type": "number", "minimum": 0}, "description": {"type": "string"}}, ["club_id", "proposed_amount"]),
    _function("generate_report", "Generate a structured event report draft from organizer-provided inputs. This does not save the report.", {"inputs": {"type": "object", "additionalProperties": True}}, ["inputs"]),
]

# Proposal functions only create pending records. They never execute a change.
PHASE3_TOOL_DEFINITIONS = [
    _function("propose_event_move", "Create a pending approval request to move an event. This records a proposal only; it does not move the event. Use only after a successful move simulation and clear user intent to proceed.", {
        "event_id": _STRING_OR_INTEGER,
        "new_date": {"type": "string", "description": "Target date in YYYY-MM-DD format"},
        "reason": {"type": "string"},
    }, ["event_id", "new_date", "reason"]),
    _function("propose_volunteer_assignments", "Create a pending approval request to assign selected recommended volunteers to an event. This records a proposal only; it does not create assignments.", {
        "event_id": _STRING_OR_INTEGER,
        "volunteer_ids": {"type": "array", "items": {"type": "integer"}, "minItems": 1, "maxItems": 100},
        "reason": {"type": "string"},
    }, ["event_id", "volunteer_ids", "reason"]),
]

TOOL_DEFINITIONS = PHASE2_TOOL_DEFINITIONS + PHASE3_TOOL_DEFINITIONS

PHASE2_TOOL_MAP = {
    name: getattr(phase2, name)
    for name in (
        "find_clashes", "club_health", "all_club_health", "match_clubs",
        "simulate_move", "find_replacements", "budget_guard", "generate_report",
    )
}


def _resolve_event_id(value: Any) -> int:
    """Resolve a Phase 2 event identifier or title into its numeric DB id."""
    import db
    if isinstance(value, bool):
        raise ValueError("event_id must be an event title or integer ID")
    if isinstance(value, int) or (isinstance(value, str) and value.strip().isdigit()):
        rows = db.query("SELECT id FROM events WHERE id=?", (int(value),))
    elif isinstance(value, str) and value.strip():
        rows = db.query("SELECT id FROM events WHERE lower(title)=lower(?) ORDER BY id LIMIT 1", (value.strip(),))
    else:
        raise ValueError("event_id must be an event title or integer ID")
    if not rows:
        raise ValueError(f"Event '{value}' was not found")
    return int(rows[0]["id"])


def _execute_proposal(name: str, arguments: dict) -> dict:
    import approval
    if name == "propose_event_move":
        event_id = _resolve_event_id(arguments["event_id"])
        return approval.create_proposal(
            "move_event",
            {"event_id": event_id, "new_date": arguments["new_date"]},
            arguments["reason"],
        )
    if name == "propose_volunteer_assignments":
        event_id = _resolve_event_id(arguments["event_id"])
        return approval.create_proposal(
            "assign_volunteers",
            {"event_id": event_id, "volunteer_ids": arguments["volunteer_ids"]},
            arguments["reason"],
        )
    raise ValueError(f"Unregistered proposal tool: {name}")


def execute_tool(name: str, arguments: dict) -> dict:
    """Validate and dispatch one allow-listed function call.

    Returns JSON-serializable dictionaries, including safe error responses.
    """
    if not isinstance(arguments, dict):
        return {"error": "Tool arguments must be a JSON object.", "result": None, "reason": "Invalid arguments."}
    try:
        if name in PHASE2_TOOL_MAP:
            func = PHASE2_TOOL_MAP[name]
            signature = inspect.signature(func)
            allowed = set(signature.parameters)
            extra = set(arguments) - allowed
            missing = {
                key for key, param in signature.parameters.items()
                if param.default is inspect.Parameter.empty and key not in arguments
            }
            if extra:
                raise ValueError("Unexpected argument(s): " + ", ".join(sorted(extra)))
            if missing:
                raise ValueError("Missing required argument(s): " + ", ".join(sorted(missing)))
            if name in {"club_health", "budget_guard"}:
                club_id = arguments.get("club_id")
                if isinstance(club_id, bool) or not isinstance(club_id, (str, int)):
                    raise ValueError("club_id must be a club name or integer ID")
            if name in {"simulate_move", "find_replacements"}:
                event_id = arguments.get("event_id")
                if isinstance(event_id, bool) or not isinstance(event_id, (str, int)):
                    raise ValueError("event_id must be an event title or integer ID")
            if name == "simulate_move" and not isinstance(arguments.get("new_date"), str):
                raise ValueError("new_date must be a YYYY-MM-DD string")
            if name == "find_replacements":
                n = arguments.get("n_needed")
                if isinstance(n, bool) or not isinstance(n, int) or not 0 <= n <= 100:
                    raise ValueError("n_needed must be an integer between 0 and 100")
                skill = arguments.get("skill")
                if skill is not None and not isinstance(skill, str):
                    raise ValueError("skill must be a string or null")
            if name == "budget_guard":
                amount = arguments.get("proposed_amount")
                if (isinstance(amount, bool) or not isinstance(amount, (int, float))
                        or not math.isfinite(amount) or amount < 0):
                    raise ValueError("proposed_amount must be a finite non-negative number")
            if name == "generate_report" and not isinstance(arguments.get("inputs"), dict):
                raise ValueError("inputs must be an object")
            json.dumps(arguments)
            result = func(**arguments)
        elif name in {"propose_event_move", "propose_volunteer_assignments"}:
            required = {"propose_event_move": {"event_id", "new_date", "reason"},
                        "propose_volunteer_assignments": {"event_id", "volunteer_ids", "reason"}}[name]
            extra = set(arguments) - required
            missing = required - set(arguments)
            if extra or missing:
                raise ValueError(f"Invalid proposal arguments. Missing={sorted(missing)}, unexpected={sorted(extra)}")
            if not isinstance(arguments["reason"], str) or not arguments["reason"].strip():
                raise ValueError("reason must be a non-empty string")
            result = _execute_proposal(name, arguments)
        else:
            return {"error": f"Unknown tool: {name}", "result": None, "reason": "Tool is not registered."}
        # Proposal functions return plain dictionaries; Phase 2 tools return same.
        json.dumps(result, default=str)
        return result
    except Exception as exc:
        return {"error": str(exc), "result": None, "reason": "Tool execution failed safely."}


def get_tool_definitions(include_proposals: bool = True) -> list[dict]:
    """Return OpenAI Responses API function schemas."""
    return TOOL_DEFINITIONS if include_proposals else PHASE2_TOOL_DEFINITIONS

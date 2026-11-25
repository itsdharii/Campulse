"""Human approval queue for the small set of supported operational changes.

A proposal is data, not an executed action. Consequential database changes only
occur inside decide(..., "approve") after re-validation in a transaction.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any

import db


class ApprovalError(Exception):
    """Raised when a proposal or approval decision is invalid."""


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _event_id(value: Any) -> int:
    if isinstance(value, bool):
        raise ApprovalError("event_id must be an integer database ID")
    try:
        event_id = int(value)
    except (TypeError, ValueError):
        raise ApprovalError("event_id must be an integer database ID")
    if event_id <= 0:
        raise ApprovalError("event_id must be a positive integer")
    return event_id


def _validate_proposal_shape(action_type: str, payload: dict) -> dict:
    if action_type not in {"move_event", "assign_volunteers"}:
        raise ApprovalError("Unsupported action type. Allowed: move_event, assign_volunteers.")
    if not isinstance(payload, dict):
        raise ApprovalError("payload must be an object")
    if action_type == "move_event":
        if set(payload) != {"event_id", "new_date"}:
            raise ApprovalError("move_event payload must contain only event_id and new_date")
        event_id = _event_id(payload["event_id"])
        if not isinstance(payload["new_date"], str):
            raise ApprovalError("new_date must be a YYYY-MM-DD string")
        try:
            new_date = date.fromisoformat(payload["new_date"]).isoformat()
        except ValueError:
            raise ApprovalError("new_date must use YYYY-MM-DD format")
        return {"event_id": event_id, "new_date": new_date}

    if set(payload) != {"event_id", "volunteer_ids"}:
        raise ApprovalError("assign_volunteers payload must contain only event_id and volunteer_ids")
    event_id = _event_id(payload["event_id"])
    ids = payload["volunteer_ids"]
    if not isinstance(ids, list) or not ids or len(ids) > 100:
        raise ApprovalError("volunteer_ids must be a non-empty list of at most 100 IDs")
    if any(isinstance(value, bool) or not isinstance(value, int) or value <= 0 for value in ids):
        raise ApprovalError("volunteer_ids must contain positive integer IDs")
    if len(set(ids)) != len(ids):
        raise ApprovalError("volunteer_ids must not contain duplicates")
    return {"event_id": event_id, "volunteer_ids": ids}


def create_proposal(action_type: str, payload: dict, description: str) -> dict:
    """Create a pending approval item. No event or assignment is changed."""
    clean_payload = _validate_proposal_shape(action_type, payload)
    if not isinstance(description, str) or not description.strip():
        raise ApprovalError("description must be a non-empty string")

    # Existence checks give the reviewer a meaningful pending item. All mutable
    # conditions (conflicts/availability) are rechecked at approval time.
    event_rows = db.query("SELECT id, title, status FROM events WHERE id=?", (clean_payload["event_id"],))
    if not event_rows:
        raise ApprovalError(f"Event ID {clean_payload['event_id']} does not exist")
    if event_rows[0]["status"] != "scheduled":
        raise ApprovalError("Only scheduled events can receive operational proposals")
    if action_type == "move_event":
        # Require the deterministic Phase 2 simulation to be clear at proposal
        # time. The exact same constraints are checked again at approval time.
        import tools
        simulation = tools.simulate_move(clean_payload["event_id"], clean_payload["new_date"])
        if "error" in simulation:
            raise ApprovalError(simulation["error"])
        simulated = simulation.get("result") or {}
        if simulated.get("old_date") == clean_payload["new_date"]:
            raise ApprovalError("The event is already scheduled for that date")
        if simulated.get("venue_conflicts") or simulated.get("unavailable_assigned_volunteers"):
            raise ApprovalError("Move simulation found blockers; resolve them before proposing this change")

    if action_type == "assign_volunteers":
        existing = db.query(
            "SELECT volunteer_id FROM assignments WHERE event_id=? AND volunteer_id IN ("
            + ",".join("?" for _ in clean_payload["volunteer_ids"])
            + ")",
            (clean_payload["event_id"], *clean_payload["volunteer_ids"]),
        )
        if existing:
            raise ApprovalError("One or more proposed volunteers are already linked to this event")
        # Only candidates returned by the existing deterministic replacement
        # tool can be proposed. Approval still re-checks these conditions.
        import tools
        recommendation = tools.find_replacements(
            clean_payload["event_id"], len(clean_payload["volunteer_ids"])
        )
        if "error" in recommendation:
            raise ApprovalError(recommendation["error"])
        eligible_ids = {
            person["id"] for person in recommendation.get("result", {}).get("candidates", [])
        }
        rejected = [value for value in clean_payload["volunteer_ids"] if value not in eligible_ids]
        if rejected:
            raise ApprovalError(f"Volunteer IDs are not currently eligible replacements: {rejected}")

    action_id = db.execute(
        "INSERT INTO pending_actions (action_type, payload, description, status, created_at) "
        "VALUES (?, ?, ?, 'pending', ?)",
        (action_type, json.dumps(clean_payload, separators=(",", ":")), description.strip(), _timestamp()),
    )
    return {
        "action_id": action_id,
        "action_type": action_type,
        "description": description.strip(),
        "status": "pending",
        "executed": False,
        "message": "Proposal created. No operational change has been made; human approval is required.",
    }


def list_pending() -> list[dict]:
    return db.query(
        "SELECT id AS action_id, action_type, payload, description, status, created_at "
        "FROM pending_actions WHERE status='pending' ORDER BY id"
    )


def get_action(action_id: int) -> dict | None:
    rows = db.query(
        "SELECT id AS action_id, action_type, payload, description, status, created_at "
        "FROM pending_actions WHERE id=?", (action_id,)
    )
    if not rows:
        return None
    row = rows[0]
    try:
        row["payload"] = json.loads(row["payload"])
    except (TypeError, json.JSONDecodeError):
        row["payload"] = None
    return row


def _validate_and_execute(conn, action_type: str, payload: dict) -> dict:
    """Execute one action on an already-open transaction connection."""
    clean = _validate_proposal_shape(action_type, payload)
    event_id = clean["event_id"]
    event = conn.execute(
        "SELECT id, title, event_date, start_time, venue_id, status, skills_needed "
        "FROM events WHERE id=?", (event_id,)
    ).fetchone()
    if not event:
        raise ApprovalError("Event no longer exists")
    if event["status"] != "scheduled":
        raise ApprovalError("Only scheduled events can be changed")

    if action_type == "move_event":
        new_date = clean["new_date"]
        if new_date == event["event_date"]:
            raise ApprovalError("The event is already scheduled for that date")
        clash = conn.execute(
            "SELECT title FROM events WHERE venue_id=? AND event_date=? AND id<>? "
            "AND status<>'cancelled' ORDER BY id LIMIT 1",
            (event["venue_id"], new_date, event_id),
        ).fetchone()
        if clash:
            raise ApprovalError(
                f"Venue conflict: {clash['title']} is already booked at this venue on {new_date}"
            )

        assigned = conn.execute(
            "SELECT v.id, v.name, v.available_dates FROM assignments a "
            "JOIN volunteers v ON v.id=a.volunteer_id "
            "WHERE a.event_id=? AND a.status='assigned'", (event_id,)
        ).fetchall()
        issues = []
        for volunteer in assigned:
            available = db.split_list(volunteer["available_dates"])
            if new_date not in available:
                issues.append(f"{volunteer['name']} is not marked available on {new_date}")
                continue
            conflict = conn.execute(
                "SELECT e.title FROM assignments a JOIN events e ON e.id=a.event_id "
                "WHERE a.volunteer_id=? AND a.status='assigned' AND e.status<>'cancelled' "
                "AND e.event_date=? AND e.id<>? LIMIT 1",
                (volunteer["id"], new_date, event_id),
            ).fetchone()
            if conflict:
                issues.append(f"{volunteer['name']} is already assigned to {conflict['title']}")
        if issues:
            raise ApprovalError("Assigned volunteer conflict: " + "; ".join(issues))

        # Phase 1 stores a date-prefixed start_time (e.g. '2026-12-15 09:00').
        # Keep the clock part in sync when moving the event.
        old_start = str(event["start_time"] or "")
        clock_part = old_start.split(maxsplit=1)[1] if " " in old_start else old_start
        new_start = f"{new_date} {clock_part}".strip()
        conn.execute(
            "UPDATE events SET event_date=?, start_time=? WHERE id=?",
            (new_date, new_start, event_id),
        )
        return {"event_id": event_id, "event": event["title"], "new_date": new_date, "executed": True}

    # assign_volunteers
    volunteer_ids = clean["volunteer_ids"]
    existing = conn.execute(
        "SELECT volunteer_id FROM assignments WHERE event_id=? AND volunteer_id IN ("
        + ",".join("?" for _ in volunteer_ids) + ")",
        (event_id, *volunteer_ids),
    ).fetchall()
    if existing:
        raise ApprovalError("One or more volunteers have already been assigned to this event")

    needed_skills = {s.lower() for s in db.split_list(event["skills_needed"])}
    checked = []
    for volunteer_id in volunteer_ids:
        volunteer = conn.execute(
            "SELECT id, name, skills, available_dates FROM volunteers WHERE id=?", (volunteer_id,)
        ).fetchone()
        if not volunteer:
            raise ApprovalError(f"Volunteer ID {volunteer_id} no longer exists")
        if event["event_date"] not in db.split_list(volunteer["available_dates"]):
            raise ApprovalError(f"{volunteer['name']} is not marked available on {event['event_date']}")
        volunteer_skills = {s.lower() for s in db.split_list(volunteer["skills"])}
        if needed_skills and not (needed_skills & volunteer_skills):
            raise ApprovalError(f"{volunteer['name']} does not match any listed event skill")
        conflict = conn.execute(
            "SELECT e.title FROM assignments a JOIN events e ON e.id=a.event_id "
            "WHERE a.volunteer_id=? AND a.status='assigned' AND e.status<>'cancelled' "
            "AND e.event_date=? AND e.id<>? LIMIT 1",
            (volunteer_id, event["event_date"], event_id),
        ).fetchone()
        if conflict:
            raise ApprovalError(f"{volunteer['name']} is already assigned to {conflict['title']}")
        checked.append((event_id, volunteer_id, "Approved replacement", "assigned"))

    conn.executemany(
        "INSERT INTO assignments (event_id, volunteer_id, role, status) VALUES (?, ?, ?, ?)",
        checked,
    )
    return {
        "event_id": event_id,
        "event": event["title"],
        "assigned_volunteer_ids": volunteer_ids,
        "executed": True,
    }


def decide(action_id: int, decision: str, reason: str = "") -> dict:
    """Approve/reject a pending action exactly once, atomically with decision log."""
    if isinstance(action_id, bool) or not isinstance(action_id, int) or action_id <= 0:
        raise ApprovalError("action_id must be a positive integer")
    if decision not in {"approve", "reject"}:
        raise ApprovalError("decision must be 'approve' or 'reject'")
    if not isinstance(reason, str):
        raise ApprovalError("reason must be a string")

    conn = db.get_conn()
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute("SELECT * FROM pending_actions WHERE id=?", (action_id,)).fetchone()
        if not row:
            raise ApprovalError(f"Action {action_id} was not found")
        if row["status"] != "pending":
            raise ApprovalError(f"Action {action_id} is already {row['status']}; duplicate decisions are blocked")

        if decision == "reject":
            conn.execute("UPDATE pending_actions SET status='rejected' WHERE id=?", (action_id,))
            conn.execute(
                "INSERT INTO decision_log (timestamp, action, decision, reason, pending_action_id) "
                "VALUES (?, ?, 'rejected', ?, ?)",
                (_timestamp(), row["action_type"], reason.strip(), action_id),
            )
            conn.commit()
            return {"action_id": action_id, "status": "rejected", "executed": False}

        try:
            payload = json.loads(row["payload"])
        except (TypeError, json.JSONDecodeError):
            raise ApprovalError("Stored action payload is invalid JSON")
        result = _validate_and_execute(conn, row["action_type"], payload)
        conn.execute("UPDATE pending_actions SET status='approved' WHERE id=?", (action_id,))
        conn.execute(
            "INSERT INTO decision_log (timestamp, action, decision, reason, pending_action_id) "
            "VALUES (?, ?, 'approved', ?, ?)",
            (_timestamp(), row["action_type"], reason.strip(), action_id),
        )
        conn.commit()
        return {"action_id": action_id, "status": "approved", "executed": True, "result": result}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

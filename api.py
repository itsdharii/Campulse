import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
import approval
import seed
import tools
from agent import CrewSyncAgent, AgentError


# Create the demo schema/data only when the database is empty (never wipes data).
seed.ensure_demo_data()

# Create one agent so conversation memory persists between requests.
# If the AI key is missing the rest of the API (clubs, events, approvals...)
# still works; only /api/chat reports that the assistant is not configured.
agent = None
agent_error = None
try:
    agent = CrewSyncAgent()
except AgentError as exc:
    agent_error = str(exc)
    print(f"[Campulse] AI assistant disabled: {exc}")


app = FastAPI(title="Crew Sync API")

# Allow the React frontend to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class DecisionRequest(BaseModel):
    reason: str = ""


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "project": "Crew Sync",
        "ai_enabled": agent is not None,
        "ai_error": agent_error,
    }


@app.get("/api/clubs")
def get_clubs():
    return db.query("""
        SELECT
            c.*,
            cb.allocated_amount,
            cb.spent_amount,
            cb.reserved_amount,
            cb.currency
        FROM clubs c
        LEFT JOIN club_budgets cb ON cb.club_id = c.id
        ORDER BY c.id
    """)


@app.get("/api/events")
def get_events():
    return db.query("""
        SELECT
            e.*,
            c.name AS club_name,
            v.name AS venue_name
        FROM events e
        JOIN clubs c ON c.id = e.club_id
        JOIN venues v ON v.id = e.venue_id
        ORDER BY e.event_date, e.start_time
    """)


# ---- Read-only endpoints added for the Campulse frontend -------------------
# They only expose existing database rows / existing deterministic tools.

@app.get("/api/volunteers")
def get_volunteers():
    volunteers = db.query("""
        SELECT v.*, c.name AS club_name
        FROM volunteers v
        LEFT JOIN clubs c ON c.id = v.club_id
        ORDER BY v.id
    """)
    assignments = db.query("""
        SELECT a.volunteer_id, a.event_id, a.role, a.status,
               e.title AS event_title, e.event_date
        FROM assignments a
        JOIN events e ON e.id = a.event_id
        ORDER BY e.event_date
    """)
    by_volunteer: dict = {}
    for row in assignments:
        by_volunteer.setdefault(row["volunteer_id"], []).append(row)
    for v in volunteers:
        v["assignments"] = by_volunteer.get(v["id"], [])
    return volunteers


@app.get("/api/assignments")
def get_assignments():
    return db.query("""
        SELECT a.*, v.name AS volunteer_name, e.title AS event_title, e.event_date
        FROM assignments a
        JOIN volunteers v ON v.id = a.volunteer_id
        JOIN events e ON e.id = a.event_id
        ORDER BY e.event_date, a.id
    """)


@app.get("/api/club-health")
def get_club_health():
    """Uses the existing deterministic tools.all_club_health()."""
    return tools.all_club_health()


@app.get("/api/clashes")
def get_clashes():
    """Uses the existing deterministic tools.find_clashes()."""
    return tools.find_clashes()


@app.get("/api/decisions")
def get_decisions():
    return db.query("""
        SELECT d.*, p.description, p.action_type
        FROM decision_log d
        LEFT JOIN pending_actions p ON p.id = d.pending_action_id
        ORDER BY d.id DESC
        LIMIT 50
    """)


@app.get("/api/actions")
def get_actions():
    """All proposals (any status) so the UI can show history."""
    actions = db.query(
        "SELECT id AS action_id, action_type, payload, description, status, created_at "
        "FROM pending_actions ORDER BY id DESC"
    )
    for action in actions:
        try:
            action["payload"] = json.loads(action["payload"])
        except (TypeError, json.JSONDecodeError):
            action["payload"] = None
    return actions


# ---------------------------------------------------------------------------

@app.post("/api/chat")
def chat(request: ChatRequest):
    if agent is None:
        raise HTTPException(
            status_code=503,
            detail=f"AI assistant is not configured: {agent_error}",
        )
    try:
        return agent.chat(
            request.message,
            session_id=request.session_id
        )
    except (ValueError, AgentError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/pending")
def get_pending():
    actions = approval.list_pending()

    # Convert the stored JSON payload into an actual object.
    for action in actions:
        try:
            action["payload"] = json.loads(action["payload"])
        except (TypeError, json.JSONDecodeError):
            action["payload"] = None

    return actions


@app.post("/api/approve/{action_id}")
def approve_action(
    action_id: int,
    request: DecisionRequest = DecisionRequest()
):
    try:
        return approval.decide(
            action_id,
            "approve",
            request.reason
        )
    except approval.ApprovalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/reject/{action_id}")
def reject_action(
    action_id: int,
    request: DecisionRequest = DecisionRequest()
):
    try:
        return approval.decide(
            action_id,
            "reject",
            request.reason
        )
    except approval.ApprovalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

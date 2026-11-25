
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
import approval
from agent import CrewSyncAgent, AgentError


# Create one agent so conversation memory persists between requests.
try:
    agent = CrewSyncAgent()
except AgentError as exc:
    raise RuntimeError(f"Could not start Crew Sync agent: {exc}") from exc


app = FastAPI(title="Crew Sync API")

# Allow the React frontend to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
    return {"status": "online", "project": "Crew Sync"}


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


@app.post("/api/chat")
def chat(request: ChatRequest):
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

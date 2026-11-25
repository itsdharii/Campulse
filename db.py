"""SQLite schema and helpers for Crew Sync. All records are fictional demo data."""
import os
import sqlite3
from datetime import date, datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_PATH = os.getenv("CREWSYNC_DB", str(Path(__file__).with_name("crewsync.db")))

TABLES = [
    "decision_log", "pending_actions", "reports", "assignments",
    "volunteers", "events", "venues", "club_budgets", "clubs",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    skills_offered TEXT,
    skills_needed TEXT,
    member_count INTEGER,
    active_members_30d INTEGER,
    volunteers_prev_90d INTEGER,
    volunteers_last_90d INTEGER,
    unfulfilled_plans INTEGER NOT NULL DEFAULT 0,
    unfulfilled_plans_note TEXT
);
CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER
);
CREATE TABLE IF NOT EXISTS club_budgets (
    id INTEGER PRIMARY KEY,
    club_id INTEGER NOT NULL UNIQUE REFERENCES clubs(id),
    allocated_amount REAL NOT NULL CHECK (allocated_amount >= 0),
    spent_amount REAL NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
    reserved_amount REAL NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR'
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    expected_attendance INTEGER,
    actual_attendance INTEGER,
    volunteers_needed INTEGER NOT NULL DEFAULT 0,
    skills_needed TEXT
);
CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    club_id INTEGER REFERENCES clubs(id),
    skills TEXT,
    available_dates TEXT
);
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
    role TEXT,
    status TEXT NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'cancelled')),
    demo_cancels INTEGER NOT NULL DEFAULT 0,
    UNIQUE (event_id, volunteer_id)
);
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    club_id INTEGER REFERENCES clubs(id),
    title TEXT,
    created_on TEXT,
    expected_attendance INTEGER,
    actual_attendance INTEGER,
    volunteers INTEGER,
    summary TEXT,
    went_well TEXT,
    problems TEXT,
    volunteer_summary TEXT,
    suggestions TEXT
);
CREATE TABLE IF NOT EXISTS pending_actions (
    id INTEGER PRIMARY KEY,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decision_log (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT,
    pending_action_id INTEGER REFERENCES pending_actions(id)
);
"""

def today() -> date:
    fixed = os.getenv("DEMO_TODAY")
    return date.fromisoformat(fixed) if fixed else date.today()

def now() -> datetime:
    if os.getenv("DEMO_TODAY"):
        return datetime.combine(today(), datetime.now().time())
    return datetime.now()

def get_conn() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def query(sql: str, params=()) -> list[dict]:
    conn = get_conn()
    try:
        return [dict(row) for row in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()

def execute(sql: str, params=()) -> int:
    conn = get_conn()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

def split_list(value) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]

def create_tables(drop_first: bool = False) -> None:
    conn = get_conn()
    try:
        if drop_first:
            for table in TABLES:
                conn.execute(f"DROP TABLE IF EXISTS {table}")
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()

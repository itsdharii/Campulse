# Crew Sync — Phase 3: Agentic AI & Orchestration

Crew Sync is an AI-powered campus club coordination prototype. Phase 3 adds an OpenAI-powered agent over the existing deterministic Phase 1/Phase 2 backend. The original Phase 1/2 function signatures, scoring logic, seed data, and business behavior are preserved. The existing read-only Phase 2 connection contexts were tightened to close SQLite connections explicitly after each call.

## What Phase 3 adds

| File | Purpose |
|---|---|
| `agent.py` | OpenAI Responses API integration, sequential tool-calling loop, error handling and call limits |
| `tool_registry.py` | Allow-listed function schemas, argument validation and safe dispatch |
| `prompts.py` | Crew Sync's agent instructions and action-safety rules |
| `memory.py` | Bounded, process-local conversation history separated by session ID |
| `approval.py` | Pending proposals, approve/reject decisions, transactional execution and decision logging |
| `run.py` | Runnable terminal demo, including approval/rejection commands |
| `test_agent.py` | Offline agent orchestration tests with mocked model responses |
| `test_approval.py` | SQLite approval, rejection, validation and rollback tests |
| `test_memory.py` | Session memory tests |

The Phase 2 read-only tools exposed to the model are:

```text
find_clashes()
club_health(club_id)
all_club_health()
match_clubs()
simulate_move(event_id, new_date)
find_replacements(event_id, n_needed, skill=None)
budget_guard(club_id, proposed_amount, description="Proposed expense")
generate_report(inputs)
```

The agent also has two Phase 3 proposal tools:

- `propose_event_move(event_id, new_date, reason)`
- `propose_volunteer_assignments(event_id, volunteer_ids, reason)`

These proposal tools only create `pending_actions` records. They do **not** execute the change. Only the approval handler can execute the two supported operational actions, after a human decision and a fresh validation check.

## Requirements

- Python 3.10 or newer
- An OpenAI API key with access to the configured model
- An API billing/usage balance for live calls (ChatGPT subscription is separate from API billing)

## Install and run

Open a terminal in this project folder.

### 1. Create a virtual environment

Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install packages

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure the API key

Copy `.env.example` to `.env` and put your key in the `OPENAI_API_KEY` value. Do not commit or share `.env`.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

macOS/Linux:

```bash
cp .env.example .env
nano .env
```

### 4. Launch Crew Sync

```bash
python run.py
```

On the first run, Crew Sync creates its SQLite schema and inserts the fictional sample data only if the `clubs` table is empty. It does not wipe an existing database.

## Try these demo prompts

Use the wording below as a starting point. The actual tool calls are selected by the model based on the supplied data and the request.

1. **Club health and collaboration**
   `Our Literary Club has become inactive. What should we do?`

   Expected relevant tools: `club_health`, `match_clubs`, and optionally `find_clashes`.

2. **Event feasibility**
   `Is the Hackathon feasible? Check the existing venue and volunteer conflicts.`

   Expected relevant tools: `find_clashes`, `simulate_move` only if a date is being considered, and other tools only when the request supplies the needed inputs.

3. **Replacement volunteers**
   `Five volunteers have cancelled for Tech Expo Prep Day. Find replacements.`

   Expected relevant tool: `find_replacements`. When suitable candidates are found, the agent may create a pending assignment proposal for human review; it cannot assign them directly.

4. **Date simulation**
   `Can we move Hackathon to 17 December 2026?`

   Expected relevant tool: `simulate_move`. A question about feasibility is not permission to change the date. Ask the agent to prepare a proposal only after reviewing the simulation.

5. **Budget monitoring**
   `Can the Coding Club afford an additional INR 10,000 equipment expense?`

   Expected relevant tool: `budget_guard`. Budget changes/spending are not implemented in this phase.

## Approval commands

The terminal is the local demo's human approval surface:

```text
/pending       List pending action proposals
/approve 3     Approve pending proposal ID 3
/reject 3      Reject pending proposal ID 3
/reset         Reset the current conversation memory
/quit          Exit
```

A proposal remains pending until explicitly approved or rejected. Approval runs in a SQLite transaction and re-checks current event status, venue conflicts, volunteer availability, skill fit, existing assignments and double-bookings. If validation fails, the transaction rolls back and the proposal remains pending. Duplicate decisions are blocked.

The CLI is a trusted local demonstration interface, not an authenticated production approval portal. Do not expose `approval.decide()` through a public endpoint without authentication and authorization.

## Run tests

```bash
python -m unittest discover -v
```

The test suite uses temporary SQLite databases and mocked OpenAI responses. It does not require an API key and does not incur API charges.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes for live AI | — | OpenAI API secret |
| `OPENAI_MODEL` | No | `gpt-6-luna` | OpenAI model ID; change it without editing Python |
| `CREWSYNC_DB` | No | `./crewsync.db` | SQLite database path |
| `CREWSYNC_MAX_TOOL_CALLS` | No | `8` | Maximum tool calls in one user turn; allowed 1–30 |
| `CREWSYNC_MAX_HISTORY_MESSAGES` | No | `20` | Maximum user/assistant messages retained per session; minimum 2 |

## Phase 3 action scope and limitations

The existing Phase 1 schema has no event end-time/duration field, so venue clash detection conservatively treats same-day bookings at the same venue as clashes. The Phase 2 date simulator is read-only.

Only these two changes can currently be proposed and executed after approval:

- Move a scheduled event to a new date.
- Assign selected replacement volunteers to a scheduled event.

The assignment approval handler revalidates availability and event skill fit. The event-move handler revalidates venue and assigned-volunteer availability/conflicts, and keeps the date portion of the existing `start_time` value in sync with `event_date`.

There is no budget-spend approval/action handler, report persistence, HTTP server, authentication, role-based access control, or frontend in Phase 3. The Phase 4 frontend can call `CrewSyncAgent.chat(...)`, `approval.list_pending()`, and `approval.decide(...)` through a future authenticated API layer.

Conversation memory is process-local and clears when the process exits. It is intentionally small for this prototype; production deployment with multiple workers should move session storage to a shared database or cache.

## Security notes

- Keep `.env` private; `.gitignore` excludes it.
- Only explicitly registered functions can be invoked by the model.
- Tool arguments are validated in Python, regardless of model-generated JSON.
- The model cannot execute arbitrary Python or SQL.
- Model-visible write functions only create proposals; approved execution lives in `approval.py`.
- Approval execution uses a transaction and revalidates immediately before writing.
- Use fictional/demo data for the hackathon presentation.

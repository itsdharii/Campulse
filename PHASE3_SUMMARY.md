# Crew Sync Phase 3 — Integration summary

## Source of truth inspected
The project was generated from the newly uploaded Phase 1 + Phase 2 ZIP. It contained `db.py`, `seed.py`, `tools.py`, and `test_tools.py`. The existing test suite passed 10/10 before changes.

## Actual Phase 1 schema
`db.py` creates nine tables: `clubs`, `venues`, `club_budgets`, `events`, `volunteers`, `assignments`, `reports`, `pending_actions`, and `decision_log`. Foreign keys connect clubs to events, volunteers, budgets and reports; venues to events; events and volunteers through assignments; and pending actions to decision log records. The existing pending action schema stores `id`, `action_type`, JSON `payload`, `description`, `status`, and `created_at`. Decision records store timestamp, action, decision, reason and pending action ID.

## Existing Phase 2 signatures
- `find_clashes()`
- `club_health(club_id)`
- `all_club_health()`
- `match_clubs()`
- `simulate_move(event_id,new_date)`
- `find_replacements(event_id,n_needed,skill=None)`
- `budget_guard(club_id,proposed_amount,description="Proposed expense")`
- `generate_report(inputs)`

Phase 2 function names, signatures, and outputs are preserved. A small resource-management fix wraps the existing read-only database connection contexts so SQLite connections are explicitly closed after tool use.

## Agent architecture
Natural-language request → OpenAI Responses API → allow-listed registered tool → Phase 2 deterministic Python tool or Phase 3 proposal function → tool output returned to model → final answer. The loop is bounded by `CREWSYNC_MAX_TOOL_CALLS`.

## Human approval
Only `move_event` and `assign_volunteers` can execute after human approval. Proposals are stored in the existing tables. Approval uses `BEGIN IMMEDIATE`, fresh validation, database writes and decision logging in one transaction. Rejected and duplicate actions do not execute. Invalidated proposals roll back and stay pending.

## Validation results
Run `python -m unittest discover -v`. The package includes 31 offline tests: the existing 10 Phase 1/2 integration tests plus Phase 3 agent, memory and approval tests. The test suite uses mocked model outputs; a live OpenAI API request still requires the user's key and account/model access.

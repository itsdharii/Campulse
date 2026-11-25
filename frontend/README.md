# Campulse frontend

React + TypeScript + Vite + Tailwind + Recharts + Lucide + React Router. Theme taken from the Crew Sync Streamlit app.

## Run everything (Windows)

1. Backend (from the project root, the folder containing `api.py`):
   ```powershell
   py -m pip install -r requirements.txt
   copy .env.example .env      # then put your GROQ_API_KEY in .env
   py -m uvicorn api:app --port 8000
   ```
   The database is created and seeded automatically on first start.
2. Frontend:
   ```powershell
   cd frontend
   npm install
   npm run dev                 # http://127.0.0.1:5173
   ```

Or run `start.ps1` in the project root to launch both.

## Configuration

`frontend/.env` (see `.env.example`): `VITE_API_BASE_URL=http://127.0.0.1:8000`. The AI key lives only in the backend `.env`.

## Backend endpoints used

Existing: `/api/health`, `/api/clubs`, `/api/events`, `/api/chat`, `/api/pending`, `/api/approve/{id}`, `/api/reject/{id}`.

Added (read-only) in `api.py` because the frontend needed them: `/api/volunteers`, `/api/assignments`,
`/api/club-health` (wraps `tools.all_club_health`), `/api/clashes` (wraps `tools.find_clashes`), `/api/decisions`, `/api/actions`.

## Limitations

- No authentication: anyone who can reach the backend can approve proposals.
- Replacement-volunteer suggestions and collaboration ideas exist only as assistant tools (via chat); there is no REST endpoint for them.
- "New conversation" starts a new session ID; the backend has no endpoint to clear old session memory.
- Events cannot be created or edited from the UI (the backend has no such endpoints); changes happen only via approved AI proposals.

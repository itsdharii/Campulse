# Campulse — Local Demo Setup

This repository combines the original Campulse Python backend and database/agent logic with the updated React frontend and its expanded FastAPI API.

## Requirements
- Python 3.10+
- Node.js LTS and npm
- A Groq API key (optional for dashboard/data pages; required for AI chat)

## 1. Configure the AI key
Copy `.env.example` to `.env` in this project root and put your own Groq key in `GROQ_API_KEY`.

```env
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
CREWSYNC_DB=./crewsync.db
CREWSYNC_MAX_TOOL_CALLS=8
CREWSYNC_MAX_HISTORY_MESSAGES=20
```

Never commit `.env` or share the key. `.gitignore` excludes it.

If you do not configure a key, the dashboard, clubs, events, volunteers and approvals APIs can still run; only AI chat will be unavailable.

## 2. Install backend dependencies
From this project root, open PowerShell:

```powershell
py -m pip install -r requirements.txt
```

## 3. Install frontend dependencies
```powershell
cd frontend
npm install
cd ..
```

## 4. Start both servers
From the project root:

```powershell
.\start.ps1
```

This opens the FastAPI backend and Vite frontend in separate PowerShell windows and opens the website.

Website: http://127.0.0.1:5173
Backend API docs: http://127.0.0.1:8000/docs
Backend health: http://127.0.0.1:8000/api/health

## Manual startup (if PowerShell blocks start.ps1)
Open two terminals in the project root.

Terminal 1:
```powershell
py -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2:
```powershell
cd frontend
npm run dev
```

Then open http://127.0.0.1:5173.

## Demo data
The API calls `seed.ensure_demo_data()` on startup. It creates the sample schema/data only if the database is empty; it does not wipe an existing database.

## Security note
This is a local hackathon demo. The API currently has no user authentication. Do not expose it publicly or put it on an untrusted network without adding authentication and deployment security.

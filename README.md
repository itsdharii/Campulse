# Campulse 🚀
### AI-Powered Campus Club & Event Management System

Campulse is an AI-powered campus management platform designed to simplify how colleges coordinate student clubs, events, volunteers and resources.

It uses an agentic AI architecture to analyse campus operations, identify potential conflicts, evaluate possible solutions and generate actionable recommendations. With a human-in-the-loop approval system, Campulse ensures that important operational decisions remain under human control.

Built as a hackathon prototype, Campulse demonstrates how AI agents can assist campus coordinators with everyday administrative and organisational challenges.

---

## ✨ Key Features

### 1. Campus Dashboard
- Centralised overview of campus clubs, events and volunteers.
- Displays operational statistics and club health indicators.
- Provides a quick overview of campus activities.

### 2. Club Management & Analysis
- View registered clubs and their information.
- Analyse club performance and operational health.
- Evaluate membership activity, recent events and volunteer trends.
- Identify potential collaboration opportunities between clubs.

### 3. Event Management & Clash Detection
- View scheduled campus events, venues, dates and attendance.
- Identify potential venue and volunteer scheduling conflicts.
- Inspect event staffing requirements and assigned volunteers.
- Simulate alternative event schedules to evaluate possible solutions.

### 4. Volunteer Coordination
- View volunteer profiles, skills and availability.
- Identify suitable replacement volunteers.
- Detect volunteer double-bookings.
- Assist with volunteer allocation for campus events.

### 5. Agentic AI Assistant
- Understands natural-language requests from campus coordinators.
- Uses predefined Python tools to retrieve and analyse operational data.
- Investigates scheduling conflicts and evaluates possible solutions.
- Generates recommendations supported by database information.
- Maintains conversation context through session-based memory.

### 6. Human-in-the-Loop Approval System
- Converts proposed operational changes into pending approval requests.
- Allows authorised coordinators to approve or reject proposals.
- Prevents consequential AI-generated changes from being executed without human approval.
- Maintains a decision log for accountability and traceability.

---

## 🧠 Agentic AI Architecture

Unlike a conventional chatbot that primarily generates text responses, Campulse uses a tool-using AI agent to interact with operational data and perform structured tasks.

The agent follows a goal-oriented workflow:

1. **Understand:** Interprets the user's request and identifies the objective.
2. **Reason:** Determines which tools are needed to investigate the problem.
3. **Execute:** Calls predefined Python functions through a controlled tool registry.
4. **Evaluate:** Uses tool outputs to assess possible solutions.
5. **Propose:** Generates actionable recommendations and approval requests.
6. **Human Approval:** Waits for a human decision before executing consequential changes.

### Example: Resolving an Event Clash

When a Hackathon conflicts with another event at the same venue, Campulse can:

- Identify the scheduling conflict.
- Investigate alternative event dates.
- Check volunteer availability.
- Simulate the proposed schedule.
- Identify suitable replacement volunteers.
- Generate approval proposals for the coordinator.

The AI suggests; the human decides.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | Component-based user interface |
| Programming Language | TypeScript | Type-safe frontend development |
| Styling | Tailwind CSS | UI styling and responsive layouts |
| Build Tool | Vite | Frontend development and production builds |
| Routing | React Router | Navigation between application pages |
| Charts | Recharts | Data visualisation |
| Backend | Python | Application and agent logic |
| Backend Framework | FastAPI | REST API development |
| API Server | Uvicorn | Runs the FastAPI application |
| Data Validation | Pydantic | Request validation |
| Database | SQLite | Structured campus data storage |
| AI Provider | Groq | Language model inference |
| AI Model | GPT-OSS-120B | Natural-language understanding and tool selection |
| AI Client | OpenAI Python SDK | Communication with Groq's compatible API |
| Version Control | Git & GitHub | Source code management |

---

## 🏗️ System Architecture

Campulse consists of four main layers:

**1. Frontend Layer**
- React and TypeScript application.
- Provides the dashboard, events, clubs, volunteers, AI assistant and approvals interfaces.

**2. Backend Layer**
- FastAPI handles incoming HTTP requests.
- Coordinates database operations, agent execution and approval workflows.

**3. AI Agent Layer**
- Uses GPT-OSS-120B through Groq.
- Selects and invokes predefined Python tools.
- Evaluates tool results and generates recommendations.

**4. Database Layer**
- SQLite stores clubs, events, volunteers, venues, budgets, assignments, pending actions and decision records.

### Simplified Data Flow

```text
        USER
          |
          v
   REACT FRONTEND
          |
          | HTTP / JSON
          v
     FASTAPI BACKEND
          |
     +----+----+
     |         |
     v         v
  AI AGENT   SQLITE
     |
     v
  PYTHON TOOLS
     |
     v
  TOOL RESULTS
     |
     v
  AI RESPONSE
     |
     v
  APPROVAL QUEUE
     |
     v
 HUMAN DECISION
     |
     v
 EXECUTION & LOGGING
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- Python 3.10 or later
- Node.js LTS and npm
- Git (optional, for cloning the repository)
- A Groq API key (required for AI chat functionality)

### 1. Clone the Repository

```bash
git clone https://github.com/itsdharii/Campulse.git
cd Campulse
```

Alternatively, download the repository as a ZIP and extract it.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the project root.

Add your own Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
CREWSYNC_DB=./crewsync.db
CREWSYNC_MAX_TOOL_CALLS=8
CREWSYNC_MAX_HISTORY_MESSAGES=20
```

Get an API key from [Groq Console](https://console.groq.com/).

**Important:** Never commit your `.env` file or expose your API key. The `.gitignore` file excludes it from version control.

Without an API key, the dashboard and data-related API functionality can still run, but AI chat will be unavailable.

### 3. Install Backend Dependencies

From the project root:

```bash
py -m pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Start Campulse

**Option A: Using the startup script (Windows)**

From the project root, run:

```powershell
.\start.ps1
```

This launches the backend and frontend in separate PowerShell windows and opens the website.

If PowerShell blocks script execution, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run the startup script again.

**Option B: Manual startup**

Open two separate terminals in the project root.

Terminal 1 — Backend:

```bash
py -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2 — Frontend:

```bash
cd frontend
npm run dev
```

If you change the backend port, ensure the frontend API base URL in `frontend/src/services/api.ts` points to the same port.

### 6. Access the Application

Once both servers are running:

| Service | Local URL |
|---|---|
| Campulse Website | http://127.0.0.1:5173 |
| Backend API | http://127.0.0.1:8000 |
| Interactive API Documentation | http://127.0.0.1:8000/docs |
| Backend Health Check | http://127.0.0.1:8000/api/health |

---

## 🔌 API Endpoints

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks backend availability |
| GET | `/api/clubs` | Retrieves club information |
| GET | `/api/events` | Retrieves scheduled events |
| GET | `/api/volunteers` | Retrieves volunteer information |
| GET | `/api/assignments` | Retrieves volunteer assignments |
| GET | `/api/club-health` | Retrieves club health analysis |
| GET | `/api/clashes` | Retrieves scheduling conflicts |
| GET | `/api/decisions` | Retrieves decision history |
| GET | `/api/actions` | Retrieves operational actions |
| POST | `/api/chat` | Sends a message to the AI agent |
| GET | `/api/pending` | Retrieves pending approval requests |
| POST | `/api/approve/{action_id}` | Approves a proposed action |
| POST | `/api/reject/{action_id}` | Rejects a proposed action |

Interactive documentation is available through FastAPI's Swagger UI at `/docs`.

---

## 📊 Demo Data

Campulse includes predefined demonstration data for clubs, events, venues, volunteers and other campus operations.

The API calls `seed.ensure_demo_data()` during startup. It creates the sample database schema and records only when the database is empty.

Existing database records are not automatically wiped or overwritten.

---

## 🔮 Future Improvements

Planned enhancements include:

- Dynamic creation, editing and deletion of clubs, events and volunteer records.
- User authentication and role-based access control.
- Persistent conversation memory.
- Cloud deployment and scalable database infrastructure.
- Advanced scheduling and resource optimisation.
- Integration with existing college management systems.
- More comprehensive operational analytics and reporting.

---

## 🔒 Security & Limitations

Campulse is currently a locally running hackathon prototype.

- The current API does not implement user authentication.
- The application uses a local SQLite database.
- AI conversation memory is session-based and stored in process memory.
- Dynamic data management is still under development.
- The system uses a predefined demonstration dataset.

Do not expose the backend publicly or deploy it on an untrusted network without implementing authentication, authorisation and appropriate deployment security.

---

## 👥 Project

**Campulse — AI-Powered Campus Management**

Developed as a hackathon project exploring the use of agentic AI in campus operations, coordination and decision support.

**GitHub Repository:** https://github.com/itsdharii/Campulse



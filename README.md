# Community Companion

**A Smarter Support Network for Senior Citizens**  
*Tagline: "No Senior Should Feel Alone."*

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19 + TypeScript + Vite (Senior-Accessible UI + Family Caregiver Hub)
- **Backend:** Node.js + Express + TypeScript (`backend/`)
- **LLM Engine:** Groq API (`llama-3.3-70b-versatile`) for ultra-low latency voice-to-JSON parsing
- **Database:** PostgreSQL 16 (`psql`)
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm` + `drizzle-kit`)
- **Containerization:** Docker Compose (PostgreSQL, Redis, RabbitMQ)
- **Package Manager:** `pnpm` (Workspace Monorepo)

---

## 📁 Repository Structure

```text
senior-companion/
├── package.json               # Monorepo scripts (dev, dev:backend, dev:frontend)
├── pnpm-workspace.yaml        # Workspace configuration (backend, frontend, packages/*)
├── docker-compose.yml         # PostgreSQL, Redis, RabbitMQ services
├── .env                       # Local environment variables & Groq API key
├── backend/                   # Express REST API & Groq LLM integration
│   ├── src/
│   │   ├── modules/
│   │   │   ├── health/        # Healthcheck (DB & Groq status)
│   │   │   └── reminders/     # Voice parsing, medicine schedule, caregiver invites
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/                  # React + Vite application
│   ├── src/
│   │   ├── App.tsx            # Grandparent Voice Mode & Family Caregiver Hub
│   │   ├── index.css          # High-contrast senior design system
│   │   └── main.tsx
│   └── package.json
└── packages/
    ├── db/                    # Drizzle schema & PostgreSQL migrations
    │   ├── src/schema/        # users.ts, reminders.ts, checkins.ts, helpRequests.ts
    │   ├── drizzle/           # Generated SQL migrations
    │   └── drizzle.config.ts
    └── shared/                # Shared Zod schemas (VoiceMedicationLlmOutputSchema)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [Docker Desktop](https://www.docker.com/)

### 2. Start Infrastructure Containers
Launch PostgreSQL, Redis, and RabbitMQ via Docker Compose:
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Database Migrations
Apply Drizzle schema migrations to PostgreSQL:
```bash
pnpm db:migrate
```

### 5. Start Development Servers
Run both backend and frontend concurrently:
```bash
pnpm dev
```
Or run individually:
```bash
pnpm dev:backend   # API on http://localhost:3000
pnpm dev:frontend  # React UI on http://localhost:5173
```

---

## 🎙️ Groq Voice-to-JSON Feature

When seniors speak their medication routine, the transcript is sent to Groq's `llama-3.3-70b-versatile` model with structured JSON enforcement:

- **Endpoint:** `POST /api/reminders/voice-parse`
- **Request:**
  ```json
  {
    "spokenTranscript": "Remind me to take Metformin 500mg after breakfast at 9 am and blood pressure pill at 8 pm",
    "seniorName": "Mrs. Rao"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "medicationName": "Metformin",
      "dosage": "500mg",
      "scheduleType": "daily",
      "targetTimes": ["09:00"],
      "mealRelation": "AFTER_MEAL",
      "mealName": ["breakfast"],
      "instructions": "Take with water as directed.",
      "seniorConfirmationPhrase": "Mrs. Rao, I have set a daily reminder for you to take Metformin 500mg after breakfast at 09:00. Does that sound correct?"
    }
  }
  ```

---

## 📡 API Endpoints Summary

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Register Senior, Family, Volunteer, or Coordinator
- `POST /api/auth/login` - Standard login with email/phone & password (returns JWT)
- `POST /api/auth/senior-login` - Senior 4-digit pairing code login (passwordless)
- `GET /api/auth/me` - Current user profile & role (JWT protected)

### 🤝 Volunteer Management (`/api/volunteers`)
- `GET /api/volunteers/pending` - List unverified volunteers (Coordinator only)
- `PATCH /api/volunteers/:id/verify` - Approve volunteer profile (Coordinator only)
- `POST /api/volunteers/assign` - Match verified volunteer with senior (Coordinator only)
- `POST /api/volunteers/check-ins` - Schedule call or visit (Coordinator only)
- `GET /api/volunteers/my-seniors` - View assigned seniors & addresses (Volunteer only)
- `GET /api/volunteers/my-tasks` - View scheduled calls/visits (Volunteer only)
- `PATCH /api/volunteers/check-ins/:id/complete` - Log check-in outcome, mood notes & coordinator flags

### 🚨 Emergency SOS (`/api/sos`)
- `POST /api/sos/trigger` - Senior/family triggers SOS $\rightarrow$ RabbitMQ multi-tier escalation
- `GET /api/sos/active` - List active unresolved SOS alerts
- `POST /api/sos/:id/acknowledge` - Acknowledge receipt of emergency
- `POST /api/sos/:id/resolve` - Close alert with resolution notes

### 🧪 Run Backend Automated Test Suite
```bash
pnpm --filter @companion/backend test
```

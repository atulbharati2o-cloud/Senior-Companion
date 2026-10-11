# Community Companion: Comprehensive Feature Specification

**Project:** Community Companion — A Smarter Support Network for Senior Citizens  
**Team:** Catalyst3  
**Tagline:** *"No Senior Should Feel Alone."*  
**Document Purpose:** Detailed feature breakdown covering the voice-driven medicine reminder system, family caregiver hub, volunteer check-ins, SOS safety network, and accessibility architecture.

---

## 1. Executive Summary & Core Philosophy

The **Community Companion** platform addresses the rapid rise of urban social isolation, healthcare non-adherence, and emergency vulnerability among senior citizens living alone.

Instead of treating the elderly as passive patients or expecting them to navigate complex smartphone interfaces, the app is built on three core pillars:
1. **Dignified Independence (Senior Voice-First Experience):** Seniors simply talk to the app naturally in their own language. An integrated LLM interprets natural voice instructions into structured schedules, alarms, and logs.
2. **Family Caregiver Stewardship (Remote Onboarding & Peace of Mind):** Adult children living across town or across the globe can remotely configure medications, schedule check-ins, receive adherence alerts, and stay connected without micromanaging.
3. **Community Warmth (Volunteer Safety Net):** Vetted neighborhood volunteers provide human warmth through scheduled phone calls, doorstep visits, and rapid support during non-medical escalations.

```
+-----------------------------------------------------------------------------------+
|                               SENIOR CITIZEN                                      |
|            Voice-First UI • One-Tap SOS • Spoken Reminders • Audio Companion       |
+-----------------------------------------------------------------------------------+
                                         │
                   ▲                     ▼                     ▲
                   │            [ EXPRESS + NODE.JS ]          │
                   │            [ POSTGRESQL + RABBITMQ ]      │
                   │                     ▲                     │
                   │                     │                     │
+──────────────────┴───────────────+     │     +───────────────┴────────────────────+
|         FAMILY CAREGIVERS        |     │     |        COMMUNITY VOLUNTEERS        |
|  • Remote Medication Setup       |     │     |  • Scheduled Friendly Calls        |
|  • SMS/WhatsApp Invite & Pairing |     │     |  • Doorstep Tea & Walking Visits   |
|  • Real-Time Adherence Timeline  |     │     |  • Vetted & Privacy-Masked Contact |
+──────────────────────────────────+     │     +────────────────────────────────────+
                                         ▼
                   +───────────────────────────────────────────+
                   |          COORDINATORS & NGOS              |
                   |  • Vetting & Verification Pipeline        |
                   |  • Escalation & Missed Check-in Dashboard |
                   |  • Community Circle Moderation            |
                   +───────────────────────────────────────────+
```

---

## 2. User Roles & Ecosystem Personas

| Role | Primary User | Needs & Pain Points | Primary Interface |
| :--- | :--- | :--- | :--- |
| **Senior Citizen** | Elder (65+) living alone | Low tech-literacy, visual/motor decline, memory lapses, loneliness. | Voice-controlled mobile/tablet app with jumbo buttons and audio cues. |
| **Family Caregiver** | Adult child / close relative | Worries about parent's health, lives far away, needs quick visibility and remote setup. | Caregiver mobile app / web portal with invitation links and notifications. |
| **Volunteer** | Vetted community member / student | Wants to help local seniors safely, needs clear tasks, respects privacy boundaries. | Dedicated volunteer task board with caller-ID masking and visit logging. |
| **Coordinator** | NGO staff / community leader | Needs to manage volunteer verification, monitor overdue tasks, and handle escalations. | Administrative web dashboard with live queue, audit trails, and reporting. |

---

## 3. Feature Breakdown by Module

---

### Module 1: Voice-First AI Medicine Reminder & Adherence System

#### 1.1 Conversational Spoken Medication Input
* **Natural Voice Capture:** The senior presses a large floating microphone button (or uses a hands-free wake phrase like *"Namaste Sathi"*) and speaks naturally in their everyday language (e.g., *"Remind me to take my blue BP tablet 10mg every morning after breakfast and Metformin at night after dinner"*).
* **Multilingual & Accent Support:** Automatic transcription (Whisper / Speech-to-Text) supporting English, Hindi, Hinglish, and major regional languages/dialects.
* **LLM Extraction & Normalization Pipeline:**
  1. The raw audio is transcribed to text.
  2. The text is passed to an LLM with strict JSON Schema output mode.
  3. The model extracts medication name, dosage form, time/frequency, relationship to meals, and duration.
  4. Resolves colloquial timings (e.g., *"after breakfast"* $\rightarrow$ default 09:00 AM; *"before bed"* $\rightarrow$ default 10:00 PM; customizable per senior's schedule).

```json
{
  "medication_name": "Metformin",
  "dosage": "500mg",
  "schedule_type": "daily",
  "target_times": ["09:00", "21:00"],
  "meal_relation": "AFTER_MEAL",
  "meal_name": ["breakfast", "dinner"],
  "instructions": "Take with full glass of water",
  "senior_confirmation_phrase": "I have set your Metformin 500mg reminder for 9:00 AM after breakfast and 9:00 PM after dinner. Shall I save this?"
}
```

* **Interactive Spoken Confirmation:** The app speaks back in a warm, natural synthesized voice (Text-to-Speech) summarizing the extracted schedule. The senior answers with a spoken *"Yes, save it"* or taps a large green checkmark.
* **Prescription Photo Fallback (OCR + LLM):** Senior or child can snap a photo of a doctor's prescription or pill box. The LLM extracts the medication schedule, asks for confirmation, and creates reminders automatically.

#### 1.2 Senior-Friendly Alarm & Adherence Prompting
* **Audio-First Alarm:** When a reminder triggers, the phone plays a gentle, penetrating chime followed by clear speech: *"Mrs. Rao, it is time for your morning blood pressure tablet with warm water."*
* **Full-Screen Jumbo Card:** A high-contrast display showing the medicine name, dosage, and a clear photo/color icon of the pill.
* **Three Simple Action Buttons:**
  * **"I Took It" (Green):** Instantly marks the occurrence as acknowledged in PostgreSQL.
  * **"Snooze 15 Mins" (Yellow):** Reschedules a gentle audio nudge.
  * **"Need Help" (Orange):** Alerts the family caregiver or assigned volunteer.
* **Voice-Activated Acknowledgement:** Seniors who cannot reach their phone can speak: *"I took my medicine"* or *"Remind me in 15 minutes."*

#### 1.3 Escalation & Gentle Follow-Up Logic
* **Grace Period Window:** Configurable per medicine (e.g., 30–45 minutes).
* **Step 1 (First Follow-up):** A second audio reminder sounds after the grace period.
* **Step 2 (Caregiver Nudge):** If still unacknowledged after 60 minutes, a gentle push/SMS notification is sent to the primary family caregiver: *"Reminder for Mrs. Rao's morning Metformin has not been acknowledged yet. You may want to give her a quick call."*
* **Safety Principle:** The system clearly distinguishes between an *unacknowledged app reminder* and a *confirmed medical failure* to avoid false panics.

---

### Module 2: Family Caregiver Hub & Remote Setup ("Invite Your Parents")

#### 2.1 Remote Setup & Zero-Friction Parent Pairing
* **Caregiver-Initiated Account Creation:** The adult child downloads the app or visits the web portal, selects *"I want to set up for my parent,"* and fills in basic details (parent's name, daily routine times, medical conditions, doctor's contact).
* **One-Step Invite Dispatch:**
  * **WhatsApp / SMS Invite Link:** A simple link sent directly to the parent's smartphone.
  * **4-Digit Voice OTP / QR Code:** When the parent opens the app, they simply scan a QR code displayed on the child's screen or type/speak a 4-digit numeric code.
  * **"Senior Mode" Auto-Configurator:** Once paired, the parent's app locks into an ultra-simplified interface with zero complex menus or tech jargon.

```
Child creates profile on Caregiver Hub
                ↓
Sends invite link via WhatsApp / SMS / QR
                ↓
Parent opens app & taps "Join My Family"
                ↓
Apps are paired automatically with full caregiver permissions
```

#### 2.2 Remote Medicine & Schedule Management
* **Remote Schedule Editing:** Children can add, edit, suspend, or update medication schedules, doctor appointments, and lab test dates directly from their own phone. Updates sync to the parent's phone instantly.
* **Pill Inventory & Refill Predictor:** Track strip counts. When a medication has 5 days of doses remaining, the family caregiver receives a refill reminder with an option to reorder via local pharmacy links.

#### 2.3 Live Peace-of-Mind Adherence Feed
* **Daily Activity Timeline:** A clear feed showing:
  * 08:30 AM — *Morning greeting completed.*
  * 09:05 AM — *Blood pressure medicine acknowledged.*
  * 02:15 PM — *Volunteer Ramesh completed 15-minute weekly call.*
  * 08:00 PM — *Evening walk logged.*
* **Multi-Child / Care Circle Support:** Siblings can share the caregiving load. One child is designated as *Primary Contact* (first to receive alerts), while others are *Secondary Contacts*.

---

### Module 3: Volunteer Matching & Community Check-In System

#### 3.1 Volunteer Onboarding & Vetting Pipeline
* **Identity & Background Verification:** Government ID submission, police verification check, address proof, and reference contact.
* **Orientation & Code of Conduct Checklist:** Mandatory micro-training on senior communication, respecting boundaries, spotting emergency signs, and privacy compliance.
* **Coordinator Approval Gate:** Volunteers cannot view any senior's profile until marked as `VERIFIED` by an authorized NGO coordinator.

#### 3.2 Intelligent Proximity & Interest Matching
* **Pincode & Ward Radius Matching:** Pairs seniors with volunteers living within a 2–5 km radius to allow easy physical visits when required.
* **Language & Cultural Affinity:** Matches seniors with volunteers fluent in their native mother tongue (e.g., Marathi, Tamil, Bengali, Hindi).
* **Shared Hobbies:** Matching based on interests (gardening, classical music, books, spirituality) to promote genuine friendships.

#### 3.3 Structured Check-In Workflows
* **Two Check-In Modalities:**
  1. **Virtual Companionship Call:** 15–20 minute weekly phone conversation to share stories, listen to concerns, and alleviate loneliness.
  2. **Doorstep Visit:** Physical visit for tea, a garden stroll, or assistance with small errands (dropping off mail, reading complex utility bills).
* **Privacy-Masked Calling:** In-app calling or virtual masked numbers so neither the senior's nor the volunteer's personal phone number is exposed.
* **Structured Post-Check-In Log:** After each interaction, the volunteer records a 30-second structured note:
  * *Status:* Completed / Senior Unavailable / Rescheduled
  * *Mood Indicator:* Cheerful / Neutral / Low Energy / Anxious
  * *Observations:* E.g., *"Mentioned mild knee pain, but in good spirits. Asked for help with TV remote on next visit."*
  * *Coordinator Flag:* Checkbox to notify coordinator if the senior requires assistance or seems unwell.

---

### Module 4: SOS, Emergency Escalation & Passive Well-Being Checks

#### 4.1 One-Touch Emergency SOS
* **Accessible SOS Button:** Prominent red button pinned to the top of the senior's screen, accessible from the lock screen widget or via voice (*"Help me!" / "Bachao!"*).
* **False-Trigger Safeguard:** 5-second animated hold countdown with haptic vibrations and loud countdown audio, giving the senior time to cancel accidental presses.
* **Emergency Medical Information Sheet:** Displays critical data for first responders: blood group, major allergies, pre-existing conditions, primary doctor, and ICE phone numbers.

#### 4.2 Multi-Tier Escalation Engine
```
                  [ Senior Taps SOS / Says "Help" ]
                                  │
                                  ▼
           [ Tier 1: Primary Family Member Notified ]
                  High-priority push alert + SMS + automated call
                                  │
                        (No response in 2 mins)
                                  ▼
         [ Tier 2: Secondary Family Member & Local Volunteer ]
                  Simultaneous alerts with senior's address & map
                                  │
                        (No response in 5 mins)
                                  ▼
             [ Tier 3: NGO Coordinator / Emergency Dispatch ]
                  Direct call prompt for local emergency services (112)
```

#### 4.3 Passive Well-Being & "Morning Greeting" Check
* **"Good Morning" Ritual:** Every morning at a chosen time (e.g., 08:00 AM), the app speaks: *"Good morning, Dadaji! How are you feeling today?"* with a giant smiling sun icon.
* **One-Tap Check-In:** Tapping anywhere on the screen or saying *"Good morning"* registers the daily check-in.
* **Inactivity Detection:** If the greeting is unacknowledged by 10:30 AM and no phone movement or app interactions are recorded, the system alerts the assigned volunteer or family member to initiate a routine well-being call.

---

### Module 5: Combating Urban Social Isolation & Community Circles

#### 5.1 "Chai & Chitchat" Audio Circles
* **Moderated Community Audio Rooms:** Weekly group audio sessions (similar to accessible group radio) where 5–8 seniors gather online to discuss nostalgic music, devotional songs, old radio plays, or current events.
* **Host Moderation:** Facilitated by an energetic youth volunteer or coordinator who keeps the conversation warm, inclusive, and positive.

#### 5.2 Empathetic AI Companion ("Sathi / Mitra")
* **Warm Conversational Buddy:** An empathetic, patient AI persona designed specifically for casual chitchat when human volunteers are off-duty.
* **Capabilities:**
  * Remembers previous conversations (*"How is the painting you were working on yesterday?"*).
  * Tells regional jokes, folktales, proverbs, and trivia.
  * Provides calm, soothing guided breathing exercises when the senior feels anxious or restless.
  * **Safety Guardrail:** Detects depressive keywords or distress and immediately flags the care circle.

#### 5.3 Local Neighborhood Walking Clubs & Meetups
* Organized offline park meetups where volunteers accompany seniors for safe, social evening walks.

---

### Module 6: Senior-Centric Accessibility Design System (UI/UX)

* **Visual Accessibility:**
  * Minimum touch target size: **64 × 64 pixels** with generous spacing to accommodate hand tremors and arthritis.
  * Three high-contrast themes: Sunlight Warm, High-Contrast Dark, and Soft Paper.
  * Typography: Large, high-legibility sans-serif fonts with dynamic text scaling up to 200%.
* **Auditory & Cognitive Accessibility:**
  * Every on-screen button can read its label aloud on a single tap.
  * Zero multi-level nested menus or confusing dropdowns; flat navigation with a maximum of three primary screens: **Home (Today)**, **Meds (Reminders)**, and **Friends (Calls)**.
  * Haptic confirmations with distinct vibration patterns for success, reminder, and warning.

---

### Module 7: Coordinator & Organization Operations Dashboard

* **Real-Time City/Ward Map:** Live view of registered seniors, active volunteers, scheduled visits, and pending alerts.
* **Overdue Task Management:** Automatic red flags for missed check-in calls, unanswered medicine reminders, or pending volunteer verifications.
* **Volunteer Workload Balancer:** Prevents volunteer burnout by limiting active seniors per volunteer (default maximum 3 seniors per volunteer).
* **Audit Trail & Safety Compliance:** Complete immutable log of who was called, at what time, notes recorded, and escalation responses.

---

## 4. Voice-to-JSON Technical Pipeline

```
  [ Senior Spoken Audio ]
             │
             ▼
[ Audio Pre-processing & Noise Reduction ]
             │
             ▼
[ Speech-to-Text: Whisper / Cloud STT ]
   ↳ Language & Dialect Detection (Hindi / English / Regional)
             │
             ▼
[ LLM Extraction Agent (Structured Output / Function Calling) ]
   ↳ Schema Enforcement: Medication, Dosage, Frequency, Relative Meal Timings
             │
             ▼
[ Zod Validation & Conflict Detector ]
   ↳ Validates valid times, flags unreasonable dosages, checks drug interaction warnings
             │
             ▼
[ TTS Audio Feedback & Confirmation ]
   ↳ "I set Metformin 500mg for 9 AM after breakfast. Is this correct?"
             │
             ▼
[ PostgreSQL Persistence via Drizzle ORM ]
   ↳ Writes medicine_reminders + generates daily reminder_occurrences
             │
             ▼
[ RabbitMQ Job Queue ]
   ↳ Schedules precision delayed delivery workers & SMS fallback triggers
```

---

## 5. Technology Stack: PostgreSQL, Drizzle ORM & pnpm

### 5.1 Why This Modern TypeScript Stack?

| Technology | Role | Key Advantages for Community Companion |
| :--- | :--- | :--- |
| **pnpm** | Fast, disk-efficient package manager | • Instant workspace symlinking for monorepo (`apps/api`, `apps/web`, `packages/db`, `packages/shared`).<br>• Deterministic lockfile and strict dependency isolation preventing phantom imports. |
| **PostgreSQL (`psql`)** | Primary relational database | • **Native JSONB:** Flexible storage for raw LLM parsed outputs, multi-schedule times, and dynamic audio metadata.<br>• **PostGIS / Geospatial queries:** Easy distance calculation between seniors and nearby volunteers.<br>• **ACID Transactions:** Rock-solid reliability for SOS escalations and lock contention on volunteer check-ins. |
| **Drizzle ORM** | Type-safe SQL-like ORM | • **Zero cold-start overhead:** Pure TypeScript, no heavy client engine binary.<br>• **Native SQL power:** Direct query control with full TypeScript autocomplete and type safety.<br>• **`drizzle-kit`:** Fast, transparent migrations with SQL diff inspection and automated schema evolution.<br>• **Drizzle Studio:** Built-in web UI (`pnpm db:studio`) for viewing and editing records in dev. |

### 5.2 Monorepo Structure with pnpm Workspaces

```text
senior-companion/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── apps/
│   ├── api/                    # Express + TypeScript REST API
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules: auth, reminders, volunteers, sos
│   │   │   ├── workers/        # RabbitMQ consumer workers
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/                    # Caregiver Portal & Coordinator Dashboard
│       └── package.json
└── packages/
    ├── db/                     # Drizzle schema, migrations, connection client
    │   ├── src/
    │   │   ├── schema/         # users.ts, reminders.ts, checkins.ts, helpRequests.ts
    │   │   ├── index.ts        # db instance export
    │   │   └── migrate.ts
    │   ├── drizzle/            # Auto-generated SQL migrations
    │   ├── drizzle.config.ts
    │   └── package.json
    └── shared/                 # Shared Zod schemas, TypeScript types, constants
        ├── src/
        │   ├── types.ts
        │   └── schemas/
        └── package.json
```

### 5.3 Drizzle Schema Architecture Preview (PostgreSQL)

```typescript
// packages/db/src/schema/reminders.ts
import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const mealRelationEnum = pgEnum("meal_relation", [
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "WITH_MEAL",
  "INDEPENDENT"
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "SCHEDULED",
  "ACKNOWLEDGED",
  "SNOOZED",
  "MISSED",
  "ESCALATED"
]);

// Master recurring reminder schedule
export const medicineReminders = pgTable("medicine_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  medicineName: varchar("medicine_name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  mealRelation: mealRelationEnum("meal_relation").default("INDEPENDENT"),
  targetTimes: jsonb("target_times").$type<string[]>().notNull(), // e.g. ["09:00", "21:00"]
  instructions: text("instructions"),
  rawLlmOutput: jsonb("raw_llm_output"), // Audit trail of what the LLM interpreted
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// Daily individual occurrence tracker
export const reminderOccurrences = pgTable("reminder_occurrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id").notNull().references(() => medicineReminders.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: reminderStatusEnum("status").default("SCHEDULED").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  notes: text("notes")
});
```

### 5.4 Standard pnpm Developer Workflow

```bash
# Install all dependencies across workspace
pnpm install

# Run database migration generation with drizzle-kit
pnpm --filter @companion/db db:generate

# Apply migrations to PostgreSQL
pnpm --filter @companion/db db:migrate

# Launch visual Drizzle Studio database inspector
pnpm --filter @companion/db db:studio

# Start backend API & workers in dev mode
pnpm --filter @companion/api dev
```

---

## 6. Phased Implementation Roadmap

```
PHASE 1: Core MVP & Voice Medicine Reminders (Weeks 1-4)
├── User Authentication & Role-Based Access (Senior, Caregiver, Volunteer, Coordinator)
├── Voice-to-JSON Medication Pipeline (STT + LLM Schema Extraction)
├── Caregiver Remote Onboarding & Magic Link / QR Code Pairing
├── Precision Reminder Notification Worker (RabbitMQ + Web Push / Audio)
└── Basic One-Tap SOS Alert with Family SMS / WhatsApp Notification

PHASE 2: Volunteer Management & Scheduled Check-Ins (Weeks 5-8)
├── Volunteer Verification Pipeline & Coordinator Admin Dashboard
├── Senior-Volunteer Proximity & Language Matching
├── Check-In Task Lifecycle (Scheduled, In-Progress, Completed, Missed)
├── Privacy-Masked VOIP Calling Integration
└── Daily Morning Greeting & Inactivity Well-Being Detection

PHASE 3: Community Circles & Conversational AI Companion (Weeks 9-12)
├── "Sathi" Conversational Voice Companion for Companionship & Small Talk
├── Moderated "Chai & Chitchat" Group Audio Rooms
├── Medicine Pill Refill Tracking & Pharmacy Integration
└── Comprehensive Analytics & NGO Operations Reporting
```

---

## 7. Success Metrics & KPIs

* **Adherence Rate:** $\ge 85\%$ of scheduled medication reminders acknowledged within 45 minutes.
* **Social Connection Impact:** At least 2 meaningful human interactions (volunteer call, family chat, or circle) per week per senior.
* **Escalation Speed:** $100\%$ of SOS requests acknowledged by family or emergency contacts within $\le 3$ minutes.
* **Ease of Use:** $\ge 90\%$ of senior actions completed using voice without requiring caregiver intervention.

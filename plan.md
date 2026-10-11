# Community Companion --- Implementation Plan

**Team:** Catalyst3\
**Team members:** Atul Bharati, Priyanshu Prince, Amar Barade\
**Project:** Community Companion --- A Smarter Support Network for
Senior Citizens\
**Tagline:** "No Senior Should Feel Alone."

------------------------------------------------------------------------

## 1. Purpose of This Plan

This document turns the Catalyst3 presentation into a phased
implementation roadmap. It explains what to build, why each component
exists, how the backend pieces work together, and what must be complete
before moving to the next phase.

The product coordinates support for senior citizens living alone
through:

1.  Volunteer matching and scheduled check-ins.
2.  Medicine reminders with acknowledgement tracking.
3.  Well-being checks.
4.  SOS/help requests and trusted-contact notifications.
5.  A coordinator dashboard for pending, overdue, and escalated work.

The central product loop is:

**Schedule → Notify → Track response → Follow up → Escalate when
appropriate → Record the outcome**

A missed acknowledgement is not automatically a confirmed emergency.
Routine check-ins should use gentle follow-up and configured escalation.
An explicit SOS is urgent and follows a separate, faster workflow.

## 2. Scope and Priorities

### 2.1 Must-have MVP

Implement these features first:

-   Authentication and role-based authorization.
-   Senior and volunteer profiles.
-   Trusted emergency contacts and consent settings.
-   Volunteer assignment and check-in scheduling.
-   Check-in status tracking and overdue detection.
-   Medicine reminder schedules and individual acknowledgement records.
-   Help requests/SOS with acknowledgement and resolution.
-   RabbitMQ-backed notification and follow-up workers.
-   Coordinator dashboard summary APIs.
-   Audit history, validation, rate limits, and tests.

### 2.2 Stretch goals

Only add these after the main workflow works end to end:

-   Kafka event streaming and analytics consumer.
-   Advanced volunteer matching by distance and availability.
-   SMS/WhatsApp/push provider integration.
-   Multilingual or voice reminders.
-   Caregiver analytics.
-   Multiple neighborhoods or organizations.
-   Sophisticated distributed deployment.

### 2.3 Explicit non-goals for the first version

Do not begin with AI diagnosis, wearable integrations, continuous GPS
tracking, a microservices architecture, or claims of medical emergency
detection. The application coordinates people and follow-up; it does not
replace healthcare professionals or emergency services.

## 3. Technology Choices and Responsibilities

  -----------------------------------------------------------------------
  Technology              Responsibility          Why it belongs
  ----------------------- ----------------------- -----------------------
  Node.js                 Runtime for API and     Handles I/O-heavy API
                          workers                 and messaging work

  Express                 REST API framework      Routes, middleware, and
                                                  request handling

  TypeScript              Application language    Typed contracts and
                                                  safer refactoring

  PostgreSQL                   Primary persistent      Reliable relational
                          store                   records and
                                                  transactions

  Drizzle                  Database ORM and        Typed queries and
                          migrations              schema evolution

  Redis                   Cache, rate limits,     Fast access for
                          short-lived             suitable temporary data
                          coordination state      

  RabbitMQ                Background job queue    Notification delivery,
                                                  retries, and follow-up
                                                  jobs

  Kafka                   Optional event stream   Replayable event
                                                  consumption and
                                                  analytics

  Zod                     Request validation      Validates untrusted
                                                  input at API boundaries

  JWT                     Authentication          Carries verified
                                                  identity claims

  Docker Compose          Local development       Repeatable environment
                          services                for the team

  Test runner             Unit/integration tests  Verifies business rules
                                                  and failure cases
  -----------------------------------------------------------------------

**Important:** PostgreSQL is the source of truth. Do not store the only copy
of a check-in, SOS, acknowledgement, or audit record in Redis or a
queue.

**RabbitMQ first, Kafka later:** RabbitMQ is the practical first choice
for jobs that need to be delivered and retried. Kafka is optional and
should have a distinct purpose, such as analytics or an independent
event consumer. Do not introduce Kafka just to list another technology.

## 4. High-Level Architecture

``` text
Senior / Volunteer / Family / Coordinator Client
                      |
                      v
          Express + TypeScript REST API
       Auth | Validation | RBAC | Business rules
                      |
             +--------+--------+
             |                 |
             v                 v
        PostgreSQL + Drizzle        Redis
     Source of truth       Cache / limits
             |
             | durable event/outbox (recommended)
             v
          RabbitMQ
             |
      +------+------------------+
      |                         |
      v                         v
Notification Worker       Follow-up Worker
      |                         |
      v                         v
Email/SMS/push adapter     Recheck task status
      |                    and escalation policy
      +------------+------------+
                   |
                   v
          Notification / Audit records

Optional later:
Domain events -> Kafka -> Analytics / reporting consumer
```

The API should validate and persist a state change before treating it as
accepted. A worker should always re-read the current database state
before sending a delayed notification or escalating a task.

## 5. Suggested Repository Structure

Start as a **modular monolith**: one API codebase organized by feature,
plus separate worker entry points. This avoids premature microservices
while keeping responsibilities clear.

``` text
community-companion/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Drizzle/
│   ├── schema.Drizzle
│   └── migrations/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── constants.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── validate.ts
│   │   ├── rateLimit.ts
│   │   ├── errorHandler.ts
│   │   └── requestId.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── seniors/
│   │   ├── volunteers/
│   │   ├── assignments/
│   │   ├── checkins/
│   │   ├── medicine/
│   │   ├── helpRequests/
│   │   ├── contacts/
│   │   ├── notifications/
│   │   └── dashboard/
│   ├── jobs/
│   │   ├── scheduler.ts
│   │   └── jobPublisher.ts
│   ├── queues/
│   │   ├── connection.ts
│   │   ├── topology.ts
│   │   └── publish.ts
│   ├── workers/
│   │   ├── notification.worker.ts
│   │   └── followup.worker.ts
│   ├── services/
│   │   ├── notificationProvider.ts
│   │   ├── escalationPolicy.ts
│   │   └── audit.ts
│   ├── events/
│   │   ├── eventTypes.ts
│   │   └── kafkaPublisher.ts        # add in optional phase
│   ├── lib/
│   │   ├── Drizzle.ts
│   │   └── redis.ts
│   └── utils/
│       ├── asyncHandler.ts
│       └── time.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

Each feature module can contain `routes.ts`, `controller.ts`,
`service.ts`, `repository.ts` if needed, and `schemas.ts`. Keep
controllers thin: validate input, call business logic, and return a
response. Business rules belong in services, not directly inside route
handlers.

## 6. Phase-by-Phase Implementation Roadmap

------------------------------------------------------------------------

## Phase 0 --- Team Alignment and Project Setup

### Goal

Agree on the exact MVP, responsibilities, API conventions, and how each
teammate will run the project.

### Tasks

1.  Create the Git repository and protect the main branch.
2.  Agree on TypeScript, npm scripts, naming conventions, and code
    formatting.
3.  Create a task board with phases and acceptance criteria.
4.  Decide the first notification channel. For a demo, an in-app
    notification or logged notification adapter is acceptable; external
    SMS can come later.
5.  Agree that Kafka is optional until the main workflow is stable.
6.  Define the senior, volunteer, family-contact, and coordinator
    permissions.

### Deliverables

-   Repository created.
-   `README.md` with setup instructions.
-   `.env.example` without secrets.
-   Initial task board and feature owners.

### Done when

All team members can clone the repository, install dependencies, and
understand the MVP scope.

------------------------------------------------------------------------

## Phase 1 --- Application Foundation and Local Infrastructure

### Goal

Create a stable backend skeleton that every later feature can use.

### Tasks

1.  Initialize Node.js and TypeScript.
2.  Configure Express, `tsconfig`, development scripts, and a production
    build.
3.  Add environment validation so the application fails clearly when
    required settings are missing.
4.  Add a health endpoint such as `GET /health`.
5.  Configure structured logs, request IDs, a central error handler, and
    a consistent JSON response style.
6.  Add Docker Compose services for PostgreSQL, Redis, and RabbitMQ.
7.  Create a Drizzle client module and Redis connection module.
8.  Keep credentials in environment variables; commit only
    `.env.example`.

### Suggested scripts

-   `dev`: run API in development.
-   `build`: compile TypeScript.
-   `start`: run compiled API.
-   `db:migrate`: apply development migrations.
-   `db:generate`: generate Drizzle client.
-   `test`: run tests.
-   `worker:notifications`: run notification worker.
-   `worker:followup`: run follow-up worker.

### Important concepts

-   `app.ts` configures Express; `server.ts` starts listening.
-   Workers should be separate processes from the HTTP server.
-   A health endpoint should not reveal secrets or internal connection
    strings.
-   Gracefully close database, Redis, and queue connections on shutdown.

### Done when

The API starts, `/health` responds, PostgreSQL migrations run, and
Redis/RabbitMQ connections can be verified locally.

------------------------------------------------------------------------

## Phase 2 --- Database Design and Migrations

### Goal

Model the core domain before implementing complicated endpoints.

### Suggested entities

#### User

Common identity and login data: - `id` - `name` - `email` (unique) -
`passwordHash` - `role` (`SENIOR`, `VOLUNTEER`, `FAMILY`, `COORDINATOR`,
`ADMIN`) - `status` - `createdAt`, `updatedAt`

Use an enum or constrained value for roles. Do not trust a role supplied
in a public registration request; users must not be able to register
themselves as coordinators or admins.

#### SeniorProfile

-   `id`
-   `userId` (unique one-to-one with User)
-   `area` or approximate locality
-   `preferredLanguage`
-   `checkInPreference`
-   `timezone`
-   consent/settings fields

#### VolunteerProfile

-   `id`
-   `userId` (unique one-to-one with User)
-   `verificationStatus`
-   `availability` or a simplified availability representation
-   `serviceArea`
-   optional capacity field

Only verified volunteers should be eligible for assignments.

#### VolunteerAssignment

-   `id`
-   `seniorId`
-   `volunteerId`
-   `assignedBy`
-   `status`
-   `startsAt`, `endsAt`
-   timestamps

Keep assignment history instead of overwriting all past assignments.

#### CheckIn

-   `id`
-   `seniorId`
-   `volunteerId` or `assignmentId`
-   `scheduledAt`
-   `dueAt`
-   `status`
-   `completedAt`
-   `outcome`
-   timestamps

A check-in is a specific task, not just a relationship between a senior
and a volunteer.

#### MedicineReminder

Stores the recurring schedule: - `id` - `seniorId` - label/instructions
approved by the senior or caregiver - schedule configuration -
timezone - `active` - timestamps

#### ReminderOccurrence / MedicineAcknowledgement

Create a record for each scheduled occurrence: - `id` - `reminderId` -
`scheduledAt` - `status` - `acknowledgedAt` - optional acknowledgement
type

This separates a recurring schedule from a particular day's reminder and
response. Avoid treating an unacknowledged reminder as proof that
medicine was not taken.

#### EmergencyContact

-   `id`
-   `seniorId`
-   name and contact method
-   priority/order
-   relationship
-   verification status if applicable
-   consent/notification preferences
-   active flag

#### HelpRequest

-   `id`
-   `seniorId`
-   category (`SOS`, `CALL_REQUEST`, `OTHER`)
-   description (optional and carefully protected)
-   status
-   `createdAt`
-   `acknowledgedAt`
-   `resolvedAt`
-   assigned coordinator/contact where applicable

#### Notification

-   `id`
-   recipient
-   event type
-   channel
-   delivery status
-   attempt count
-   provider reference where applicable
-   created/sent/failed timestamps

#### AuditEvent

-   `id`
-   actor user ID if known
-   action
-   entity type and ID
-   timestamp
-   safe metadata

Do not store passwords, authentication tokens, or unnecessary sensitive
details in audit metadata.

### Database rules

-   Use foreign keys and appropriate indexes.
-   Index common filters such as check-in status/deadline, senior ID,
    volunteer ID, and help-request status/creation time.
-   Use unique constraints for email and any idempotency key scope.
-   Store timestamps consistently in UTC; retain the senior's IANA
    timezone for scheduling.
-   Use migrations rather than manually changing shared databases.
-   Use transactions when several related records must be created or
    updated together.

### Deliverables

Drizzle schema, initial migration, seed script for fictional demo users,
and a documented relationship diagram.

### Done when

A clean database can be created from migrations and seeded with
fictional seniors, verified volunteers, contacts, and tasks.

------------------------------------------------------------------------

## Phase 3 --- Authentication, Authorization, and User Profiles

### Goal

Ensure each user can access only the features and records they are
permitted to use.

### Tasks

1.  Implement registration and login.
2.  Hash passwords with a modern password-hashing algorithm; never store
    plaintext passwords.
3.  Issue and verify access tokens. If refresh tokens are implemented,
    store and revoke them safely.
4.  Add `authenticate` middleware to validate the token and attach the
    authenticated user to the request.
5.  Add role authorization middleware.
6.  Implement profile read/update endpoints.
7.  Ensure public registration cannot create privileged roles.
8.  Validate request bodies and path parameters with Zod.
9.  Add login rate limits and safe error messages.

### Suggested endpoints

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `POST /api/auth/logout` if session/refresh-token support exists
-   `GET /api/users/me`
-   `PATCH /api/users/me`
-   `GET /api/seniors/:id` for authorized viewers only

### Authorization rule

Role checks alone are not enough. A volunteer may have the `VOLUNTEER`
role but should only view seniors assigned to them. A family contact
should only view information explicitly shared with them.

### Done when

Tests prove that unauthenticated requests are rejected, a senior cannot
call coordinator-only operations, and one volunteer cannot access
another volunteer's assigned senior without permission.

------------------------------------------------------------------------

## Phase 4 --- Senior Profiles, Contacts, Consent, and Volunteer Verification

### Goal

Build the trusted relationships required before check-ins or escalation
can operate safely.

### Tasks

1.  Create and update senior profiles.
2.  Allow a senior or authorized coordinator to add trusted contacts
    according to the chosen consent process.
3.  Store contact priority and preferred notification channel.
4.  Add a verification workflow for volunteers.
5.  Prevent unverified volunteers from receiving assignments.
6.  Implement coordinator-only actions for reviewing volunteer
    verification.
7.  Add audit events for contact changes, consent changes, and
    verification decisions.
8.  Ensure private contact details are not exposed in broad list
    endpoints.

### Suggested endpoints

-   `POST /api/seniors/:id/contacts`
-   `GET /api/seniors/:id/contacts`
-   `PATCH /api/contacts/:contactId`
-   `DELETE /api/contacts/:contactId` or deactivate the record
-   `PATCH /api/volunteers/:id/verification` (coordinator/admin only)

### Done when

A senior's contact list is available only to authorized users, and
unverified volunteers cannot be assigned.

------------------------------------------------------------------------

## Phase 5 --- Volunteer Assignment and Check-In Management

### Goal

Deliver the central community-coordination workflow.

### Tasks

1.  Let coordinators view eligible volunteers and their service
    areas/availability.
2.  Create an assignment linking a senior to a verified volunteer.
3.  Create check-in tasks with scheduled and due timestamps.
4.  Let volunteers view only their own assigned tasks.
5.  Implement allowed state transitions, for example:
    -   `SCHEDULED` → `IN_PROGRESS`
    -   `SCHEDULED` or `IN_PROGRESS` → `COMPLETED`
    -   `SCHEDULED` or `IN_PROGRESS` → `CANCELLED`
    -   overdue detection can transition an eligible task to `OVERDUE`
    -   unresolved overdue tasks may become `ESCALATED`
6.  Store completion time and a simple outcome such as `CONTACTED`,
    `VISIT_COMPLETED`, `CALL_REQUESTED`, or `NO_ANSWER`.
7.  Reject invalid transitions and repeated completion attempts safely.
8.  Add pagination and filters for date, status, senior, and assigned
    volunteer.

### Suggested endpoints

-   `POST /api/assignments`
-   `GET /api/assignments`
-   `POST /api/check-ins`
-   `GET /api/check-ins/my-tasks`
-   `GET /api/check-ins/:id`
-   `PATCH /api/check-ins/:id/status`
-   `GET /api/seniors/:id/check-ins` (authorized access)

### Important rule

A task completion and its audit record should be committed consistently.
Repeated requests must not create duplicate completion records or
trigger multiple escalations.

### Done when

A coordinator can assign a verified volunteer, the volunteer can
complete the task, and the coordinator dashboard reflects the updated
status.

------------------------------------------------------------------------

## Phase 6 --- Medicine Reminder Scheduling and Acknowledgements

### Goal

Create reliable reminders while distinguishing delivery from
acknowledgement.

### Tasks

1.  Create, edit, pause, and deactivate recurring reminder schedules.
2.  Validate schedule inputs and timezone.
3.  Generate an individual occurrence for each due reminder.
4.  Enqueue a delivery job for the occurrence.
5.  Record whether delivery was attempted, delivered by the provider,
    failed, or acknowledged by the user, depending on what the channel
    can confirm.
6.  Allow the senior to acknowledge, report a missed reminder, or
    request a call if configured.
7.  Use idempotent occurrence creation so scheduler restarts do not
    create duplicate occurrences.
8.  Avoid logging sensitive medication details unnecessarily.

### Suggested endpoints

-   `POST /api/medicine-reminders`
-   `GET /api/medicine-reminders`
-   `PATCH /api/medicine-reminders/:id`
-   `POST /api/reminder-occurrences/:id/acknowledgements`
-   `GET /api/medicine-reminders/:id/occurrences`

### Scheduling strategy

For an MVP, run a scheduler at a short interval to find due reminders,
create missing occurrences, and enqueue them. Use a unique database
constraint based on the reminder and scheduled occurrence to prevent
duplicates. For a larger deployment, adopt a dedicated scheduling
service or durable delayed-job design.

Do not assume that a queue message scheduled for the future will execute
at the exact minute. Always check the due time and latest state before
processing.

### Done when

A test reminder produces one occurrence, one delivery attempt/job, and a
recorded acknowledgement without duplicate occurrences after a scheduler
restart.

------------------------------------------------------------------------

## Phase 7 --- RabbitMQ and Notification Workers

### Goal

Separate slow or unreliable notification delivery from the HTTP request
path.

### Tasks

1.  Configure RabbitMQ exchanges, queues, routing keys, durable queues,
    and persistent messages where appropriate.
2.  Define versioned message payloads with event/job ID, entity ID,
    recipient, type, and timestamps. Avoid placing unnecessary sensitive
    details in messages.
3.  Create a notification worker.
4.  Create a follow-up worker.
5.  Add bounded retries with backoff.
6.  Route repeatedly failing jobs to a dead-letter queue.
7.  Make consumers idempotent.
8.  Acknowledge a message only after its work has been handled safely.
9.  Record delivery attempts and final status in PostgreSQL.
10. Add logs and metrics for queue depth, failed jobs, and processing
    latency.

### Example job types

-   `SEND_MEDICINE_REMINDER`
-   `SEND_CHECKIN_REMINDER`
-   `FOLLOW_UP_CHECKIN`
-   `ESCALATE_OVERDUE_CHECKIN`
-   `NOTIFY_HELP_REQUEST`
-   `NOTIFY_TRUSTED_CONTACT`

### Notification provider abstraction

Create an interface such as `NotificationProvider.send(...)`. Start with
a development provider that writes a safe message to logs or an in-app
notification table. Add email/SMS/push implementations behind the same
interface later.

Never claim an SMS or push message was delivered merely because the
queue accepted the job. Track the actual provider result separately.

### The database-to-queue reliability gap

A database update can succeed while publishing to RabbitMQ fails, or a
worker can crash after sending a notification but before acknowledging
the message. For stronger reliability, use a **transactional
outbox**: 1. Save the business state change and an outbox event in the
same PostgreSQL transaction. 2. A publisher process reads unpublished outbox
rows. 3. It publishes to RabbitMQ and marks them published. 4. Consumers
deduplicate using a stable event/job ID.

For a time-limited demo, you can begin with direct publishing but
document this limitation and implement the outbox if time allows.

### Done when

The API remains responsive even if a notification provider is slow;
failed jobs retry; permanently failing jobs become inspectable in a
dead-letter queue; duplicate jobs do not cause duplicate business
actions.

------------------------------------------------------------------------

## Phase 8 --- Missed Check-In Detection and Escalation

### Goal

Implement the key reliability workflow shown in the presentation.

### Flow

1.  A check-in reaches its deadline.
2.  A scheduler/worker finds tasks that are still eligible for
    follow-up.
3.  It re-reads the task from PostgreSQL.
4.  If already completed or cancelled, it exits without sending an
    alert.
5.  If still incomplete, it marks the task overdue and schedules a
    gentle follow-up.
6.  After the configured grace period, it rechecks the task.
7.  If unresolved, it notifies the designated coordinator/contact
    according to the escalation policy.
8.  It records every attempted and completed escalation in the audit
    history.

### Separate routine follow-up from SOS

-   **Routine check-in missed:** reminder, grace period, then
    coordinator/trusted-contact escalation.
-   **Explicit SOS:** immediate urgent notification to configured
    contacts, with acknowledgement tracking and appropriate instructions
    for professional emergency services.

Do not make an SOS wait behind a routine reminder queue if that would
delay urgent handling. Use a dedicated priority path or separate
queue/consumer capacity for urgent work.

### Reliability requirements

-   Re-read state immediately before sending.
-   Use a stable idempotency key for each escalation stage.
-   Store the escalation stage and timestamp in durable storage.
-   Ensure two workers cannot both execute the same stage; use a
    conditional update or transaction/locking strategy.
-   Record acknowledgement and resolution.
-   Retry transient failures without sending unlimited duplicate
    notifications.
-   Provide an operational way to inspect failed jobs.

### Done when

The team can simulate a missed check-in, see a follow-up, advance the
clock or use short demo deadlines, and see a single escalation.
Completing the task before escalation must suppress the pending alert.

------------------------------------------------------------------------

## Phase 9 --- SOS / Help Requests

### Goal

Allow seniors to request help clearly and let authorized people
acknowledge and resolve it.

### Tasks

1.  Create a help request with category and timestamp.
2.  Authenticate the requester and verify the senior identity.
3.  Apply per-user and per-endpoint rate limits to reduce accidental or
    malicious request floods.
4.  Persist the request before enqueueing notifications.
5.  Notify the primary contact/coordinator immediately through the
    urgent path.
6.  Track acknowledgement, assignment, and resolution.
7.  If the first contact does not acknowledge, notify the next eligible
    contact according to the configured policy.
8.  Prevent unauthorized users from closing a request.
9.  Keep a full audit trail.

### Suggested endpoints

-   `POST /api/help-requests`
-   `GET /api/help-requests/:id`
-   `GET /api/help-requests/active` (authorized coordinator)
-   `PATCH /api/help-requests/:id/acknowledge`
-   `PATCH /api/help-requests/:id/resolve`

### Done when

A senior can create an SOS, an authorized contact receives the alert,
the contact acknowledges it, and the dashboard reflects the
active/resolved state.

------------------------------------------------------------------------

## Phase 10 --- Daily Well-Being Checks

### Goal

Offer a simple opt-in daily prompt that lets seniors report how they are
doing.

### Response choices

-   "I'm okay."
-   "I'd like someone to call me."
-   "I need help."

### Tasks

1.  Allow the senior to configure the preferred time and frequency.
2.  Create daily check occurrences.
3.  Send the prompt using the notification system.
4.  Record the response.
5.  If there is no response, follow the senior's consent-based
    configured follow-up policy.
6.  Treat "I need help" as a help request with an appropriate priority.
7.  Avoid inferring health status from non-response alone.

### Done when

A daily prompt can be scheduled, answered, and reflected on the
dashboard; an unanswered prompt follows the configured policy.

------------------------------------------------------------------------

## Phase 11 --- Redis Usage

### Goal

Use Redis only where fast, short-lived state provides a real benefit.

### Appropriate initial use cases

1.  **Rate limiting:** limit login attempts and repeated SOS
    submissions. Choose limits carefully so a legitimate emergency
    request is not silently blocked.
2.  **Dashboard caching:** cache aggregate counts with a short TTL if
    dashboard reads become frequent.
3.  **Short-lived deduplication:** use stable keys with expirations for
    specific transient operations where appropriate.
4.  **Temporary coordination:** use Redis primitives only when their
    consistency properties suit the operation.

### Rules

-   PostgreSQL remains authoritative for check-in status, SOS requests,
    consent, contacts, and audit events.
-   A cache miss must be recoverable from PostgreSQL.
-   Invalidate or update cache entries after relevant writes; do not
    rely only on a long TTL for correctness.
-   Do not use Redis alone to guarantee that an emergency alert was
    delivered.
-   Do not add distributed locks unless the team can explain why a
    database constraint/transaction is insufficient.

### Done when

At least one Redis use case is measured or demonstrated, and correctness
does not depend on a cache entry being present.

------------------------------------------------------------------------

## Phase 12 --- Coordinator Dashboard APIs

### Goal

Make the system's state visible and actionable.

### Suggested dashboard cards

-   Check-ins scheduled today.
-   Check-ins completed.
-   Overdue check-ins.
-   Active help requests.
-   Pending medicine acknowledgements, if consent and product policy
    allow this view.
-   Notification failures needing review.

### Suggested endpoints

-   `GET /api/dashboard/summary`
-   `GET /api/dashboard/check-ins?status=OVERDUE`
-   `GET /api/dashboard/help-requests?status=ACTIVE`
-   `GET /api/dashboard/notification-failures`

### Rules

-   Enforce coordinator scope: a coordinator should only see their
    assigned community/organization if multi-community support exists.
-   Use pagination for lists.
-   Use aggregate queries and appropriate indexes.
-   Add Redis caching only after the query works correctly.
-   Show meaningful empty/loading/error states in the client.
-   Do not expose private medicine details on a general community
    dashboard.

### Done when

The demo dashboard reflects changes immediately or within a clearly
documented cache TTL and gives coordinators enough information to act on
unresolved work.

------------------------------------------------------------------------

## Phase 13 --- Optional Kafka Event Streaming

### Goal

Demonstrate event-driven analytics without making core safety workflows
dependent on Kafka.

### Events to consider

-   `CheckInScheduled`
-   `CheckInCompleted`
-   `CheckInOverdue`
-   `ReminderAcknowledged`
-   `HelpRequestCreated`
-   `HelpRequestResolved`
-   `NotificationFailed`

### Implementation

1.  Define a versioned event envelope with event ID, event type, schema
    version, entity ID, and timestamp.
2.  Publish events through a controlled publisher.
3.  Build one consumer for a distinct purpose, such as daily aggregate
    counts or activity analytics.
4.  Track consumer offsets and handle replay safely.
5.  Make analytics processing idempotent.
6.  Avoid putting unnecessary personally identifiable or medical
    information in event payloads.
7.  Decide how database changes reliably produce events. The
    transactional outbox can feed both RabbitMQ and Kafka.

### Do not

-   Use Kafka and RabbitMQ to perform identical work without a reason.
-   Make the SOS path depend on the analytics consumer.
-   Claim exactly-once business processing simply because Kafka is used.
-   Add Kafka if the team cannot finish and test the core product first.

### Done when

A domain event is published and consumed by a separate analytics
component, and replaying an event does not double-count the result.

------------------------------------------------------------------------

## Phase 14 --- Security, Privacy, and Accessibility

### Security checklist

-   Passwords are hashed.
-   Tokens and secrets are never committed to Git.
-   Authentication and role checks are applied consistently.
-   Record-level authorization checks ownership, assignment, consent,
    and scope.
-   Inputs are validated.
-   Login and sensitive endpoints have rate limits.
-   Error responses do not reveal secrets or internal stack traces.
-   Sensitive contact details and reminder information are returned only
    when needed.
-   Logs and audit events avoid tokens, passwords, and unnecessary
    personal data.
-   Production deployment uses HTTPS and appropriately secured
    database/broker connections.

### Privacy checklist

-   Obtain and record appropriate consent for sharing information.
-   Make contact sharing revocable.
-   Collect only data needed for the service.
-   Restrict access to volunteers assigned to a senior.
-   Define a retention/deletion approach for personal data.
-   Use fictional data in demos and screenshots.

### Accessibility checklist

-   Simple wording.
-   Large, readable text and clear actions.
-   Minimal steps to request help.
-   Clear confirmation when a request has been sent or acknowledged.
-   Support for preferred language as the application evolves.

### Done when

The team has tested common authorization failures and can explain what
information each role is allowed to see.

------------------------------------------------------------------------

## Phase 15 --- Testing and Failure Simulation

### Unit tests

Test pure business rules: - Allowed and disallowed check-in state
transitions. - Escalation eligibility. - Reminder occurrence
generation. - Contact priority selection. - Idempotency key
generation. - Permission decisions.

### Integration tests

Test against a test database and controlled queue/provider: - Register
and log in. - Create a senior profile. - Assign a verified volunteer. -
Schedule and complete a check-in. - Create and acknowledge a medicine
occurrence. - Create an SOS and acknowledge it. - Publish and consume a
queue job. - Record failed notification attempts.

### End-to-end scenarios

1.  **Happy path:** check-in scheduled, completed, dashboard updated.
2.  **Missed check-in:** due time passes, follow-up occurs, escalation
    happens once.
3.  **Late completion:** task completes before escalation; pending
    escalation is suppressed.
4.  **Duplicate message:** the same job is processed twice; no duplicate
    business action.
5.  **Provider failure:** notification fails, retries, then succeeds or
    reaches the dead-letter queue.
6.  **Worker restart:** unprocessed jobs are recovered according to
    queue configuration.
7.  **Unauthorized access:** another volunteer cannot access a senior's
    data.
8.  **SOS acknowledgement:** active request becomes
    acknowledged/resolved and stops further escalation.

Use a controllable clock or short test deadlines. Do not wait real hours
to test escalation logic.

### Done when

The important workflows and failure cases pass repeatedly, and the team
can demonstrate at least one failure recovery scenario.

------------------------------------------------------------------------

## Phase 16 --- Deployment and Demo Readiness

### Tasks

1.  Provide reliable setup instructions and an `.env.example`.
2.  Use migrations and seed scripts; never depend on manual database
    edits.
3.  Ensure API and workers can be started separately.
4.  Add health checks and useful logs.
5.  Use fictional demo accounts for every role.
6.  Prepare a short, repeatable demo script.
7.  Document which features are implemented, simulated, or planned.
8.  Test from a clean checkout on another team member's machine.

### Suggested demo sequence

1.  Log in as coordinator.
2.  Show a senior and a verified volunteer.
3.  Assign the volunteer and create a check-in.
4.  Complete one check-in and show the dashboard update.
5.  Create a medicine reminder and acknowledge an occurrence.
6.  Simulate a missed check-in using a short deadline.
7.  Show RabbitMQ-driven follow-up and escalation.
8.  Trigger an SOS and acknowledge it as a trusted contact/coordinator.
9.  Show the audit history and, if implemented, the Kafka analytics
    consumer.

### Done when

The full demo can be run reliably in the time available, without
manually editing production-like records during the presentation.

------------------------------------------------------------------------

## 7. API Contract Summary

The following endpoints are a starting point; finalize request/response
schemas as the team implements each phase.

### Authentication and profiles

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `GET /api/users/me`
-   `PATCH /api/users/me`

### Senior and volunteer administration

-   `GET /api/seniors`
-   `GET /api/seniors/:id`
-   `POST /api/seniors/:id/contacts`
-   `GET /api/seniors/:id/contacts`
-   `PATCH /api/volunteers/:id/verification`

### Assignments and check-ins

-   `POST /api/assignments`
-   `GET /api/assignments`
-   `POST /api/check-ins`
-   `GET /api/check-ins/my-tasks`
-   `GET /api/check-ins/:id`
-   `PATCH /api/check-ins/:id/status`

### Medicine reminders

-   `POST /api/medicine-reminders`
-   `GET /api/medicine-reminders`
-   `PATCH /api/medicine-reminders/:id`
-   `POST /api/reminder-occurrences/:id/acknowledgements`

### Help requests

-   `POST /api/help-requests`
-   `GET /api/help-requests/active`
-   `PATCH /api/help-requests/:id/acknowledge`
-   `PATCH /api/help-requests/:id/resolve`

### Dashboard and operations

-   `GET /api/dashboard/summary`
-   `GET /api/dashboard/check-ins`
-   `GET /api/dashboard/help-requests`
-   `GET /api/health`
-   `GET /api/ready` (if readiness checks are implemented)

For list endpoints, support pagination and filters. Do not return all
records by default.

## 8. Core Domain Events and Queue Messages

Prefer explicit event/job names rather than opaque generic messages.

  ----------------------------------------------------------------------------
  Name                         Purpose                 Typical consumer
  ---------------------------- ----------------------- -----------------------
  `SEND_MEDICINE_REMINDER`     Deliver a due reminder  Notification worker

  `SEND_CHECKIN_REMINDER`      Remind a                Notification worker
                               volunteer/senior about  
                               a task                  

  `FOLLOW_UP_CHECKIN`          Recheck a missed        Follow-up worker
                               check-in after a grace  
                               period                  

  `ESCALATE_OVERDUE_CHECKIN`   Notify an authorized    Escalation worker
                               person after policy     
                               conditions are met      

  `NOTIFY_HELP_REQUEST`        Send an urgent          Urgent notification
                               help-request alert      worker

  `CheckInCompleted`           Record a completed      Audit/event consumer
                               check-in for downstream 
                               consumers               

  `ReminderAcknowledged`       Record an               Analytics consumer
                               acknowledgement event   

  `HelpRequestResolved`        Record resolution for   Analytics consumer
                               analytics/history       
  ----------------------------------------------------------------------------

Separate a **job command** ("perform this work") from a **domain event**
("this fact happened"). RabbitMQ can carry commands/jobs; Kafka can
carry domain events if the team adopts it. A transactional outbox can
reliably publish committed domain changes.

## 9. Cross-Cutting Engineering Rules

### Idempotency

A repeated request or message should not repeat an irreversible effect.
Use a stable request/job/event ID, unique constraints where appropriate,
and conditional state transitions. For externally delivered
notifications, exactly-once delivery is generally not guaranteed; design
for duplicate attempts and record provider results.

### Transactions

Use database transactions for related state changes, such as changing a
help request status and recording an audit event. Keep network calls
outside long-running database transactions.

### Race conditions

A volunteer might complete a check-in while a follow-up worker is trying
to escalate it. The worker must recheck state and use a conditional
update/transaction so only one valid transition wins.

### Retries

Retry transient failures with a bounded policy and backoff. Validation
errors and permanent recipient errors usually should not retry
indefinitely. Dead-letter queues should be monitored and recoverable.

### Observability

Log request IDs, job IDs, entity IDs, outcome, and duration. Avoid
logging secrets or sensitive details. Monitor API errors, queue depth,
job failures, delivery failures, and escalation latency.

### Time

Use UTC timestamps in persistence, store the relevant timezone for local
schedules, and test daylight-saving changes where relevant. Keep time
calculations in a shared module.

## 10. Team Work Division

A possible division for three people; adjust based on strengths and
availability.

### Atul Bharati --- Backend architecture and reliability

-   Repository foundation and API conventions.
-   Authentication middleware and authorization review.
-   RabbitMQ topology and worker reliability.
-   Check-in escalation and idempotency.
-   Integration review and end-to-end testing.

### Priyanshu Prince --- Core domain and database

-   Drizzle schema and migrations.
-   Senior/volunteer profiles and assignments.
-   Check-in APIs and status transitions.
-   Medicine reminder data model and acknowledgement APIs.
-   Database constraints and integration tests.

### Amar Barade --- Help workflows and demo integration

-   Emergency contacts and consent workflows.
-   SOS/help-request APIs and escalation contact selection.
-   Notification provider adapter and notification history.
-   Dashboard APIs and demo data.
-   README, demo script, and user-facing integration support.

**Shared ownership:** all three members should review security-sensitive
changes, test the complete flow, and understand the architecture. Avoid
isolated modules that only one person can run or explain.

## 11. Suggested Milestones

These milestones are based on dependency order rather than a fixed
calendar. Adapt them to the actual hackathon deadline.

  -----------------------------------------------------------------------
  Milestone                           Exit criteria
  ----------------------------------- -----------------------------------
  M1 --- Skeleton                     API, configuration, database,
                                      Redis, RabbitMQ run locally

  M2 --- Secure core                  Authentication, roles, profiles,
                                      consent, volunteer verification

  M3 --- Main workflow                Assignments and check-ins work end
                                      to end

  M4 --- Reminder workflow            Reminder occurrences and
                                      acknowledgements work

  M5 --- Reliable jobs                RabbitMQ workers, retries, and
                                      delivery status work

  M6 --- Escalation and SOS           Missed check-in and urgent help
                                      flows work

  M7 --- Dashboard                    Coordinator can see and act on
                                      unresolved tasks

  M8 --- Hardening                    Authorization, idempotency, failure
                                      tests, audit logs

  M9 --- Stretch                      Kafka analytics or external
                                      messaging integration
  -----------------------------------------------------------------------

Do not move to a stretch milestone while a previous milestone's critical
acceptance criteria are failing.

## 12. Acceptance Criteria for the Complete MVP

The MVP is ready to present when all of these are true:

-   [ ] A user can register and log in securely.
-   [ ] Roles and record-level permissions are enforced.
-   [ ] A coordinator can verify a volunteer and assign a senior.
-   [ ] A volunteer can view and complete assigned check-ins.
-   [ ] Check-in states and timestamps are persisted.
-   [ ] A medicine schedule creates individual occurrences.
-   [ ] Acknowledgements are recorded without duplicate occurrences.
-   [ ] An SOS/help request is persisted and sent to the configured
    notification path.
-   [ ] An authorized contact can acknowledge and resolve a help
    request.
-   [ ] A missed check-in triggers follow-up and, if still unresolved,
    one escalation.
-   [ ] Completing a task before escalation suppresses the stale alert.
-   [ ] RabbitMQ jobs retry transient failures and expose persistent
    failures.
-   [ ] Redis is used for a defined purpose without becoming the only
    source of truth.
-   [ ] The dashboard reports current and authorized state.
-   [ ] Important actions are auditable.
-   [ ] Core authorization and failure scenarios are tested.
-   [ ] The application can be started from documented instructions.
-   [ ] The team can explain which components are implemented and which
    are optional.

## 13. Final Implementation Strategy

Build in this order:

**Secure foundation → PostgreSQL domain models → check-ins → medicine
reminders → RabbitMQ workers → escalation → SOS → dashboard → hardening
→ optional Kafka.**

The strongest demonstration is a real workflow in which a scheduled
check-in is completed normally, a second check-in is missed and
escalated exactly once, and an SOS is acknowledged and resolved with a
complete audit trail.

The project succeeds when the software reliably coordinates human
care---not when it contains the largest number of technologies.

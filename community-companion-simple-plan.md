# Community Companion --- Simple Phase-Wise Implementation Plan

**Team:** Catalyst3\
**Team members:** Atul Bharati, Priyanshu Prince, Amar Barade\
**Project:** Community Companion --- A Smarter Support Network for
Senior Citizens\
**Tagline:** No Senior Should Feel Alone.

------------------------------------------------------------------------

## 1. What Are We Building?

We are building a platform that helps senior citizens living alone stay
connected to people who can support them.

The platform connects four groups:

1.  **Senior citizens:** receive reminders, get volunteer check-ins, and
    request help.
2.  **Volunteers:** call or visit assigned seniors and record the
    result.
3.  **Family / trusted contacts:** receive updates or alerts when the
    senior has allowed this.
4.  **Coordinators:** assign volunteers and keep track of tasks that
    need attention.

The main idea is:

**Schedule something → notify the right person → record the response →
follow up if there is no response → escalate if needed.**

This is a coordination platform, not a medical diagnosis system. A
missing response does not automatically mean there is an emergency.

------------------------------------------------------------------------

## 2. First Understand the Three Main Workflows

### Workflow A --- Volunteer check-in

Example: Mrs. Rao has a volunteer call scheduled for Monday at 6 PM.

``` text
Coordinator assigns a volunteer
          ↓
A check-in is scheduled for Mrs. Rao
          ↓
Volunteer sees the task
          ↓
Volunteer calls or visits Mrs. Rao
          ↓
Volunteer records the result
          ↓
Task becomes COMPLETED
```

If the volunteer does not complete the task by the deadline:

``` text
Check-in deadline passes
          ↓
System checks whether it is already completed
          ↓
If incomplete, send a follow-up reminder
          ↓
Wait for a configured grace period
          ↓
Check the status again
          ↓
Still unresolved? Notify the coordinator / trusted contact
```

This is the normal check-in workflow. It is not automatically an
emergency.

### Workflow B --- Medicine reminder

Example: Mrs. Rao wants a reminder at 9 AM every day.

``` text
Senior or authorized caregiver creates a reminder
          ↓
System creates today's reminder occurrence
          ↓
Reminder becomes due at 9 AM
          ↓
Notification worker sends the reminder
          ↓
Senior acknowledges it, if they choose
          ↓
System records the acknowledgement
```

If there is no acknowledgement, the system may send a follow-up or
notify an authorized caregiver according to the configured settings.
**No acknowledgement does not prove that the medicine was not taken.**

### Workflow C --- SOS / Request for Help

**What does SOS mean in this project?**

SOS is a button or simple action the senior can use when they actively
need help. For example:

-   "I have fallen and need assistance."
-   "I feel unwell and want someone to contact me."
-   "I need someone to call me urgently."

The senior is explicitly asking for help. This is different from the
system noticing that a routine check-in was missed.

Example:

``` text
Senior taps "Request Help"
          ↓
Backend creates a HelpRequest in PostgreSQL
          ↓
System identifies the senior's configured trusted contacts
          ↓
Urgent notification job is queued
          ↓
Notification worker contacts the designated people
          ↓
A contact acknowledges: "I have seen this request"
          ↓
Contact/coordinator follows up with the senior
          ↓
Request is marked RESOLVED when appropriate
```

If the first contact does not acknowledge within the configured time:

``` text
No acknowledgement from first contact
          ↓
System notifies the next eligible contact or coordinator
          ↓
System records the escalation
```

For a real life-threatening emergency, the app should direct the senior
to the appropriate local emergency service. The app and volunteers must
not be presented as replacements for professional emergency response.

**Important terms:**

-   **Help request created:** the senior has asked for help.
-   **Notification sent:** the system attempted to contact someone.
-   **Acknowledged:** a contact has confirmed that they saw the request.
-   **Resolved:** the situation has been handled or the request has been
    closed by an authorized person.

Acknowledging a request does not necessarily mean the problem has
already been solved.

------------------------------------------------------------------------

## 3. Technology Stack --- What Each Part Does

  -----------------------------------------------------------------------
  Technology                          Simple responsibility
  ----------------------------------- -----------------------------------
  Node.js                             Runs our backend code

  Express                             Provides REST API endpoints

  TypeScript                          Makes backend code easier to
                                      validate and maintain

  PostgreSQL (psql)                   Permanently stores users,
                                      assignments, check-ins, reminders,
                                      help requests, and history

  Drizzle ORM                         Type-safe TypeScript ORM to define
                                      schema and query PostgreSQL

  Redis                               Speeds up selected reads and helps
                                      with rate limiting or short-lived
                                      state

  RabbitMQ                            Holds background jobs such as
                                      sending notifications and
                                      performing follow-ups

  Background workers                  Read jobs from RabbitMQ and perform
                                      the work

  Kafka (optional)                    Streams events for analytics or a
                                      separate consumer after the main
                                      product works

  Docker Compose                      Starts local services consistently
  -----------------------------------------------------------------------

**Do not try to implement every technology immediately.** Start with the
API and PostgreSQL. Add RabbitMQ when the basic workflows work. Add Redis for
a specific need. Kafka is a stretch goal.

PostgreSQL is the source of truth. Redis or a queue must never be the only
place where an SOS request or check-in is stored.

------------------------------------------------------------------------

## 4. High-Level Architecture

``` text
Senior / Volunteer / Family / Coordinator
                    |
                    v
          Express + TypeScript API
                    |
             +------+------+
             |             |
             v             v
          PostgreSQL           Redis
       Permanent data   Cache / limits
             |
             v
          RabbitMQ
             |
        +----+-----+
        |          |
        v          v
 Notification   Follow-up /
   Worker       Escalation Worker
        |          |
        v          v
 Notification   Recheck latest
   Provider     task status
```

Kafka can be added later to consume selected events for analytics. It is
not needed for the first working version.

------------------------------------------------------------------------

## 5. Phase-Wise Implementation

Each phase has four things: - **Goal:** why we are doing it. -
**Implement:** what to build. - **Workflow:** how the feature works. -
**Done when:** what must work before moving forward.

------------------------------------------------------------------------

## Phase 0 --- Finalize the MVP

### Goal

Agree on the first version so we do not build too many things at once.

### Implement

Decide to build these first: 1. Login and user roles. 2. Senior profiles
and trusted contacts. 3. Volunteer assignment and check-ins. 4. Medicine
reminders and acknowledgements. 5. SOS/help requests. 6. Background
notifications and follow-up. 7. A simple coordinator dashboard.

### Workflow

``` text
Choose MVP features
      ↓
Agree on user roles
      ↓
Agree on task statuses and API names
      ↓
Split work among team members
```

### Done when

Everyone understands the features and the team agrees which features are
must-have and which are optional.

------------------------------------------------------------------------

## Phase 1 --- Project Setup

### Goal

Create the basic backend project.

### Implement

-   Node.js + Express + TypeScript (managed via pnpm workspaces).
-   Separate `app.ts` (Express configuration) and `server.ts` (starts
    the server).
-   Environment variables and `.env.example`.
-   Zod request validation.
-   Central error handling and basic logging.
-   PostgreSQL connection pool and Drizzle ORM setup.
-   A simple health endpoint.

### Workflow

``` text
Start backend
    ↓
Connect to PostgreSQL
    ↓
Call GET /health
    ↓
Receive a successful response
```

### Done when

The server starts, TypeScript compiles, and the health endpoint works.

------------------------------------------------------------------------

## Phase 2 --- Database Models

### Goal

Decide what information the application must remember.

### Implement

Start with these tables/models:

-   `User`: login identity and role.
-   `SeniorProfile`: senior-specific information and preferences.
-   `VolunteerProfile`: availability and verification status.
-   `EmergencyContact`: trusted people and contact priority.
-   `VolunteerAssignment`: which volunteer is assigned to which senior.
-   `CheckIn`: each scheduled call or visit.
-   `MedicineReminder`: recurring reminder schedule.
-   `ReminderOccurrence`: one particular reminder instance.
-   `HelpRequest`: a request for assistance.
-   `Notification`: delivery attempts and results.
-   `AuditEvent`: important actions and status changes.

### Workflow

``` text
Define Drizzle schema in TypeScript
        ↓
Generate migration via drizzle-kit
        ↓
Run migration on PostgreSQL
        ↓
Seed fictional test users
        ↓
Check that relationships work
```

### Done when

The database can be recreated from migrations and contains sample users
for testing.

------------------------------------------------------------------------

## Phase 3 --- Login, Roles, and Permissions

### Goal

Ensure people can only use the parts of the app they are allowed to use.

### Implement

-   Register and login.
-   Hash passwords; never store plaintext passwords.
-   JWT authentication middleware.
-   Role checks for senior, volunteer, family contact, coordinator, and
    admin.
-   Profile endpoints.
-   Request validation.

### Workflow

``` text
User logs in
    ↓
Backend verifies credentials
    ↓
Backend returns an access token
    ↓
Client sends token with protected requests
    ↓
Backend verifies identity and permissions
```

### Important example

A volunteer should only see seniors assigned to them. A family contact
should only see information the senior has authorized them to access.

### Done when

Unauthenticated requests are rejected, and users cannot access another
user's private records by guessing an ID.

------------------------------------------------------------------------

## Phase 4 --- Senior Profiles, Contacts, and Volunteer Verification

### Goal

Create the trusted relationships used by later features.

### Implement

-   Create/update senior profiles.
-   Add, update, or deactivate trusted contacts.
-   Store contact priority (first contact, second contact, etc.).
-   Let a coordinator mark volunteers as verified.
-   Prevent unverified volunteers from being assigned.
-   Record consent and important changes.

### Workflow

``` text
Senior profile created
        ↓
Trusted contacts added with appropriate consent
        ↓
Volunteer registers
        ↓
Coordinator verifies volunteer
        ↓
Verified volunteer becomes eligible for assignment
```

### Done when

A senior has authorized contacts and only verified volunteers can be
assigned.

------------------------------------------------------------------------

## Phase 5 --- Volunteer Assignment and Check-Ins

### Goal

Make scheduled calls and visits manageable.

### Implement

-   Coordinator assigns a verified volunteer to a senior.
-   Create check-ins with scheduled time and deadline.
-   Volunteer sees their assigned tasks.
-   Volunteer starts or completes a check-in.
-   Record the result, such as `CONTACTED`, `VISIT_COMPLETED`, or
    `NO_ANSWER`.
-   Show completed and pending check-ins.

Suggested check-in states: - `SCHEDULED` - `IN_PROGRESS` - `COMPLETED` -
`OVERDUE` - `ESCALATED` - `CANCELLED`

### Workflow

``` text
Coordinator creates assignment
          ↓
Coordinator schedules check-in
          ↓
Volunteer sees task
          ↓
Volunteer calls/visits senior
          ↓
Volunteer records outcome
          ↓
Check-in is completed
```

### Done when

A coordinator can assign a volunteer and the volunteer can complete a
task, with the updated status saved in PostgreSQL.

------------------------------------------------------------------------

## Phase 6 --- Medicine Reminders

### Goal

Schedule reminders and record responses.

### Implement

-   Create/edit/pause a recurring reminder.
-   Store the senior's timezone.
-   Create a separate occurrence for each scheduled reminder.
-   Send a reminder when it becomes due.
-   Record acknowledgement separately from delivery status.
-   Avoid creating duplicate occurrences if the scheduler runs more than
    once.

### Workflow

``` text
Create daily 9 AM reminder
          ↓
Scheduler creates today's occurrence
          ↓
Occurrence becomes due
          ↓
Notification job is queued
          ↓
Worker sends reminder
          ↓
Senior acknowledges (optional)
          ↓
Acknowledgement is stored
```

### Done when

A reminder can be created, one occurrence is generated, a notification
job is processed, and an acknowledgement can be recorded.

------------------------------------------------------------------------

## Phase 7 --- RabbitMQ and Notification Worker

### Goal

Send notifications in the background so API requests do not need to wait
for notification delivery.

### Implement

-   RabbitMQ connection, exchange, and queue.
-   A notification worker.
-   A provider interface for notifications.
-   Initially use an in-app notification or development/logging
    provider.
-   Record notification attempts and outcomes.
-   Add bounded retries and a dead-letter queue for jobs that repeatedly
    fail.

### Workflow

``` text
API saves reminder/help request in PostgreSQL
          ↓
Notification job is published
          ↓
RabbitMQ holds the job
          ↓
Worker reads the job
          ↓
Worker sends notification
          ↓
Worker records success/failure
```

### Important distinction

A job being accepted by RabbitMQ does not mean the notification reached
the recipient. Track the provider's result separately.

### Done when

The API can enqueue a job and a separate worker processes it. A failed
notification can be retried without repeating the underlying business
action.

------------------------------------------------------------------------

## Phase 8 --- Missed Check-In Follow-Up and Escalation

### Goal

Make sure missed routine check-ins do not silently disappear.

### Implement

-   Detect check-ins whose deadline has passed.
-   Recheck the latest status in PostgreSQL.
-   Send a gentle follow-up if still incomplete.
-   Wait a configured grace period.
-   Recheck again.
-   Notify a coordinator or trusted contact if still unresolved.
-   Record each escalation stage and attempt.

### Workflow

``` text
Check-in deadline passes
          ↓
Is it already completed/cancelled?
     +----+----+
     |         |
    Yes        No
     |         |
   Stop     Send follow-up
               ↓
        Wait grace period
               ↓
        Check status again
               ↓
      Still unresolved?
               ↓
      Notify coordinator/contact
               ↓
        Record escalation
```

### Done when

A short demo deadline can trigger follow-up and then one escalation. If
the volunteer completes the check-in before escalation, the pending
alert is cancelled/suppressed.

**This is a routine follow-up workflow, not the SOS workflow.**

------------------------------------------------------------------------

## Phase 9 --- SOS / Request for Help

### Goal

Let a senior actively ask for help and make sure the request reaches an
appropriate person.

### What SOS means

SOS is an explicit request initiated by the senior. It is not inferred
just because they missed a reminder.

Examples: - "I need someone to call me urgently." - "I need assistance
at home." - "I feel unwell and want my trusted contact notified."

For a real life-threatening emergency, the interface must direct the
person to the appropriate local emergency service. The platform is not a
replacement for emergency responders.

### Implement

-   A `HelpRequest` record in PostgreSQL.
-   Request categories, such as `SOS`, `CALL_REQUEST`, or `OTHER`.
-   A way to notify the designated contact/coordinator.
-   An acknowledgement action for the recipient.
-   A resolution action for an authorized person.
-   Escalation to the next eligible contact if the first contact does
    not acknowledge.
-   Rate limiting and an audit history.

Suggested statuses: - `OPEN`: request created and awaiting attention. -
`ACKNOWLEDGED`: an authorized recipient has confirmed they saw it. -
`IN_PROGRESS`: someone is following up. - `RESOLVED`: the request has
been handled. - `CANCELLED`: request was cancelled according to the
product's policy.

### Workflow

``` text
Senior presses "Request Help"
          ↓
API validates request and saves it in PostgreSQL
          ↓
Urgent notification job is queued
          ↓
Worker notifies designated contact/coordinator
          ↓
Recipient acknowledges the request
          ↓
Recipient follows up with the senior
          ↓
Authorized person marks it resolved
```

If no one acknowledges:

``` text
No acknowledgement within configured time
          ↓
Notify next eligible contact/coordinator
          ↓
Record escalation and notification result
```

### What is the difference between acknowledgement and resolution?

-   **Acknowledged:** "I have seen the request and will respond."
-   **Resolved:** "The issue has been handled or the request has been
    closed appropriately."

One does not automatically mean the other.

### Done when

A senior can create a request, a designated contact can acknowledge it,
and an authorized person can resolve it. If no one acknowledges within
the test window, the next contact is notified once.

------------------------------------------------------------------------

## Phase 10 --- Well-Being Check

### Goal

Allow a senior to respond to a simple daily question.

### Implement

A prompt such as: "Are you doing okay today?"

Possible answers: - "I'm okay." - "I'd like someone to call me." - "I
need help."

### Workflow

``` text
Well-being prompt scheduled
          ↓
Prompt sent to senior
          ↓
Senior selects a response
          ↓
Response stored
          ↓
If help is requested, create a HelpRequest
If no response, follow the configured follow-up policy
```

### Done when

A response is stored and the dashboard shows whether the senior
responded or requested a call/help.

------------------------------------------------------------------------

## Phase 11 --- Redis

### Goal

Use Redis for a specific performance or coordination need.

### Implement first

-   Rate limiting for login and repeated requests.
-   Optionally cache dashboard summary counts with a short TTL.

### Workflow: dashboard cache

``` text
Coordinator opens dashboard
          ↓
Check Redis cache
     +----+----+
     |         |
    Hit       Miss
     |         |
Return data   Query PostgreSQL
               ↓
          Cache summary
               ↓
          Return data
```

### Rules

PostgreSQL remains the source of truth. A missing or unavailable Redis cache
must not erase or lose an SOS request or check-in.

### Done when

At least one Redis use case works, and the API can recover from a cache
miss.

------------------------------------------------------------------------

## Phase 12 --- Coordinator Dashboard

### Goal

Give coordinators a simple overview of work that needs attention.

### Implement

Dashboard cards/lists for: - Check-ins scheduled today. - Completed
check-ins. - Overdue check-ins. - Active help requests. - Pending
reminder acknowledgements, if permitted. - Failed notifications
requiring attention.

### Workflow

``` text
Coordinator opens dashboard
          ↓
Frontend requests summary API
          ↓
Backend queries authorized data
          ↓
Dashboard displays counts and task lists
          ↓
Coordinator opens an unresolved task
          ↓
Coordinator follows up or assigns it
```

### Done when

Dashboard counts update when a check-in is completed or a help request
is acknowledged/resolved.

------------------------------------------------------------------------

## Phase 13 --- Audit History and Reliability

### Goal

Make important actions traceable and prevent duplicate or stale alerts.

### Implement

-   Audit events for check-in completion, contact changes, SOS creation,
    acknowledgement, resolution, and escalation.
-   Stable job/event IDs.
-   Idempotent workers.
-   Conditional updates/transactions for state transitions.
-   Retries with limits and a dead-letter queue.
-   Recheck the database state immediately before sending a delayed
    alert.

### Example problem

A follow-up job is waiting in RabbitMQ. Meanwhile, the volunteer
completes the check-in. When the worker eventually receives the job, it
must check PostgreSQL and stop instead of sending a stale escalation.

### Done when

Duplicate jobs do not create duplicate escalations, and completed tasks
do not receive stale alerts.

------------------------------------------------------------------------

## Phase 14 --- Optional Kafka

### Goal

Add event streaming only after the main workflows work.

### Possible events

-   `CheckInCompleted`
-   `CheckInOverdue`
-   `ReminderAcknowledged`
-   `HelpRequestCreated`
-   `HelpRequestResolved`
-   `NotificationFailed`

### Workflow

``` text
A business event is recorded
          ↓
Event is published to Kafka
          ↓
Analytics consumer reads the event
          ↓
Consumer updates aggregate counts
          ↓
Coordinator can view trends
```

Kafka is for a separate event-streaming/analytics use case. RabbitMQ
remains the initial mechanism for notification jobs and follow-up tasks.

### Done when

One event can be consumed by a separate analytics process without
duplicating counts when it is replayed.

**Skip this phase if time is short.**

------------------------------------------------------------------------

## Phase 15 --- Testing

### Goal

Prove that the workflows work, including failure cases.

### Test these scenarios

1.  A volunteer completes a scheduled check-in.
2.  A check-in is missed and a follow-up is sent.
3.  The task is completed before escalation and the stale alert is
    suppressed.
4.  A medicine reminder is created and acknowledged.
5.  A senior creates an SOS/help request and a contact acknowledges it.
6.  A request remains unacknowledged and the next eligible contact is
    notified.
7.  A duplicate queue job is processed without duplicate escalation.
8.  A notification provider fails and the worker retries.
9.  An unauthorized volunteer attempts to view another senior's details.
10. Redis is unavailable and permanent records remain safe.

### Done when

The team can run the main happy paths and at least two failure scenarios
reliably.

------------------------------------------------------------------------

## Phase 16 --- Demo and Final Integration

### Goal

Prepare a repeatable hackathon demonstration.

### Demo workflow

``` text
1. Coordinator logs in
          ↓
2. Shows a senior and verified volunteer
          ↓
3. Assigns volunteer and schedules check-in
          ↓
4. Volunteer completes one check-in
          ↓
5. Create and acknowledge a medicine reminder
          ↓
6. Simulate another missed check-in
          ↓
7. Show RabbitMQ follow-up/escalation
          ↓
8. Senior creates a HelpRequest/SOS
          ↓
9. Contact acknowledges and resolves it
          ↓
10. Show dashboard and audit history
```

Use short demo deadlines and a development notification provider if real
SMS/push integration is not ready. Clearly label simulated
notifications.

### Done when

The whole flow works from a clean setup and all team members can explain
it.

------------------------------------------------------------------------

## 6. Suggested API Endpoints

These are starting points; implement them as the relevant phase is
reached.

### Authentication

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `GET /api/users/me`

### Profiles and contacts

-   `GET /api/seniors/me`
-   `POST /api/seniors/:id/contacts`
-   `GET /api/seniors/:id/contacts`

### Assignments and check-ins

-   `POST /api/assignments`
-   `POST /api/check-ins`
-   `GET /api/check-ins/my-tasks`
-   `PATCH /api/check-ins/:id/status`

### Medicine reminders

-   `POST /api/medicine-reminders`
-   `GET /api/medicine-reminders`
-   `POST /api/reminder-occurrences/:id/acknowledgements`

### SOS / help requests

-   `POST /api/help-requests`
-   `GET /api/help-requests/active`
-   `PATCH /api/help-requests/:id/acknowledge`
-   `PATCH /api/help-requests/:id/resolve`

### Dashboard

-   `GET /api/dashboard/summary`
-   `GET /api/dashboard/check-ins`
-   `GET /api/dashboard/help-requests`

------------------------------------------------------------------------

## 7. Suggested Team Division

Adjust this to the team's strengths, but keep shared code reviews and
integration.

### Atul Bharati --- Backend foundation and reliability

-   Project setup and API conventions.
-   Authentication/authorization review.
-   RabbitMQ setup and workers.
-   Check-in follow-up/escalation.
-   Integration and reliability tests.

### Priyanshu Prince --- Database and check-ins

-   Drizzle schema and migrations.
-   Senior/volunteer profiles.
-   Assignments and check-in APIs.
-   Medicine reminder models and acknowledgement APIs.
-   Database constraints and tests.

### Amar Barade --- Help requests and integration

-   Emergency contacts and consent.
-   SOS/help-request APIs.
-   Notification provider adapter and notification history.
-   Dashboard APIs and demo integration.
-   Demo script and documentation.

All three members should understand the SOS workflow, the main database
models, and the end-to-end demo.

------------------------------------------------------------------------

## 8. What to Build First if Time Is Limited

### First priority

1.  Project setup.
2.  PostgreSQL schema.
3.  Login and roles.
4.  Senior/volunteer profiles.
5.  Volunteer assignment and check-ins.

### Second priority

6.  Medicine reminders.
7.  RabbitMQ notification worker.
8.  Missed check-in follow-up.
9.  SOS/help requests and acknowledgement.

### Third priority

10. Dashboard.
11. Redis rate limiting/cache.
12. Audit logs and failure tests.

### Stretch goals

13. Kafka analytics.
14. Real SMS/push provider.
15. Advanced matching and multilingual/voice reminders.

------------------------------------------------------------------------

## 9. Final Definition of Done

The MVP is ready when:

-   [ ] Users can log in and role permissions work.
-   [ ] A coordinator can assign a verified volunteer.
-   [ ] A volunteer can complete a check-in.
-   [ ] Missed check-ins trigger follow-up and controlled escalation.
-   [ ] Medicine reminders create occurrences and store
    acknowledgements.
-   [ ] A senior can create a HelpRequest/SOS.
-   [ ] A designated contact can acknowledge and resolve the request.
-   [ ] Notification attempts and failures are recorded.
-   [ ] Duplicate jobs do not create duplicate escalations.
-   [ ] The dashboard displays current task states.
-   [ ] Private data is protected by authorization and consent.
-   [ ] The main workflows and failure cases are tested.
-   [ ] The project starts from documented instructions.
-   [ ] The team can explain the purpose of every implemented
    technology.

## 10. The Main Idea to Remember

The application is not just a reminder sender.

It manages a loop:

**Create a task or request → store it → notify the right person → record
the response → follow up if needed → escalate when appropriate → record
the outcome.**

For a routine missed check-in, follow up gently first. For an explicit
SOS, notify the designated people urgently. In both cases, store the
request/status in PostgreSQL, use background jobs for notification work, and
recheck the latest state before sending delayed alerts.

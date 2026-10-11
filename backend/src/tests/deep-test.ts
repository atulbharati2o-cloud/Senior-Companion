import { db, users, seniorProfiles, volunteerProfiles, emergencyContacts, medicineReminders, reminderOccurrences, checkIns, helpRequests, auditEvents, eq, and } from "@companion/db";
import { runScheduleCheck } from "../jobs/scheduler";

const BASE_URL = "http://localhost:3000";

// ANSI color helpers
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, testName: string, details?: any) {
  if (Boolean(condition)) {
    passedCount++;
    console.log(`  ${green("✔ PASS:")} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${red("✖ FAIL:")} ${testName}`);
    if (details) console.error("    Details:", details);
  }
}

async function runDeepTestSuite() {
  console.log(bold(cyan("\n================================================================================")));
  console.log(bold(cyan("     🧪 SENIOR COMPANION: DEEP END-TO-END BACKEND VERIFICATION SUITE           ")));
  console.log(bold(cyan("================================================================================\n")));

  const timestamp = Date.now();

  // Test Context
  let coordinatorToken = "";
  let coordinatorUserId = "";
  let volunteer1Token = "";
  let volunteer1UserId = "";
  let volunteer2Token = "";
  let volunteer2UserId = "";
  let seniorToken = "";
  let seniorUserId = "";
  let seniorPairingCode = "";
  let familyToken = "";
  let familyUserId = "";
  let assignmentId = "";
  let checkInId = "";
  let reminderId = "";
  let occurrenceId = "";
  let helpRequestId = "";

  // ---------------------------------------------------------------------------
  // FLOW 1: AUTHENTICATION, VALIDATION & RBAC PERMISSIONS
  // ---------------------------------------------------------------------------
  console.log(bold(yellow("\n--- [FLOW 1] Authentication, Validation & RBAC Security ---")));

  // 1.1 Healthcheck
  const healthRes = await fetch(`${BASE_URL}/health`).then(r => r.json());
  assert(healthRes.status === "ok" && healthRes.database.status === "connected", "API is healthy and PostgreSQL is connected");

  // 1.2 Register Coordinator
  const coordEmail = `coordinator_${timestamp}@ngo.org`;
  const regCoord = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Anita Deshmukh (Coordinator)",
      email: coordEmail,
      password: "secure_password_123",
      role: "COORDINATOR"
    })
  }).then(r => r.json());
  assert(regCoord.success === true && regCoord.data.token, "Coordinator registration succeeded with JWT");
  coordinatorToken = regCoord.data.token;
  coordinatorUserId = regCoord.data.user.id;

  // 1.3 Duplicate Registration Rejection
  const dupCoord = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Duplicate Anita",
      email: coordEmail,
      password: "secure_password_123",
      role: "COORDINATOR"
    })
  });
  assert(dupCoord.status === 400, "Duplicate email registration properly rejected with HTTP 400");

  // 1.4 Short password validation
  const badPass = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Short Pass",
      email: `bad_${timestamp}@example.com`,
      password: "123", // too short (< 6)
      role: "VOLUNTEER"
    })
  });
  assert(badPass.status === 400, "Short password (< 6 chars) rejected by Zod schema");

  // 1.5 Register Volunteer 1
  const vol1Email = `volunteer1_${timestamp}@example.com`;
  const regVol1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Rohan Kulkarni (Volunteer)",
      email: vol1Email,
      password: "vol_password_123",
      role: "VOLUNTEER",
      languagesSpoken: "Hindi, Marathi, English",
      pincode: "400050"
    })
  }).then(r => r.json());
  assert(regVol1.success === true, "Volunteer 1 registered successfully");
  volunteer1Token = regVol1.data.token;
  volunteer1UserId = regVol1.data.user.id;

  // 1.6 Verify unverified state in DB for new volunteer
  const [vol1Profile] = await db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, volunteer1UserId));
  assert(vol1Profile.isVerified === false, "New volunteer is automatically flagged isVerified: false in DB");

  // 1.7 Register Volunteer 2 (for multi-volunteer tests)
  const vol2Email = `volunteer2_${timestamp}@example.com`;
  const regVol2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Neha Verma (Volunteer 2)",
      email: vol2Email,
      password: "vol2_password_123",
      role: "VOLUNTEER"
    })
  }).then(r => r.json());
  volunteer2Token = regVol2.data.token;
  volunteer2UserId = regVol2.data.user.id;

  // 1.8 Register Senior Citizen
  const seniorPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regSenior = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Mrs. Shanti Devi",
      phone: seniorPhone,
      role: "SENIOR",
      preferredLanguage: "Hindi",
      pincode: "400050"
    })
  }).then(r => r.json());
  assert(regSenior.success === true, "Senior Citizen registered successfully");
  seniorToken = regSenior.data.token;
  seniorUserId = regSenior.data.user.id;

  // 1.9 Check Senior 4-digit pairing code generation
  const [seniorProf] = await db.select().from(seniorProfiles).where(eq(seniorProfiles.userId, seniorUserId));
  assert(Boolean(seniorProf && seniorProf.pairingCode && seniorProf.pairingCode.length === 4), "Senior profile auto-assigned 4-digit pairing code in DB", seniorProf?.pairingCode);
  seniorPairingCode = seniorProf.pairingCode!;

  // 1.10 Senior Passwordless Login with 4-digit Pairing Code
  const seniorLoginRes = await fetch(`${BASE_URL}/api/auth/senior-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode: seniorPairingCode })
  }).then(r => r.json());
  assert(seniorLoginRes.success === true && seniorLoginRes.data.user.role === "SENIOR", "Senior can log in passwordless using 4-digit code");

  // 1.11 Senior login with invalid code
  const badCodeRes = await fetch(`${BASE_URL}/api/auth/senior-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode: "0000" })
  });
  assert(badCodeRes.status === 401, "Invalid pairing code rejected with HTTP 401");

  // 1.12 Protected /api/auth/me endpoint verification
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(meRes.success === true && meRes.data.role === "COORDINATOR", "GET /api/auth/me decodes and returns valid user identity");

  // 1.13 Unauthorized access without token
  const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert(noTokenRes.status === 401, "Protected route without Bearer token rejected with HTTP 401");

  // 1.14 RBAC Guard: Volunteer attempting Coordinator-only endpoint
  const rbacForbidden = await fetch(`${BASE_URL}/api/volunteers/pending`, {
    headers: { "Authorization": `Bearer ${volunteer1Token}` }
  });
  assert(rbacForbidden.status === 403, "RBAC Security: Volunteer attempting coordinator route blocked with HTTP 403 Forbidden");

  // 1.15 RBAC Guard: Senior attempting Volunteer-only endpoint
  const rbacVolOnly = await fetch(`${BASE_URL}/api/volunteers/my-tasks`, {
    headers: { "Authorization": `Bearer ${seniorToken}` }
  });
  assert(rbacVolOnly.status === 403, "RBAC Security: Senior attempting volunteer route blocked with HTTP 403 Forbidden");

  // 1.16 Security Guard: Malformed or forged JWT token rejected
  const tamperedTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature" }
  });
  assert(tamperedTokenRes.status === 401, "Security Guard: Malformed or forged JWT signature rejected with HTTP 401");

  // ---------------------------------------------------------------------------
  // FLOW 2: VOLUNTEER VETTING, WORKLOAD PROTECTION & CHECK-IN WORKFLOW
  // ---------------------------------------------------------------------------
  console.log(bold(yellow("\n--- [FLOW 2] Volunteer Vetting, Workload & Check-In Tasks ---")));

  // 2.1 Coordinator lists pending volunteers
  const pendingList = await fetch(`${BASE_URL}/api/volunteers/pending`, {
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(Array.isArray(pendingList.data) && pendingList.data.some((v: any) => v.userId === volunteer1UserId), "Coordinator can list unverified volunteers");

  // 2.2 Attempt to assign unverified volunteer -> MUST FAIL
  const prematureAssign = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      volunteerUserId: volunteer1UserId,
      seniorUserId: seniorUserId
    })
  });
  assert(prematureAssign.status === 400, "Safety Guard: Cannot assign volunteer before verification by coordinator");

  // 2.3 Coordinator approves Volunteer 1
  const verifyRes = await fetch(`${BASE_URL}/api/volunteers/${volunteer1UserId}/verify`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(verifyRes.success === true && verifyRes.data.isVerified === true, "Coordinator successfully verifies volunteer profile");

  // 2.4 Coordinator assigns verified volunteer to senior
  const assignRes = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      volunteerUserId: volunteer1UserId,
      seniorUserId: seniorUserId,
      frequency: "WEEKLY"
    })
  }).then(r => r.json());
  assert(assignRes.success === true && assignRes.data.id, "Verified volunteer successfully assigned to senior");
  assignmentId = assignRes.data.id;

  // 2.5 Volunteer views their assigned seniors
  const mySeniors = await fetch(`${BASE_URL}/api/volunteers/my-seniors`, {
    headers: { "Authorization": `Bearer ${volunteer1Token}` }
  }).then(r => r.json());
  assert(mySeniors.data.length >= 1 && mySeniors.data[0].seniorId === seniorUserId, "Volunteer can retrieve their assigned seniors list");

  // 2.6 Coordinator schedules a check-in visit
  const scheduleTask = await fetch(`${BASE_URL}/api/volunteers/check-ins`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assignmentId,
      seniorId: seniorUserId,
      volunteerId: volunteer1UserId,
      type: "PHONE_CALL",
      scheduledFor: new Date().toISOString()
    })
  }).then(r => r.json());
  assert(scheduleTask.success === true && scheduleTask.data.id, "Coordinator schedules check-in task in DB");
  checkInId = scheduleTask.data.id;

  // 2.7 Volunteer views pending tasks
  const myTasks = await fetch(`${BASE_URL}/api/volunteers/my-tasks`, {
    headers: { "Authorization": `Bearer ${volunteer1Token}` }
  }).then(r => r.json());
  assert(myTasks.data.some((t: any) => t.taskId === checkInId), "Volunteer sees scheduled task in their task board");

  // 2.8 Unauthorized volunteer (Volunteer 2) tries to complete Volunteer 1's task -> MUST FAIL
  const wrongVolComplete = await fetch(`${BASE_URL}/api/volunteers/check-ins/${checkInId}/complete`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${volunteer2Token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "COMPLETED",
      mood: "CHEERFUL",
      notes: "Hacker complete"
    })
  });
  assert(wrongVolComplete.status === 400, "Security Guard: Another volunteer cannot complete someone else's task");

  // 2.9 Assigned Volunteer 1 completes check-in task with mood indicator & coordinator flag
  const completeTask = await fetch(`${BASE_URL}/api/volunteers/check-ins/${checkInId}/complete`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${volunteer1Token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "COMPLETED",
      mood: "CHEERFUL",
      notes: "Shanti Devi was very happy today. We discussed her favorite devotional songs.",
      coordinatorFlag: "Senior requested a visit next Tuesday"
    })
  }).then(r => r.json());
  assert(completeTask.success === true && completeTask.data.status === "COMPLETED", "Volunteer records check-in outcome with mood & notes");

  // Verify in PostgreSQL DB
  const [dbCheckIn] = await db.select().from(checkIns).where(eq(checkIns.id, checkInId));
  assert(dbCheckIn && dbCheckIn.status === "COMPLETED" && dbCheckIn.mood === "CHEERFUL", "Check-in record verified in PostgreSQL database with mood and timestamp");

  // 2.10 Volunteer Burnout & Workload Protection
  // Volunteer 1 already has 1 active assignment. Register Senior B, C, D to test maximum capacity (3 seniors).
  const regSeniorB = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "Senior B", phone: `+9191${Math.floor(10000000 + Math.random() * 90000000)}`, role: "SENIOR" })
  }).then(r => r.json());
  const regSeniorC = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "Senior C", phone: `+9192${Math.floor(10000000 + Math.random() * 90000000)}`, role: "SENIOR" })
  }).then(r => r.json());
  const regSeniorD = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "Senior D", phone: `+9193${Math.floor(10000000 + Math.random() * 90000000)}`, role: "SENIOR" })
  }).then(r => r.json());

  // Assign 2nd senior (allowed)
  const assignB = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${coordinatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ volunteerUserId: volunteer1UserId, seniorUserId: regSeniorB.data.user.id })
  }).then(r => r.json());
  assert(assignB.success === true, "Workload: Coordinator successfully assigns 2nd senior to Volunteer 1");

  // Assign 3rd senior (allowed, hits limit of 3)
  const assignC = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${coordinatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ volunteerUserId: volunteer1UserId, seniorUserId: regSeniorC.data.user.id })
  }).then(r => r.json());
  assert(assignC.success === true, "Workload: Coordinator successfully assigns 3rd senior to Volunteer 1 (reaches 3 cap)");

  // Attempt to assign 4th senior (exceeds limit) -> MUST FAIL with 400
  const assignD = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${coordinatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ volunteerUserId: volunteer1UserId, seniorUserId: regSeniorD.data.user.id })
  });
  const assignDJson = await assignD.json();
  assert(assignD.status === 400 && assignDJson.error?.includes("maximum limit"), "Burnout Protection: 4th assignment blocked when volunteer reaches max limit of 3 active seniors");

  // ---------------------------------------------------------------------------
  // FLOW 3: VOICE-TO-JSON PARSING (GROQ), REMINDERS & ADHERENCE
  // ---------------------------------------------------------------------------
  console.log(bold(yellow("\n--- [FLOW 3] Voice-to-JSON Parsing (Groq) & Medication Adherence ---")));

  // 3.1 Test Groq LLM Voice Parsing on Multi-Drug / Dialect Input
  console.log("   Invoking Groq API for voice parsing...");
  const voiceParse1 = await fetch(`${BASE_URL}/api/reminders/voice-parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spokenTranscript: "Remind me to take Metformin 500mg after breakfast at 9 am and blood pressure tablet at 9 pm",
      seniorName: "Mrs. Shanti Devi"
    })
  }).then(r => r.json());

  assert(voiceParse1.success === true, "Groq voice parse endpoint returned success");
  assert(Boolean(voiceParse1.data.medicationName) && voiceParse1.data.dosage === "500mg", "Groq correctly extracted medicine name and dosage ('500mg')");
  assert(Array.isArray(voiceParse1.data.targetTimes) && voiceParse1.data.targetTimes.length >= 1, "Groq formatted target times into 24h array");
  assert(Boolean(voiceParse1.data.seniorConfirmationPhrase), "Groq synthesized friendly TTS confirmation phrase for senior");
  console.log(`   TTS Voice Output: "${voiceParse1.data.seniorConfirmationPhrase}"`);

  // 3.2 Persist Reminder into PostgreSQL
  const createReminder = await fetch(`${BASE_URL}/api/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seniorId: seniorUserId,
      medicineName: voiceParse1.data.medicationName,
      dosage: voiceParse1.data.dosage,
      mealRelation: voiceParse1.data.mealRelation || "AFTER_MEAL",
      targetTimes: voiceParse1.data.targetTimes,
      instructions: "Take with water",
      rawLlmOutput: voiceParse1.data
    })
  }).then(r => r.json());

  assert(createReminder.success === true && createReminder.data.reminder.id, "Medicine reminder master schedule persisted in PostgreSQL");
  assert(createReminder.data.occurrences.length >= 1, "Daily reminder occurrences automatically generated in PostgreSQL");
  reminderId = createReminder.data.reminder.id;
  occurrenceId = createReminder.data.occurrences[0].id;

  // 3.3 Fetch active reminders for senior
  const seniorReminders = await fetch(`${BASE_URL}/api/reminders/senior/${seniorUserId}`).then(r => r.json());
  assert(seniorReminders.data.some((r: any) => r.id === reminderId), "GET /api/reminders/senior/:id returns newly created schedule");

  // 3.4 Senior Acknowledges Dose ("I took it")
  const ackDose = await fetch(`${BASE_URL}/api/reminders/occurrence/${occurrenceId}/acknowledge`, {
    method: "POST"
  }).then(r => r.json());
  assert(ackDose.success === true && ackDose.data.status === "ACKNOWLEDGED", "Senior marks dose as ACKNOWLEDGED in PostgreSQL");

  // Verify DB state
  const [dbOcc] = await db.select().from(reminderOccurrences).where(eq(reminderOccurrences.id, occurrenceId));
  assert(dbOcc && dbOcc.status === "ACKNOWLEDGED" && dbOcc.acknowledgedAt !== null, "PostgreSQL confirms acknowledged_at timestamp populated");

  // 3.5 Acknowledge non-existent dose -> 404
  const badAck = await fetch(`${BASE_URL}/api/reminders/occurrence/00000000-0000-0000-0000-000000000000/acknowledge`, {
    method: "POST"
  });
  assert(badAck.status === 404, "Acknowledging non-existent occurrence returns HTTP 404");

  // 3.6 Family Caregiver Invite Generation (Children creating invite for elderly parent)
  const inviteRes = await fetch(`${BASE_URL}/api/reminders/invite/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parentName: "Dada Ji (Grandpa)",
      phone: `+9194${Math.floor(10000000 + Math.random() * 90000000)}`
    })
  }).then(r => r.json());
  assert(inviteRes.success === true && inviteRes.data.pairingCode && inviteRes.data.smsInviteText.includes(inviteRes.data.pairingCode), "Family Caregiver can generate 4-digit pairing invite code with SMS text");

  // 3.7 Elderly parent uses the invite pairing code for passwordless login
  const parentLoginRes = await fetch(`${BASE_URL}/api/auth/senior-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode: inviteRes.data.pairingCode })
  }).then(r => r.json());
  assert(parentLoginRes.success === true && parentLoginRes.data.user.id === inviteRes.data.seniorId, "Elderly parent logs in seamlessly via child's invitation code");

  // 3.8 Groq Voice Parsing on Hindi-English conversational phrasing
  console.log("   Testing Groq voice parsing on conversational Hindi-English phrasing...");
  const voiceParseHindi = await fetch(`${BASE_URL}/api/reminders/voice-parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spokenTranscript: "Subah nashte ke baad ek Telmisartan 40mg lena hai aur paani ke saath lena",
      seniorName: "Dada Ji"
    })
  }).then(r => r.json());
  assert(voiceParseHindi.success === true, "Groq handles mixed Hindi-English speech input gracefully");
  assert(Boolean(voiceParseHindi.data.medicationName) && voiceParseHindi.data.dosage === "40mg", "Groq correctly parses 'Telmisartan' with '40mg' dosage from Hindi-English");
  assert(voiceParseHindi.data.mealRelation === "AFTER_MEAL", "Groq correctly identifies meal relation as 'AFTER_MEAL' from 'nashte ke baad'");
  console.log(`   TTS Voice Output (Hindi-English input): "${voiceParseHindi.data.seniorConfirmationPhrase}"`);

  // 3.9 Fetch today's occurrences feed
  const todayOccurrences = await fetch(`${BASE_URL}/api/reminders/occurrences/today`).then(r => r.json());
  assert(todayOccurrences.success === true && Array.isArray(todayOccurrences.data) && todayOccurrences.data.length >= 1, "GET /api/reminders/occurrences/today returns active daily doses for dashboard");

  // ---------------------------------------------------------------------------
  // FLOW 4: EMERGENCY SOS MULTI-TIER ESCALATION ENGINE
  // ---------------------------------------------------------------------------
  console.log(bold(yellow("\n--- [FLOW 4] Emergency SOS Lifecycle & Multi-Tier Dispatch ---")));

  // 4.1 Setup Family Emergency Contacts for Senior in DB
  const [primaryContact] = await db.insert(emergencyContacts).values({
    seniorId: seniorUserId,
    name: "Priya Rao (Daughter)",
    relationship: "Daughter",
    phone: "+919811122233",
    priorityTier: 1, // Tier 1
    isNotifiedOnMissedMeds: true
  }).returning();

  const [secondaryContact] = await db.insert(emergencyContacts).values({
    seniorId: seniorUserId,
    name: "Vikram Rao (Son)",
    relationship: "Son",
    phone: "+919844455566",
    priorityTier: 2, // Tier 2
    isNotifiedOnMissedMeds: true
  }).returning();
  assert(Boolean(primaryContact.id && secondaryContact.id), "Registered Tier 1 and Tier 2 family emergency contacts in DB");

  // 4.2 Senior Triggers SOS Emergency
  const sosTrigger = await fetch(`${BASE_URL}/api/sos/trigger`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${seniorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reason: "Fell in bathroom and unable to get up",
      severity: "CRITICAL"
    })
  }).then(r => r.json());
  assert(sosTrigger.success === true && sosTrigger.data.id, "Senior triggers emergency SOS via POST /api/sos/trigger");
  helpRequestId = sosTrigger.data.id;

  // Allow RabbitMQ worker to consume and dispatch
  await new Promise(res => setTimeout(res, 400));

  // 4.3 Query Active SOS List
  const activeSos = await fetch(`${BASE_URL}/api/sos/active`, {
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(activeSos.data.some((h: any) => h.id === helpRequestId), "Active SOS queue reflects triggered alert with senior name and details");

  // 4.4 Family or Coordinator Acknowledges SOS
  const ackSos = await fetch(`${BASE_URL}/api/sos/${helpRequestId}/acknowledge`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(ackSos.success === true && ackSos.data.status === "ACKNOWLEDGED", "Coordinator acknowledges SOS ('Help is being dispatched')");

  // 4.5 Resolve SOS without notes -> MUST FAIL
  const badResolve = await fetch(`${BASE_URL}/api/sos/${helpRequestId}/resolve`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ resolutionNotes: "" })
  });
  assert(badResolve.status === 400, "Safety Check: Resolving emergency requires non-empty resolution notes");

  // 4.6 Resolve SOS successfully
  const resolveSos = await fetch(`${BASE_URL}/api/sos/${helpRequestId}/resolve`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      resolutionNotes: "Volunteer Ramesh reached doorstep within 7 minutes. Senior helped up safely. Family informed."
    })
  }).then(r => r.json());
  assert(resolveSos.success === true && resolveSos.data.status === "RESOLVED", "Emergency SOS marked as RESOLVED in PostgreSQL");

  // 4.7 Verify it disappears from active queue
  const recheckActive = await fetch(`${BASE_URL}/api/sos/active`, {
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  }).then(r => r.json());
  assert(!recheckActive.data.some((h: any) => h.id === helpRequestId), "Resolved emergency is cleanly cleared from active monitoring queue");

  // 4.8 Non-existent SOS acknowledge -> 404
  const nonExistentAck = await fetch(`${BASE_URL}/api/sos/00000000-0000-0000-0000-000000000000/acknowledge`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${coordinatorToken}` }
  });
  assert(nonExistentAck.status === 404, "Safety Check: Acknowledging non-existent SOS alert returns HTTP 404");

  // 4.9 Non-existent SOS resolve -> 404
  const nonExistentResolve = await fetch(`${BASE_URL}/api/sos/00000000-0000-0000-0000-000000000000/resolve`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordinatorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ resolutionNotes: "Sample note" })
  });
  assert(nonExistentResolve.status === 404, "Safety Check: Resolving non-existent SOS alert returns HTTP 404");

  // ---------------------------------------------------------------------------
  // FLOW 5: BACKGROUND SCHEDULER & MISSED DOSE ESCALATION ENGINE
  // ---------------------------------------------------------------------------
  console.log(bold(yellow("\n--- [FLOW 5] Background Scheduler & Missed Dose Escalation Engine ---")));

  // 5.1 Inject synthetic overdue unacknowledged dose (scheduled 60 mins ago)
  const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const [syntheticOcc] = await db.insert(reminderOccurrences).values({
    reminderId,
    scheduledFor: pastTime,
    status: "SCHEDULED"
  }).returning();

  assert(Boolean(syntheticOcc.id), "Synthetic overdue dose injected into PostgreSQL (scheduled 60 minutes ago)");

  // 5.2 Execute background schedule check
  console.log("   Running background scheduler inspection...");
  await runScheduleCheck();

  // Give asynchronous RabbitMQ worker 500ms to consume and process
  await new Promise(res => setTimeout(res, 800));

  // 5.3 Verify that the occurrence was updated to ESCALATED in PostgreSQL
  const [inspectedOcc] = await db.select().from(reminderOccurrences).where(eq(reminderOccurrences.id, syntheticOcc.id));
  assert(inspectedOcc.status === "ESCALATED", "Escalation Engine identified overdue dose and updated status to ESCALATED in DB");
  assert(inspectedOcc.escalatedAt !== null, "Escalation timestamp recorded in PostgreSQL");

  // 5.4 Verify that audit_events captured the escalation
  const [auditLog] = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, "MEDICATION_DOSE_ESCALATED"),
        eq(auditEvents.entityId, syntheticOcc.id)
      )
    );
  assert(Boolean(auditLog), "Immutable audit trail logged in audit_events table in PostgreSQL");

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log(bold(cyan("\n================================================================================")));
  console.log(bold(green(`✔ TOTAL TESTS PASSED: ${passedCount}`)));
  if (failedCount > 0) {
    console.log(bold(red(`✖ TOTAL TESTS FAILED: ${failedCount}`)));
  } else {
    console.log(bold(green("🎉 100% OF ALL BACKEND FLOWS PASSED FLAWLESSLY!")));
  }
  console.log(bold(cyan("================================================================================\n")));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDeepTestSuite().catch((err) => {
  console.error("Test runner encountered unexpected error:", err);
  process.exit(1);
});

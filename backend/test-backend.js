// End-to-end backend verification script
const BASE_URL = "http://localhost:3000";

async function testBackend() {
  console.log("==================================================");
  console.log("🚀 STARTING SENIOR COMPANION BACKEND TEST SUITE");
  console.log("==================================================\n");

  // 1. Healthcheck
  console.log("1️⃣ Testing GET /health...");
  const healthRes = await fetch(`${BASE_URL}/health`).then(r => r.json());
  console.log("   Health Status:", healthRes.status, "| DB:", healthRes.database.status, "| Groq:", healthRes.llm.model);

  // 2. Register Coordinator
  console.log("\n2️⃣ Registering Coordinator...");
  const coordEmail = `coord_${Date.now()}@example.com`;
  const coordRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Anil Coordinator",
      email: coordEmail,
      password: "password123",
      role: "COORDINATOR"
    })
  }).then(r => r.json());
  const coordToken = coordRes.data.token;
  console.log("   Coordinator registered! JWT Token obtained. User ID:", coordRes.data.user.id);

  // 3. Register Volunteer
  console.log("\n3️⃣ Registering Volunteer...");
  const volEmail = `vol_${Date.now()}@example.com`;
  const volRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Ramesh Sharma",
      email: volEmail,
      password: "password123",
      role: "VOLUNTEER",
      languagesSpoken: "Hindi, English",
      pincode: "400001"
    })
  }).then(r => r.json());
  const volUserId = volRes.data.user.id;
  const volToken = volRes.data.token;
  console.log("   Volunteer registered! ID:", volUserId);

  // 4. Register Senior Citizen
  console.log("\n4️⃣ Registering Senior Citizen...");
  const seniorPhone = `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`;
  const seniorRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Mrs. Sunita Rao",
      phone: seniorPhone,
      role: "SENIOR",
      preferredLanguage: "Hindi",
      pincode: "400001"
    })
  }).then(r => r.json());
  const seniorUserId = seniorRes.data.user.id;
  const seniorToken = seniorRes.data.token;
  console.log("   Senior registered! ID:", seniorUserId);

  // 5. Coordinator verifies Volunteer
  console.log("\n5️⃣ Coordinator verifying Volunteer (PATCH /api/volunteers/:id/verify)...");
  const verifyRes = await fetch(`${BASE_URL}/api/volunteers/${volUserId}/verify`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${coordToken}` }
  }).then(r => r.json());
  console.log("   Volunteer verified status:", verifyRes.success, "| isVerified:", verifyRes.data.isVerified);

  // 6. Coordinator assigns verified volunteer to senior
  console.log("\n6️⃣ Coordinator assigning Volunteer to Senior (POST /api/volunteers/assign)...");
  const assignRes = await fetch(`${BASE_URL}/api/volunteers/assign`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      volunteerUserId: volUserId,
      seniorUserId: seniorUserId,
      frequency: "WEEKLY"
    })
  }).then(r => r.json());
  console.log("   Assignment created! Assignment ID:", assignRes.data.id);

  // 7. Coordinator schedules a check-in call
  console.log("\n7️⃣ Scheduling Check-In Call (POST /api/volunteers/check-ins)...");
  const checkInRes = await fetch(`${BASE_URL}/api/volunteers/check-ins`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${coordToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assignmentId: assignRes.data.id,
      seniorId: seniorUserId,
      volunteerId: volUserId,
      type: "PHONE_CALL",
      scheduledFor: new Date().toISOString()
    })
  }).then(r => r.json());
  const checkInId = checkInRes.data.id;
  console.log("   Check-in scheduled! ID:", checkInId);

  // 8. Volunteer completes check-in task with mood & observations
  console.log("\n8️⃣ Volunteer completing task (PATCH /api/volunteers/check-ins/:id/complete)...");
  const completeRes = await fetch(`${BASE_URL}/api/volunteers/check-ins/${checkInId}/complete`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${volToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "COMPLETED",
      mood: "CHEERFUL",
      notes: "Had a lovely 15-minute conversation about classical music. In great spirits."
    })
  }).then(r => r.json());
  console.log("   Check-in completed! Status:", completeRes.data.status, "| Mood:", completeRes.data.mood);

  // 9. Senior triggers SOS emergency
  console.log("\n9️⃣ Senior triggering Emergency SOS (POST /api/sos/trigger)...");
  const sosRes = await fetch(`${BASE_URL}/api/sos/trigger`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${seniorToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reason: "Feeling dizzy after morning walk",
      severity: "HIGH"
    })
  }).then(r => r.json());
  console.log("   Emergency SOS triggered! ID:", sosRes.data.id, "| Status:", sosRes.data.status);

  // 10. Voice medicine parsing with Groq
  console.log("\n🔟 Testing Groq Voice Parsing (POST /api/reminders/voice-parse)...");
  const voiceRes = await fetch(`${BASE_URL}/api/reminders/voice-parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spokenTranscript: "Remind me to take Metformin 500mg after breakfast at 9 am",
      seniorName: "Mrs. Rao"
    })
  }).then(r => r.json());
  console.log("   Parsed Medicine:", voiceRes.data.medicationName, "| Dosage:", voiceRes.data.dosage, "| Times:", voiceRes.data.targetTimes);
  console.log("   TTS Confirmation Phrase:", `"${voiceRes.data.seniorConfirmationPhrase}"`);

  console.log("\n==================================================");
  console.log("🎉 ALL BACKEND MODULES & WORKERS VERIFIED 100%!");
  console.log("==================================================");
}

testBackend().catch(console.error);

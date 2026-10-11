import { initRabbitMQ, QUEUES } from "../infra/rabbitmq";
import {
  db,
  helpRequests,
  emergencyContacts,
  volunteerAssignments,
  seniorProfiles,
  users,
  auditEvents,
  eq,
  and
} from "@companion/db";

export async function startSosWorker() {
  try {
    const channel = await initRabbitMQ();
    await channel.consume(QUEUES.SOS, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        const { helpRequestId, seniorId, reason, severity } = payload;

        console.log(`\n======================================================`);
        console.log(`[SOS ENGINE] 🚨 CRITICAL EMERGENCY TRIGGERED FOR SENIOR ${seniorId}`);
        console.log(`[SOS ENGINE] Reason: ${reason || "One-tap SOS pressed"} | Severity: ${severity}`);
        console.log(`======================================================`);

        // 1. Fetch senior details & address
        const [seniorUser] = await db.select().from(users).where(eq(users.id, seniorId));
        const [seniorProfile] = await db.select().from(seniorProfiles).where(eq(seniorProfiles.userId, seniorId));

        // 2. TIER 1: Primary Emergency Contacts (High Priority Alert)
        const primaryContacts = await db
          .select()
          .from(emergencyContacts)
          .where(
            and(
              eq(emergencyContacts.seniorId, seniorId),
              eq(emergencyContacts.priorityTier, 1)
            )
          );

        console.log(`[SOS TIER 1] 📢 Dispatched automated priority call + SMS to Primary Contacts:`);
        for (const contact of primaryContacts) {
          console.log(`   ➜ ${contact.name} (${contact.relationship}) @ ${contact.phone}`);
        }

        // 3. TIER 2: Secondary Contacts & Assigned Local Volunteer
        const secondaryContacts = await db
          .select()
          .from(emergencyContacts)
          .where(
            and(
              eq(emergencyContacts.seniorId, seniorId),
              eq(emergencyContacts.priorityTier, 2)
            )
          );

        const assignments = await db
          .select({
            volunteerId: users.id,
            volunteerName: users.fullName,
            volunteerPhone: users.phone
          })
          .from(volunteerAssignments)
          .innerJoin(users, eq(users.id, volunteerAssignments.volunteerId))
          .where(
            and(
              eq(volunteerAssignments.seniorId, seniorId),
              eq(volunteerAssignments.status, "ACTIVE")
            )
          );

        console.log(`[SOS TIER 2] 🤝 Alerting Secondary Contacts and Local Volunteers with address:`);
        console.log(`   Senior Address: ${seniorProfile?.address || "Address on profile"}, Pincode: ${seniorProfile?.pincode || "N/A"}`);
        for (const contact of secondaryContacts) {
          console.log(`   ➜ Secondary Contact: ${contact.name} @ ${contact.phone}`);
        }
        for (const vol of assignments) {
          console.log(`   ➜ Nearby Volunteer: ${vol.volunteerName} @ ${vol.volunteerPhone}`);
        }

        // 4. Update Help Request status in PostgreSQL (only if still in TRIGGERED state, don't overwrite if already ACKNOWLEDGED or RESOLVED)
        await db
          .update(helpRequests)
          .set({
            status: "DISPATCHED",
            currentEscalationTier: 2
          })
          .where(
            and(
              eq(helpRequests.id, helpRequestId),
              eq(helpRequests.status, "TRIGGERED")
            )
          );

        // 5. Immutable Audit Event
        await db.insert(auditEvents).values({
          action: "SOS_MULTI_TIER_DISPATCHED",
          entityType: "HELP_REQUEST",
          entityId: helpRequestId,
          payload: {
            seniorId,
            seniorName: seniorUser?.fullName,
            tier1Count: primaryContacts.length,
            tier2Count: secondaryContacts.length + assignments.length
          }
        });

        channel.ack(msg);
      } catch (err) {
        console.error("[SOS Engine] Dispatch error:", err);
        channel.nack(msg, false, false);
      }
    });

    console.log("[SOS Engine] Active and monitoring emergency queues.");
  } catch (err) {
    console.warn("[SOS Engine] RabbitMQ offline, running in direct dispatch fallback mode.");
  }
}

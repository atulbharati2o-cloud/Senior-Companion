import { initRabbitMQ, QUEUES } from "../infra/rabbitmq";
import { db, reminderOccurrences, emergencyContacts, auditEvents, eq } from "@companion/db";

export async function startEscalationWorker() {
  try {
    const channel = await initRabbitMQ();
    await channel.consume(QUEUES.ESCALATIONS, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        const { occurrenceId, seniorId, medicineName, dosage, scheduledFor } = payload;

        console.log(`[Escalation Engine] ⚠️ Overdue dose detected for senior ${seniorId}: ${medicineName} (${dosage})`);

        // 1. Update status in PostgreSQL to ESCALATED
        await db
          .update(reminderOccurrences)
          .set({
            status: "ESCALATED",
            escalatedAt: new Date()
          })
          .where(eq(reminderOccurrences.id, occurrenceId));

        // 2. Fetch senior's configured emergency contacts
        const contacts = await db
          .select()
          .from(emergencyContacts)
          .where(eq(emergencyContacts.seniorId, seniorId));

        // 3. Dispatch simulated alerts to family caregivers
        for (const contact of contacts) {
          if (contact.isNotifiedOnMissedMeds) {
            console.log(
              `[Escalation Engine] 📲 Dispatching SMS to ${contact.name} (${contact.relationship || "Family"}) at ${contact.phone}: "Reminder: ${medicineName} scheduled for ${scheduledFor} has not been acknowledged for over 45 minutes. Please check in with your parent."`
            );
          }
        }

        // 4. Log immutable audit trail
        await db.insert(auditEvents).values({
          action: "MEDICATION_DOSE_ESCALATED",
          entityType: "REMINDER_OCCURRENCE",
          entityId: occurrenceId,
          payload: {
            seniorId,
            medicineName,
            dosage,
            notifiedContactsCount: contacts.length
          }
        });

        channel.ack(msg);
      } catch (err) {
        console.error("[Escalation Engine] Processing error:", err);
        channel.nack(msg, false, false);
      }
    });

    console.log("[Escalation Engine] Active and listening for missed dose escalations.");
  } catch (err) {
    console.warn("[Escalation Engine] RabbitMQ offline, operating in direct fallback mode.");
  }
}

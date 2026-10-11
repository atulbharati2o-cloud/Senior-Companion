import { db, reminderOccurrences, medicineReminders, eq, and, lte } from "@companion/db";
import { publishToQueue, QUEUES } from "../infra/rabbitmq";

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Background job that regularly scans for:
 * 1. Doses that are due right now.
 * 2. Unacknowledged doses past the 45-minute grace period to escalate to caregivers.
 */
export async function runScheduleCheck() {
  const now = new Date();
  const gracePeriodThreshold = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago

  try {
    // 1. Find overdue, unacknowledged doses that have NOT yet been escalated
    const overdueOccurrences = await db
      .select({
        occurrenceId: reminderOccurrences.id,
        scheduledFor: reminderOccurrences.scheduledFor,
        status: reminderOccurrences.status,
        seniorId: medicineReminders.seniorId,
        medicineName: medicineReminders.medicineName,
        dosage: medicineReminders.dosage
      })
      .from(reminderOccurrences)
      .innerJoin(medicineReminders, eq(medicineReminders.id, reminderOccurrences.reminderId))
      .where(
        and(
          eq(reminderOccurrences.status, "SCHEDULED"),
          lte(reminderOccurrences.scheduledFor, gracePeriodThreshold)
        )
      );

    if (overdueOccurrences.length > 0) {
      console.log(`[Scheduler] Found ${overdueOccurrences.length} overdue dose(s) eligible for family escalation.`);
      for (const occ of overdueOccurrences) {
        await publishToQueue(QUEUES.ESCALATIONS, {
          occurrenceId: occ.occurrenceId,
          seniorId: occ.seniorId,
          medicineName: occ.medicineName,
          dosage: occ.dosage,
          scheduledFor: occ.scheduledFor.toLocaleTimeString()
        });
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error during schedule inspection:", err);
  }
}

export function startScheduler(intervalMs: number = 60000): void {
  if (schedulerInterval) return;

  console.log(`[Scheduler] Started automated scheduler (polling every ${intervalMs / 1000}s).`);
  // Run immediate first check
  runScheduleCheck();
  schedulerInterval = setInterval(runScheduleCheck, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped.");
  }
}

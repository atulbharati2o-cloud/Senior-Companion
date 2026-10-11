import { initRabbitMQ, QUEUES } from "../infra/rabbitmq";

export async function startReminderWorker() {
  try {
    const channel = await initRabbitMQ();
    await channel.consume(QUEUES.REMINDERS, (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        console.log(`[Reminder Worker] 🔔 Dispatching dose reminder:`, {
          occurrenceId: payload.occurrenceId,
          medicineName: payload.medicineName,
          dosage: payload.dosage,
          scheduledFor: payload.scheduledFor
        });

        // Simulate push delivery / Web Audio chime trigger
        channel.ack(msg);
      } catch (err) {
        console.error("[Reminder Worker] Processing error:", err);
        channel.nack(msg, false, false);
      }
    });

    console.log("[Reminder Worker] Active and listening for due medicine notifications.");
  } catch (err) {
    console.warn("[Reminder Worker] RabbitMQ offline, running in internal scheduler fallback mode.");
  }
}

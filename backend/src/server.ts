import { app } from "./app";
import { client } from "@companion/db";
import { initRabbitMQ, closeRabbitMQ } from "./infra/rabbitmq";
import { startReminderWorker } from "./workers/reminder.worker";
import { startEscalationWorker } from "./workers/escalation.worker";
import { startSosWorker } from "./workers/sos.worker";
import { startScheduler, stopScheduler } from "./jobs/scheduler";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(` Senior Companion Backend running on port ${PORT}`);
  console.log(` Healthcheck: http://localhost:${PORT}/health`);
  console.log(` Groq LLM: ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}`);
  console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`===============================================`);

  // Initialize RabbitMQ & background workers
  try {
    await initRabbitMQ();
    await startReminderWorker();
    await startEscalationWorker();
    await startSosWorker();
  } catch (err) {
    console.warn("RabbitMQ initialization error:", err);
  }

  // Start background job scheduler
  startScheduler(30000); // Check every 30 seconds
});

const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down backend...`);
  stopScheduler();
  server.close(async () => {
    try {
      await closeRabbitMQ();
      await client.end();
      console.log("Database and RabbitMQ connections closed.");
    } catch (err) {
      console.error("Error closing resources:", err);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

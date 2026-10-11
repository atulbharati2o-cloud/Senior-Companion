import amqplib, { Channel, ChannelModel } from "amqplib";

export const QUEUES = {
  REMINDERS: "reminders_queue",
  ESCALATIONS: "escalations_queue",
  SOS: "sos_queue"
} as const;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://companion:companion_secret@localhost:5673";

/**
 * Initialize RabbitMQ connection and assert durable queues
 */
export async function initRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  try {
    console.log(`[RabbitMQ] Connecting to ${RABBITMQ_URL}...`);
    const conn = await amqplib.connect(RABBITMQ_URL);
    connection = conn;
    const ch = await conn.createChannel();
    channel = ch;

    // Assert durable queues
    for (const q of Object.values(QUEUES)) {
      await ch.assertQueue(q, { durable: true });
    }

    console.log("[RabbitMQ] Connected successfully and all queues asserted.");

    (conn as any).on("error", (err: any) => {
      console.error("[RabbitMQ] Connection error:", err);
      channel = null;
      connection = null;
    });

    (conn as any).on("close", () => {
      console.warn("[RabbitMQ] Connection closed.");
      channel = null;
      connection = null;
    });

    return ch;
  } catch (err) {
    console.warn("[RabbitMQ] Broker offline. Operating in simulation fallback mode:", (err as Error).message);
    throw err;
  }
}

/**
 * Publish message payload to a designated queue
 */
export async function publishToQueue(queue: string, data: any): Promise<boolean> {
  try {
    const ch = await initRabbitMQ();
    return ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
  } catch (err) {
    console.warn(`[RabbitMQ Simulation] Queue '${queue}' received event:`, JSON.stringify(data));
    return false;
  }
}

/**
 * Close RabbitMQ connection cleanly on shutdown
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await (connection as any).close();
  } catch (err) {
    console.error("[RabbitMQ] Error during clean shutdown:", err);
  }
}

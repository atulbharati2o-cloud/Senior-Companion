import { Router, Request, Response } from "express";
import { client } from "@companion/db";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  let dbStatus = "disconnected";
  try {
    await client`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = `error: ${(error as Error).message}`;
  }

  res.json({
    status: "ok",
    service: "Community Companion Backend",
    timestamp: new Date().toISOString(),
    database: {
      engine: "PostgreSQL",
      status: dbStatus
    },
    llm: {
      provider: "Groq",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      hasKey: Boolean(process.env.GROQ_API_KEY)
    }
  });
});

import { Router, Response } from "express";
import { db, helpRequests, users, seniorProfiles, eq, or, and } from "@companion/db";
import { publishToQueue, QUEUES } from "../../infra/rabbitmq";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import { AuthenticatedRequest } from "../auth/auth.types";
import { z } from "zod";

export const sosRouter = Router();

const TriggerSosSchema = z.object({
  seniorId: z.string().uuid().optional(),
  reason: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH")
});

const AcknowledgeSosSchema = z.object({
  notes: z.string().optional()
});

const ResolveSosSchema = z.object({
  resolutionNotes: z.string().min(1, "Resolution notes are required")
});

/**
 * 1. Trigger Emergency SOS
 */
sosRouter.post("/trigger", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = TriggerSosSchema.parse(req.body);
    let targetSeniorId = validated.seniorId || (req.user?.role === "SENIOR" ? req.user.userId : undefined);

    if (!targetSeniorId) {
      res.status(400).json({ error: "Senior user not specified or found" });
      return;
    }

    // Create record in PostgreSQL
    const [helpRequest] = await db
      .insert(helpRequests)
      .values({
        seniorId: targetSeniorId,
        status: "TRIGGERED",
        severity: validated.severity,
        reason: validated.reason || "Manual SOS trigger via app",
        currentEscalationTier: 1
      })
      .returning();

    // Publish to RabbitMQ SOS emergency queue
    await publishToQueue(QUEUES.SOS, {
      helpRequestId: helpRequest.id,
      seniorId: targetSeniorId,
      reason: helpRequest.reason,
      severity: helpRequest.severity
    });

    res.status(201).json({
      success: true,
      message: "Emergency SOS triggered and multi-tier escalation started",
      data: helpRequest
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 2. Get active unresolved SOS requests (for Caregivers, Volunteers, Coordinators)
 */
sosRouter.get("/active", authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const active = await db
      .select({
        id: helpRequests.id,
        seniorId: helpRequests.seniorId,
        seniorName: users.fullName,
        phone: users.phone,
        status: helpRequests.status,
        severity: helpRequests.severity,
        reason: helpRequests.reason,
        currentEscalationTier: helpRequests.currentEscalationTier,
        createdAt: helpRequests.createdAt,
        address: seniorProfiles.address,
        pincode: seniorProfiles.pincode
      })
      .from(helpRequests)
      .innerJoin(users, eq(users.id, helpRequests.seniorId))
      .leftJoin(seniorProfiles, eq(seniorProfiles.userId, users.id))
      .where(
        or(
          eq(helpRequests.status, "TRIGGERED"),
          eq(helpRequests.status, "DISPATCHED"),
          eq(helpRequests.status, "ACKNOWLEDGED")
        )
      );

    res.json({ success: true, data: active });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 3. Acknowledge an SOS alert ("I have seen this request and am checking")
 */
sosRouter.post("/:id/acknowledge", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const [updated] = await db
      .update(helpRequests)
      .set({
        status: "ACKNOWLEDGED",
        acknowledgedByUserId: req.user!.userId,
        acknowledgedAt: new Date()
      })
      .where(eq(helpRequests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Help request not found" });
      return;
    }

    res.json({
      success: true,
      message: "SOS alert acknowledged",
      data: updated
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 4. Resolve an SOS alert ("Situation handled and closed")
 */
sosRouter.post("/:id/resolve", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const validated = ResolveSosSchema.parse(req.body);

    const [updated] = await db
      .update(helpRequests)
      .set({
        status: "RESOLVED",
        resolvedByUserId: req.user!.userId,
        resolvedAt: new Date(),
        resolutionNotes: validated.resolutionNotes
      })
      .where(eq(helpRequests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Help request not found" });
      return;
    }

    res.json({
      success: true,
      message: "SOS request resolved successfully",
      data: updated
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

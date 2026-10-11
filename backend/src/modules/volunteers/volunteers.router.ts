import { Router, Response } from "express";
import { VolunteerService } from "./volunteer.service";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { AuthenticatedRequest } from "../auth/auth.types";
import { z } from "zod";

export const volunteersRouter = Router();

const AssignSchema = z.object({
  volunteerUserId: z.string().uuid(),
  seniorUserId: z.string().uuid(),
  frequency: z.string().optional()
});

const ScheduleCheckInSchema = z.object({
  assignmentId: z.string().uuid().optional(),
  seniorId: z.string().uuid(),
  volunteerId: z.string().uuid(),
  type: z.enum(["PHONE_CALL", "DOORSTEP_VISIT", "MORNING_GREETING"]),
  scheduledFor: z.string().datetime()
});

const CompleteCheckInSchema = z.object({
  status: z.enum(["COMPLETED", "MISSED", "UNREACHABLE"]),
  mood: z.enum(["CHEERFUL", "NEUTRAL", "LOW_ENERGY", "ANXIOUS", "UNWELL"]).optional(),
  notes: z.string().optional(),
  coordinatorFlag: z.string().optional()
});

/**
 * 1. List unverified volunteers (Coordinator/Admin only)
 */
volunteersRouter.get(
  "/pending",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const list = await VolunteerService.getPendingVolunteers();
      res.json({ success: true, data: list });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * 2. Verify and approve a volunteer (Coordinator/Admin only)
 */
volunteersRouter.patch(
  "/:id/verify",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const updated = await VolunteerService.verifyVolunteer(id);
      res.json({ success: true, message: "Volunteer verified successfully", data: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * 3. Assign volunteer to senior (Coordinator/Admin only)
 */
volunteersRouter.post(
  "/assign",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validated = AssignSchema.parse(req.body);
      const assignment = await VolunteerService.assignVolunteer(validated);
      res.status(201).json({ success: true, message: "Volunteer assigned successfully", data: assignment });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.errors });
        return;
      }
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * 4. Schedule a check-in call or visit (Coordinator/Admin only)
 */
volunteersRouter.post(
  "/check-ins",
  authenticate,
  requireRole("COORDINATOR", "ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validated = ScheduleCheckInSchema.parse(req.body);
      const task = await VolunteerService.scheduleCheckIn({
        ...validated,
        scheduledFor: new Date(validated.scheduledFor)
      });
      res.status(201).json({ success: true, message: "Check-in task scheduled", data: task });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.errors });
        return;
      }
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * 5. Get assigned seniors for the logged-in volunteer
 */
volunteersRouter.get(
  "/my-seniors",
  authenticate,
  requireRole("VOLUNTEER"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seniors = await VolunteerService.getMyAssignedSeniors(req.user!.userId);
      res.json({ success: true, data: seniors });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * 6. Get check-in tasks for the logged-in volunteer
 */
volunteersRouter.get(
  "/my-tasks",
  authenticate,
  requireRole("VOLUNTEER"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = await VolunteerService.getMyCheckInTasks(req.user!.userId);
      res.json({ success: true, data: tasks });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * 7. Complete check-in task with mood & observations (Volunteer only)
 */
volunteersRouter.patch(
  "/check-ins/:id/complete",
  authenticate,
  requireRole("VOLUNTEER"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const validated = CompleteCheckInSchema.parse(req.body);
      const updated = await VolunteerService.recordCheckInResult({
        checkInId: id,
        volunteerUserId: req.user!.userId,
        ...validated
      });

      res.json({
        success: true,
        message: "Check-in result recorded successfully",
        data: updated
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.errors });
        return;
      }
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

import { Router, Request, Response } from "express";
import { db, medicineReminders, reminderOccurrences, seniorProfiles, users, eq } from "@companion/db";
import { CreateMedicineReminderSchema } from "@companion/shared";
import { VoiceMedicineParserService } from "./voice-parser.service";
import { z } from "zod";

export const remindersRouter = Router();

/**
 * 1. Parse spoken senior instruction into structured JSON via Groq LLaMA 3.3
 */
remindersRouter.post("/voice-parse", async (req: Request, res: Response) => {
  try {
    const { spokenTranscript, seniorName } = req.body;
    if (!spokenTranscript || typeof spokenTranscript !== "string") {
      res.status(400).json({ error: "spokenTranscript is required as a string" });
      return;
    }

    const parsedJson = await VoiceMedicineParserService.parseSpokenInstruction(
      spokenTranscript,
      seniorName || "Elder"
    );

    res.json({
      success: true,
      data: parsedJson
    });
  } catch (err) {
    console.error("Voice parse error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 2. Create and persist a medicine reminder in PostgreSQL via Drizzle ORM
 */
remindersRouter.post("/", async (req: Request, res: Response) => {
  try {
    // If seniorId is missing, "default", or placeholder, fallback to first senior user in DB
    if (!req.body.seniorId || req.body.seniorId === "default" || req.body.seniorId.startsWith("00000000")) {
      const [demoSenior] = await db.select().from(users).where(eq(users.role, "SENIOR"));
      if (demoSenior) {
        req.body.seniorId = demoSenior.id;
      }
    }

    const validated = CreateMedicineReminderSchema.parse(req.body);

    // Insert master recurring schedule
    const [inserted] = await db.insert(medicineReminders).values({
      seniorId: validated.seniorId,
      medicineName: validated.medicineName,
      dosage: validated.dosage,
      mealRelation: validated.mealRelation,
      targetTimes: validated.targetTimes,
      instructions: validated.instructions,
      rawLlmOutput: validated.rawLlmOutput
    }).returning();

    // Create today's occurrences for each target time
    const today = new Date();
    const occurrencesToInsert = validated.targetTimes.map((timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const scheduledFor = new Date(today);
      scheduledFor.setHours(hours, minutes, 0, 0);

      return {
        reminderId: inserted.id,
        scheduledFor,
        status: "SCHEDULED" as const
      };
    });

    const createdOccurrences = await db.insert(reminderOccurrences)
      .values(occurrencesToInsert)
      .returning();

    res.status(201).json({
      success: true,
      data: {
        reminder: inserted,
        occurrences: createdOccurrences
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Create reminder error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 3. Fetch all active reminders
 */
remindersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const reminders = await db.select().from(medicineReminders);
    res.json({ success: true, data: reminders });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 4. Fetch all active reminders for a specific senior
 */
remindersRouter.get("/senior/:seniorId", async (req: Request, res: Response) => {
  try {
    const seniorId = String(req.params.seniorId);
    const reminders = await db.select()
      .from(medicineReminders)
      .where(eq(medicineReminders.seniorId, seniorId));

    res.json({
      success: true,
      data: reminders
    });
  } catch (err) {
    console.error("Fetch reminders error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 5. Fetch today's reminder occurrences (for senior or caregiver feed)
 */
remindersRouter.get("/occurrences/today", async (req: Request, res: Response) => {
  try {
    const { seniorId } = req.query;
    let query = db
      .select({
        id: reminderOccurrences.id,
        reminderId: reminderOccurrences.reminderId,
        scheduledFor: reminderOccurrences.scheduledFor,
        status: reminderOccurrences.status,
        acknowledgedAt: reminderOccurrences.acknowledgedAt,
        medicineName: medicineReminders.medicineName,
        dosage: medicineReminders.dosage,
        mealRelation: medicineReminders.mealRelation,
        instructions: medicineReminders.instructions
      })
      .from(reminderOccurrences)
      .innerJoin(medicineReminders, eq(medicineReminders.id, reminderOccurrences.reminderId));

    if (seniorId && typeof seniorId === "string") {
      const filtered = await query.where(eq(medicineReminders.seniorId, seniorId));
      res.json({ success: true, data: filtered });
      return;
    }

    const occurrences = await query;
    res.json({ success: true, data: occurrences });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 6. Acknowledge a medicine reminder occurrence ("I took it")
 */
remindersRouter.post("/occurrence/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [updated] = await db.update(reminderOccurrences)
      .set({
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date()
      })
      .where(eq(reminderOccurrences.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Reminder occurrence not found" });
      return;
    }

    res.json({
      success: true,
      message: "Medicine dose acknowledged",
      data: updated
    });
  } catch (err) {
    console.error("Acknowledge reminder error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 7. Generate Family Caregiver pairing invitation code
 */
remindersRouter.post("/invite/create", async (req: Request, res: Response) => {
  try {
    const { parentName, phone } = req.body;
    const targetPhone = phone || `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`;
    const pairingCode = Math.floor(1000 + Math.random() * 9000).toString();

    let targetSeniorId: string;
    let targetSeniorName = parentName || "Senior Parent";

    // Check if user with this phone already exists
    const [existingUser] = await db.select().from(users).where(eq(users.phone, targetPhone));

    if (existingUser) {
      targetSeniorId = existingUser.id;
      if (parentName) {
        targetSeniorName = parentName;
        await db.update(users).set({ fullName: parentName }).where(eq(users.id, existingUser.id));
      } else {
        targetSeniorName = existingUser.fullName;
      }

      const [existingProfile] = await db.select().from(seniorProfiles).where(eq(seniorProfiles.userId, existingUser.id));
      if (existingProfile) {
        await db.update(seniorProfiles)
          .set({ pairingCode, isPaired: false })
          .where(eq(seniorProfiles.id, existingProfile.id));
      } else {
        await db.insert(seniorProfiles).values({
          userId: existingUser.id,
          pairingCode,
          isPaired: false
        });
      }
    } else {
      // Create new senior user and profile
      const [newUser] = await db.insert(users).values({
        fullName: targetSeniorName,
        phone: targetPhone,
        role: "SENIOR"
      }).returning();

      targetSeniorId = newUser.id;

      await db.insert(seniorProfiles).values({
        userId: newUser.id,
        pairingCode,
        isPaired: false
      });
    }

    res.json({
      success: true,
      data: {
        seniorId: targetSeniorId,
        parentName: targetSeniorName,
        pairingCode,
        smsInviteText: `Hello! Your child has set up Community Companion for you. Open the app and enter code: ${pairingCode} to connect.`
      }
    });
  } catch (err) {
    console.error("Invite generation error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 8. Fetch linked senior parent details for Caregiver portal
 */
remindersRouter.get("/caregiver/parent", async (_req: Request, res: Response) => {
  try {
    const [senior] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        pairingCode: seniorProfiles.pairingCode,
        isPaired: seniorProfiles.isPaired,
        preferredLanguage: seniorProfiles.preferredLanguage
      })
      .from(users)
      .innerJoin(seniorProfiles, eq(seniorProfiles.userId, users.id))
      .where(eq(users.role, "SENIOR"))
      .limit(1);

    res.json({
      success: true,
      data: senior || null
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

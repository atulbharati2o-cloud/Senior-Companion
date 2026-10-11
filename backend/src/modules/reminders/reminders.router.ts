import { Router, Request, Response } from "express";
import { db, medicineReminders, reminderOccurrences, seniorProfiles, users, emergencyContacts, eq, and, or } from "@companion/db";
import { CreateMedicineReminderSchema } from "@companion/shared";
import { VoiceMedicineParserService } from "./voice-parser.service";
import { optionalAuthenticate } from "../auth/auth.middleware";
import { AuthenticatedRequest } from "../auth/auth.types";
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
remindersRouter.post("/", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.body.seniorId || req.body.seniorId === "default" || String(req.body.seniorId).startsWith("00000000")) {
      if (req.user?.role === "SENIOR") {
        req.body.seniorId = req.user.userId;
      } else if (req.user?.role === "FAMILY") {
        const conditions = [eq(emergencyContacts.familyUserId, req.user.userId)];
        if (req.user.phone) conditions.push(eq(emergencyContacts.phone, req.user.phone));
        const [contact] = await db.select().from(emergencyContacts).where(or(...conditions));
        if (contact) {
          req.body.seniorId = contact.seniorId;
        }
      }
    }

    if (!req.body.seniorId) {
      res.status(400).json({ error: "A linked senior parent is required before scheduling medicine." });
      return;
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
 * 3. Fetch active reminders (optionally filtered by seniorId)
 */
remindersRouter.get("/", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { seniorId } = req.query;
    let targetSeniorId = seniorId && typeof seniorId === "string" ? seniorId : undefined;

    if (!targetSeniorId && req.user) {
      if (req.user.role === "SENIOR") {
        targetSeniorId = req.user.userId;
      } else if (req.user.role === "FAMILY") {
        const conditions = [eq(emergencyContacts.familyUserId, req.user.userId)];
        if (req.user.phone) conditions.push(eq(emergencyContacts.phone, req.user.phone));
        const [contact] = await db.select().from(emergencyContacts).where(or(...conditions));
        if (contact) {
          targetSeniorId = contact.seniorId;
        }
      }
    }

    if (!targetSeniorId) {
      res.json({ success: true, data: [] });
      return;
    }

    const reminders = await db.select()
      .from(medicineReminders)
      .where(eq(medicineReminders.seniorId, targetSeniorId));
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
remindersRouter.get("/occurrences/today", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { seniorId } = req.query;
    let targetSeniorId = seniorId && typeof seniorId === "string" ? seniorId : undefined;

    if (!targetSeniorId && req.user) {
      if (req.user.role === "SENIOR") {
        targetSeniorId = req.user.userId;
      } else if (req.user.role === "FAMILY") {
        const conditions = [eq(emergencyContacts.familyUserId, req.user.userId)];
        if (req.user.phone) conditions.push(eq(emergencyContacts.phone, req.user.phone));
        const [contact] = await db.select().from(emergencyContacts).where(or(...conditions));
        if (contact) {
          targetSeniorId = contact.seniorId;
        }
      }
    }

    if (!targetSeniorId) {
      res.json({ success: true, data: [] });
      return;
    }

    const occurrences = await db
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
      .innerJoin(medicineReminders, eq(medicineReminders.id, reminderOccurrences.reminderId))
      .where(eq(medicineReminders.seniorId, targetSeniorId));

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
remindersRouter.post("/invite/create", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
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

    // Link caller in emergencyContacts if authenticated as FAMILY
    if (req.user) {
      const caregiverUser = req.user;
      const [existingContact] = await db
        .select()
        .from(emergencyContacts)
        .where(
          and(
            eq(emergencyContacts.seniorId, targetSeniorId),
            eq(emergencyContacts.familyUserId, caregiverUser.userId)
          )
        );

      if (!existingContact) {
        await db.insert(emergencyContacts).values({
          seniorId: targetSeniorId,
          familyUserId: caregiverUser.userId,
          name: caregiverUser.fullName,
          relationship: "Family Caregiver",
          phone: caregiverUser.phone || "+919800000000",
          priorityTier: 1,
          isNotifiedOnMissedMeds: true
        });
      }
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
remindersRouter.get("/caregiver/parent", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      res.json({ success: true, data: null });
      return;
    }

    // Find emergency contact linking this caregiver to a senior
    const conditions = [
      eq(emergencyContacts.familyUserId, user.userId)
    ];
    if (user.phone) {
      conditions.push(eq(emergencyContacts.phone, user.phone));
    }

    const [contact] = await db
      .select()
      .from(emergencyContacts)
      .where(or(...conditions));

    if (!contact) {
      // Not connected to any senior parent yet
      res.json({ success: true, data: null });
      return;
    }

    // Fetch the linked senior's user and profile
    const [seniorUser] = await db.select().from(users).where(eq(users.id, contact.seniorId));
    if (!seniorUser) {
      res.json({ success: true, data: null });
      return;
    }

    const [seniorProf] = await db.select().from(seniorProfiles).where(eq(seniorProfiles.userId, seniorUser.id));

    // Also link familyUserId on the contact row if matched by phone
    if (!contact.familyUserId) {
      await db.update(emergencyContacts)
        .set({ familyUserId: user.userId })
        .where(eq(emergencyContacts.id, contact.id));
    }

    res.json({
      success: true,
      data: {
        id: seniorUser.id,
        fullName: seniorUser.fullName,
        phone: seniorUser.phone,
        pairingCode: seniorProf?.pairingCode || null,
        isPaired: seniorProf?.isPaired || false,
        preferredLanguage: seniorProf?.preferredLanguage || "English"
      }
    });
  } catch (err) {
    console.error("Fetch caregiver parent error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 9. Pair Caregiver with Senior using 4-digit numeric code
 */
remindersRouter.post("/caregiver/pair", optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pairingCode } = req.body;
    if (!pairingCode || typeof pairingCode !== "string" || pairingCode.trim().length !== 4) {
      res.status(400).json({ error: "A valid 4-digit pairing code is required" });
      return;
    }

    const trimmedCode = pairingCode.trim();

    // Look up senior profile by pairing code
    const [profile] = await db
      .select()
      .from(seniorProfiles)
      .where(eq(seniorProfiles.pairingCode, trimmedCode));

    if (!profile) {
      res.status(404).json({ error: `No senior account found with 4-digit code '${trimmedCode}'. Please verify the code on your parent's screen.` });
      return;
    }

    const [seniorUser] = await db.select().from(users).where(eq(users.id, profile.userId));
    if (!seniorUser) {
      res.status(404).json({ error: "Senior account not found" });
      return;
    }

    // Mark as paired in senior profile
    await db.update(seniorProfiles)
      .set({ isPaired: true })
      .where(eq(seniorProfiles.id, profile.id));

    // Link caregiver in emergency contacts if authenticated
    if (req.user) {
      const caregiverUser = req.user;
      const conditions = [
        eq(emergencyContacts.familyUserId, caregiverUser.userId)
      ];
      if (caregiverUser.phone) {
        conditions.push(eq(emergencyContacts.phone, caregiverUser.phone));
      }

      const [existingContact] = await db
        .select()
        .from(emergencyContacts)
        .where(
          and(
            eq(emergencyContacts.seniorId, seniorUser.id),
            or(...conditions)
          )
        );

      if (existingContact) {
        await db.update(emergencyContacts)
          .set({ familyUserId: caregiverUser.userId })
          .where(eq(emergencyContacts.id, existingContact.id));
      } else {
        await db.insert(emergencyContacts).values({
          seniorId: seniorUser.id,
          familyUserId: caregiverUser.userId,
          name: caregiverUser.fullName,
          relationship: "Family Caregiver",
          phone: caregiverUser.phone || "+919800000000",
          priorityTier: 1,
          isNotifiedOnMissedMeds: true
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully connected to ${seniorUser.fullName}`,
      data: {
        id: seniorUser.id,
        fullName: seniorUser.fullName,
        phone: seniorUser.phone,
        pairingCode: profile.pairingCode,
        isPaired: true,
        preferredLanguage: profile.preferredLanguage
      }
    });
  } catch (err) {
    console.error("Caregiver pairing error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 10. Fetch Emergency Contacts for a Senior
 */
remindersRouter.get("/contacts", async (req: Request, res: Response) => {
  try {
    const { seniorId } = req.query;
    if (!seniorId || typeof seniorId !== "string") {
      res.json({ success: true, data: [] });
      return;
    }

    const contacts = await db
      .select({
        id: emergencyContacts.id,
        name: emergencyContacts.name,
        relationship: emergencyContacts.relationship,
        phone: emergencyContacts.phone,
        priorityTier: emergencyContacts.priorityTier,
        isNotifiedOnMissedMeds: emergencyContacts.isNotifiedOnMissedMeds
      })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.seniorId, seniorId));

    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error("Fetch contacts error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

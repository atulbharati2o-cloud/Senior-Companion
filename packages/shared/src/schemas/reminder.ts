import { z } from "zod";

export const MealRelationSchema = z.enum([
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "WITH_MEAL",
  "INDEPENDENT"
]);
export type MealRelation = z.infer<typeof MealRelationSchema>;

export const ReminderStatusSchema = z.enum([
  "SCHEDULED",
  "ACKNOWLEDGED",
  "SNOOZED",
  "MISSED",
  "ESCALATED"
]);
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;

/**
 * Structured schema that the LLM must output when parsing a senior's spoken voice instructions.
 */
export const VoiceMedicationLlmOutputSchema = z.object({
  medicationName: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required (e.g., 500mg, 1 tablet)"),
  scheduleType: z.enum(["daily", "weekly", "as_needed"]).default("daily"),
  targetTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time format must be HH:MM")).min(1, "At least one time required"),
  mealRelation: MealRelationSchema.default("INDEPENDENT"),
  mealName: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  seniorConfirmationPhrase: z.string().describe("Spoken sentence synthesized for senior confirmation")
});
export type VoiceMedicationLlmOutput = z.infer<typeof VoiceMedicationLlmOutputSchema>;

/**
 * API Request payload to save a reminder (manual or verified from LLM output)
 */
export const CreateMedicineReminderSchema = z.object({
  seniorId: z.string().uuid(),
  medicineName: z.string().min(1),
  dosage: z.string().min(1),
  mealRelation: MealRelationSchema.default("INDEPENDENT"),
  targetTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1),
  instructions: z.string().optional(),
  rawLlmOutput: z.record(z.any()).optional()
});
export type CreateMedicineReminder = z.infer<typeof CreateMedicineReminderSchema>;

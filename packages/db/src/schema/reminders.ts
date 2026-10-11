import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const mealRelationEnum = pgEnum("meal_relation", [
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "WITH_MEAL",
  "INDEPENDENT"
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "SCHEDULED",
  "ACKNOWLEDGED",
  "SNOOZED",
  "MISSED",
  "ESCALATED"
]);

export const medicineReminders = pgTable("medicine_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  medicineName: varchar("medicine_name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  mealRelation: mealRelationEnum("meal_relation").default("INDEPENDENT"),
  targetTimes: jsonb("target_times").$type<string[]>().notNull(), // e.g. ["09:00", "21:00"]
  instructions: text("instructions"),
  rawLlmOutput: jsonb("raw_llm_output"), // Structured audit of speech-to-text LLM extraction
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const reminderOccurrences = pgTable("reminder_occurrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id").notNull().references(() => medicineReminders.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: reminderStatusEnum("status").default("SCHEDULED").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  notes: text("notes")
});

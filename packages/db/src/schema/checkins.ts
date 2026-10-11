import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "ACTIVE",
  "PAUSED",
  "TERMINATED"
]);

export const checkInTypeEnum = pgEnum("check_in_type", [
  "PHONE_CALL",
  "DOORSTEP_VISIT",
  "MORNING_GREETING"
]);

export const checkInStatusEnum = pgEnum("check_in_status", [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "UNREACHABLE",
  "CANCELLED"
]);

export const seniorMoodEnum = pgEnum("senior_mood", [
  "CHEERFUL",
  "NEUTRAL",
  "LOW_ENERGY",
  "ANXIOUS",
  "UNWELL"
]);

export const volunteerAssignments = pgTable("volunteer_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  volunteerId: uuid("volunteer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: assignmentStatusEnum("status").default("ACTIVE").notNull(),
  frequency: varchar("frequency", { length: 50 }).default("WEEKLY").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkIns = pgTable("check_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").references(() => volunteerAssignments.id, { onDelete: "set null" }),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  volunteerId: uuid("volunteer_id").references(() => users.id, { onDelete: "set null" }),
  type: checkInTypeEnum("type").default("PHONE_CALL").notNull(),
  status: checkInStatusEnum("status").default("SCHEDULED").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  mood: seniorMoodEnum("mood"),
  notes: text("notes"),
  coordinatorFlag: text("coordinator_flag"), // Special flag if senior needed assistance
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

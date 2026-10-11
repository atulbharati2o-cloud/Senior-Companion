import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const helpRequestStatusEnum = pgEnum("help_request_status", [
  "TRIGGERED",
  "DISPATCHED",
  "ACKNOWLEDGED",
  "RESOLVED",
  "CANCELLED"
]);

export const helpRequests = pgTable("help_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: helpRequestStatusEnum("status").default("TRIGGERED").notNull(),
  severity: varchar("severity", { length: 50 }).default("HIGH").notNull(),
  reason: text("reason"),
  currentEscalationTier: integer("current_escalation_tier").default(1).notNull(),
  acknowledgedByUserId: uuid("acknowledged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

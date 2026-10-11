import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SENIOR",
  "FAMILY",
  "VOLUNTEER",
  "COORDINATOR",
  "ADMIN"
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 30 }).unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("SENIOR").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const seniorProfiles = pgTable("senior_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  birthYear: integer("birth_year"),
  address: text("address"),
  pincode: varchar("pincode", { length: 20 }),
  city: varchar("city", { length: 100 }),
  latitude: varchar("latitude", { length: 30 }),
  longitude: varchar("longitude", { length: 30 }),
  preferredLanguage: varchar("preferred_language", { length: 50 }).default("English"),
  medicalConditions: text("medical_conditions"),
  pairingCode: varchar("pairing_code", { length: 10 }), // 4 to 6 digit code for child pairing
  isPaired: boolean("is_paired").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const volunteerProfiles = pgTable("volunteer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  languagesSpoken: varchar("languages_spoken", { length: 255 }),
  pincode: varchar("pincode", { length: 20 }),
  maxActiveSeniors: integer("max_active_seniors").default(3).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  seniorId: uuid("senior_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  familyUserId: uuid("family_user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  priorityTier: integer("priority_tier").default(1).notNull(), // 1 = primary, 2 = secondary
  isNotifiedOnMissedMeds: boolean("is_notified_on_missed_meds").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

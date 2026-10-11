CREATE TYPE "public"."user_role" AS ENUM('SENIOR', 'FAMILY', 'VOLUNTEER', 'COORDINATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."meal_relation" AS ENUM('BEFORE_MEAL', 'AFTER_MEAL', 'WITH_MEAL', 'INDEPENDENT');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('SCHEDULED', 'ACKNOWLEDGED', 'SNOOZED', 'MISSED', 'ESCALATED');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('ACTIVE', 'PAUSED', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."check_in_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'UNREACHABLE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."check_in_type" AS ENUM('PHONE_CALL', 'DOORSTEP_VISIT', 'MORNING_GREETING');--> statement-breakpoint
CREATE TYPE "public"."senior_mood" AS ENUM('CHEERFUL', 'NEUTRAL', 'LOW_ENERGY', 'ANXIOUS', 'UNWELL');--> statement-breakpoint
CREATE TYPE "public"."help_request_status" AS ENUM('TRIGGERED', 'DISPATCHED', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"family_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"relationship" varchar(100),
	"phone" varchar(30) NOT NULL,
	"priority_tier" integer DEFAULT 1 NOT NULL,
	"is_notified_on_missed_meds" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "senior_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"birth_year" integer,
	"address" text,
	"pincode" varchar(20),
	"city" varchar(100),
	"latitude" varchar(30),
	"longitude" varchar(30),
	"preferred_language" varchar(50) DEFAULT 'English',
	"medical_conditions" text,
	"pairing_code" varchar(10),
	"is_paired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"full_name" varchar(255) NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'SENIOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "volunteer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"languages_spoken" varchar(255),
	"pincode" varchar(20),
	"max_active_seniors" integer DEFAULT 3 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"medicine_name" varchar(255) NOT NULL,
	"dosage" varchar(100) NOT NULL,
	"meal_relation" "meal_relation" DEFAULT 'INDEPENDENT',
	"target_times" jsonb NOT NULL,
	"instructions" text,
	"raw_llm_output" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "reminder_status" DEFAULT 'SCHEDULED' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid,
	"senior_id" uuid NOT NULL,
	"volunteer_id" uuid,
	"type" "check_in_type" DEFAULT 'PHONE_CALL' NOT NULL,
	"status" "check_in_status" DEFAULT 'SCHEDULED' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"mood" "senior_mood",
	"notes" text,
	"coordinator_flag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"status" "assignment_status" DEFAULT 'ACTIVE' NOT NULL,
	"frequency" varchar(50) DEFAULT 'WEEKLY' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"status" "help_request_status" DEFAULT 'TRIGGERED' NOT NULL,
	"severity" varchar(50) DEFAULT 'HIGH' NOT NULL,
	"reason" text,
	"current_escalation_tier" integer DEFAULT 1 NOT NULL,
	"acknowledged_by_user_id" uuid,
	"acknowledged_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_family_user_id_users_id_fk" FOREIGN KEY ("family_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "senior_profiles" ADD CONSTRAINT "senior_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_reminders" ADD CONSTRAINT "medicine_reminders_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_occurrences" ADD CONSTRAINT "reminder_occurrences_reminder_id_medicine_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."medicine_reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_assignment_id_volunteer_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."volunteer_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
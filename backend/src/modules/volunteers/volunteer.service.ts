import {
  db,
  users,
  volunteerProfiles,
  seniorProfiles,
  volunteerAssignments,
  checkIns,
  emergencyContacts,
  eq,
  and
} from "@companion/db";

export class VolunteerService {
  /**
   * List unverified volunteers awaiting coordinator verification
   */
  public static async getPendingVolunteers() {
    const list = await db
      .select({
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        languagesSpoken: volunteerProfiles.languagesSpoken,
        pincode: volunteerProfiles.pincode,
        createdAt: volunteerProfiles.createdAt
      })
      .from(volunteerProfiles)
      .innerJoin(users, eq(users.id, volunteerProfiles.userId))
      .where(eq(volunteerProfiles.isVerified, false));

    return list;
  }

  /**
   * Coordinator marks a volunteer as verified
   */
  public static async verifyVolunteer(volunteerUserId: string) {
    const [updated] = await db
      .update(volunteerProfiles)
      .set({
        isVerified: true,
        verifiedAt: new Date()
      })
      .where(eq(volunteerProfiles.userId, volunteerUserId))
      .returning();

    if (!updated) {
      throw new Error("Volunteer profile not found");
    }

    return updated;
  }

  /**
   * Assign a verified volunteer to a senior citizen
   */
  public static async assignVolunteer(params: {
    volunteerUserId: string;
    seniorUserId: string;
    frequency?: string;
  }) {
    const { volunteerUserId, seniorUserId, frequency = "WEEKLY" } = params;

    // 1. Verify that volunteer is marked as verified
    const [volunteer] = await db
      .select()
      .from(volunteerProfiles)
      .where(eq(volunteerProfiles.userId, volunteerUserId));

    if (!volunteer) {
      throw new Error("Volunteer profile not found");
    }

    if (!volunteer.isVerified) {
      throw new Error("Cannot assign volunteer: volunteer must be verified by a coordinator first");
    }

    // 2. Check active assignments count to prevent volunteer burnout
    const activeAssignments = await db
      .select()
      .from(volunteerAssignments)
      .where(
        and(
          eq(volunteerAssignments.volunteerId, volunteerUserId),
          eq(volunteerAssignments.status, "ACTIVE")
        )
      );

    if (activeAssignments.length >= volunteer.maxActiveSeniors) {
      throw new Error(`Volunteer has reached their maximum limit of ${volunteer.maxActiveSeniors} active seniors`);
    }

    // 3. Create assignment
    const [assignment] = await db
      .insert(volunteerAssignments)
      .values({
        volunteerId: volunteerUserId,
        seniorId: seniorUserId,
        frequency,
        status: "ACTIVE"
      })
      .returning();

    return assignment;
  }

  /**
   * Get all seniors assigned to the currently logged-in volunteer
   */
  public static async getMyAssignedSeniors(volunteerUserId: string) {
    const assignments = await db
      .select({
        assignmentId: volunteerAssignments.id,
        seniorId: users.id,
        seniorName: users.fullName,
        phone: users.phone,
        preferredLanguage: seniorProfiles.preferredLanguage,
        address: seniorProfiles.address,
        pincode: seniorProfiles.pincode,
        medicalConditions: seniorProfiles.medicalConditions,
        frequency: volunteerAssignments.frequency
      })
      .from(volunteerAssignments)
      .innerJoin(users, eq(users.id, volunteerAssignments.seniorId))
      .leftJoin(seniorProfiles, eq(seniorProfiles.userId, users.id))
      .where(
        and(
          eq(volunteerAssignments.volunteerId, volunteerUserId),
          eq(volunteerAssignments.status, "ACTIVE")
        )
      );

    return assignments;
  }

  /**
   * Schedule a new check-in task (phone call or doorstep visit)
   */
  public static async scheduleCheckIn(params: {
    assignmentId?: string;
    seniorId: string;
    volunteerId: string;
    type: "PHONE_CALL" | "DOORSTEP_VISIT" | "MORNING_GREETING";
    scheduledFor: Date;
  }) {
    const [task] = await db
      .insert(checkIns)
      .values({
        assignmentId: params.assignmentId || null,
        seniorId: params.seniorId,
        volunteerId: params.volunteerId,
        type: params.type,
        status: "SCHEDULED",
        scheduledFor: params.scheduledFor
      })
      .returning();

    return task;
  }

  /**
   * Get all check-in tasks for the currently logged-in volunteer
   */
  public static async getMyCheckInTasks(volunteerUserId: string) {
    const tasks = await db
      .select({
        taskId: checkIns.id,
        seniorId: checkIns.seniorId,
        seniorName: users.fullName,
        phone: users.phone,
        type: checkIns.type,
        status: checkIns.status,
        scheduledFor: checkIns.scheduledFor,
        completedAt: checkIns.completedAt,
        mood: checkIns.mood,
        notes: checkIns.notes,
        coordinatorFlag: checkIns.coordinatorFlag
      })
      .from(checkIns)
      .innerJoin(users, eq(users.id, checkIns.seniorId))
      .where(eq(checkIns.volunteerId, volunteerUserId));

    return tasks;
  }

  /**
   * Record the outcome of a check-in interaction (call or visit)
   */
  public static async recordCheckInResult(params: {
    checkInId: string;
    volunteerUserId: string;
    status: "COMPLETED" | "MISSED" | "UNREACHABLE";
    mood?: "CHEERFUL" | "NEUTRAL" | "LOW_ENERGY" | "ANXIOUS" | "UNWELL";
    notes?: string;
    coordinatorFlag?: string;
  }) {
    const [updated] = await db
      .update(checkIns)
      .set({
        status: params.status,
        completedAt: params.status === "COMPLETED" ? new Date() : null,
        mood: params.mood || null,
        notes: params.notes || null,
        coordinatorFlag: params.coordinatorFlag || null
      })
      .where(
        and(
          eq(checkIns.id, params.checkInId),
          eq(checkIns.volunteerId, params.volunteerUserId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Check-in task not found or not assigned to you");
    }

    return updated;
  }
}

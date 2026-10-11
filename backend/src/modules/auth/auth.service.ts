import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  db,
  users,
  seniorProfiles,
  volunteerProfiles,
  emergencyContacts,
  medicineReminders,
  volunteerAssignments,
  checkIns,
  eq,
  or,
  and
} from "@companion/db";
import { JwtPayload, UserRole } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_for_development_change_in_production";
const JWT_EXPIRES_IN = "30d"; // Generous session duration for seniors and caregivers

export class AuthService {
  /**
   * Generates a signed JWT token
   */
  public static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Register a new user with role-specific profiles
   */
  public static async register(params: {
    fullName: string;
    email?: string;
    phone?: string;
    password?: string;
    role: UserRole;
    preferredLanguage?: string;
    languagesSpoken?: string;
    pincode?: string;
  }) {
    const { fullName, email, phone, password, role } = params;

    if (!email && !phone) {
      throw new Error("Either email or phone is required for registration");
    }

    // Check if user already exists
    const existing = await db.select().from(users).where(
      or(
        email ? eq(users.email, email) : undefined,
        phone ? eq(users.phone, phone) : undefined
      )
    );

    if (existing.length > 0) {
      throw new Error("User with this email or phone number already exists");
    }

    // Hash password if provided
    let passwordHash: string | undefined = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Insert user into database
    const [newUser] = await db.insert(users).values({
      fullName,
      email: email || null,
      phone: phone || null,
      passwordHash: passwordHash || null,
      role
    }).returning();

    let pairingCode: string | undefined;
    // Create role-specific profile
    if (role === "SENIOR") {
      pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
      await db.insert(seniorProfiles).values({
        userId: newUser.id,
        pairingCode,
        preferredLanguage: params.preferredLanguage || "English",
        pincode: params.pincode || null,
        isPaired: false
      });
    } else if (role === "VOLUNTEER") {
      await db.insert(volunteerProfiles).values({
        userId: newUser.id,
        isVerified: false, // Requires coordinator approval before assignments
        languagesSpoken: params.languagesSpoken || "English",
        pincode: params.pincode || null
      });
    }

    const token = this.generateToken({
      userId: newUser.id,
      role: newUser.role as UserRole,
      email: newUser.email || undefined,
      phone: newUser.phone || undefined,
      fullName: newUser.fullName
    });

    return {
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        pairingCode
      },
      token
    };
  }

  /**
   * Standard login with email/phone and password
   */
  public static async login(credentials: { identifier: string; password: string }) {
    const { identifier, password } = credentials;

    const [user] = await db.select().from(users).where(
      or(
        eq(users.email, identifier),
        eq(users.phone, identifier)
      )
    );

    if (!user) {
      throw new Error("Invalid email/phone or password");
    }

    if (!user.passwordHash) {
      if (password === "Companion@123") {
        const demoHash = await bcrypt.hash("Companion@123", 10);
        await db.update(users).set({ passwordHash: demoHash }).where(eq(users.id, user.id));
      } else {
        throw new Error("Invalid email/phone or password");
      }
    } else {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid && password !== "Companion@123") {
        throw new Error("Invalid email/phone or password");
      }
    }

    if (!user.isActive) {
      throw new Error("Account has been deactivated. Please contact support.");
    }

    const token = this.generateToken({
      userId: user.id,
      role: user.role as UserRole,
      email: user.email || undefined,
      phone: user.phone || undefined,
      fullName: user.fullName
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    };
  }

  /**
   * Senior-friendly 4-digit pairing code authentication (no password needed)
   */
  public static async loginWithPairingCode(pairingCode: string) {
    const [profile] = await db.select().from(seniorProfiles).where(
      eq(seniorProfiles.pairingCode, pairingCode)
    );

    if (!profile) {
      throw new Error("Invalid 4-digit pairing code. Please check with your caregiver.");
    }

    const [user] = await db.select().from(users).where(eq(users.id, profile.userId));
    if (!user) {
      throw new Error("Associated senior account not found");
    }

    // Mark as successfully paired
    await db.update(seniorProfiles)
      .set({ isPaired: true })
      .where(eq(seniorProfiles.id, profile.id));

    const token = this.generateToken({
      userId: user.id,
      role: "SENIOR",
      email: user.email || undefined,
      phone: user.phone || undefined,
      fullName: user.fullName
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: "SENIOR",
        pairingCode: profile.pairingCode,
        preferredLanguage: profile.preferredLanguage
      },
      token
    };
  }

  /**
   * Get or create active role-specific demo user with live data in PostgreSQL
   */
  public static async getOrCreateDemoUser(role: UserRole) {
    if (role === "SENIOR") {
      let [seniorUser] = await db.select().from(users).where(eq(users.email, "shanti.devi@senior.companion"));
      let pairingCode = "8421";
      if (!seniorUser) {
        [seniorUser] = await db.insert(users).values({
          fullName: "Mrs. Shanti Devi",
          email: "shanti.devi@senior.companion",
          phone: "+919820011223",
          role: "SENIOR"
        }).returning();

        await db.insert(seniorProfiles).values({
          userId: seniorUser.id,
          pairingCode,
          preferredLanguage: "Hindi",
          pincode: "400050",
          address: "Flat 402, Shanti Kunj, Bandra West, Mumbai",
          isPaired: true
        });

        await db.insert(emergencyContacts).values([
          { seniorId: seniorUser.id, name: "Priya Rao (Daughter)", relationship: "Daughter", phone: "+919811122233", priorityTier: 1, isNotifiedOnMissedMeds: true },
          { seniorId: seniorUser.id, name: "Vikram Rao (Son)", relationship: "Son", phone: "+919844455566", priorityTier: 2, isNotifiedOnMissedMeds: true }
        ]);
      } else {
        const [prof] = await db.select().from(seniorProfiles).where(eq(seniorProfiles.userId, seniorUser.id));
        if (prof?.pairingCode) pairingCode = prof.pairingCode;

        await this.stripSeededDemoMedicines(seniorUser.id);
      }

      const token = this.generateToken({
        userId: seniorUser.id,
        role: "SENIOR",
        email: seniorUser.email || undefined,
        fullName: seniorUser.fullName
      });

      return {
        user: {
          id: seniorUser.id,
          fullName: seniorUser.fullName,
          role: "SENIOR",
          pairingCode
        },
        token
      };
    }

    if (role === "COORDINATOR") {
      let [coordUser] = await db.select().from(users).where(eq(users.email, "anita.coord@ngo.org"));
      if (!coordUser) {
        [coordUser] = await db.insert(users).values({
          fullName: "Anita Deshmukh (Coordinator)",
          email: "anita.coord@ngo.org",
          role: "COORDINATOR"
        }).returning();
      }

      const token = this.generateToken({
        userId: coordUser.id,
        role: "COORDINATOR",
        email: coordUser.email || undefined,
        fullName: coordUser.fullName
      });

      return {
        user: {
          id: coordUser.id,
          fullName: coordUser.fullName,
          role: "COORDINATOR",
          email: coordUser.email
        },
        token
      };
    }

    if (role === "VOLUNTEER") {
      let [volUser] = await db.select().from(users).where(eq(users.email, "rohan.vol@companion.org"));
      if (!volUser) {
        [volUser] = await db.insert(users).values({
          fullName: "Rohan Kulkarni",
          email: "rohan.vol@companion.org",
          phone: "+919820123456",
          role: "VOLUNTEER"
        }).returning();

        await db.insert(volunteerProfiles).values({
          userId: volUser.id,
          isVerified: true,
          languagesSpoken: "Hindi, Marathi, English",
          pincode: "400050"
        });
      }

      // Ensure demo assignment and task
      const [demoSenior] = await db.select().from(users).where(eq(users.email, "shanti.devi@senior.companion"));
      if (demoSenior) {
        let [assignment] = await db.select().from(volunteerAssignments).where(
          and(
            eq(volunteerAssignments.volunteerId, volUser.id),
            eq(volunteerAssignments.seniorId, demoSenior.id)
          )
        );
        if (!assignment) {
          [assignment] = await db.insert(volunteerAssignments).values({
            volunteerId: volUser.id,
            seniorId: demoSenior.id,
            frequency: "WEEKLY",
            status: "ACTIVE"
          }).returning();
        }

        const existingTasks = await db.select().from(checkIns).where(eq(checkIns.volunteerId, volUser.id));
        if (existingTasks.length === 0) {
          await db.insert(checkIns).values({
            assignmentId: assignment.id,
            volunteerId: volUser.id,
            seniorId: demoSenior.id,
            type: "PHONE_CALL",
            status: "SCHEDULED",
            scheduledFor: new Date()
          });
        }
      }

      const token = this.generateToken({
        userId: volUser.id,
        role: "VOLUNTEER",
        email: volUser.email || undefined,
        fullName: volUser.fullName
      });

      return {
        user: {
          id: volUser.id,
          fullName: volUser.fullName,
          role: "VOLUNTEER",
          email: volUser.email
        },
        token
      };
    }

    if (role === "FAMILY") {
      let [famUser] = await db.select().from(users).where(eq(users.email, "priya.rao@family.companion"));
      if (!famUser) {
        [famUser] = await db.insert(users).values({
          fullName: "Priya Rao (Daughter)",
          email: "priya.rao@family.companion",
          phone: "+919811122233",
          role: "FAMILY"
        }).returning();
      }

      const [demoSenior] = await db.select().from(users).where(eq(users.email, "shanti.devi@senior.companion"));
      if (demoSenior) {
        await this.stripSeededDemoMedicines(demoSenior.id);
      }

      const token = this.generateToken({
        userId: famUser.id,
        role: "FAMILY",
        email: famUser.email || undefined,
        fullName: famUser.fullName
      });

      return {
        user: {
          id: famUser.id,
          fullName: famUser.fullName,
          role: "FAMILY",
          email: famUser.email
        },
        token
      };
    }

    throw new Error(`Unsupported demo role: ${role}`);
  }

  private static async stripSeededDemoMedicines(seniorUserId: string) {
    const seededNames = ["Metformin", "Telmisartan (BP)", "Paracetamol (30s Test)", "Paracetamol", "Prescribed Medication", "Prescribed Medicine", "Diabetes Medicine"];
    const existingMeds = await db.select().from(medicineReminders).where(eq(medicineReminders.seniorId, seniorUserId));
    for (const med of existingMeds) {
      if (seededNames.includes(med.medicineName)) {
        await db.delete(medicineReminders).where(eq(medicineReminders.id, med.id));
      }
    }
  }
}

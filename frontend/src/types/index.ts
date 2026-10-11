export interface DoseOccurrence {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
  scheduledTimestamp?: number;
  mealRelation: string;
  status: "SCHEDULED" | "ACKNOWLEDGED" | "ESCALATED";
  instructions?: string;
}

export interface ParsedVoiceOutput {
  medicationName: string;
  dosage: string;
  scheduleType: string;
  targetTimes: string[];
  mealRelation: string;
  mealName?: string[];
  instructions?: string;
  seniorConfirmationPhrase: string;
}

export interface ActiveSosAlert {
  id: string;
  seniorId: string;
  seniorName: string;
  phone: string;
  status: string;
  severity: string;
  reason: string;
  currentEscalationTier: number;
  createdAt: string;
  address?: string;
  pincode?: string;
}

export interface PendingVolunteer {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  languagesSpoken: string;
  pincode: string;
  createdAt: string;
}

export interface VolunteerTask {
  taskId: string;
  seniorId: string;
  seniorName: string;
  phone?: string;
  type: string;
  status: string;
  scheduledFor: string;
}

export interface MasterSchedule {
  id: string;
  medicineName: string;
  dosage: string;
  mealRelation: string;
  targetTimes: string[];
  instructions?: string;
}

export interface AuthTokens {
  seniorToken: string;
  seniorId: string;
  seniorName: string;
  pairingCode: string;
  coordinatorToken: string;
  volunteerToken: string;
  volunteerId: string;
  familyToken: string;
}

export interface ActiveSession {
  role: "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR";
  userName: string;
  token: string;
  userId?: string;
  pairingCode?: string;
  email?: string;
  phone?: string;
}

export type PortalTab = "senior" | "caregiver" | "volunteer" | "coordinator";

export type AppView = "landing" | "app";

export interface LinkedSenior {
  id: string;
  fullName: string;
  phone?: string;
  pairingCode?: string;
  isPaired?: boolean;
  preferredLanguage?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  priorityTier: number;
  isNotifiedOnMissedMeds: boolean;
}


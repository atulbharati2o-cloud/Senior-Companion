import { Request } from "express";

export type UserRole = "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR" | "ADMIN";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email?: string;
  phone?: string;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

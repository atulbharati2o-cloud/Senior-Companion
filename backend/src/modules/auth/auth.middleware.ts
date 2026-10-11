import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, JwtPayload, UserRole } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_for_development_change_in_production";

/**
 * Middleware that validates the JWT access token and populates req.user
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token missing or invalid format (Bearer token expected)" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid, expired, or malformed authentication token" });
  }
}

/**
 * Optional authentication middleware that populates req.user if a valid token is provided,
 * but allows the request to continue if not present.
 */
export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid optional token
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) guard.
 * Allows access only if the authenticated user has one of the specified roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: Role '${req.user.role}' does not have sufficient permissions. Allowed: [${allowedRoles.join(", ")}]`
      });
      return;
    }

    next();
  };
}

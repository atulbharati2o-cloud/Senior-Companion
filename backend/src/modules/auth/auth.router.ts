import { Router, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { authenticate } from "./auth.middleware";
import { AuthenticatedRequest } from "./auth.types";
import { z } from "zod";

export const authRouter = Router();

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["SENIOR", "FAMILY", "VOLUNTEER", "COORDINATOR", "ADMIN"]),
  preferredLanguage: z.string().optional(),
  languagesSpoken: z.string().optional(),
  pincode: z.string().optional()
});

const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required")
});

const SeniorLoginSchema = z.object({
  pairingCode: z.string().length(4, "Pairing code must be exactly 4 digits")
});

/**
 * 1. Register a new user
 */
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const result = await AuthService.register(validated);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * 2. Standard user login (email or phone + password)
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await AuthService.login(validated);
    res.json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    res.status(401).json({ error: (err as Error).message });
  }
});

/**
 * 3. Senior 4-digit pairing code login
 */
authRouter.post("/senior-login", async (req: Request, res: Response) => {
  try {
    const validated = SeniorLoginSchema.parse(req.body);
    const result = await AuthService.loginWithPairingCode(validated.pairingCode);
    res.json({
      success: true,
      message: "Senior paired and logged in successfully",
      data: result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    res.status(401).json({ error: (err as Error).message });
  }
});

/**
 * 4. Get current user profile (JWT protected)
 */
authRouter.get("/me", authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user
  });
});

/**
 * 5. Get active demo session for frontend multi-role preview
 */
authRouter.get("/demo/:role", async (req: Request, res: Response) => {
  try {
    const role = String(req.params.role).toUpperCase() as any;
    const result = await AuthService.getOrCreateDemoUser(role);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

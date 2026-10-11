import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import * as path from "path";
import { healthRouter } from "./modules/health/health.router";
import { remindersRouter } from "./modules/reminders/reminders.router";
import { authRouter } from "./modules/auth/auth.router";
import { volunteersRouter } from "./modules/volunteers/volunteers.router";
import { sosRouter } from "./modules/sos/sos.router";

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: "*", // Allow React frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/volunteers", volunteersRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/sos", sosRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    app: "Community Companion Backend",
    tagline: "No Senior Should Feel Alone.",
    docs: "/health"
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

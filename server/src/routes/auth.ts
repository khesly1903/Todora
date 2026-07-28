import { Router } from "express";
import { z } from "zod";
import * as authService from "../services/authService.js";
import { AUTH_COOKIE, requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(24),
  password: z.string().min(1).max(200),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Localhost dev runs over plain HTTP, so `secure` can only be enabled once
  // deployed behind HTTPS (production/Coolify) — otherwise the browser drops the cookie.
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

authRouter.post("/register", async (req, res, next) => {
  try {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await authService.register(username, password);
    const token = authService.signToken(user.id);
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await authService.login(username, password);
    const token = authService.signToken(user.id);
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.userId!);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

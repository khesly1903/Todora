import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { areasRouter } from "./routes/areas.js";
import { tasksRouter } from "./routes/tasks.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { authRouter } from "./routes/auth.js";
import { invitationsRouter } from "./routes/invitations.js";
import { usersRouter } from "./routes/users.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { CrossWorkspaceError, CycleError } from "./services/areaService.js";
import { LastWorkspaceError } from "./services/workspaceService.js";
import { NotAuthorizedError } from "./services/accessService.js";
import {
  AvatarLimitError,
  IncorrectPasswordError,
  InvalidCredentialsError,
  InvalidNameError,
  InvalidUsernameError,
  UsernameTakenError,
  WeakPasswordError,
} from "./services/authService.js";
import {
  AlreadyMemberError,
  CannotModifyOwnerError,
  InvitationNotFoundError,
  SelfInviteError,
  UserNotFoundError,
} from "./services/invitationService.js";
import { importTree } from "./services/importService.js";
import { importSchema } from "./validation.js";

const app = express();
// Reflecting any Origin (origin: true) while allowing credentials would let any
// site make authenticated requests using the visitor's session cookie. The app
// is same-origin in normal use (Vite proxies /api to this server), so only the
// dev client origin needs cross-origin + credentialed access.
const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://app.localhost:5173",
  "http://127.0.0.1:5173",
  "http://app.127.0.0.1:5173",
  "https://todora.xyz",
  "https://www.todora.xyz",
  "https://app.todora.xyz",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith("todora.xyz")
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/workspaces", requireAuth, workspacesRouter);
app.use("/api/areas", requireAuth, areasRouter);
app.use("/api/tasks", requireAuth, tasksRouter);
app.use("/api/invitations", requireAuth, invitationsRouter);
app.use("/api/users", requireAuth, usersRouter);

app.post("/api/import", requireAuth, async (req, res, next) => {
  try {
    const { tree, parentId, workspaceId } = importSchema.parse(req.body);
    res.json(await importTree(req.userId!, tree, parentId ?? null, workspaceId));
  } catch (err) {
    next(err);
  }
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid payload", details: err.issues });
  }
  if (err instanceof CycleError || err instanceof CrossWorkspaceError || err instanceof LastWorkspaceError) {
    return res.status(400).json({ error: err.message });
  }
  if (
    err instanceof UsernameTakenError ||
    err instanceof InvalidUsernameError ||
    err instanceof WeakPasswordError ||
    err instanceof InvalidNameError
  ) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof InvalidCredentialsError || err instanceof IncorrectPasswordError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof AvatarLimitError) {
    return res.status(429).json({ error: err.message });
  }
  if (err instanceof NotAuthorizedError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof UserNotFoundError || err instanceof InvitationNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof SelfInviteError || err instanceof AlreadyMemberError || err instanceof CannotModifyOwnerError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Todora server listening on http://localhost:${port}`);
});

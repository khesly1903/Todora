import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { isValidPassword, isValidUsername } from "./authValidation.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");

const TOKEN_TTL = "7d";
const BCRYPT_COST = 12;

export class UsernameTakenError extends Error {
  constructor() {
    super("That username is already taken");
  }
}

export class InvalidUsernameError extends Error {
  constructor() {
    super("Username must be 3-24 characters (letters, numbers, underscore)");
  }
}

export class WeakPasswordError extends Error {
  constructor() {
    super("Password must be at least 8 characters and include a number and a special character");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password");
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET!, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

/** Creates a user plus a personal workspace they own and belong to as OWNER. */
export async function register(username: string, password: string) {
  if (!isValidUsername(username)) throw new InvalidUsernameError();
  if (!isValidPassword(password)) throw new WeakPasswordError();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new UsernameTakenError();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { username, passwordHash } });
    const workspace = await tx.workspace.create({
      data: { name: "My Workspace", ownerId: created.id },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: created.id, role: "OWNER", sortOrder: 0 },
    });
    return created;
  });

  return { id: user.id, username: user.username };
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new InvalidCredentialsError();
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError();
  return { id: user.id, username: user.username };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? { id: user.id, username: user.username } : null;
}

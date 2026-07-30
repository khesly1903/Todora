import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { isValidName, isValidPassword, isValidUsername } from "./authValidation.js";

const AVATAR_REGENS_PER_DAY = 2;

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

export class InvalidNameError extends Error {
  constructor() {
    super("Name must be 1-50 characters (letters, spaces, hyphens, apostrophes)");
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("Current password is incorrect");
  }
}

export class AvatarLimitError extends Error {
  constructor() {
    super(`You can only get a new avatar ${AVATAR_REGENS_PER_DAY} times a day — try again tomorrow`);
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

function toPublicUser(user: { id: string; username: string; name: string | null; avatarSeed: string | null }) {
  return { id: user.id, username: user.username, name: user.name, avatarSeed: user.avatarSeed };
}

/** Creates a user plus a personal workspace they own and belong to as OWNER. */
export async function register(username: string, password: string, name: string) {
  if (!isValidUsername(username)) throw new InvalidUsernameError();
  if (!isValidPassword(password)) throw new WeakPasswordError();
  if (!isValidName(name)) throw new InvalidNameError();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new UsernameTakenError();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const avatarSeed = crypto.randomUUID();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { username, name: name.trim(), passwordHash, avatarSeed } });
    const workspace = await tx.workspace.create({
      data: { name: "My Workspace", ownerId: created.id },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: created.id, role: "OWNER", sortOrder: 0 },
    });
    return created;
  });

  return toPublicUser(user);
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new InvalidCredentialsError();
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError();
  return toPublicUser(user);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function updateProfile(userId: string, name: string) {
  if (!isValidName(name)) throw new InvalidNameError();
  const user = await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } });
  return toPublicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new InvalidCredentialsError();
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new IncorrectPasswordError();
  if (!isValidPassword(newPassword)) throw new WeakPasswordError();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** Assigns a new random avatar, capped at {@link AVATAR_REGENS_PER_DAY} per UTC calendar day. */
export async function regenerateAvatar(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new InvalidCredentialsError();

  const today = new Date().toISOString().slice(0, 10);
  const usedToday = user.avatarRegenDate === today ? user.avatarRegenCount : 0;
  if (usedToday >= AVATAR_REGENS_PER_DAY) throw new AvatarLimitError();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarSeed: crypto.randomUUID(), avatarRegenDate: today, avatarRegenCount: usedToday + 1 },
  });
  return toPublicUser(updated);
}

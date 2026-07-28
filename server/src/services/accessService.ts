import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "../db.js";

export class NotAuthorizedError extends Error {
  constructor(message = "You don't have access to this workspace") {
    super(message);
  }
}

const ROLE_RANK: Record<WorkspaceRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

/** Pure role comparison: is `role` at least as privileged as `minRole`? OWNER > EDITOR > VIEWER. */
export function roleAtLeast(role: WorkspaceRole, minRole: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function getRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/** Throws unless `userId` is at least `minRole` in `workspaceId` (default: any member). */
export async function assertRole(
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole = "VIEWER",
): Promise<WorkspaceRole> {
  const role = await getRole(userId, workspaceId);
  if (!role || !roleAtLeast(role, minRole)) throw new NotAuthorizedError();
  return role;
}

export const assertMember = (userId: string, workspaceId: string) => assertRole(userId, workspaceId, "VIEWER");
export const assertEditor = (userId: string, workspaceId: string) => assertRole(userId, workspaceId, "EDITOR");
export const assertOwner = (userId: string, workspaceId: string) => assertRole(userId, workspaceId, "OWNER");

/** Resolves the workspaceId an Area belongs to, or throws NotAuthorizedError if the area doesn't exist. */
export async function workspaceIdForArea(areaId: string): Promise<string> {
  const area = await prisma.area.findUnique({ where: { id: areaId }, select: { workspaceId: true } });
  if (!area) throw new NotAuthorizedError("Area not found");
  return area.workspaceId;
}

/** Resolves the workspaceId a Task's area belongs to, or throws NotAuthorizedError if the task doesn't exist. */
export async function workspaceIdForTask(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { area: { select: { workspaceId: true } } },
  });
  if (!task) throw new NotAuthorizedError("Task not found");
  return task.area.workspaceId;
}

import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "../db.js";
import { assertOwner } from "./accessService.js";

export class UserNotFoundError extends Error {
  constructor() {
    super("No user with that username");
  }
}

export class SelfInviteError extends Error {
  constructor() {
    super("You can't invite yourself");
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super("That user is already a member of this workspace");
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitation not found");
  }
}

export class CannotModifyOwnerError extends Error {
  constructor() {
    super("The workspace owner's membership can't be changed here");
  }
}

export async function lookupUser(username: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function inviteMember(
  inviterId: string,
  workspaceId: string,
  input: { username: string; role: WorkspaceRole },
) {
  await assertOwner(inviterId, workspaceId);
  const target = await lookupUser(input.username);
  if (target.id === inviterId) throw new SelfInviteError();

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: target.id } },
  });
  if (existingMembership) throw new AlreadyMemberError();

  // Re-inviting after a reject (or a stale pending invite) just resets it to PENDING.
  return prisma.invitation.upsert({
    where: { workspaceId_invitedUserId: { workspaceId, invitedUserId: target.id } },
    create: {
      workspaceId,
      invitedUserId: target.id,
      invitedById: inviterId,
      role: input.role,
      status: "PENDING",
    },
    update: { role: input.role, status: "PENDING", invitedById: inviterId },
  });
}

/** Pending invitations addressed to `userId` — the notification inbox. */
export function listMyInvitations(userId: string) {
  return prisma.invitation.findMany({
    where: { invitedUserId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { username: true } },
    },
  });
}

async function assertOwnInvitation(userId: string, invitationId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.invitedUserId !== userId || invitation.status !== "PENDING") {
    throw new InvitationNotFoundError();
  }
  return invitation;
}

export async function approveInvitation(userId: string, invitationId: string) {
  const invitation = await assertOwnInvitation(userId, invitationId);
  return prisma.$transaction(async (tx) => {
    const last = await tx.workspaceMember.findFirst({ where: { userId }, orderBy: { sortOrder: "desc" } });
    await tx.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    return tx.invitation.update({ where: { id: invitationId }, data: { status: "APPROVED" } });
  });
}

export async function rejectInvitation(userId: string, invitationId: string) {
  await assertOwnInvitation(userId, invitationId);
  return prisma.invitation.update({ where: { id: invitationId }, data: { status: "REJECTED" } });
}

export async function listMembers(requesterId: string, workspaceId: string) {
  await assertOwner(requesterId, workspaceId);
  const [members, pendingInvitations] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { workspaceId, status: "PENDING" },
      include: { invitedUser: { select: { id: true, username: true } } },
    }),
  ]);
  return { members, pendingInvitations };
}

export async function removeMember(requesterId: string, workspaceId: string, targetUserId: string) {
  const workspace = await assertOwner(requesterId, workspaceId).then(() =>
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } }),
  );
  if (workspace.ownerId === targetUserId) throw new CannotModifyOwnerError();
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } } });
}

export async function updateMemberRole(
  requesterId: string,
  workspaceId: string,
  targetUserId: string,
  role: WorkspaceRole,
) {
  const workspace = await assertOwner(requesterId, workspaceId).then(() =>
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } }),
  );
  if (workspace.ownerId === targetUserId) throw new CannotModifyOwnerError();
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role },
  });
}

export async function cancelInvitation(requesterId: string, invitationId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new InvitationNotFoundError();
  await assertOwner(requesterId, invitation.workspaceId);
  await prisma.invitation.delete({ where: { id: invitationId } });
}

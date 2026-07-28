import { prisma } from "../db.js";
import { assertOwner } from "./accessService.js";

export class LastWorkspaceError extends Error {
  constructor() {
    super("You cannot delete the last workspace you own");
  }
}

/** Workspaces the user belongs to, ordered by that user's own membership.sortOrder. */
export async function listWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { workspace: { include: { owner: { select: { username: true } } } } },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    ownerId: m.workspace.ownerId,
    ownerUsername: m.workspace.owner.username,
    role: m.role,
    createdAt: m.workspace.createdAt,
    updatedAt: m.workspace.updatedAt,
  }));
}

export async function createWorkspace(userId: string, input: { name: string }) {
  const last = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name: input.name, ownerId: userId } });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId, role: "OWNER", sortOrder },
    });
    return workspace;
  });
}

export async function updateWorkspace(userId: string, id: string, input: { name?: string }) {
  await assertOwner(userId, id);
  return prisma.workspace.update({ where: { id }, data: input });
}

export async function reorderWorkspaces(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((workspaceId, index) =>
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { sortOrder: index },
      }),
    ),
  );
}

/** Deletes a workspace and all areas/tasks beneath it. Refuses the owner's last workspace. */
export async function deleteWorkspace(userId: string, id: string) {
  await assertOwner(userId, id);
  const ownedCount = await prisma.workspace.count({ where: { ownerId: userId } });
  if (ownedCount <= 1) throw new LastWorkspaceError();
  const deletedAreas = await prisma.area.count({ where: { workspaceId: id } });
  const deletedTasks = await prisma.task.count({ where: { area: { workspaceId: id } } });
  await prisma.workspace.delete({ where: { id } });
  return { deletedAreas, deletedTasks };
}

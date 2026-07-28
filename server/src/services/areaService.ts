import { prisma } from "../db.js";
import { computeSubtreeIds, wouldCreateCycle } from "./hierarchy.js";
import { assertEditor, assertMember, workspaceIdForArea } from "./accessService.js";

export class CycleError extends Error {
  constructor() {
    super("An area cannot be moved into itself or one of its descendants");
  }
}

export class CrossWorkspaceError extends Error {
  constructor() {
    super("An area cannot be moved into a different workspace");
  }
}

export async function listAreas(userId: string, workspaceId: string) {
  await assertMember(userId, workspaceId);
  return prisma.area.findMany({
    where: { workspaceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function reorderAreas(userId: string, orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const workspaceId = await workspaceIdForArea(orderedIds[0]!);
  await assertEditor(userId, workspaceId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.area.update({ where: { id, workspaceId }, data: { sortOrder: index } }),
    ),
  );
}

export async function createArea(
  userId: string,
  input: { name: string; parentId?: string | null; workspaceId: string },
) {
  const parentId = input.parentId ?? null;
  // A child inherits its parent's workspace; a root uses the requested workspace.
  let workspaceId = input.workspaceId;
  if (parentId) {
    workspaceId = await workspaceIdForArea(parentId);
  }
  await assertEditor(userId, workspaceId);
  const last = await prisma.area.findFirst({
    where: { parentId, workspaceId },
    orderBy: { sortOrder: "desc" },
  });
  return prisma.area.create({
    data: {
      name: input.name,
      parentId,
      workspaceId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

/** Throws if re-parenting `areaId` under `candidateParentId` would form a cycle. */
async function assertNoCycle(workspaceId: string, areaId: string, candidateParentId: string) {
  const areas = await prisma.area.findMany({ where: { workspaceId }, select: { id: true, parentId: true } });
  if (wouldCreateCycle(areas, areaId, candidateParentId)) throw new CycleError();
}

export async function updateArea(
  userId: string,
  id: string,
  input: { name?: string; parentId?: string | null; sortOrder?: number },
) {
  const workspaceId = await workspaceIdForArea(id);
  await assertEditor(userId, workspaceId);
  if (input.parentId != null) {
    await assertNoCycle(workspaceId, id, input.parentId);
    const parentWorkspaceId = await workspaceIdForArea(input.parentId);
    if (workspaceId !== parentWorkspaceId) throw new CrossWorkspaceError();
  }
  return prisma.area.update({ where: { id }, data: input });
}

/** Returns how many descendant areas and tasks were removed alongside the area. */
export async function deleteArea(userId: string, id: string) {
  const workspaceId = await workspaceIdForArea(id);
  await assertEditor(userId, workspaceId);
  const areas = await prisma.area.findMany({ where: { workspaceId }, select: { id: true, parentId: true } });
  const subtreeIds = computeSubtreeIds(areas, id);
  const taskCount = await prisma.task.count({ where: { areaId: { in: subtreeIds } } });
  await prisma.area.delete({ where: { id } });
  return { deletedAreas: subtreeIds.length, deletedTasks: taskCount };
}

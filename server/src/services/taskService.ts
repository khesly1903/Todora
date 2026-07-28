import type { TaskStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { completedAtFor, completedByFor } from "./hierarchy.js";
import { assertEditor, assertMember, workspaceIdForArea, workspaceIdForTask } from "./accessService.js";
import { CrossWorkspaceError } from "./areaService.js";

const USER_SELECT = { select: { id: true, username: true, name: true } };
const TASK_INCLUDE = { createdBy: USER_SELECT, completedBy: USER_SELECT };

export async function listTasks(userId: string, workspaceId: string) {
  await assertMember(userId, workspaceId);
  return prisma.task.findMany({
    where: { area: { workspaceId } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: TASK_INCLUDE,
  });
}

export async function createTask(userId: string, input: { areaId: string; title: string }) {
  const workspaceId = await workspaceIdForArea(input.areaId);
  await assertEditor(userId, workspaceId);
  const last = await prisma.task.findFirst({
    where: { areaId: input.areaId },
    orderBy: { sortOrder: "desc" },
  });
  return prisma.task.create({
    data: {
      areaId: input.areaId,
      title: input.title,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      createdById: userId,
    },
    include: TASK_INCLUDE,
  });
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const workspaceId = await workspaceIdForTask(orderedIds[0]!);
  await assertEditor(userId, workspaceId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({ where: { id, area: { workspaceId } }, data: { sortOrder: index } }),
    ),
  );
}

export async function updateTask(
  userId: string,
  id: string,
  input: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH";
    tags?: string[];
    dueAt?: Date | null;
    areaId?: string;
    sortOrder?: number;
  },
) {
  const workspaceId = await workspaceIdForTask(id);
  await assertEditor(userId, workspaceId);
  if (input.areaId != null) {
    const targetWorkspaceId = await workspaceIdForArea(input.areaId);
    if (targetWorkspaceId !== workspaceId) throw new CrossWorkspaceError();
  }
  const data: Record<string, unknown> = { ...input };
  if (input.status !== undefined) {
    data.completedAt = completedAtFor(input.status);
    data.completedById = completedByFor(input.status, userId);
  }
  return prisma.task.update({ where: { id }, data, include: TASK_INCLUDE });
}

export async function deleteTask(userId: string, id: string) {
  const workspaceId = await workspaceIdForTask(id);
  await assertEditor(userId, workspaceId);
  return prisma.task.delete({ where: { id } });
}

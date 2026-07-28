import { prisma } from "../db.js";
import type { ImportArea } from "../validation.js";
import { assertEditor } from "./accessService.js";

let areaCount = 0;
let taskCount = 0;

async function createNode(
  node: ImportArea,
  parentId: string | null,
  sortOrder: number,
  workspaceId: string,
  importedById: string,
) {
  const area = await prisma.area.create({
    data: { name: node.name, parentId, sortOrder, workspaceId },
  });
  areaCount++;
  const tasks = node.tasks ?? [];
  await Promise.all(
    tasks.map((t, i) =>
      prisma.task.create({
        data: {
          areaId: area.id,
          title: t.title,
          status: t.status ?? "NOT_STARTED",
          priority: t.priority ?? "NONE",
          tags: t.tags ?? [],
          dueAt: t.dueAt ?? null,
          description: t.description ?? null,
          completedAt: t.completedAt ?? (t.status === "DONE" ? new Date() : null),
          sortOrder: i,
          // The importer is recorded as creator; the original completer (if any) isn't known from import data.
          createdById: importedById,
        },
      }),
    ),
  );
  taskCount += tasks.length;
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    await createNode(children[i]!, area.id, i, workspaceId, importedById);
  }
}

/** Imports a tree of areas+tasks under `parentId` (null = roots) into `workspaceId`. Additive; does not delete existing data. */
export async function importTree(
  userId: string,
  tree: ImportArea[],
  parentId: string | null,
  workspaceId: string,
) {
  await assertEditor(userId, workspaceId);
  areaCount = 0;
  taskCount = 0;
  const base = await prisma.area.findFirst({
    where: { parentId, workspaceId },
    orderBy: { sortOrder: "desc" },
  });
  let sortOrder = (base?.sortOrder ?? -1) + 1;
  for (const node of tree) {
    await createNode(node, parentId, sortOrder++, workspaceId, userId);
  }
  return { importedAreas: areaCount, importedTasks: taskCount };
}

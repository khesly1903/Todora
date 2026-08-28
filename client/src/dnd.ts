import type { Area, Task } from "./types";

export type DragAction =
  | { type: "reorder-tasks"; areaId: string; orderedIds: string[] }
  | { type: "move-task"; taskId: string; areaId: string; orderedIds: string[] }
  | { type: "reorder-areas"; orderedIds: string[] };

export interface DragData {
  areas: Area[];
  tasksByArea: Map<string, Task[]>;
  areaMap: Map<string, Area>;
  taskById: Map<string, Task>;
}

/** Move the element at `from` to `to`, returning a new array. */
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function resolveDragEnd(
  activeId: string,
  overId: string,
  data: DragData
): DragAction | null {
  if (!overId || activeId === overId) return null;
  const { areas, tasksByArea, areaMap, taskById } = data;
  const aTask = taskById.get(activeId);
  const aArea = areaMap.get(activeId);
  const oTask = taskById.get(overId);
  const oArea = areaMap.get(overId);

  // --- Dragging a task ---
  if (aTask) {
    let targetAreaId: string | null = null;
    let overTaskId: string | null = null;
    if (oArea) targetAreaId = oArea.id; // dropped on an area → move into it
    else if (oTask) {
      targetAreaId = oTask.areaId;
      overTaskId = oTask.id;
    }
    if (!targetAreaId) return null;

    if (targetAreaId === aTask.areaId) {
      const list = (tasksByArea.get(targetAreaId) ?? []).map((t) => t.id);
      const from = list.indexOf(activeId);
      const to = overTaskId ? list.indexOf(overTaskId) : list.length - 1;
      if (from === -1 || to === -1 || from === to) return null;
      return { type: "reorder-tasks", areaId: targetAreaId, orderedIds: arrayMove(list, from, to) };
    }

    const targetIds = (tasksByArea.get(targetAreaId) ?? []).map((t) => t.id).filter((id) => id !== activeId);
    const insertAt = overTaskId ? Math.max(0, targetIds.indexOf(overTaskId)) : targetIds.length;
    targetIds.splice(insertAt, 0, activeId);
    return { type: "move-task", taskId: activeId, areaId: targetAreaId, orderedIds: targetIds };
  }

  // --- Dragging an area ---
  if (aArea && oArea) {
    if (activeId === oArea.id) return null;

    if (aArea.parentId === oArea.parentId) {
      // Same sibling group already — a plain reorder.
      const siblings = areas.filter((x) => x.parentId === aArea.parentId).map((x) => x.id);
      const from = siblings.indexOf(activeId);
      const to = siblings.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return null;
      return { type: "reorder-areas", orderedIds: arrayMove(siblings, from, to) };
    }
  }

  return null;
}

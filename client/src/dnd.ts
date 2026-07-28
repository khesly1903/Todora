import type { Area, Task } from "./types";

/** Droppable id for the "move to top level" target (the Areas header). */
export const ROOT_DROP_ID = "__root__";

export type DragAction =
  | { type: "reorder-tasks"; areaId: string; orderedIds: string[] }
  | { type: "move-task"; taskId: string; areaId: string; orderedIds: string[] }
  | { type: "reorder-areas"; orderedIds: string[] }
  | { type: "reparent-area"; areaId: string; parentId: string | null; expandId?: string };

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

/** Is `ancestorId` an ancestor of `nodeId`? Used to block nesting a parent into its own descendant. */
function isAncestorOf(areaMap: Map<string, Area>, ancestorId: string, nodeId: string): boolean {
  let cur = areaMap.get(nodeId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = areaMap.get(cur.parentId);
  }
  return false;
}

/**
 * Resolve a drag-and-drop gesture into a concrete action (or null for a no-op).
 * Shared by the tree and column views so both interpret drops identically:
 * reorder within a group, move a task into another area, reorder sibling areas,
 * re-parent an area (with cycle protection), or pull an area out to the top level.
 */
export function resolveDragEnd(activeId: string, overId: string, data: DragData): DragAction | null {
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
  if (aArea && overId === ROOT_DROP_ID) {
    if (aArea.parentId !== null) return { type: "reparent-area", areaId: activeId, parentId: null };
    return null;
  }
  if (aArea && oArea) {
    if (aArea.parentId === oArea.parentId) {
      const siblings = areas.filter((x) => x.parentId === aArea.parentId).map((x) => x.id);
      const from = siblings.indexOf(activeId);
      const to = siblings.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return null;
      return { type: "reorder-areas", orderedIds: arrayMove(siblings, from, to) };
    }
    // re-parent — blocked if it would nest an area into its own descendant
    if (isAncestorOf(areaMap, activeId, overId)) return null;
    return { type: "reparent-area", areaId: activeId, parentId: oArea.id, expandId: oArea.id };
  }

  return null;
}

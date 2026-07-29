import type { Area, Task } from "./types";

/** Droppable id for the "move to top level" target (the Areas header). */
export const ROOT_DROP_ID = "__root__";

/** Where a drag was released relative to the hovered row. "into" nests as a child; "before"/"after" reorders as a sibling. */
export type DropPosition = "before" | "after" | "into";

export type DragAction =
  | { type: "reorder-tasks"; areaId: string; orderedIds: string[] }
  | { type: "move-task"; taskId: string; areaId: string; orderedIds: string[] }
  | { type: "reorder-areas"; orderedIds: string[] }
  | { type: "move-area"; areaId: string; parentId: string | null; orderedIds: string[]; expandId?: string };

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
 *
 * `dropPosition` only affects area-onto-area drops. It defaults to "into" (nest as a
 * child) so callers that don't track pointer position, like the column view where every
 * visible area already shares a parent, keep their previous behavior unchanged.
 */
export function resolveDragEnd(
  activeId: string,
  overId: string,
  data: DragData,
  dropPosition: DropPosition = "into",
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
  if (aArea && overId === ROOT_DROP_ID) {
    if (aArea.parentId === null) return null;
    const rootIds = areas.filter((x) => x.parentId === null).map((x) => x.id);
    rootIds.push(activeId);
    return { type: "move-area", areaId: activeId, parentId: null, orderedIds: rootIds };
  }
  if (aArea && oArea) {
    // Dropping onto an area you're dragging (or one of its own descendants) would create a cycle.
    if (activeId === oArea.id || isAncestorOf(areaMap, activeId, overId)) return null;

    if (aArea.parentId === oArea.parentId) {
      // Same sibling group already — a plain reorder, regardless of which band was hit.
      const siblings = areas.filter((x) => x.parentId === aArea.parentId).map((x) => x.id);
      const from = siblings.indexOf(activeId);
      const to = siblings.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return null;
      return { type: "reorder-areas", orderedIds: arrayMove(siblings, from, to) };
    }

    if (dropPosition === "into") {
      // Nest as a child of the hovered area, appended after its existing children.
      const childIds = areas.filter((x) => x.parentId === oArea.id).map((x) => x.id);
      childIds.push(activeId);
      return { type: "move-area", areaId: activeId, parentId: oArea.id, orderedIds: childIds, expandId: oArea.id };
    }

    // "before" / "after" — become a sibling of the hovered area, at its level. (No extra cycle
    // check needed: the guard above already rules out oArea's parent chain containing activeId.)
    const parentId = oArea.parentId;
    const siblingIds = areas.filter((x) => x.parentId === parentId && x.id !== activeId).map((x) => x.id);
    const overIndex = siblingIds.indexOf(overId);
    siblingIds.splice(dropPosition === "before" ? overIndex : overIndex + 1, 0, activeId);
    return {
      type: "move-area",
      areaId: activeId,
      parentId,
      orderedIds: siblingIds,
      expandId: parentId ?? undefined,
    };
  }

  return null;
}

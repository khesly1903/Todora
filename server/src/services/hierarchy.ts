/**
 * Pure hierarchy helpers over a flat adjacency list of areas.
 * No database access — unit-testable in isolation, reused by areaService/taskService.
 */

export interface AreaRef {
  id: string;
  parentId: string | null;
}

/** All ids in the subtree rooted at `rootId` (inclusive), breadth-first. */
export function computeSubtreeIds(areas: AreaRef[], rootId: string): string[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const a of areas) {
    const list = childrenByParent.get(a.parentId) ?? [];
    list.push(a.id);
    childrenByParent.set(a.parentId, list);
  }
  const ids: string[] = [rootId];
  for (let i = 0; i < ids.length; i++) {
    ids.push(...(childrenByParent.get(ids[i]!) ?? []));
  }
  return ids;
}

/**
 * True if re-parenting `areaId` under `candidateParentId` would create a cycle —
 * i.e. the candidate parent is the area itself or one of its descendants.
 */
export function wouldCreateCycle(
  areas: AreaRef[],
  areaId: string,
  candidateParentId: string,
): boolean {
  const parentOf = new Map(areas.map((a) => [a.id, a.parentId] as const));
  let cursor: string | null = candidateParentId;
  while (cursor !== null) {
    if (cursor === areaId) return true;
    cursor = parentOf.get(cursor) ?? null;
  }
  return false;
}

/** The `completedAt` value implied by a status change: set when DONE, cleared otherwise. */
export function completedAtFor(status: string, now: Date = new Date()): Date | null {
  return status === "DONE" ? now : null;
}

/** The `completedById` value implied by a status change: the acting user when DONE, cleared otherwise. */
export function completedByFor(status: string, userId: string): string | null {
  return status === "DONE" ? userId : null;
}

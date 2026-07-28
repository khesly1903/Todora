import type { Area, Task } from "./types";

export interface AreaNode extends Area {
  children: AreaNode[];
}

export function buildTree(areas: Area[]): AreaNode[] {
  const nodes = new Map<string, AreaNode>(areas.map((a) => [a.id, { ...a, children: [] }]));
  const roots: AreaNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function groupTasksByArea(tasks: Task[]): Map<string, Task[]> {
  const byArea = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = byArea.get(task.areaId) ?? [];
    list.push(task);
    byArea.set(task.areaId, list);
  }
  return byArea;
}

/** Done/total counts across a node's entire subtree. */
export function countSubtree(
  node: AreaNode,
  tasksByArea: Map<string, Task[]>,
): { done: number; total: number } {
  const own = tasksByArea.get(node.id) ?? [];
  let done = own.filter((t) => t.status === "DONE").length;
  let total = own.length;
  for (const child of node.children) {
    const r = countSubtree(child, tasksByArea);
    done += r.done;
    total += r.total;
  }
  return { done, total };
}

/** Descendant areas (excluding the node itself) and all tasks in the subtree — for delete confirmation. */
export function deletionImpact(
  node: AreaNode,
  tasksByArea: Map<string, Task[]>,
): { areas: number; tasks: number } {
  let areas = 0;
  let tasks = (tasksByArea.get(node.id) ?? []).length;
  for (const child of node.children) {
    const r = deletionImpact(child, tasksByArea);
    areas += 1 + r.areas;
    tasks += r.tasks;
  }
  return { areas, tasks };
}

export function findPath(roots: AreaNode[], id: string, trail: AreaNode[] = []): AreaNode[] | null {
  for (const node of roots) {
    const next = [...trail, node];
    if (node.id === id) return next;
    const found = findPath(node.children, id, next);
    if (found) return found;
  }
  return null;
}

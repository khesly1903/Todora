import type { Task } from "./types";

export function isOverdue(task: Task): boolean {
  if (!task.dueAt || task.status === "DONE") return false;
  const due = new Date(task.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function formatDueShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function taskMatchesQuery(task: Task, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  if (task.title.toLowerCase().includes(q)) return true;
  if (task.description && task.description.toLowerCase().includes(q)) return true;
  const tagQuery = q.startsWith("#") ? q.slice(1) : q;
  if (
    tagQuery &&
    task.tags &&
    task.tags.some((tag) => tag.toLowerCase().replace(/^#/, "").includes(tagQuery))
  ) {
    return true;
  }
  return false;
}

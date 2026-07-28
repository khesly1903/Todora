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

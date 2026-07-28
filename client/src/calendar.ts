import type { Task } from "./types";

export interface DayCell {
  y: number;
  m: number;
  d: number;
  inMonth: boolean;
  key: string;
}

/** Stable local-date key, e.g. "2026-07-14". */
export function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The local calendar day of an ISO timestamp, as a day key. */
export function isoToDayKey(iso: string): string {
  const d = new Date(iso);
  return dayKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local midnight of a day key, as an ISO string (matches how the date picker stores due dates). */
export function dayKeyToISO(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toISOString();
}

/** 6×7 grid of calendar cells for the given month, Monday-first. */
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  // JS getDay: 0=Sun … 6=Sat. Shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const y = dt.getFullYear();
    const m = dt.getMonth();
    const d = dt.getDate();
    cells.push({ y, m, d, inMonth: m === month, key: dayKey(y, m, d) });
  }
  return cells;
}

/** Bucket tasks by the local day of their due date. Tasks without a due date are omitted. */
export function groupTasksByDueDay(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const k = isoToDayKey(t.dueAt);
    const list = map.get(k) ?? [];
    list.push(t);
    map.set(k, list);
  }
  return map;
}

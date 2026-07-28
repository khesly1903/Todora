import { createContext, type ReactNode, useContext, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Area, Task } from "./types";

interface UndoContextValue {
  deleteTask: (task: Task) => void;
  deleteArea: (area: Area) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function useUndo(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within an UndoProvider");
  return ctx;
}

const UNDO_MS = 7000;

/** All area ids in the subtree rooted at `rootId` (inclusive), from a flat Area list. */
function subtreeIds(areas: Area[], rootId: string): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  for (const a of areas) {
    const list = childrenByParent.get(a.parentId) ?? [];
    list.push(a.id);
    childrenByParent.set(a.parentId, list);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const childId of childrenByParent.get(id) ?? []) {
      ids.add(childId);
      stack.push(childId);
    }
  }
  return ids;
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const commitRef = useRef<(() => void) | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // Run the pending server delete now (used before scheduling a new one, or on dismiss).
  function flush() {
    clearTimer();
    const commit = commitRef.current;
    commitRef.current = null;
    setMessage(null);
    commit?.();
  }

  function schedule(msg: string, optimisticRemove: () => void, commit: () => void) {
    flush(); // only one pending delete at a time
    optimisticRemove();
    commitRef.current = commit;
    setMessage(msg);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const c = commitRef.current;
      commitRef.current = null;
      setMessage(null);
      c?.();
    }, UNDO_MS);
  }

  function undo() {
    clearTimer();
    commitRef.current = null;
    setMessage(null);
    // Server still has the data (we deferred the delete) — refetch to restore.
    qc.invalidateQueries({ queryKey: ["areas"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  const value: UndoContextValue = {
    deleteTask: (task) =>
      schedule(
        `Deleted “${task.title}”`,
        () => qc.setQueryData<Task[]>(["tasks"], (ts) => ts?.filter((t) => t.id !== task.id)),
        () => {
          void api.deleteTask(task.id).then(() => qc.invalidateQueries({ queryKey: ["tasks"] }));
        },
      ),
    deleteArea: (area) =>
      schedule(
        `Deleted “${area.name}”`,
        () => {
          const areas = qc.getQueryData<Area[]>(["areas"]) ?? [];
          const ids = subtreeIds(areas, area.id);
          qc.setQueryData<Area[]>(["areas"], (as) => as?.filter((a) => !ids.has(a.id)));
          qc.setQueryData<Task[]>(["tasks"], (ts) => ts?.filter((t) => !ids.has(t.areaId)));
        },
        () => {
          void api.deleteArea(area.id).then(() => {
            qc.invalidateQueries({ queryKey: ["areas"] });
            qc.invalidateQueries({ queryKey: ["tasks"] });
          });
        },
      ),
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
      {message && (
        <div
          className="fixed bottom-5 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-3 px-4 py-2.5"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{message}</span>
          <button
            type="button"
            onClick={undo}
            className="cursor-pointer border-none bg-transparent p-0"
            style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--accent-9)" }}
          >
            Undo
          </button>
          <button
            type="button"
            title="Dismiss"
            onClick={flush}
            className="cursor-pointer border-none bg-transparent p-0"
            style={{ fontSize: 15, lineHeight: 1, color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

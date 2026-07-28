import { findPath, type AreaNode } from "../tree";
import type { Task } from "../types";
import { StatusDot } from "./primitives";

export function SearchResults({
  roots,
  matches,
  onPick,
}: {
  roots: AreaNode[];
  matches: Task[];
  onPick: (task: Task) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="px-2 py-3" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
        No matching tasks.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {matches.map((task) => {
        const areaPath = (findPath(roots, task.areaId) ?? []).map((n) => n.name).join(" / ");
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onPick(task)}
            className="flex cursor-pointer flex-col gap-0.5 border-none bg-transparent px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <span className="flex items-center gap-2">
              <StatusDot status={task.status} />
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontSize: "var(--text-sm)",
                  color: task.status === "DONE" ? "var(--text-tertiary)" : "var(--text-primary)",
                  textDecoration: task.status === "DONE" ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
            </span>
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap pl-4"
              style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
            >
              {areaPath}
            </span>
          </button>
        );
      })}
    </div>
  );
}

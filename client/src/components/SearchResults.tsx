import { findPath, type AreaNode } from "../tree";
import type { Area, Task } from "../types";
import { FolderIcon, StatusDot } from "./primitives";

export function SearchResults({
  roots,
  areaMatches,
  matches,
  onPickArea,
  onPick,
}: {
  roots: AreaNode[];
  areaMatches: Area[];
  matches: Task[];
  onPickArea: (area: Area) => void;
  onPick: (task: Task) => void;
}) {
  if (areaMatches.length === 0 && matches.length === 0) {
    return (
      <div className="px-2 py-3" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
        No matching areas or tasks.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {areaMatches.map((area) => {
        const parentPath = (findPath(roots, area.id) ?? [])
          .slice(0, -1)
          .map((n) => n.name)
          .join(" / ");
        return (
          <button
            key={area.id}
            type="button"
            onClick={() => onPickArea(area)}
            className="flex cursor-pointer flex-col gap-0.5 border-none bg-transparent px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <span className="flex items-center gap-2">
              <FolderIcon />
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
              >
                {area.name}
              </span>
            </span>
            {parentPath && (
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap pl-4"
                style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
              >
                {parentPath}
              </span>
            )}
          </button>
        );
      })}
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

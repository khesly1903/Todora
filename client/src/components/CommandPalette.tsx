import { useEffect, useMemo, useRef, useState } from "react";
import type { Area, Task } from "../types";
import { buildTree, findPath } from "../tree";
import { FolderIcon, StatusDot } from "./primitives";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

type Item =
  | { kind: "command"; command: Command }
  | { kind: "area"; area: Area; path: string }
  | { kind: "task"; task: Task; path: string };

export function CommandPalette({
  open,
  onClose,
  commands,
  tasks,
  areas,
  onPickTask,
  onPickArea,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  tasks: Task[];
  areas: Area[];
  onPickTask: (task: Task) => void;
  onPickArea: (area: Area) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // focus after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const roots = useMemo(() => buildTree(areas), [areas]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const cmds = commands
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .map((command) => ({ kind: "command" as const, command }));
    const areaItems = q
      ? areas
          .filter((a) => a.name.toLowerCase().includes(q))
          .slice(0, 12)
          .map((area) => ({
            kind: "area" as const,
            area,
            path: (findPath(roots, area.id) ?? [])
              .slice(0, -1)
              .map((n) => n.name)
              .join(" / "),
          }))
      : [];
    const taskItems = q
      ? tasks
          .filter((t) => t.title.toLowerCase().includes(q))
          .slice(0, 12)
          .map((task) => ({
            kind: "task" as const,
            task,
            path: (findPath(roots, task.areaId) ?? []).map((n) => n.name).join(" / "),
          }))
      : [];
    return [...cmds, ...areaItems, ...taskItems];
  }, [query, commands, areas, tasks, roots]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  function runItem(item: Item | undefined) {
    if (!item) return;
    if (item.kind === "command") item.command.run();
    else if (item.kind === "area") onPickArea(item.area);
    else onPickTask(item.task);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[400] flex items-start justify-center pt-[12vh]"
      style={{ background: "var(--scrim)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-[520px] max-w-[92vw] flex-col overflow-hidden"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <input
          ref={inputRef}
          value={query}
          placeholder="Search areas, tasks, or run a command…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runItem(items[active]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          className="w-full border-none bg-transparent px-4 py-3 outline-none"
          style={{
            fontSize: "var(--text-md)",
            color: "var(--text-primary)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        />
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <div className="px-3 py-4" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
              No matches.
            </div>
          )}
          {items.map((item, i) => {
            const isActive = i === active;
            const key =
              item.kind === "command" ? `c-${item.command.id}` : item.kind === "area" ? `a-${item.area.id}` : `t-${item.task.id}`;
            return (
              <div
                key={key}
                onMouseEnter={() => setActive(i)}
                onClick={() => runItem(item)}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--accent-tint-strong)" : "transparent",
                }}
              >
                {item.kind === "command" ? (
                  <>
                    <span
                      className="flex-1"
                      style={{
                        fontSize: "var(--text-sm)",
                        color: isActive ? "var(--accent-10)" : "var(--text-primary)",
                      }}
                    >
                      {item.command.label}
                    </span>
                    {item.command.hint && (
                      <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
                        {item.command.hint}
                      </span>
                    )}
                  </>
                ) : item.kind === "area" ? (
                  <>
                    <FolderIcon />
                    <span
                      className="overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
                    >
                      {item.area.name}
                    </span>
                    <span
                      className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right"
                      style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
                    >
                      {item.path}
                    </span>
                  </>
                ) : (
                  <>
                    <StatusDot status={item.task.status} />
                    <span
                      className="overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
                    >
                      {item.task.title}
                    </span>
                    <span
                      className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right"
                      style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
                    >
                      {item.path}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

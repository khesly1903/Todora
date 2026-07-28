import { type CSSProperties, type ReactNode, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import type { AreaNode } from "../tree";
import { countSubtree } from "../tree";
import { ChevronRight, DueBadge, FolderIcon, InlineInput, PlusIcon, StatusDot } from "./primitives";
import { isOverdue } from "../utils";
import { PRIORITY_COLORS } from "../types";

export function Column({ children, dropRef }: { children: ReactNode; dropRef?: (el: HTMLElement | null) => void }) {
  return (
    <div
      ref={dropRef}
      className="flex h-full min-w-[180px] flex-1 flex-col overflow-y-auto px-1.5 py-2"
      style={{ borderRight: "1px solid var(--border-default)", flexBasis: 0 }}
    >
      {children}
    </div>
  );
}

/** Sortable + droppable wrapper: makes a column row draggable and a drop target. */
function useRowDnd(id: string): {
  ref: (el: HTMLElement | null) => void;
  handleProps: Record<string, unknown>;
  style: CSSProperties;
  isOver: boolean;
} {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });
  return {
    ref: setNodeRef,
    handleProps: { ...attributes, ...listeners },
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 10 : undefined,
    },
    isOver: isOver && !isDragging,
  };
}

export function AreaColumnItem({
  node,
  tasksByArea,
  selected,
  editing,
  canEdit,
  onSelect,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}: {
  node: AreaNode;
  tasksByArea: Map<string, Task[]>;
  selected: boolean;
  editing: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (name: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const dnd = useRowDnd(node.id);
  const counts = countSubtree(node, tasksByArea);
  const incomplete = counts.total - counts.done;
  const hasChildren = node.children.length > 0;

  if (editing) {
    return (
      <div className="flex h-[26px] items-center gap-1.5 px-2">
        <FolderIcon />
        <InlineInput defaultValue={node.name} onSubmit={onSubmitEdit} onCancel={onCancelEdit} />
      </div>
    );
  }

  return (
    <div
      ref={dnd.ref}
      {...(canEdit ? dnd.handleProps : {})}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      onDoubleClick={() => canEdit && onStartEdit()}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className="flex h-[26px] cursor-default items-center gap-1.5 px-2 hover:bg-[var(--surface-hover)]"
      style={{
        borderRadius: "var(--radius-sm)",
        background: dnd.isOver ? "var(--accent-tint)" : selected ? "var(--accent-tint-strong)" : undefined,
        boxShadow: dnd.isOver ? "inset 0 0 0 1px var(--accent-9)" : "none",
        ...dnd.style,
      }}
    >
      <FolderIcon />
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          fontSize: "var(--text-sm)",
          color: selected ? "var(--accent-10)" : "var(--text-primary)",
          fontWeight: selected ? "var(--weight-medium)" : "var(--weight-regular)",
        }}
      >
        {node.name}
      </span>
      {incomplete > 0 && (
        <span
          title="Unfinished tasks"
          className="shrink-0"
          style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
        >
          {incomplete}
        </span>
      )}
      {hover && canEdit && (
        <button
          type="button"
          title="Delete area"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0"
          style={{ color: "var(--text-tertiary)", fontSize: 14, lineHeight: 1 }}
        >
          ×
        </button>
      )}
      {hasChildren && <ChevronRight />}
    </div>
  );
}

export function TaskColumnItem({
  task,
  selected,
  editing,
  canEdit,
  onSelect,
  onCycleStatus,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}: {
  task: Task;
  selected: boolean;
  editing: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onCycleStatus: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (title: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const dnd = useRowDnd(task.id);
  const done = task.status === "DONE";

  if (editing) {
    return (
      <div className="flex h-[26px] items-center gap-2 px-2">
        <StatusDot status={task.status} />
        <InlineInput defaultValue={task.title} onSubmit={onSubmitEdit} onCancel={onCancelEdit} />
      </div>
    );
  }

  return (
    <div
      ref={dnd.ref}
      {...(canEdit ? dnd.handleProps : {})}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      onDoubleClick={() => canEdit && onStartEdit()}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className="flex h-[26px] cursor-default items-center gap-2 px-2 hover:bg-[var(--surface-hover)]"
      style={{ borderRadius: "var(--radius-sm)", background: selected ? "var(--accent-tint-strong)" : undefined, ...dnd.style }}
    >
      <StatusDot status={task.status} onClick={canEdit ? onCycleStatus : undefined} />
      {task.priority !== "NONE" && (
        <span
          title={`Priority: ${task.priority}`}
          className="shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority], fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)" }}
        >
          {task.priority === "HIGH" ? "!!!" : task.priority === "MEDIUM" ? "!!" : "!"}
        </span>
      )}
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          fontSize: "var(--text-sm)",
          color: done ? "var(--text-tertiary)" : selected ? "var(--accent-10)" : "var(--text-primary)",
          textDecoration: done ? "line-through" : "none",
          opacity: done ? 0.7 : 1,
          transition: "opacity var(--duration-normal) var(--ease-standard)",
        }}
      >
        {task.title}
      </span>
      {task.dueAt && <DueBadge iso={task.dueAt} overdue={isOverdue(task)} />}
      {hover && canEdit && (
        <button
          type="button"
          title="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center border-none bg-transparent p-0"
          style={{ color: "var(--text-tertiary)", fontSize: 14, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AddTaskRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-1 flex h-[26px] items-center gap-2 px-2">
      <span className="inline-flex" style={{ color: "var(--text-tertiary)", opacity: 0.45 }}>
        <PlusIcon />
      </span>
      <input
        value={value}
        placeholder="Add task…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
        className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none"
        style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
      />
    </div>
  );
}

export function AddAreaRow({ onAdd, placeholder = "New area…" }: { onAdd: (name: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex h-[26px] items-center gap-1.5 px-2">
      <span className="inline-flex" style={{ opacity: 0.45 }}>
        <FolderIcon />
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
        className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none"
        style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
      />
    </div>
  );
}

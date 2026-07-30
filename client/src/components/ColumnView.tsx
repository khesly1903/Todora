import { type CSSProperties, type ReactNode, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import type { AreaNode } from "../tree";
import { countSubtree, splitActiveAndCompleted } from "../tree";
import { Avatar, ChevronRight, ChevronToggle, DueBadge, FolderIcon, InlineInput, StatusDot } from "./primitives";
import { isOverdue } from "../utils";
import { PRIORITY_COLORS } from "../types";
import { AddTaskBar, type CreateTaskInput } from "./AddTaskBar";

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
  showAvatar = false,
  draggable = true,
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
  showAvatar?: boolean;
  /** Completed tasks render read-only, outside the sortable set — same as Tree view. */
  draggable?: boolean;
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
      {...(canEdit && draggable ? dnd.handleProps : {})}
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
      {showAvatar && task.createdBy && <Avatar user={task.createdBy} size={16} />}
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

/**
 * Active tasks render inline; DONE tasks collapse into a "Completed (N)" section,
 * hidden by default — same behavior as the Tree view's task panel.
 */
export function TaskColumnList({
  tasks,
  selectedTaskId,
  editingTaskId,
  canEdit,
  showAvatars = false,
  onSelect,
  onCycleStatus,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
}: {
  tasks: Task[];
  selectedTaskId: string | null;
  editingTaskId: string | null;
  canEdit: boolean;
  showAvatars?: boolean;
  onSelect: (task: Task) => void;
  onCycleStatus: (task: Task) => void;
  onStartEdit: (task: Task) => void;
  onSubmitEdit: (task: Task, title: string) => void;
  onCancelEdit: () => void;
  onDelete: (task: Task) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const { active, completed } = splitActiveAndCompleted(tasks);

  function row(task: Task, draggable: boolean) {
    return (
      <TaskColumnItem
        key={task.id}
        task={task}
        selected={selectedTaskId === task.id}
        editing={editingTaskId === task.id}
        canEdit={canEdit}
        showAvatar={showAvatars}
        draggable={draggable}
        onSelect={() => onSelect(task)}
        onCycleStatus={() => onCycleStatus(task)}
        onStartEdit={() => onStartEdit(task)}
        onSubmitEdit={(title) => onSubmitEdit(task, title)}
        onCancelEdit={onCancelEdit}
        onDelete={() => onDelete(task)}
      />
    );
  }

  return (
    <>
      {active.map((task) => row(task, true))}

      {completed.length > 0 &&
        (!showCompleted ? (
          <div className="mt-1 flex items-center justify-between px-2 py-1.5">
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
              {completed.length} completed
            </span>
            <button
              type="button"
              onClick={() => setShowCompleted(true)}
              className="cursor-pointer border-none bg-transparent p-0"
              style={{ fontSize: "var(--text-2xs)", color: "var(--accent-9)" }}
            >
              Show completed
            </button>
          </div>
        ) : (
          <div className="mt-1">
            <div
              onClick={() => setCompletedExpanded((v) => !v)}
              className="flex h-[22px] cursor-default items-center gap-1.5 px-2"
            >
              <ChevronToggle expanded={completedExpanded} />
              <span style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-secondary)" }}>
                Completed ({completed.length})
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompleted(false);
                }}
                className="cursor-pointer border-none bg-transparent p-0"
                style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
              >
                Hide
              </button>
            </div>
            {completedExpanded && completed.map((task) => row(task, false))}
          </div>
        ))}
    </>
  );
}

export function AddTaskRow({ onAdd }: { onAdd: (input: CreateTaskInput) => void }) {
  return (
    <div className="mt-1 px-2">
      <AddTaskBar onAdd={onAdd} placeholder="Add task…" />
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

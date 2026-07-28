import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Area, Priority, Task } from "../types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "../types";

const PRIORITY_ORDER: Priority[] = ["NONE", "LOW", "MEDIUM", "HIGH"];
import { buildTree, findPath } from "../tree";
import {
  type DayCell,
  dayKey,
  dayKeyToISO,
  groupTasksByDueDay,
  isoToDayKey,
  monthGrid,
} from "../calendar";
import { useCreateTask, useCycleTaskStatus, useUpdateTask } from "../hooks";
import { useUndo } from "../undo";
import { isOverdue } from "../utils";
import { StatusDot } from "./primitives";
import { TaskInspector } from "./TaskInspector";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_CHIPS = 3;
const DAY_DROP_PREFIX = "day:";

export function CalendarView({ areas, tasks, canEdit }: { areas: Area[]; tasks: Task[]; canEdit: boolean }) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const cycleStatus = useCycleTaskStatus();
  const undo = useUndo();

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ key: string; rect: DOMRect; showTasks: boolean } | null>(null);

  const roots = useMemo(() => buildTree(areas), [areas]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  // Only open tasks appear on the calendar (completed tasks are hidden).
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "DONE"), [tasks]);
  const tasksByDay = useMemo(() => groupTasksByDueDay(openTasks), [openTasks]);

  const areaOptions = useMemo(
    () =>
      areas
        .map((a) => ({ id: a.id, label: (findPath(roots, a.id) ?? []).map((n) => n.name).join(" / ") }))
        .sort((x, y) => x.label.localeCompare(y.label)),
    [areas, roots],
  );

  const cells = useMemo(() => monthGrid(view.getFullYear(), view.getMonth()), [view]);
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    if (!canEdit) return;
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith(DAY_DROP_PREFIX)) return;
    const key = overId.slice(DAY_DROP_PREFIX.length);
    const task = taskById.get(String(active.id));
    if (!task) return;
    if (task.dueAt && isoToDayKey(task.dueAt) === key) return;
    updateTask.mutate({ id: task.id, dueAt: dayKeyToISO(key) });
  }

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
    setPopover(null);
  }

  function addTask(key: string, areaId: string, title: string, priority: Priority) {
    createTask.mutate(
      { areaId, title },
      {
        onSuccess: (task) =>
          updateTask.mutate({
            id: task.id,
            dueAt: dayKeyToISO(key),
            ...(priority !== "NONE" ? { priority } : {}),
          }),
      },
    );
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <span style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            {MONTHS[view.getMonth()]} {view.getFullYear()}
          </span>
          <div className="flex items-center gap-1.5">
            <NavBtn dir="prev" onClick={() => shiftMonth(-1)} />
            <button
              type="button"
              onClick={() => {
                setView(new Date(today.getFullYear(), today.getMonth(), 1));
                setPopover(null);
              }}
              className="cursor-pointer px-2.5 py-1"
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
                color: "var(--text-secondary)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Today
            </button>
            <NavBtn dir="next" onClick={() => shiftMonth(1)} />
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 pb-1"
              style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-medium)", color: "var(--text-tertiary)" }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1 px-2 pb-2">
            {cells.map((cell) => (
              <DayCellView
                key={cell.key}
                cell={cell}
                isToday={cell.key === todayKey}
                dayTasks={tasksByDay.get(cell.key) ?? []}
                selectedTaskId={selectedTaskId}
                canEdit={canEdit}
                onSelectTask={setSelectedTaskId}
                onCycleStatus={(task) => cycleStatus.mutate({ task })}
                onOpenDay={(rect, showTasks) => setPopover({ key: cell.key, rect, showTasks })}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {selectedTask && (
        <TaskInspector
          key={selectedTask.id}
          task={selectedTask}
          canEdit={canEdit}
          onUpdate={(fields) => updateTask.mutate({ id: selectedTask.id, ...fields })}
          onClose={() => setSelectedTaskId(null)}
          onDelete={() => {
            undo.deleteTask(selectedTask);
            setSelectedTaskId(null);
          }}
        />
      )}

      {popover && (
        <DayPopover
          dayKey={popover.key}
          anchor={popover.rect}
          tasks={popover.showTasks ? (tasksByDay.get(popover.key) ?? []) : []}
          areaOptions={areaOptions}
          canEdit={canEdit}
          onSelectTask={(id) => {
            setSelectedTaskId(id);
            setPopover(null);
          }}
          onAdd={(areaId, title, priority) => addTask(popover.key, areaId, title, priority)}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

function DayCellView({
  cell,
  isToday,
  dayTasks,
  selectedTaskId,
  canEdit,
  onSelectTask,
  onCycleStatus,
  onOpenDay,
}: {
  cell: DayCell;
  isToday: boolean;
  dayTasks: Task[];
  selectedTaskId: string | null;
  canEdit: boolean;
  onSelectTask: (id: string) => void;
  onCycleStatus: (task: Task) => void;
  onOpenDay: (rect: DOMRect, showTasks: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_DROP_PREFIX}${cell.key}` });
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = dayTasks.slice(0, MAX_CHIPS);
  const overflow = dayTasks.length - visible.length;

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => canEdit && ref.current && onOpenDay(ref.current.getBoundingClientRect(), false)}
      className="flex min-h-0 cursor-pointer flex-col overflow-hidden p-1"
      style={{
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-subtle)",
        background: isOver ? "var(--accent-tint)" : cell.inMonth ? "var(--surface-content)" : "var(--surface-sunken)",
        boxShadow: isOver ? "inset 0 0 0 1px var(--accent-9)" : "none",
        opacity: cell.inMonth ? 1 : 0.6,
      }}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center"
          style={{
            fontSize: "var(--text-2xs)",
            fontWeight: isToday ? "var(--weight-semibold)" : "var(--weight-regular)",
            color: isToday ? "var(--text-on-accent)" : "var(--text-secondary)",
            background: isToday ? "var(--accent-9)" : "transparent",
            borderRadius: "var(--radius-full)",
            padding: "0 5px",
          }}
        >
          {cell.d}
        </span>
        {hover && canEdit && (
          <span
            title="Add task"
            className="inline-flex h-4 w-4 items-center justify-center"
            style={{ color: "var(--text-tertiary)", fontSize: 13, lineHeight: 1 }}
          >
            +
          </span>
        )}
      </div>

      <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {visible.map((task) => (
          <TaskChip
            key={task.id}
            task={task}
            selected={selectedTaskId === task.id}
            canEdit={canEdit}
            onSelect={() => onSelectTask(task.id)}
            onCycleStatus={() => onCycleStatus(task)}
          />
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (ref.current) onOpenDay(ref.current.getBoundingClientRect(), true);
            }}
            className="cursor-pointer border-none bg-transparent px-1 py-0.5 text-left hover:bg-[var(--surface-hover)]"
            style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)", borderRadius: "var(--radius-xs)" }}
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}

function TaskChip({
  task,
  selected,
  canEdit,
  onSelect,
  onCycleStatus,
}: {
  task: Task;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onCycleStatus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const overdue = isOverdue(task);
  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="flex items-center gap-1 px-1 py-0.5"
      style={{
        borderRadius: "var(--radius-xs)",
        background: selected ? "var(--accent-tint-strong)" : overdue ? "var(--danger-tint)" : "var(--surface-sunken)",
        opacity: isDragging ? 0.5 : 1,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        cursor: canEdit ? "grab" : "default",
      }}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) onCycleStatus();
        }}
      >
        <StatusDot status={task.status} size={6} />
      </span>
      {task.priority !== "NONE" && (
        <span
          className="shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority], fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)" }}
        >
          {task.priority === "HIGH" ? "!!!" : task.priority === "MEDIUM" ? "!!" : "!"}
        </span>
      )}
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        title={task.title}
        style={{
          fontSize: "var(--text-2xs)",
          color: overdue ? "var(--status-not-started-text)" : "var(--text-primary)",
          fontWeight: overdue ? "var(--weight-medium)" : "var(--weight-regular)",
        }}
      >
        {task.title}
      </span>
    </div>
  );
}

function DayPopover({
  dayKey: key,
  anchor,
  tasks,
  areaOptions,
  canEdit,
  onSelectTask,
  onAdd,
  onClose,
}: {
  dayKey: string;
  anchor: DOMRect;
  tasks: Task[];
  areaOptions: { id: string; label: string }[];
  canEdit: boolean;
  onSelectTask: (id: string) => void;
  onAdd: (areaId: string, title: string, priority: Priority) => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState(areaOptions[0]?.id ?? "");
  const [areaQuery, setAreaQuery] = useState("");
  const [priority, setPriority] = useState<Priority>("NONE");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const [y, m, d] = key.split("-").map(Number);
  const label = new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const q = areaQuery.trim().toLowerCase();
  const filteredAreas = q ? areaOptions.filter((o) => o.label.toLowerCase().includes(q)) : areaOptions;
  const selectedAreaLabel = areaOptions.find((o) => o.id === areaId)?.label ?? "";

  useLayoutEffect(() => {
    const width = 248;
    const height = popRef.current?.offsetHeight ?? 260;
    let left = anchor.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    let top = anchor.bottom + 4;
    if (top + height > window.innerHeight - 8) top = Math.max(8, anchor.top - height - 4);
    setPos({ top, left: Math.max(8, left) });
  }, [anchor, tasks.length, filteredAreas.length]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Defer so the opening click doesn't immediately close it.
    const t = window.setTimeout(() => window.addEventListener("mousedown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || !areaId) return;
    onAdd(areaId, trimmed, priority);
    setTitle("");
    setPriority("NONE");
  }

  return (
    <div
      ref={popRef}
      className="fixed z-[360] flex flex-col gap-2 p-2.5"
      style={{
        top: pos?.top ?? anchor.bottom + 4,
        left: pos?.left ?? anchor.left,
        width: 248,
        visibility: pos ? "visible" : "hidden",
        background: "var(--surface-overlay)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
          {label}
        </span>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-[var(--surface-hover)]"
          style={{ borderRadius: "var(--radius-sm)", color: "var(--text-tertiary)", fontSize: 15, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTask(t.id)}
              className="flex items-center gap-1.5 px-1 py-1 text-left hover:bg-[var(--surface-hover)]"
              style={{ borderRadius: "var(--radius-xs)" }}
            >
              <StatusDot status={t.status} size={7} />
              <span
                className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}
              >
                {t.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {!canEdit ? null : areaOptions.length === 0 ? (
        <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          Create an area first (Tree or Columns view).
        </div>
      ) : (
        <div
          className="flex flex-col gap-1.5"
          style={{
            borderTop: tasks.length > 0 ? "1px solid var(--border-subtle)" : "none",
            paddingTop: tasks.length > 0 ? 8 : 0,
          }}
        >
          <input
            autoFocus
            value={title}
            placeholder="New task…"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="px-2 py-1 outline-none"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--text-primary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
            }}
          />

          {/* Priority */}
          <div className="flex items-center gap-0.5 p-0.5" style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}>
            {PRIORITY_ORDER.map((p) => {
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="flex-1 cursor-pointer border-none px-1 py-0.5"
                  style={{
                    fontSize: "var(--text-2xs)",
                    fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                    borderRadius: "var(--radius-xs)",
                    background: active ? "var(--surface-raised)" : "transparent",
                    color: active && p !== "NONE" ? PRIORITY_COLORS[p] : active ? "var(--text-primary)" : "var(--text-secondary)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {p === "NONE" ? "None" : PRIORITY_LABELS[p]}
                </button>
              );
            })}
          </div>

          {/* Area picker with search */}
          <div className="flex flex-col gap-1">
            <input
              value={areaQuery}
              placeholder="Search areas…"
              onChange={(e) => setAreaQuery(e.target.value)}
              className="px-2 py-1 outline-none"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--text-primary)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <div
              className="flex max-h-28 flex-col gap-0.5 overflow-y-auto p-0.5"
              style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
            >
              {filteredAreas.length === 0 ? (
                <div className="px-1.5 py-1" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
                  No areas match “{areaQuery.trim()}”.
                </div>
              ) : (
                filteredAreas.map((o) => {
                  const active = o.id === areaId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setAreaId(o.id)}
                      className="flex items-center gap-1.5 px-1.5 py-1 text-left hover:bg-[var(--surface-hover)]"
                      style={{
                        borderRadius: "var(--radius-xs)",
                        background: active ? "var(--accent-tint-strong)" : "transparent",
                      }}
                    >
                      <span
                        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{
                          fontSize: "var(--text-xs)",
                          color: active ? "var(--accent-10)" : "var(--text-primary)",
                          fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
                        }}
                      >
                        {o.label}
                      </span>
                      {active && <span style={{ color: "var(--accent-9)", fontSize: "var(--text-xs)" }}>✓</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || !areaId}
            className="cursor-pointer px-2 py-1"
            title={selectedAreaLabel ? `Add to ${selectedAreaLabel}` : undefined}
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-on-accent)",
              background: "var(--accent-9)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              opacity: title.trim() && areaId ? 1 : 0.5,
            }}
          >
            Add task
          </button>
        </div>
      )}
    </div>
  );
}

function NavBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      title={dir === "prev" ? "Previous month" : "Next month"}
      onClick={onClick}
      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center hover:bg-[var(--surface-hover)]"
      style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
    >
      <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}>
        <path d="M2 1l4 3.5L2 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

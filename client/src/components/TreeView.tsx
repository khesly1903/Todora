import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS } from "../types";

interface DndRowProps {
  setNodeRef: (el: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  style: CSSProperties;
}

function AreasHeader({ onAddRoot, canEdit }: { onAddRoot: () => void; canEdit: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      className="mb-1 flex items-center justify-between px-2 py-1"
      style={{
        borderRadius: "var(--radius-sm)",
        background: isOver ? "var(--accent-tint)" : "transparent",
        boxShadow: isOver ? "inset 0 0 0 1px var(--accent-9)" : "none",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: isOver ? "var(--accent-10)" : "var(--text-tertiary)",
        }}
      >
        {isOver ? "Move to top level" : "Areas"}
      </span>
      {canEdit && (
        <button
          type="button"
          title="New area"
          onClick={onAddRoot}
          className="inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-[var(--surface-hover)]"
          style={{ borderRadius: "var(--radius-xs)", color: "var(--text-secondary)" }}
        >
          <PlusIcon />
        </button>
      )}
    </div>
  );
}
import {
  buildTree,
  countSubtree,
  deletionImpact,
  findPath,
  groupTasksByArea,
  type AreaNode,
} from "../tree";
import type { Area } from "../types";
import {
  useApplyDragAction,
  useCreateArea,
  useCreateTask,
  useCycleTaskStatus,
  useRenameArea,
  useRenameTask,
  useUpdateTask,
} from "../hooks";
import { useUndo } from "../undo";
import {
  Breadcrumb,
  Button,
  ChevronRight,
  ChevronToggle,
  DueBadge,
  FolderIcon,
  InlineInput,
  PlusIcon,
  StatusDot,
} from "./primitives";
import { isOverdue } from "../utils";
import { ROOT_DROP_ID, resolveDragEnd } from "../dnd";
import { DeleteConfirmDialog } from "./Dialog";
import { TaskInspector } from "./TaskInspector";
import { SearchResults } from "./SearchResults";

type AddingArea = { parentId: string | null };

export function TreeView({
  areas,
  tasks,
  workspaceId,
  canEdit,
  focusTaskId,
  onFocusHandled,
}: {
  areas: Area[];
  tasks: Task[];
  workspaceId: string;
  canEdit: boolean;
  focusTaskId?: string | null;
  onFocusHandled?: () => void;
}) {
  const roots = useMemo(() => buildTree(areas), [areas]);
  const tasksByArea = useMemo(() => groupTasksByArea(tasks), [tasks]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renamingAreaId, setRenamingAreaId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddingArea | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AreaNode | null>(null);

  const createArea = useCreateArea();
  const renameArea = useRenameArea();
  const createTask = useCreateTask();
  const renameTask = useRenameTask();
  const updateTask = useUpdateTask();
  const cycleStatus = useCycleTaskStatus();
  const applyDrag = useApplyDragAction();
  const undo = useUndo();

  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  const query = search.trim().toLowerCase();
  const matches = query ? tasks.filter((t) => t.title.toLowerCase().includes(query)) : [];

  function openTaskFromSearch(task: Task) {
    openArea(task.areaId);
    setSelectedTaskId(task.id);
    setSearch("");
  }

  function selectArea(id: string) {
    setSelectedId(id);
    setSelectedTaskId(null);
  }

  // External focus request (e.g. from the command palette): reveal and select the task.
  useEffect(() => {
    if (!focusTaskId) return;
    const task = tasks.find((t) => t.id === focusTaskId);
    if (task) {
      setSelectedId(task.areaId);
      setSelectedTaskId(task.id);
      const chain = findPath(roots, task.areaId) ?? [];
      setExpanded((prev) => {
        const next = new Set(prev);
        chain.forEach((n) => next.add(n.id));
        return next;
      });
    }
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTaskId]);

  // Keyboard shortcuts (act on the currently selected task / area).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        if (selectedId) {
          e.preventDefault();
          document.querySelector<HTMLInputElement>("[data-add-task]")?.focus();
        }
        return;
      }
      if (typing || renamingAreaId) return;
      if (!selectedTask) return;

      const areaTasks = tasksByArea.get(selectedTask.areaId) ?? [];
      const idx = areaTasks.findIndex((t) => t.id === selectedTask.id);

      if (e.key === " " && canEdit) {
        e.preventDefault();
        cycleStatus.mutate({ task: selectedTask });
      } else if (e.key === "Enter" && canEdit) {
        e.preventDefault();
        setEditingTaskId(selectedTask.id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && canEdit) {
        e.preventDefault();
        undo.deleteTask(selectedTask);
        setSelectedTaskId(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = areaTasks[idx + 1];
        if (next) setSelectedTaskId(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = areaTasks[idx - 1];
        if (prev) setSelectedTaskId(prev.id);
      } else if (e.key === "Escape") {
        setSelectedTaskId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedTask, renamingAreaId, tasksByArea, cycleStatus, undo, canEdit]);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const treeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleTreeDragEnd(event: DragEndEvent) {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;
    const action = resolveDragEnd(String(active.id), String(over.id), {
      areas,
      tasksByArea,
      areaMap,
      taskById,
    });
    applyDrag(action, (id) => setExpanded((prev) => new Set(prev).add(id)));
  }

  // Select an area AND expand its whole ancestor chain in the sidebar, so the
  // dropdowns open down to it and it shows up selected (used when drilling from the main panel).
  function openArea(id: string) {
    setSelectedId(id);
    setSelectedTaskId(null);
    const chain = findPath(roots, id) ?? [];
    setExpanded((prev) => {
      const next = new Set(prev);
      chain.forEach((n) => next.add(n.id));
      return next;
    });
  }

  const selectedNode = selectedId ? (findPath(roots, selectedId)?.at(-1) ?? null) : null;
  const path = selectedId ? (findPath(roots, selectedId) ?? []) : [];

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submitNewArea(name: string) {
    const trimmed = name.trim();
    const parentId = adding?.parentId ?? null;
    setAdding(null);
    if (!trimmed) return;
    createArea.mutate(
      { name: trimmed, parentId, workspaceId },
      {
        onSuccess: (area) => {
          if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
          setSelectedId(area.id);
        },
      },
    );
  }

  function beginAddChild(parentId: string) {
    setExpanded((prev) => new Set(prev).add(parentId));
    setAdding({ parentId });
  }

  return (
    <DndContext sensors={treeSensors} collisionDetection={closestCenter} onDragEnd={handleTreeDragEnd}>
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div
        className="flex h-full w-[240px] max-[720px]:w-[190px] shrink-0 flex-col overflow-y-auto px-1.5 py-2"
        style={{ background: "var(--surface-sidebar)", borderRight: "1px solid var(--border-default)" }}
      >
        <div className="mb-1.5 px-1">
          <input
            value={search}
            placeholder="Search tasks…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            className="w-full px-2 py-1 outline-none"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--text-primary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
            }}
          />
        </div>

        {query ? (
          <SearchResults roots={roots} matches={matches} onPick={openTaskFromSearch} />
        ) : (
          <>
        <AreasHeader onAddRoot={() => setAdding({ parentId: null })} canEdit={canEdit} />

          <SortableContext items={roots.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {roots.map((node) => (
              <AreaBranch
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                selectedId={selectedId}
                renamingAreaId={renamingAreaId}
                adding={adding}
                tasksByArea={tasksByArea}
                canEdit={canEdit}
                onToggle={toggle}
                onSelect={selectArea}
                onStartRename={setRenamingAreaId}
                onSubmitRename={(id, name) => {
                  setRenamingAreaId(null);
                  const trimmed = name.trim();
                  if (trimmed) renameArea.mutate({ id, name: trimmed });
                }}
                onCancelRename={() => setRenamingAreaId(null)}
                onAddChild={beginAddChild}
                onSubmitNewArea={submitNewArea}
              />
            ))}
          </SortableContext>

        {adding?.parentId === null && (
          <div className="flex h-6 items-center gap-1.5 px-2" style={{ paddingLeft: 4 }}>
            <span className="w-3" />
            <FolderIcon />
            <InlineInput
              placeholder="New area"
              onSubmit={submitNewArea}
              onCancel={() => setAdding(null)}
            />
          </div>
        )}

        {roots.length === 0 && adding === null && canEdit && (
          <button
            type="button"
            onClick={() => setAdding({ parentId: null })}
            className="mt-2 cursor-pointer border-none bg-transparent px-2 text-left"
            style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
          >
            No areas yet — create your first one.
          </button>
        )}
        {roots.length === 0 && adding === null && !canEdit && (
          <div className="mt-2 px-2" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
            No areas yet.
          </div>
        )}
          </>
        )}
      </div>

      {/* Task panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedNode ? (
          <TaskPanel
            node={selectedNode}
            path={path}
            canEdit={canEdit}
            onNavigate={(index) => {
              const target = path[index];
              if (!target) return;
              selectArea(target.id);
              setExpanded((prev) => {
                const next = new Set(prev);
                path.slice(0, index).forEach((n) => next.add(n.id));
                return next;
              });
            }}
            counts={countSubtree(selectedNode, tasksByArea)}
            tasks={tasksByArea.get(selectedNode.id) ?? []}
            childAreas={selectedNode.children}
            tasksByArea={tasksByArea}
            onOpenArea={openArea}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            editingTaskId={editingTaskId}
            onSetEditingTask={setEditingTaskId}
            onAddTask={(title) => createTask.mutate({ areaId: selectedNode.id, title })}
            onCycleStatus={(task) => cycleStatus.mutate({ task })}
            onRenameTask={(id, title) => renameTask.mutate({ id, title })}
            onDeleteTask={(task) => {
              undo.deleteTask(task);
              if (selectedTaskId === task.id) setSelectedTaskId(null);
            }}
            onDeleteArea={() => setDeleteTarget(selectedNode)}
            onAddChildArea={() => beginAddChild(selectedNode.id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center" style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
            Select an area to see its tasks.
          </div>
        )}
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

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        name={deleteTarget?.name ?? ""}
        areaCount={deleteTarget ? deletionImpact(deleteTarget, tasksByArea).areas : 0}
        taskCount={deleteTarget ? deletionImpact(deleteTarget, tasksByArea).tasks : 0}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            undo.deleteArea(deleteTarget);
            if (selectedId === deleteTarget.id) setSelectedId(null);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
    </DndContext>
  );
}

interface BranchProps {
  node: AreaNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  renamingAreaId: string | null;
  adding: AddingArea | null;
  tasksByArea: Map<string, Task[]>;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onStartRename: (id: string) => void;
  onSubmitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onAddChild: (parentId: string) => void;
  onSubmitNewArea: (name: string) => void;
}

function AreaBranch(props: BranchProps) {
  const { node, depth, expanded, selectedId, renamingAreaId, adding, tasksByArea, canEdit } = props;
  const [hover, setHover] = useState(false);
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const selected = selectedId === node.id;
  const counts = countSubtree(node, tasksByArea);
  const renaming = renamingAreaId === node.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: node.id,
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div
        {...(canEdit ? attributes : {})}
        {...(canEdit ? listeners : {})}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => props.onSelect(node.id)}
        onDoubleClick={() => canEdit && props.onStartRename(node.id)}
        className="flex h-6 cursor-default items-center gap-1.5"
        style={{
          padding: `0 8px 0 ${4 + depth * 16}px`,
          borderRadius: "var(--radius-sm)",
          background:
            isOver && !isDragging
              ? "var(--accent-tint)"
              : selected
                ? "var(--accent-tint-strong)"
                : hover
                  ? "var(--surface-hover)"
                  : "transparent",
          boxShadow: isOver && !isDragging ? "inset 0 0 0 1px var(--accent-9)" : "none",
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            props.onToggle(node.id);
          }}
          className="inline-flex w-3 justify-center"
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <ChevronToggle expanded={isExpanded} />
        </span>
        <FolderIcon />
        {renaming ? (
          <InlineInput
            defaultValue={node.name}
            onSubmit={(name) => props.onSubmitRename(node.id, name)}
            onCancel={props.onCancelRename}
          />
        ) : (
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
        )}
        {!renaming && hover && canEdit ? (
          <button
            type="button"
            title="New sub-area"
            onClick={(e) => {
              e.stopPropagation();
              props.onAddChild(node.id);
            }}
            className="inline-flex h-4 w-4 cursor-pointer items-center justify-center border-none bg-transparent p-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            <PlusIcon />
          </button>
        ) : !renaming && counts.total - counts.done > 0 ? (
          <span
            title="Unfinished tasks"
            style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
          >
            {counts.total - counts.done}
          </span>
        ) : null}
      </div>

      {isExpanded && (
        <>
          <SortableContext items={node.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {node.children.map((child) => (
              <AreaBranch key={child.id} {...props} node={child} depth={depth + 1} />
            ))}
          </SortableContext>
          {adding?.parentId === node.id && (
            <div
              className="flex h-6 items-center gap-1.5"
              style={{ padding: `0 8px 0 ${4 + (depth + 1) * 16}px` }}
            >
              <span className="w-3" />
              <FolderIcon />
              <InlineInput
                placeholder="New area"
                onSubmit={props.onSubmitNewArea}
                onCancel={() => props.onSubmitNewArea("")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TaskPanel({
  node,
  path,
  canEdit,
  onNavigate,
  counts,
  tasks,
  childAreas,
  tasksByArea,
  onOpenArea,
  selectedTaskId,
  onSelectTask,
  editingTaskId,
  onSetEditingTask,
  onAddTask,
  onCycleStatus,
  onRenameTask,
  onDeleteTask,
  onDeleteArea,
  onAddChildArea,
}: {
  node: AreaNode;
  path: { id: string; name: string }[];
  canEdit: boolean;
  onNavigate: (index: number) => void;
  counts: { done: number; total: number };
  tasks: Task[];
  childAreas: AreaNode[];
  tasksByArea: Map<string, Task[]>;
  onOpenArea: (id: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  editingTaskId: string | null;
  onSetEditingTask: (id: string | null) => void;
  onAddTask: (title: string) => void;
  onCycleStatus: (task: Task) => void;
  onRenameTask: (id: string, title: string) => void;
  onDeleteTask: (task: Task) => void;
  onDeleteArea: () => void;
  onAddChildArea: () => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const setEditingTaskId = onSetEditingTask;

  const active = tasks.filter((t) => t.status !== "DONE");
  const completed = [...tasks.filter((t) => t.status === "DONE")].sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-2">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {counts.total > 0 ? `${counts.done}/${counts.total} complete` : "No tasks yet"}
        </span>
        {canEdit && (
          <div className="flex gap-1">
            <Button variant="ghost" icon={<PlusIcon />} onClick={onAddChildArea}>
              Sub-area
            </Button>
            <Button variant="ghost" onClick={onDeleteArea}>
              Delete area
            </Button>
          </div>
        )}
      </div>

      {/* Header: breadcrumb + add task */}
      <div
        className="flex flex-col gap-2.5 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <nav className="flex min-w-0 items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          <Breadcrumb items={path} onNavigate={onNavigate} />
        </nav>
        {canEdit && (
          <div
            className="flex h-8 items-center gap-2 px-2.5"
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-raised)",
            }}
          >
            <span style={{ color: "var(--text-tertiary)", display: "inline-flex" }}>
              <PlusIcon />
            </span>
            <AddTaskInput onAdd={onAddTask} />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5">
        {childAreas.map((child) => (
          <SubAreaRow key={child.id} node={child} tasksByArea={tasksByArea} onOpen={() => onOpenArea(child.id)} />
        ))}
        <SortableList ids={active.map((t) => t.id)}>
          {active.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              editing={editingTaskId === task.id}
              canEdit={canEdit}
              onSelect={() => onSelectTask(task.id)}
              onCycleStatus={() => onCycleStatus(task)}
              onStartEdit={() => setEditingTaskId(task.id)}
              onSubmitEdit={(title) => {
                setEditingTaskId(null);
                const trimmed = title.trim();
                if (trimmed && trimmed !== task.title) onRenameTask(task.id, trimmed);
              }}
              onCancelEdit={() => setEditingTaskId(null)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
        </SortableList>
        {active.length === 0 && childAreas.length === 0 && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", padding: "12px 8px" }}>
            No open tasks — add one above.
          </div>
        )}

        {completed.length > 0 &&
          (!showCompleted ? (
            <div className="mt-1 flex items-center justify-between px-2 py-2">
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                {completed.length} completed task{completed.length === 1 ? "" : "s"} hidden
              </span>
              <button
                type="button"
                onClick={() => setShowCompleted(true)}
                className="cursor-pointer border-none bg-transparent p-0"
                style={{ fontSize: "var(--text-xs)", color: "var(--accent-9)" }}
              >
                Show completed
              </button>
            </div>
          ) : (
            <div className="mt-1">
              <div
                onClick={() => setCompletedExpanded((v) => !v)}
                className="flex cursor-default items-center gap-1.5 px-2 py-1.5"
              >
                <ChevronToggle expanded={completedExpanded} />
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-secondary)" }}>
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
              {completedExpanded &&
                completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={selectedTaskId === task.id}
                    editing={editingTaskId === task.id}
                    canEdit={canEdit}
                    onSelect={() => onSelectTask(task.id)}
                    onCycleStatus={() => onCycleStatus(task)}
                    onStartEdit={() => setEditingTaskId(task.id)}
                    onSubmitEdit={(title) => {
                      setEditingTaskId(null);
                      const trimmed = title.trim();
                      if (trimmed && trimmed !== task.title) onRenameTask(task.id, trimmed);
                    }}
                    onCancelEdit={() => setEditingTaskId(null)}
                    onDelete={() => onDeleteTask(task)}
                  />
                ))}
            </div>
          ))}
      </div>
      <span className="sr-only">{node.name}</span>
    </>
  );
}

function SubAreaRow({
  node,
  tasksByArea,
  onOpen,
}: {
  node: AreaNode;
  tasksByArea: Map<string, Task[]>;
  onOpen: () => void;
}) {
  const [hover, setHover] = useState(false);
  const counts = countSubtree(node, tasksByArea);
  const incomplete = counts.total - counts.done;
  const { setNodeRef, isOver } = useDroppable({ id: node.id });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="flex h-7 cursor-default items-center gap-2 px-2"
      style={{
        borderRadius: "var(--radius-sm)",
        background: isOver ? "var(--accent-tint)" : hover ? "var(--surface-hover)" : "transparent",
        boxShadow: isOver ? "inset 0 0 0 1px var(--accent-9)" : "none",
      }}
    >
      <FolderIcon />
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
      >
        {node.name}
      </span>
      {incomplete > 0 && (
        <span title="Unfinished tasks" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          {incomplete}
        </span>
      )}
      <ChevronRight />
    </div>
  );
}

function useDndRow(id: string): { dnd: DndRowProps; isDragging: boolean } {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return {
    dnd: {
      setNodeRef,
      attributes,
      listeners,
      style: {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      },
    },
    isDragging,
  };
}

function SortableList({ ids, children }: { ids: string[]; children: ReactNode }) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

function SortableTaskRow(props: Omit<Parameters<typeof TaskRow>[0], "dnd">) {
  const { dnd } = useDndRow(props.task.id);
  return <TaskRow {...props} dnd={dnd} />;
}

function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <input
      data-add-task
      value={value}
      placeholder="Add a task…"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) {
          onAdd(value.trim());
          setValue("");
        }
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none"
      style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
    />
  );
}

function TaskRow({
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
  dnd,
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
  dnd?: DndRowProps;
}) {
  const [hover, setHover] = useState(false);
  const done = task.status === "DONE";

  if (editing) {
    return (
      <div className="flex h-7 items-center gap-2 px-2">
        <StatusDot status={task.status} />
        <InlineInput defaultValue={task.title} onSubmit={onSubmitEdit} onCancel={onCancelEdit} />
      </div>
    );
  }

  return (
    <div
      ref={dnd?.setNodeRef}
      {...(canEdit ? (dnd?.attributes ?? {}) : {})}
      {...(canEdit ? (dnd?.listeners ?? {}) : {})}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      onDoubleClick={() => canEdit && onStartEdit()}
      className="flex h-7 cursor-default items-center gap-2 px-2"
      style={{
        borderRadius: "var(--radius-sm)",
        background: selected ? "var(--accent-tint-strong)" : hover ? "var(--surface-hover)" : "transparent",
        ...(dnd?.style ?? {}),
      }}
    >
      <StatusDot status={task.status} onClick={canEdit ? onCycleStatus : undefined} />
      {task.priority !== "NONE" && (
        <span
          title={`Priority: ${PRIORITY_LABELS[task.priority]}`}
          className="shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority], fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)" }}
        >
          {task.priority === "HIGH" ? "!!!" : task.priority === "MEDIUM" ? "!!" : "!"}
        </span>
      )}
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        title={STATUS_LABELS[task.status]}
        style={{
          fontSize: "var(--text-sm)",
          color: done ? "var(--text-tertiary)" : "var(--text-primary)",
          textDecoration: done ? "line-through" : "none",
          opacity: done ? 0.7 : 1,
          transition: "opacity var(--duration-normal) var(--ease-standard)",
        }}
      >
        {task.title}
      </span>
      {task.tags.slice(0, 2).map((tag) => (
        <span
          key={tag}
          className="shrink-0 whitespace-nowrap px-1.5"
          style={{
            fontSize: "var(--text-2xs)",
            color: "var(--text-secondary)",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-full)",
          }}
        >
          {tag}
        </span>
      ))}
      {task.dueAt && <DueBadge iso={task.dueAt} overdue={isOverdue(task)} />}
      {hover && canEdit && (
        <button
          type="button"
          title="Delete task"
          onClick={onDelete}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center border-none bg-transparent p-0"
          style={{ color: "var(--text-tertiary)", fontSize: 14, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

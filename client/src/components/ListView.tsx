import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
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

function HeaderIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-[var(--surface-hover)]"
      style={{ borderRadius: "var(--radius-xs)", color: "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}

function ExpandAllIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
      <path
        d="M2 4.2 L5.5 1.5 L9 4.2 M2 9 L5.5 6.3 L9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(180 5.5 5.5)"
      />
    </svg>
  );
}

function CollapseAllIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
      <path
        d="M2 4.2 L5.5 1.5 L9 4.2 M2 9 L5.5 6.3 L9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function AreasHeader({
  onAddRoot,
  canEdit,
  onExpandAll,
  onCollapseAll,
}: {
  onAddRoot: () => void;
  canEdit: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div
      className="mb-1 flex items-center justify-between px-2 py-1"
      style={{
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        Areas
      </span>
      <div className="flex items-center gap-0.5">
        <HeaderIconButton title="Expand all areas" onClick={onExpandAll}>
          <ExpandAllIcon />
        </HeaderIconButton>
        <HeaderIconButton title="Collapse all areas" onClick={onCollapseAll}>
          <CollapseAllIcon />
        </HeaderIconButton>
        {canEdit && (
          <HeaderIconButton title="New area" onClick={onAddRoot}>
            <PlusIcon />
          </HeaderIconButton>
        )}
      </div>
    </div>
  );
}
import {
  buildTree,
  countSubtree,
  deletionImpact,
  findPath,
  groupTasksByArea,
  splitActiveAndCompleted,
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
  useTaskLineClamp,
  useUpdateTask,
} from "../hooks";
import { useUndo } from "../undo";
import {
  Avatar,
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
import { resolveDragEnd } from "../dnd";
import { DeleteConfirmDialog } from "./Dialog";
import { TaskInspector } from "./TaskInspector";
import { AddTaskBar, type CreateTaskInput } from "./AddTaskBar";

type AddingArea = { parentId: string | null };

/** Current pointer Y, derived from the drag's start event plus how far it has moved since. */

export function ListView({
  areas,
  tasks,
  workspaceId,
  canEdit,
  showAvatars,
  focusTaskId,
  onFocusHandled,
  focusAreaId,
  onAreaFocusHandled,
}: {
  areas: Area[];
  tasks: Task[];
  workspaceId: string;
  canEdit: boolean;
  showAvatars: boolean;
  focusTaskId?: string | null;
  onFocusHandled?: () => void;
  focusAreaId?: string | null;
  onAreaFocusHandled?: () => void;
}) {
  const roots = useMemo(() => buildTree(areas), [areas]);
  const tasksByArea = useMemo(() => groupTasksByArea(tasks), [tasks]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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

  // External focus request (e.g. from the command palette): reveal and select the area.
  useEffect(() => {
    if (!focusAreaId) return;
    if (areaMap.has(focusAreaId)) openArea(focusAreaId);
    onAreaFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAreaId]);

  // Keyboard shortcuts (act on the currently selected task / area).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (typing || renamingAreaId) return;
      if (e.key === "Escape") {
        if (selectedTaskId) {
          setSelectedTaskId(null);
        } else if (selectedId) {
          setSelectedId(null);
        }
        return;
      }
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
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedTask, renamingAreaId, tasksByArea, cycleStatus, undo, canEdit]);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const treeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleTreeDragEnd(event: DragEndEvent) {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;
    const action = resolveDragEnd(
      String(active.id),
      String(over.id),
      { areas, tasksByArea, areaMap, taskById }
    );
    applyDrag(action);
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

  function expandAllAreas() {
    setExpanded(new Set(areas.map((a) => a.id)));
  }

  function collapseAllAreas() {
    setExpanded(new Set());
  }

  return (
    <DndContext
      sensors={treeSensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleTreeDragEnd}
    >
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div
        className="flex h-full w-[240px] max-[720px]:w-[190px] shrink-0 flex-col overflow-y-auto px-1.5 py-2"
        style={{ background: "var(--surface-sidebar)", borderRight: "1px solid var(--border-default)" }}
      >
        <AreasHeader
          onAddRoot={() => setAdding({ parentId: null })}
          canEdit={canEdit}
          onExpandAll={expandAllAreas}
          onCollapseAll={collapseAllAreas}
        />

          <SortableContext items={roots.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {roots.map((node) => (
              <AreaBranch
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                selectedId={selectedId}
                selectedTaskId={selectedTaskId}
                renamingAreaId={renamingAreaId}
                adding={adding}
                tasksByArea={tasksByArea}
                canEdit={canEdit}
                
                onToggle={toggle}
                onSelect={selectArea}
                onSelectTask={setSelectedTaskId}
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
            showAvatars={showAvatars}
            tasksByArea={tasksByArea}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            editingTaskId={editingTaskId}
            onSetEditingTask={setEditingTaskId}
            onAddTask={(input) => createTask.mutate({ areaId: selectedNode.id, ...input })}
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
          <EmptyView />
        )}
      </div>

      {selectedTask && (
        <TaskInspector
          key={selectedTask.id}
          task={selectedTask}
          canEdit={canEdit}
          showAvatars={showAvatars}
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
  selectedTaskId: string | null;
  renamingAreaId: string | null;
  adding: AddingArea | null;
  tasksByArea: Map<string, Task[]>;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onSelectTask: (id: string) => void;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div
        {...(canEdit ? attributes : {})}
        {...(canEdit ? listeners : {})}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (!selected) {
            props.onSelect(node.id);
            if (hasChildren && !isExpanded) props.onToggle(node.id);
          } else {
            if (hasChildren) props.onToggle(node.id);
          }
        }}
        onDoubleClick={() => canEdit && props.onStartRename(node.id)}
        className="flex h-6 cursor-default items-center gap-1.5"
        style={{
          padding: `0 8px 0 ${4 + depth * 16}px`,
          borderRadius: "var(--radius-sm)",
          background: selected
            ? "var(--accent-tint-strong)"
            : hover
              ? "var(--surface-hover)"
              : "transparent",
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
          {hasChildren &&
            (tasksByArea.get(node.id) ?? []).map((task) => (
              <SidebarTaskRow
                key={task.id}
                task={task}
                depth={depth + 1}
                selected={props.selectedTaskId === task.id}
                onSelect={() => {
                  props.onSelect(node.id);
                  props.onSelectTask(task.id);
                }}
              />
            ))}
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

function SidebarTaskRow({
  task,
  depth,
  selected,
  onSelect,
}: {
  task: Task;
  depth: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const done = task.status === "DONE";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="flex min-h-6 cursor-default items-center gap-1.5 py-1"
      style={{
        padding: `0 8px 0 ${4 + depth * 16}px`,
        borderRadius: "var(--radius-sm)",
        background: selected ? "var(--accent-tint-strong)" : hover ? "var(--surface-hover)" : "transparent",
      }}
    >
      <span className="inline-flex w-3 justify-center" />
      <StatusDot status={task.status} />
      <span
        className="task-title-text flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          fontSize: "var(--text-sm)",
          color: selected ? "var(--accent-10)" : "var(--text-primary)",
          fontWeight: selected ? "var(--weight-medium)" : "var(--weight-regular)",
          opacity: done ? 0.6 : 1,
        }}
      >
        {task.title}
      </span>
    </div>
  );
}


function EmptyView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-raised)]" style={{ border: "1px solid var(--border-default)", boxShadow: "var(--shadow-sm)" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Ready to focus?</h2>
      <p className="max-w-[300px]" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: "1.5" }}>
        Select an area from the sidebar to view its tasks, or press <kbd style={{ padding: "2px 6px", background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace", color: "var(--text-primary)" }}>⌘K</kbd> to jump anywhere.
      </p>
    </div>
  );
}

function ListAreaSection({
  node,
  depth,
  tasksByArea,
  selectedTaskId,
  onSelectTask,
  editingTaskId,
  onSetEditingTask,
  onCycleStatus,
  onRenameTask,
  onDeleteTask,
  canEdit,
  showAvatars
}: {
  node: AreaNode;
  depth: number;
  tasksByArea: Map<string, Task[]>;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  editingTaskId: string | null;
  onSetEditingTask: (id: string | null) => void;
  onCycleStatus: (task: Task) => void;
  onRenameTask: (id: string, title: string) => void;
  onDeleteTask: (task: Task) => void;
  canEdit: boolean;
  showAvatars: boolean;
}) {
  const counts = countSubtree(node, tasksByArea);
  if (counts.total - counts.done === 0) return null;

  const tasks = tasksByArea.get(node.id) ?? [];
  const { active } = splitActiveAndCompleted(tasks);
  
  return (
    <div className="mb-4">
      <h3
        className="mb-2 font-semibold"
        style={{
          fontSize: depth === 0 ? "var(--text-lg)" : depth === 1 ? "var(--text-md)" : "var(--text-sm)",
          color: "var(--text-primary)",
          borderBottom: depth === 0 ? "1px solid var(--border-default)" : "none",
          paddingBottom: depth === 0 ? "4px" : "0",
          marginTop: depth > 0 ? "16px" : "0"
        }}
      >
        {node.name}
      </h3>
      
      {active.length > 0 && (
        <SortableList ids={active.map((t) => t.id)}>
          {active.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              editing={editingTaskId === task.id}
              canEdit={canEdit}
              showAvatar={showAvatars}
              onSelect={() => onSelectTask(task.id)}
              onCycleStatus={() => onCycleStatus(task)}
              onStartEdit={() => onSetEditingTask(task.id)}
              onSubmitEdit={(title) => {
                onSetEditingTask(null);
                const trimmed = title.trim();
                if (trimmed && trimmed !== task.title) onRenameTask(task.id, trimmed);
              }}
              onCancelEdit={() => onSetEditingTask(null)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
        </SortableList>
      )}
      


      {node.children.length > 0 && (
        <div className="pl-4 mt-2" style={{ borderLeft: "1px solid var(--border-default)" }}>
          {node.children.map(child => (
            <ListAreaSection
              key={child.id}
              node={child}
              depth={depth + 1}
              tasksByArea={tasksByArea}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              editingTaskId={editingTaskId}
              onSetEditingTask={onSetEditingTask}
              onCycleStatus={onCycleStatus}
              onRenameTask={onRenameTask}
              onDeleteTask={onDeleteTask}
              canEdit={canEdit}
              showAvatars={showAvatars}
            />
          ))}
        </div>
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
  showAvatars,
  tasksByArea,
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
  showAvatars: boolean;
  tasksByArea: Map<string, Task[]>;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  editingTaskId: string | null;
  onSetEditingTask: (id: string | null) => void;
  onAddTask: (input: CreateTaskInput) => void;
  onCycleStatus: (task: Task) => void;
  onRenameTask: (id: string, title: string) => void;
  onDeleteTask: (task: Task) => void;
  onDeleteArea: () => void;
  onAddChildArea: () => void;
}) {
  const [clampThree, setClampThree] = useTaskLineClamp();


  return (
    <>
      <div className="flex items-center justify-between gap-2 px-5 pt-2">
        <span className="shrink-0 whitespace-nowrap" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          {counts.total > 0 ? `${counts.done}/${counts.total} complete` : "No tasks yet"}
        </span>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" icon={<PlusIcon />} onClick={onAddChildArea}>
              <span className="hidden sm:inline">Sub-area</span>
            </Button>
            <Button variant="ghost" icon={<TrashIcon />} onClick={onDeleteArea}>
              <span className="hidden sm:inline">Delete area</span>
            </Button>
          </div>
        )}
      </div>

      {/* Header: breadcrumb + add task */}
      <div
        className="flex flex-col gap-2.5 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <nav className="flex min-w-0 items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            <Breadcrumb items={path} onNavigate={onNavigate} />
          </nav>
          <button
            type="button"
            onClick={() => setClampThree((v) => !v)}
            title={clampThree ? "Switch to 1 line task titles" : "Switch to multiple lines task titles"}
            className="inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent px-2 py-0.5 transition-colors"
            style={{
              fontSize: "var(--text-2xs)",
              color: clampThree ? "var(--text-primary)" : "var(--text-tertiary)",
              background: clampThree ? "var(--surface-sunken)" : "transparent",
              borderRadius: "var(--radius-xs)",
              fontWeight: "var(--weight-medium)",
            }}
          >
            <span>{clampThree ? "Multiple lines" : "1 line"}</span>
          </button>
        </div>
        {canEdit && (
          <div
            className="flex flex-col gap-1.5 px-2.5 py-1.5"
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-raised)",
            }}
          >
            <AddTaskBar onAdd={onAddTask} />
          </div>
        )}
      </div>

      {/* Task list - Recursive Render */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <ListAreaSection
          node={node}
          depth={0}
          tasksByArea={tasksByArea}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
          editingTaskId={editingTaskId}
          onSetEditingTask={onSetEditingTask}
          onCycleStatus={onCycleStatus}
          onRenameTask={onRenameTask}
          onDeleteTask={onDeleteTask}
          canEdit={canEdit}
          showAvatars={showAvatars}
        />
      </div>
      <span className="sr-only">{node.name}</span>
    </>
  );
}

export function SubAreaRow({
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


function TaskRow({
  task,
  selected,
  editing,
  canEdit,
  showAvatar,
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
  showAvatar: boolean;
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
      <div className="flex min-h-7 items-center gap-2 px-2 py-1">
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
      className="flex min-h-7 cursor-default items-center gap-2 px-2 py-1"
      style={{
        borderRadius: "var(--radius-sm)",
        background: selected ? "var(--accent-tint-strong)" : hover ? "var(--surface-hover)" : "transparent",
        ...(dnd?.style ?? {}),
      }}
    >
      {showAvatar && (task.updatedBy ?? task.createdBy) && <Avatar user={(task.updatedBy ?? task.createdBy)!} size={16} />}
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
        className="task-title-text flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        title={STATUS_LABELS[task.status]}
        style={{
          fontSize: "var(--text-sm)",
          color: done ? "var(--text-tertiary)" : "var(--text-primary)",
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

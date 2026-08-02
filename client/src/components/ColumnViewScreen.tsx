import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  useApplyDragAction,
  useCreateArea,
  useCreateTask,
  useCycleTaskStatus,
  useIsMobile,
  useRenameArea,
  useRenameTask,
  useUpdateTask,
} from "../hooks";
import { useUndo } from "../undo";
import { resolveDragEnd } from "../dnd";
import { buildTree, deletionImpact, findPath, groupTasksByArea, splitActiveAndCompleted, type AreaNode } from "../tree";
import { AddAreaRow, AreaColumnItem, Column, TaskColumnList } from "./ColumnView";
import { AddTaskBar } from "./AddTaskBar";
import { BackIcon, Breadcrumb } from "./primitives";
import { DeleteConfirmDialog } from "./Dialog";
import { TaskInspector } from "./TaskInspector";
import type { Area, Task } from "../types";

interface ColumnModel {
  parent: AreaNode | null; // null = root column; otherwise the area whose children/tasks are shown
  areas: AreaNode[];
  tasks: Task[];
  selectedAreaId: string | undefined;
}

const MAX_COLUMN_OPTIONS = [2, 3, 4] as const;

function useMaxColumns() {
  const [max, setMax] = useState<number>(() => Number(localStorage.getItem("todora-max-columns")) || 3);
  useEffect(() => {
    localStorage.setItem("todora-max-columns", String(max));
  }, [max]);
  return [max, setMax] as const;
}

export function ColumnViewScreen({
  areas,
  tasks,
  workspaceId,
  canEdit,
  showAvatars,
}: {
  areas: Area[];
  tasks: Task[];
  workspaceId: string;
  canEdit: boolean;
  showAvatars: boolean;
}) {
  const [maxColumns, setMaxColumns] = useMaxColumns();
  const isMobile = useIsMobile();
  const cycleStatus = useCycleTaskStatus();
  const createArea = useCreateArea();
  const createTask = useCreateTask();
  const renameTask = useRenameTask();
  const updateTask = useUpdateTask();
  const renameArea = useRenameArea();
  const applyDrag = useApplyDragAction();
  const undo = useUndo();

  const [selection, setSelection] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AreaNode | null>(null);

  const roots = useMemo(() => buildTree(areas), [areas]);
  const tasksByArea = useMemo(() => groupTasksByArea(tasks), [tasks]);
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;
    const action = resolveDragEnd(String(active.id), String(over.id), { areas, tasksByArea, areaMap, taskById });
    applyDrag(action);
  }

  const validSelection = useMemo(() => {
    const result: string[] = [];
    let level = roots;
    for (const id of selection) {
      const node = level.find((n) => n.id === id);
      if (!node) break;
      result.push(id);
      level = node.children;
    }
    return result;
  }, [roots, selection]);

  const columns = useMemo<ColumnModel[]>(() => {
    const cols: ColumnModel[] = [
      { parent: null, areas: roots, tasks: [], selectedAreaId: validSelection[0] },
    ];
    let level = roots;
    validSelection.forEach((id, depth) => {
      const node = level.find((n) => n.id === id);
      if (!node) return;
      if (node.children.length > 0 || (tasksByArea.get(node.id)?.length ?? 0) > 0) {
        cols.push({
          parent: node,
          areas: node.children,
          tasks: tasksByArea.get(node.id) ?? [],
          selectedAreaId: validSelection[depth + 1],
        });
      }
      level = node.children;
    });
    return cols;
  }, [roots, tasksByArea, validSelection]);

  const deepestId = validSelection.at(-1);
  const path = deepestId ? (findPath(roots, deepestId) ?? []) : [];
  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  // Sliding window: only render the deepest `maxColumns` columns; older ones live in the breadcrumb.
  // On mobile there's only room for one pane, so it always shows just the deepest column —
  // navigation happens via the back button instead of side-by-side columns.
  const startIdx = Math.max(0, columns.length - (isMobile ? 1 : maxColumns));
  const visibleColumns = columns.slice(startIdx);

  function selectArea(depth: number, id: string) {
    setSelection([...validSelection.slice(0, depth), id]);
    setSelectedTaskId(null);
    setEditingTaskId(null);
    setEditingAreaId(null);
  }

  // Mobile: Columns collapses to a single pane showing only the deepest drilled-into
  // area, with a back button walking up one level at a time (like Tree view's
  // breadcrumb navigation, but as a single stack instead of a sidebar tree).
  function goBack() {
    setSelection(validSelection.slice(0, -1));
    setSelectedTaskId(null);
    setEditingTaskId(null);
    setEditingAreaId(null);
  }

  function submitTaskRename(task: Task, title: string) {
    setEditingTaskId(null);
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) renameTask.mutate({ id: task.id, title: trimmed });
  }

  function submitAreaRename(node: AreaNode, name: string) {
    setEditingAreaId(null);
    const trimmed = name.trim();
    if (trimmed && trimmed !== node.name) renameArea.mutate({ id: node.id, name: trimmed });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="flex items-center justify-between gap-3 px-5 py-2.5"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {isMobile ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {validSelection.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                title="Back"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent"
                style={{ borderRadius: "var(--radius-xs)", color: "var(--text-secondary)" }}
              >
                <BackIcon />
              </button>
            )}
            <span
              className="truncate"
              style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}
            >
              {visibleColumns.at(-1)?.parent?.name ?? "Areas"}
            </span>
          </div>
        ) : (
          <nav className="flex min-w-0 items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            <Breadcrumb
              items={path}
              emptyLabel="Pick an area to drill in"
              onNavigate={(index) => {
                setSelection(path.slice(0, index + 1).map((n) => n.id));
                setSelectedTaskId(null);
                setEditingTaskId(null);
                setEditingAreaId(null);
              }}
            />
          </nav>
        )}
        <div className={isMobile ? "flex min-w-0 flex-1 items-center justify-end gap-2" : "flex shrink-0 items-center gap-2"}>
        {!isMobile && (
        <div
          className="flex shrink-0 items-center gap-0.5 p-0.5"
          style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
          title="Visible columns"
        >
          {MAX_COLUMN_OPTIONS.map((n) => {
            const active = maxColumns === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setMaxColumns(n)}
                className="h-5 w-6 cursor-pointer border-none"
                style={{
                  fontSize: "var(--text-2xs)",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 overflow-hidden">
        {visibleColumns.map((col, i) => {
          const depth = startIdx + i;
          const isEmptyRoot = col.parent === null && col.areas.length === 0;
          const { active: activeTasks } = splitActiveAndCompleted(col.tasks);
          return (
            <Column key={col.parent?.id ?? "root"}>
              {canEdit &&
                (col.parent ? (
                  <>
                    <div
                      className="mb-1.5 px-2.5 py-1.5"
                      style={{
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-raised)",
                      }}
                    >
                      <AddTaskBar
                        onAdd={(input) => createTask.mutate({ areaId: col.parent!.id, ...input })}
                        placeholder="Add task…"
                      />
                    </div>
                    <div
                      className="mb-1.5 px-2.5 py-1.5"
                      style={{
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-raised)",
                      }}
                    >
                      <AddAreaRow
                        placeholder="New sub-area…"
                        onAdd={(name) => createArea.mutate({ name, parentId: col.parent!.id, workspaceId })}
                      />
                    </div>
                  </>
                ) : (
                  <div
                    className="mb-1.5 px-2.5 py-1.5"
                    style={{
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-raised)",
                    }}
                  >
                    <AddAreaRow placeholder="New area…" onAdd={(name) => createArea.mutate({ name, parentId: null, workspaceId })} />
                  </div>
                ))}
              <SortableContext
                items={[...col.areas.map((a) => a.id), ...activeTasks.map((t) => t.id)]}
                strategy={verticalListSortingStrategy}
              >
                {col.areas.map((node) => (
                  <AreaColumnItem
                    key={node.id}
                    node={node}
                    tasksByArea={tasksByArea}
                    selected={col.selectedAreaId === node.id}
                    editing={editingAreaId === node.id}
                    canEdit={canEdit}
                    onSelect={() => selectArea(depth, node.id)}
                    onStartEdit={() => setEditingAreaId(node.id)}
                    onSubmitEdit={(name) => submitAreaRename(node, name)}
                    onCancelEdit={() => setEditingAreaId(null)}
                    onDelete={() => setDeleteTarget(node)}
                  />
                ))}
                <TaskColumnList
                  tasks={col.tasks}
                  selectedTaskId={selectedTaskId}
                  editingTaskId={editingTaskId}
                  canEdit={canEdit}
                  showAvatars={showAvatars}
                  onSelect={(task) => setSelectedTaskId(task.id)}
                  onCycleStatus={(task) => cycleStatus.mutate({ task })}
                  onStartEdit={(task) => setEditingTaskId(task.id)}
                  onSubmitEdit={(task, title) => submitTaskRename(task, title)}
                  onCancelEdit={() => setEditingTaskId(null)}
                  onDelete={(task) => {
                    undo.deleteTask(task);
                    if (selectedTaskId === task.id) setSelectedTaskId(null);
                  }}
                />
              </SortableContext>
              {isEmptyRoot && (
                <div className="px-2 py-2" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  {canEdit ? "No areas yet — create your first one above." : "No areas yet."}
                </div>
              )}
            </Column>
          );
        })}
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
      </div>
      </DndContext>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        name={deleteTarget?.name ?? ""}
        areaCount={deleteTarget ? deletionImpact(deleteTarget, tasksByArea).areas : 0}
        taskCount={deleteTarget ? deletionImpact(deleteTarget, tasksByArea).tasks : 0}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            undo.deleteArea(deleteTarget);
            setSelection((sel) => {
              const idx = sel.indexOf(deleteTarget.id);
              return idx === -1 ? sel : sel.slice(0, idx);
            });
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

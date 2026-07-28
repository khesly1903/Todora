import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { resolveDragEnd } from "../dnd";
import { buildTree, deletionImpact, findPath, groupTasksByArea, type AreaNode } from "../tree";
import { AddAreaRow, AddTaskRow, AreaColumnItem, Column, TaskColumnItem } from "./ColumnView";
import { Breadcrumb } from "./primitives";
import { DeleteConfirmDialog } from "./Dialog";
import { TaskInspector } from "./TaskInspector";
import { SearchResults } from "./SearchResults";
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
}: {
  areas: Area[];
  tasks: Task[];
  workspaceId: string;
  canEdit: boolean;
}) {
  const [maxColumns, setMaxColumns] = useMaxColumns();
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
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AreaNode | null>(null);

  const roots = useMemo(() => buildTree(areas), [areas]);
  const tasksByArea = useMemo(() => groupTasksByArea(tasks), [tasks]);
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  const query = search.trim().toLowerCase();
  const matches = query ? tasks.filter((t) => t.title.toLowerCase().includes(query)) : [];

  function openTaskFromSearch(task: Task) {
    const chain = findPath(roots, task.areaId) ?? [];
    setSelection(chain.map((n) => n.id));
    setSelectedTaskId(task.id);
    setSearch("");
  }

  // Sliding window: only render the deepest `maxColumns` columns; older ones live in the breadcrumb.
  const startIdx = Math.max(0, columns.length - maxColumns);
  const visibleColumns = columns.slice(startIdx);

  function selectArea(depth: number, id: string) {
    setSelection([...validSelection.slice(0, depth), id]);
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
        <div className="flex shrink-0 items-center gap-2">
        <input
          value={search}
          placeholder="Search tasks…"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          className="w-[170px] shrink-0 px-2 py-1 outline-none"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
          }}
        />
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
        </div>
      </div>

      {query ? (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <SearchResults roots={roots} matches={matches} onPick={openTaskFromSearch} />
        </div>
      ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 overflow-hidden">
        {visibleColumns.map((col, i) => {
          const depth = startIdx + i;
          const isEmptyRoot = col.parent === null && col.areas.length === 0;
          return (
            <Column key={col.parent?.id ?? "root"}>
              <SortableContext
                items={[...col.areas.map((a) => a.id), ...col.tasks.map((t) => t.id)]}
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
                {col.tasks.map((task) => (
                  <TaskColumnItem
                    key={task.id}
                    task={task}
                    selected={selectedTaskId === task.id}
                    editing={editingTaskId === task.id}
                    canEdit={canEdit}
                    onSelect={() => setSelectedTaskId(task.id)}
                    onCycleStatus={() => cycleStatus.mutate({ task })}
                    onStartEdit={() => setEditingTaskId(task.id)}
                    onSubmitEdit={(title) => submitTaskRename(task, title)}
                    onCancelEdit={() => setEditingTaskId(null)}
                    onDelete={() => {
                      undo.deleteTask(task);
                      if (selectedTaskId === task.id) setSelectedTaskId(null);
                    }}
                  />
                ))}
              </SortableContext>
              {isEmptyRoot && (
                <div className="px-2 py-2" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  {canEdit ? "No areas yet — create your first one below." : "No areas yet."}
                </div>
              )}
              {canEdit &&
                (col.parent ? (
                  <>
                    <AddAreaRow
                      placeholder="New sub-area…"
                      onAdd={(name) => createArea.mutate({ name, parentId: col.parent!.id, workspaceId })}
                    />
                    <AddTaskRow onAdd={(title) => createTask.mutate({ areaId: col.parent!.id, title })} />
                  </>
                ) : (
                  <AddAreaRow placeholder="New area…" onAdd={(name) => createArea.mutate({ name, parentId: null, workspaceId })} />
                ))}
            </Column>
          );
        })}
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
      </div>
      </DndContext>
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

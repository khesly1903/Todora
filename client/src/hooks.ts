import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type TaskUpdate } from "./api";
import type { Area, Task, TaskStatus, Workspace, WorkspaceRole } from "./types";
import { NEXT_STATUS } from "./types";
import { reorderByIds } from "./reorder";
import type { DragAction } from "./dnd";

// Query keys are workspace-scoped: ["areas", workspaceId] / ["tasks", workspaceId].
// Invalidations below use the ["areas"] / ["tasks"] prefix (partial match), and
// optimistic updates use setQueriesData/getQueriesData over that prefix, so a
// mutation touches whichever workspace's cached list actually holds the item.

export function useWorkspaces() {
  return useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
}

// Polled so changes from other members of a shared workspace (new areas/tasks,
// edits, deletes) show up without a manual refresh — same pattern as invitations.
const COLLAB_REFETCH_MS = 10_000;

export function useAreas(workspaceId: string | null) {
  return useQuery({
    queryKey: ["areas", workspaceId],
    queryFn: () => api.listAreas(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: COLLAB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => api.listTasks(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: COLLAB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateWorkspaces() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["workspaces"] });
}

function useInvalidateAreas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["areas"] });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

export function useCreateWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: { name: string }) => api.createWorkspace(input),
    onSuccess: invalidate,
  });
}

export function useRenameWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateWorkspace(id, { name }),
    onSuccess: invalidate,
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateArea() {
  const invalidate = useInvalidateAreas();
  return useMutation({
    mutationFn: (input: { name: string; parentId?: string | null; workspaceId: string }) =>
      api.createArea(input),
    onSuccess: invalidate,
  });
}

export function useRenameArea() {
  const invalidate = useInvalidateAreas();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateArea(id, { name }),
    onSuccess: invalidate,
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: { areaId: string; title: string }) => api.createTask(input),
    onSuccess: invalidate,
  });
}

export function useRenameTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.updateTask(id, { title }),
    onSuccess: invalidate,
  });
}

/** Snapshot of every cached list under a prefix, so an optimistic update can roll back. */
type Snapshot<T> = [readonly unknown[], T[] | undefined][];

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }: { id: string } & TaskUpdate) => api.updateTask(id, fields),
    onMutate: async ({ id, ...fields }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] }) as Snapshot<Task>;
      queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (tasks) =>
        tasks?.map((t) => (t.id === id ? ({ ...t, ...fields } as Task) : t)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }: { id: string; name?: string; parentId?: string | null; sortOrder?: number }) =>
      api.updateArea(id, fields),
    onMutate: async ({ id, ...fields }) => {
      await queryClient.cancelQueries({ queryKey: ["areas"] });
      const previous = queryClient.getQueriesData<Area[]>({ queryKey: ["areas"] }) as Snapshot<Area>;
      queryClient.setQueriesData<Area[]>({ queryKey: ["areas"] }, (areas) =>
        areas?.map((a) => (a.id === id ? { ...a, ...fields } : a)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: invalidate,
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.reorderTasks(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] }) as Snapshot<Task>;
      queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (tasks) =>
        tasks ? reorderByIds(tasks, orderedIds) : tasks,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useReorderAreas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.reorderAreas(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["areas"] });
      const previous = queryClient.getQueriesData<Area[]>({ queryKey: ["areas"] }) as Snapshot<Area>;
      queryClient.setQueriesData<Area[]>({ queryKey: ["areas"] }, (areas) =>
        areas ? reorderByIds(areas, orderedIds) : areas,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useImportTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tree, parentId, workspaceId }: { tree: import("./api").ExportNode[]; parentId: string | null; workspaceId: string }) =>
      api.importTree(tree, parentId, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/**
 * Turn a resolved {@link DragAction} into the right mutations. Shared by the tree and
 * column views so both apply drops identically. `onExpand` lets the tree reveal a
 * newly-nested area; the column view can omit it.
 */
export function useApplyDragAction() {
  const reorderTasks = useReorderTasks();
  const updateTask = useUpdateTask();
  const reorderAreas = useReorderAreas();
  const moveArea = useUpdateArea();
  return (action: DragAction | null, onExpand?: (id: string) => void) => {
    if (!action) return;
    switch (action.type) {
      case "reorder-tasks":
        reorderTasks.mutate(action.orderedIds);
        break;
      case "move-task":
        updateTask.mutate({ id: action.taskId, areaId: action.areaId });
        reorderTasks.mutate(action.orderedIds);
        break;
      case "reorder-areas":
        reorderAreas.mutate(action.orderedIds);
        break;
      case "reparent-area":
        moveArea.mutate({ id: action.areaId, parentId: action.parentId });
        if (action.expandId) onExpand?.(action.expandId);
        break;
    }
  };
}

export function useCycleTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task }: { task: Task }) =>
      api.updateTask(task.id, { status: NEXT_STATUS[task.status] }),
    onMutate: async ({ task }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] }) as Snapshot<Task>;
      const nextStatus: TaskStatus = NEXT_STATUS[task.status];
      queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (tasks) =>
        tasks?.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextStatus,
                completedAt: nextStatus === "DONE" ? new Date().toISOString() : null,
              }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/** Pending invitations addressed to the current user — polled so the bell updates without a manual refresh. */
export function useMyInvitations() {
  return useQuery({
    queryKey: ["invitations", "mine"],
    queryFn: api.listMyInvitations,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateMyInvitations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["invitations", "mine"] });
}

export function useApproveInvitation() {
  const queryClient = useQueryClient();
  const invalidateInvitations = useInvalidateMyInvitations();
  return useMutation({
    mutationFn: (id: string) => api.approveInvitation(id),
    onSuccess: () => {
      invalidateInvitations();
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRejectInvitation() {
  const invalidate = useInvalidateMyInvitations();
  return useMutation({
    mutationFn: (id: string) => api.rejectInvitation(id),
    onSuccess: invalidate,
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => api.listMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

function useInvalidateMembers(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
}

export function useInviteMember(workspaceId: string) {
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: (input: { username: string; role: WorkspaceRole }) => api.inviteMember(workspaceId, input),
    onSuccess: invalidate,
  });
}

export function useCancelInvitation(workspaceId: string) {
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: (invitationId: string) => api.cancelInvitation(workspaceId, invitationId),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(workspaceId, userId),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      api.updateMemberRole(workspaceId, userId, role),
    onSuccess: invalidate,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.changePassword(input.currentPassword, input.newPassword),
    meta: { silent: true },
  });
}

export type { Workspace };

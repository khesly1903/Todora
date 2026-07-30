import type {
  Area,
  Invitation,
  Priority,
  Task,
  TaskStatus,
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// In dev, requests stay relative and Vite proxies /api to the local server.
// In prod, the client and server are typically on different subdomains, so
// VITE_API_URL (baked in at build time) points requests at the real API host.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `Request failed: ${res.status}`, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export interface DeleteAreaResult {
  deletedAreas: number;
  deletedTasks: number;
}

export type DeleteWorkspaceResult = DeleteAreaResult;

export type TaskUpdate = Partial<
  Pick<Task, "title" | "description" | "areaId" | "sortOrder" | "dueAt" | "priority" | "tags">
> & { status?: TaskStatus };

export interface ExportNode {
  name: string;
  tasks: {
    title: string;
    status: TaskStatus;
    priority: string;
    tags: string[];
    dueAt: string | null;
    description: string | null;
    completedAt: string | null;
  }[];
  children: ExportNode[];
}

export const api = {
  register: (username: string, password: string, name: string) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password, name }) }),
  login: (username: string, password: string) =>
    request<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
  updateProfile: (name: string) =>
    request<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  regenerateAvatar: () => request<User>("/api/auth/regenerate-avatar", { method: "POST" }),

  listWorkspaces: () => request<Workspace[]>("/api/workspaces"),
  createWorkspace: (input: { name: string }) =>
    request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
  updateWorkspace: (id: string, input: { name?: string }) =>
    request<Workspace>(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteWorkspace: (id: string) =>
    request<DeleteWorkspaceResult>(`/api/workspaces/${id}`, { method: "DELETE" }),
  reorderWorkspaces: (orderedIds: string[]) =>
    request<void>("/api/workspaces/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),

  lookupUser: (username: string) =>
    request<User>(`/api/users/lookup?username=${encodeURIComponent(username)}`),

  listMembers: (workspaceId: string) =>
    request<{ members: WorkspaceMember[]; pendingInvitations: Invitation[] }>(
      `/api/workspaces/${workspaceId}/members`,
    ),
  inviteMember: (workspaceId: string, input: { username: string; role: WorkspaceRole }) =>
    request<Invitation>(`/api/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelInvitation: (workspaceId: string, invitationId: string) =>
    request<void>(`/api/workspaces/${workspaceId}/invitations/${invitationId}`, { method: "DELETE" }),
  removeMember: (workspaceId: string, userId: string) =>
    request<void>(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }),
  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) =>
    request<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  listMyInvitations: () => request<Invitation[]>("/api/invitations"),
  approveInvitation: (id: string) => request<Invitation>(`/api/invitations/${id}/approve`, { method: "POST" }),
  rejectInvitation: (id: string) => request<Invitation>(`/api/invitations/${id}/reject`, { method: "POST" }),

  listAreas: (workspaceId: string) =>
    request<Area[]>(`/api/areas?workspaceId=${encodeURIComponent(workspaceId)}`),
  listTasks: (workspaceId: string) =>
    request<Task[]>(`/api/tasks?workspaceId=${encodeURIComponent(workspaceId)}`),

  createArea: (input: { name: string; parentId?: string | null; workspaceId: string }) =>
    request<Area>("/api/areas", { method: "POST", body: JSON.stringify(input) }),
  updateArea: (id: string, input: { name?: string; parentId?: string | null; sortOrder?: number }) =>
    request<Area>(`/api/areas/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteArea: (id: string) => request<DeleteAreaResult>(`/api/areas/${id}`, { method: "DELETE" }),

  createTask: (input: {
    areaId: string;
    title: string;
    status?: TaskStatus;
    priority?: Priority;
    tags?: string[];
    dueAt?: string | null;
    description?: string | null;
  }) =>
    request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: string, input: TaskUpdate) =>
    request<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  reorderTasks: (orderedIds: string[]) =>
    request<void>("/api/tasks/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
  reorderAreas: (orderedIds: string[]) =>
    request<void>("/api/areas/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
  importTree: (tree: ExportNode[], parentId: string | null, workspaceId: string) =>
    request<{ importedAreas: number; importedTasks: number }>("/api/import", {
      method: "POST",
      body: JSON.stringify({ tree, parentId, workspaceId }),
    }),
};

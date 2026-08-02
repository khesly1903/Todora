export type TaskStatus = "NOT_STARTED" | "COOKING" | "DONE";
export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";
export type InvitationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  username: string;
  name: string | null;
  avatarSeed: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  ownerName: string | null;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  sortOrder: number;
  createdAt: string;
  user: User;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  invitedUserId: string;
  invitedById: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
  workspace?: { name: string };
  invitedBy?: { username: string; name: string | null; avatarSeed: string | null };
  invitedUser?: User;
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function canEditRole(role: WorkspaceRole | null | undefined): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export interface Area {
  id: string;
  name: string;
  parentId: string | null;
  workspaceId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  areaId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  sortOrder: number;
  dueAt: string | null;
  completedAt: string | null;
  createdById: string | null;
  createdBy: User | null;
  completedById: string | null;
  completedBy: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  COOKING: "Cooking",
  DONE: "Done",
};

export const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  NOT_STARTED: "COOKING",
  COOKING: "DONE",
  DONE: "NOT_STARTED",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const MINIMAL_PRIORITY_LABELS: Record<Priority, string> = {
  NONE: "-",
  LOW: "!",
  MEDIUM: "!!",
  HIGH: "!!!",
};

export const PRIORITY_ORDER: Priority[] = ["NONE", "LOW", "MEDIUM", "HIGH"];

export const PRIORITY_COLORS: Record<Priority, string> = {
  NONE: "var(--text-tertiary)",
  LOW: "var(--accent-9)",
  MEDIUM: "var(--status-cooking)",
  HIGH: "var(--status-not-started)",
};

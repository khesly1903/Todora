import type { Area, Priority, Task, TaskStatus, User, Workspace } from "../types";

let seq = 0;

export function makeUser(over: Partial<User> = {}): User {
  seq += 1;
  return {
    id: `user-${seq}`,
    username: `user${seq}`,
    ...over,
  };
}

export function makeWorkspace(over: Partial<Workspace> = {}): Workspace {
  seq += 1;
  return {
    id: `ws-${seq}`,
    name: `Workspace ${seq}`,
    ownerId: "user-1",
    ownerUsername: "user1",
    role: "OWNER",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

export function makeArea(over: Partial<Area> = {}): Area {
  seq += 1;
  return {
    id: `area-${seq}`,
    name: `Area ${seq}`,
    parentId: null,
    workspaceId: "ws-1",
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

export function makeTask(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    areaId: "area-1",
    title: `Task ${seq}`,
    description: null,
    status: "NOT_STARTED" as TaskStatus,
    priority: "NONE" as Priority,
    tags: [],
    sortOrder: 0,
    dueAt: null,
    completedAt: null,
    createdById: null,
    createdBy: null,
    completedById: null,
    completedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

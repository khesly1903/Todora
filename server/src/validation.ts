import { z } from "zod";

export const taskStatusSchema = z.enum(["NOT_STARTED", "COOKING", "DONE"]);
export const prioritySchema = z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

export const workspaceRoleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);

export const createInvitationSchema = z.object({
  username: z.string().trim().min(1).max(24),
  role: workspaceRoleSchema.exclude(["OWNER"]).default("EDITOR"),
});

export const updateMemberRoleSchema = z.object({
  role: workspaceRoleSchema.exclude(["OWNER"]),
});

export const usernameQuerySchema = z.object({
  username: z.string().trim().min(1).max(24),
});

export const workspaceQuerySchema = z.object({
  workspaceId: z.string().min(1),
});

export const createAreaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().nullish(),
  workspaceId: z.string().min(1),
});

export const updateAreaSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const createTaskSchema = z.object({
  areaId: z.string(),
  title: z.string().trim().min(1).max(500),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  areaId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).max(10000),
});

const importTaskSchema = z.object({
  title: z.string().trim().min(1).max(500),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  description: z.string().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export type ImportArea = {
  name: string;
  tasks?: z.infer<typeof importTaskSchema>[];
  children?: ImportArea[];
};

const importAreaSchema: z.ZodType<ImportArea> = z.lazy(() =>
  z.object({
    name: z.string().trim().min(1).max(200),
    tasks: z.array(importTaskSchema).optional(),
    children: z.array(importAreaSchema).optional(),
  }),
);

export const importSchema = z.object({
  parentId: z.string().nullable().optional(),
  workspaceId: z.string().min(1),
  tree: z.array(importAreaSchema),
});

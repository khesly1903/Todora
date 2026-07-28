import { Router } from "express";
import { createTaskSchema, reorderSchema, updateTaskSchema, workspaceQuerySchema } from "../validation.js";
import * as taskService from "../services/taskService.js";

export const tasksRouter = Router();

tasksRouter.post("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = reorderSchema.parse(req.body);
    await taskService.reorderTasks(req.userId!, orderedIds);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const { workspaceId } = workspaceQuerySchema.parse(req.query);
    res.json(await taskService.listTasks(req.userId!, workspaceId));
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const input = createTaskSchema.parse(req.body);
    res.status(201).json(await taskService.createTask(req.userId!, input));
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateTaskSchema.parse(req.body);
    res.json(await taskService.updateTask(req.userId!, req.params.id, input));
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    await taskService.deleteTask(req.userId!, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

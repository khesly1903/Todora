import { Router } from "express";
import { createAreaSchema, reorderSchema, updateAreaSchema, workspaceQuerySchema } from "../validation.js";
import * as areaService from "../services/areaService.js";

export const areasRouter = Router();

areasRouter.post("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = reorderSchema.parse(req.body);
    await areaService.reorderAreas(req.userId!, orderedIds);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

areasRouter.get("/", async (req, res, next) => {
  try {
    const { workspaceId } = workspaceQuerySchema.parse(req.query);
    res.json(await areaService.listAreas(req.userId!, workspaceId));
  } catch (err) {
    next(err);
  }
});

areasRouter.post("/", async (req, res, next) => {
  try {
    const input = createAreaSchema.parse(req.body);
    res.status(201).json(await areaService.createArea(req.userId!, input));
  } catch (err) {
    next(err);
  }
});

areasRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateAreaSchema.parse(req.body);
    res.json(await areaService.updateArea(req.userId!, req.params.id, input));
  } catch (err) {
    next(err);
  }
});

areasRouter.delete("/:id", async (req, res, next) => {
  try {
    res.json(await areaService.deleteArea(req.userId!, req.params.id));
  } catch (err) {
    next(err);
  }
});

import { Router } from "express";
import {
  createInvitationSchema,
  createWorkspaceSchema,
  reorderSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from "../validation.js";
import * as workspaceService from "../services/workspaceService.js";
import * as invitationService from "../services/invitationService.js";

export const workspacesRouter = Router();

workspacesRouter.post("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = reorderSchema.parse(req.body);
    await workspaceService.reorderWorkspaces(req.userId!, orderedIds);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

workspacesRouter.get("/", async (req, res, next) => {
  try {
    res.json(await workspaceService.listWorkspaces(req.userId!));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.post("/", async (req, res, next) => {
  try {
    const input = createWorkspaceSchema.parse(req.body);
    res.status(201).json(await workspaceService.createWorkspace(req.userId!, input));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateWorkspaceSchema.parse(req.body);
    res.json(await workspaceService.updateWorkspace(req.userId!, req.params.id, input));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.delete("/:id", async (req, res, next) => {
  try {
    res.json(await workspaceService.deleteWorkspace(req.userId!, req.params.id));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.get("/:id/members", async (req, res, next) => {
  try {
    res.json(await invitationService.listMembers(req.userId!, req.params.id));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.post("/:id/invitations", async (req, res, next) => {
  try {
    const input = createInvitationSchema.parse(req.body);
    res.status(201).json(await invitationService.inviteMember(req.userId!, req.params.id, input));
  } catch (err) {
    next(err);
  }
});

workspacesRouter.delete("/:id/invitations/:invitationId", async (req, res, next) => {
  try {
    await invitationService.cancelInvitation(req.userId!, req.params.invitationId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

workspacesRouter.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    await invitationService.removeMember(req.userId!, req.params.id, req.params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

workspacesRouter.patch("/:id/members/:userId/role", async (req, res, next) => {
  try {
    const { role } = updateMemberRoleSchema.parse(req.body);
    res.json(await invitationService.updateMemberRole(req.userId!, req.params.id, req.params.userId, role));
  } catch (err) {
    next(err);
  }
});

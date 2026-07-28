import { Router } from "express";
import * as invitationService from "../services/invitationService.js";

export const invitationsRouter = Router();

invitationsRouter.get("/", async (req, res, next) => {
  try {
    res.json(await invitationService.listMyInvitations(req.userId!));
  } catch (err) {
    next(err);
  }
});

invitationsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    res.json(await invitationService.approveInvitation(req.userId!, req.params.id));
  } catch (err) {
    next(err);
  }
});

invitationsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    res.json(await invitationService.rejectInvitation(req.userId!, req.params.id));
  } catch (err) {
    next(err);
  }
});

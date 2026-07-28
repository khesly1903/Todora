import { Router } from "express";
import { usernameQuerySchema } from "../validation.js";
import { lookupUser } from "../services/invitationService.js";

export const usersRouter = Router();

usersRouter.get("/lookup", async (req, res, next) => {
  try {
    const { username } = usernameQuerySchema.parse(req.query);
    res.json(await lookupUser(username));
  } catch (err) {
    next(err);
  }
});

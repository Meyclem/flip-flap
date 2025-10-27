import { Router } from "express";

import {
  createFlag,
  deleteFlag,
  evaluateFlags,
  getFlag,
  listFlags,
  updateFlag,
} from "@/controllers/flags.controller.js";
import { authenticateApiKey } from "@/middleware/auth.middleware.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const flagsRouter = Router();

flagsRouter.post("/evaluate", asyncHandler(authenticateApiKey), asyncHandler(evaluateFlags));
flagsRouter.get("/", asyncHandler(authenticateApiKey), asyncHandler(listFlags));
flagsRouter.get("/:key", asyncHandler(authenticateApiKey), asyncHandler(getFlag));
flagsRouter.post("/", asyncHandler(authenticateApiKey), asyncHandler(createFlag));
flagsRouter.put("/:key", asyncHandler(authenticateApiKey), asyncHandler(updateFlag));
flagsRouter.delete("/:key", asyncHandler(authenticateApiKey), asyncHandler(deleteFlag));

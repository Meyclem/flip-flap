import { Router } from "express";

import {
  createFlag,
  deleteFlag,
  evaluateFlags,
  getFlag,
  listFlags,
  updateFlag,
} from "@/controllers/flags.controller.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const flagsRouter = Router();

flagsRouter.post("/evaluate", asyncHandler(evaluateFlags));
flagsRouter.get("/", asyncHandler(listFlags));
flagsRouter.get("/:key", asyncHandler(getFlag));
flagsRouter.post("/", asyncHandler(createFlag));
flagsRouter.put("/:key", asyncHandler(updateFlag));
flagsRouter.delete("/:key", asyncHandler(deleteFlag));

import { Router } from "express";

import { createFlag, getFlag, listFlags } from "@/controllers/flags.controller.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const flagsRouter = Router();

flagsRouter.get("/", asyncHandler(listFlags));
flagsRouter.get("/:key", asyncHandler(getFlag));
flagsRouter.post("/", asyncHandler(createFlag));

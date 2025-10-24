import { Router } from "express";

import { createFlag, listFlags } from "@/controllers/flags.controller.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const flagsRouter = Router();

flagsRouter.get("/", asyncHandler(listFlags));
flagsRouter.post("/", asyncHandler(createFlag));

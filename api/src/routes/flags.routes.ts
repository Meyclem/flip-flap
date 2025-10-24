import { Router } from "express";

import { createFlag } from "@/controllers/flags.controller.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const flagsRouter = Router();

flagsRouter.post("/", asyncHandler(createFlag));

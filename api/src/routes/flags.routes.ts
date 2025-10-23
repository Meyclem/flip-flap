import { Router } from "express";

import { createFlag } from "@/controllers/flags.controller.js";

export const flagsRouter = Router();

flagsRouter.post("/", createFlag);

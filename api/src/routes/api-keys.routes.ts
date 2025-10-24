import { Router } from "express";

import { createApiKey, listApiKeys } from "@/controllers/api-keys.controller.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const apiKeysRouter = Router();

apiKeysRouter.get("/", asyncHandler(listApiKeys));
apiKeysRouter.post("/", asyncHandler(createApiKey));

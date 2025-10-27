import { Router } from "express";

import { createApiKey, listApiKeys } from "@/controllers/api-keys.controller.js";
import { authenticateApiKey } from "@/middleware/auth.middleware.js";
import { asyncHandler } from "@/utils/async-handler.js";

export const apiKeysRouter = Router();

apiKeysRouter.get("/", asyncHandler(authenticateApiKey), asyncHandler(listApiKeys));
apiKeysRouter.post("/", asyncHandler(authenticateApiKey), asyncHandler(createApiKey));

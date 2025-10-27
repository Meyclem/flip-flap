import type { NextFunction, Request, Response } from "express";

import { ApiKey } from "@/models/api-key.model.js";
import { UnauthorizedError } from "@/utils/errors.js";

export const authenticateApiKey = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const apiKey = request.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    throw new UnauthorizedError("API key is required. Please provide a valid API key in the X-API-Key header.");
  }

  const apiKeyDoc = await ApiKey.findOne({ key: apiKey });

  if (!apiKeyDoc) {
    throw new UnauthorizedError("Invalid API key. Please check your credentials.");
  }

  response.locals.organizationId = apiKeyDoc.organizationId;
  response.locals.environment = apiKeyDoc.environment;

  next();
};

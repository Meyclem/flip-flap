import crypto from "node:crypto";

import type { Request, Response } from "express";
import { Types } from "mongoose";

import { ApiKey } from "@/models/api-key.model.js";
import { createApiKeySchema } from "@/validators/api-key.validator.js";

export const createApiKey = async (request: Request, response: Response) => {
  const validationResult = createApiKeySchema.safeParse(request.body);

  if (!validationResult.success) {
    throw validationResult.error;
  }

  const { environment, description } = validationResult.data;
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const key = `${environment.slice(0, 4)}_${crypto.randomBytes(32).toString("hex")}`;

  const apiKey = await ApiKey.create({
    organizationId,
    key,
    environment,
    description,
  });

  return response.status(201).json(apiKey);
};

export const listApiKeys = async (_request: Request, response: Response) => {
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const apiKeys = await ApiKey.find({ organizationId }).sort({ createdAt: -1 });

  return response.status(200).json(apiKeys);
};

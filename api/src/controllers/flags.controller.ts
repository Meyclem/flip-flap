import type { Request, Response } from "express";
import { Types } from "mongoose";

import { Flag } from "@/models/flag.model.js";
import { ConflictError, NotFoundError } from "@/utils/errors.js";
import { createFlagSchema } from "@/validators/flag.validator.js";

export const listFlags = async (_request: Request, response: Response) => {
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const flags = await Flag.find({ organizationId }).sort({ createdAt: -1 });

  return response.status(200).json(flags);
};

export const getFlag = async (request: Request, response: Response) => {
  const { key } = request.params;
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const flag = await Flag.findOne({ organizationId, flagKey: key });

  if (!flag) {
    throw new NotFoundError(`Flag with key '${key}' not found`);
  }

  return response.status(200).json(flag);
};

export const createFlag = async (request: Request, response: Response) => {
  const validationResult = createFlagSchema.safeParse(request.body);

  if (!validationResult.success) {
    throw validationResult.error;
  }

  const { flagKey, name, description, environments } = validationResult.data;

  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const existingFlag = await Flag.findOne({ organizationId, flagKey });
  if (existingFlag) {
    throw new ConflictError("Flag with this key already exists in the organization");
  }

  const flag = await Flag.create({
    organizationId,
    flagKey,
    name,
    description,
    environments,
  });

  return response.status(201).json(flag);
};

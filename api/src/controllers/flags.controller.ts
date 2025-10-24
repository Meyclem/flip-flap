import type { Request, Response } from "express";
import { Types } from "mongoose";

import { Flag } from "@/models/flag.model.js";
import { cacheService } from "@/services/cache.service.js";
import type { EvaluationContext } from "@/services/evaluator.js";
import { evaluateFlag } from "@/services/evaluator.js";
import { ConflictError, NotFoundError } from "@/utils/errors.js";
import { evaluateFlagSchema } from "@/validators/evaluate.validator.js";
import { createFlagSchema, updateFlagSchema } from "@/validators/flag.validator.js";

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

export const updateFlag = async (request: Request, response: Response) => {
  const { key } = request.params;
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  const validationResult = updateFlagSchema.safeParse(request.body);

  if (!validationResult.success) {
    throw validationResult.error;
  }

  const flag = await Flag.findOne({ organizationId, flagKey: key });

  if (!flag) {
    throw new NotFoundError(`Flag with key '${key}' not found`);
  }

  const updateData = validationResult.data;

  Object.assign(flag, updateData);
  await flag.save();
  cacheService.set(organizationId, flag.flagKey, flag);

  return response.status(200).json(flag);
};

export const deleteFlag = async (request: Request, response: Response) => {
  const { key } = request.params;
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

  if (!key) {
    throw new NotFoundError("Flag key is required");
  }

  const result = await Flag.deleteOne({ organizationId, flagKey: key });

  if (result.deletedCount === 0) {
    throw new NotFoundError(`Flag with key '${key}' not found`);
  }

  cacheService.delete(organizationId, key);

  return response.status(204).send();
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

  cacheService.set(organizationId, flagKey, flag);

  return response.status(201).json(flag);
};

export const evaluateFlags = async (request: Request, response: Response) => {
  const validationResult = evaluateFlagSchema.safeParse(request.body);

  if (!validationResult.success) {
    throw validationResult.error;
  }

  const { flagKey, context } = validationResult.data;
  const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");
  const environment = (response.locals.environment ?? "development");

  try {
    const flag = await cacheService.get(organizationId, flagKey);

    if (!flag) {
      return response.status(200).json({
        flagKey,
        enabled: false,
        metadata: { reason: "flag_not_found" },
      });
    }

    const envConfig = flag.environments[environment as keyof typeof flag.environments];

    if (!envConfig) {
      return response.status(200).json({
        flagKey,
        enabled: false,
        metadata: { reason: "environment_not_configured" },
      });
    }

    const result = evaluateFlag(flagKey, envConfig, context as EvaluationContext);

    return response.status(200).json({
      flagKey,
      ...result,
    });
  } catch {
    return response.status(200).json({
      flagKey,
      enabled: false,
      metadata: { reason: "evaluation_error" },
    });
  }
};

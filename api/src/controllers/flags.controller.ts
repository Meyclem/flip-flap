import type { Request, Response } from "express";
import { Types } from "mongoose";

import { Flag } from "@/models/flag.model.js";
import { createFlagSchema } from "@/validators/flag.validator.js";

export const createFlag = async (request: Request, response: Response) => {
  try {
    const validationResult = createFlagSchema.safeParse(request.body);

    if (!validationResult.success) {
      return response.status(400).json({
        error: "Validation failed",
        details: validationResult.error.issues,
      });
    }

    const { flagKey, name, description, environments } = validationResult.data;

    const organizationId = response.locals.organizationId ?? new Types.ObjectId("000000000000000000000001");

    const existingFlag = await Flag.findOne({ organizationId, flagKey });
    if (existingFlag) {
      return response.status(409).json({
        error: "Flag with this key already exists in the organization",
      });
    }

    const flag = await Flag.create({
      organizationId,
      flagKey,
      name,
      description,
      environments,
    });

    return response.status(201).json(flag);
  } catch (error) {
    console.error("Error creating flag:", error);
    return response.status(500).json({ error: "Internal server error" });
  }
};

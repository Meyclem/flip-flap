import mongoose, { type Document, Schema } from "mongoose";

import type { Environment } from "./api-key.model.js";

export interface IOperatorExpression {
  eq?: string | number;
  neq?: string | number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  oneOf?: (string | number)[];
  notOneOf?: (string | number)[];
}

export interface IPhase {
  startDate: string;
  endDate?: string;
  percentage: number;
}

export interface IEnvironmentConfig {
  enabled: boolean;
  phases?: IPhase[];
  contextRules?: Record<string, IOperatorExpression>;
}

export interface IFlag extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  flagKey: string;
  name: string;
  description?: string;
  environments: Record<Environment, IEnvironmentConfig>;
  createdAt: Date;
  updatedAt: Date;
}

const phaseSchema = new Schema<IPhase>(
  {
    startDate: { type: String, required: true },
    endDate: { type: String },
    percentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const environmentConfigSchema = new Schema<IEnvironmentConfig>(
  {
    enabled: { type: Boolean, required: true, default: false },
    phases: [phaseSchema],
    // Using Mixed type for contextRules to support fully dynamic field names
    // Trade-offs:
    // ✅ Flexible: Supports any custom context field without schema changes
    // ✅ Simple: No need to predefine possible field names
    // ❌ No DB validation: Relies entirely on Zod validation at API layer
    // ❌ Limited querying: Cannot efficiently query on specific rule values
    // This is acceptable for POC - validation happens via Zod before saving
    contextRules: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const flagSchema = new Schema<IFlag>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    flagKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_-]+$/,
      maxlength: 100,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    environments: {
      development: { type: environmentConfigSchema, required: true },
      staging: { type: environmentConfigSchema, required: true },
      production: { type: environmentConfigSchema, required: true },
    },
  },
  {
    timestamps: true,
  },
);

flagSchema.index({ organizationId: 1, flagKey: 1 }, { unique: true });

export const Flag = mongoose.model<IFlag>("Flag", flagSchema);

import mongoose, { type Document, Schema } from "mongoose";

export type Environment = "development" | "staging" | "production";

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  key: string;
  environment: Environment;
  description?: string;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    environment: {
      type: String,
      required: true,
      enum: ["development", "staging", "production"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

apiKeySchema.index({ organizationId: 1, environment: 1 });

export const ApiKey = mongoose.model<IApiKey>("ApiKey", apiKeySchema);

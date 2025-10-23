import mongoose, { type Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

organizationSchema.index({ name: 1 });

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  organizationSchema,
);

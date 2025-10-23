import { z } from "zod";

export const evaluateFlagSchema = z.object({
  flagKey: z.string().min(1),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export type EvaluateFlagInput = z.infer<typeof evaluateFlagSchema>;

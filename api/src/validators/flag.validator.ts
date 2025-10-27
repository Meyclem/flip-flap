import { z } from "zod";

export const operatorExpressionSchema = z.object({
  eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
  neq: z.union([z.string(), z.number(), z.boolean()]).optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  oneOf: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1)
    .optional(),
  notOneOf: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1)
    .optional(),
}).strict();

export const phaseSchema = z.object({
  startDate: z.string().datetime()
    .default(() => new Date().toISOString()),
  endDate: z.string().datetime()
    .optional(),
  percentage: z.number().min(0)
    .max(100),
});

function phasesOverlap(
  p1: { startDate: string; endDate?: string | undefined },
  p2: { startDate: string; endDate?: string | undefined },
): boolean {
  const start1 = new Date(p1.startDate).getTime();
  const end1 = p1.endDate ? new Date(p1.endDate).getTime() : Number.POSITIVE_INFINITY;
  const start2 = new Date(p2.startDate).getTime();
  const end2 = p2.endDate ? new Date(p2.endDate).getTime() : Number.POSITIVE_INFINITY;

  return start1 < end2 && start2 < end1;
}

export const environmentConfigSchema = z
  .object({
    enabled: z.boolean(),
    phases: z.array(phaseSchema)
      .optional(),
    contextRules: z.record(z.string(), operatorExpressionSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.phases || data.phases.length <= 1) {
        return true;
      }

      const phases = data.phases;
      for (let i = 0; i < phases.length; i += 1) {
        for (let j = i + 1; j < phases.length; j += 1) {
          if (phasesOverlap(phases[i]!, phases[j]!)) {
            return false;
          }
        }
      }
      return true;
    },
    { message: "Phase date ranges must not overlap" },
  );

export const createFlagSchema = z.object({
  flagKey: z
    .string()
    .min(1)
    .max(100)
    .toLowerCase()
    .regex(/^[a-z0-9_-]+$/, "Flag key must contain only lowercase letters, numbers, hyphens, and underscores"),
  name: z.string().min(1)
    .max(200),
  description: z.string().max(1000)
    .optional(),
  environments: z.object({
    development: environmentConfigSchema,
    staging: environmentConfigSchema,
    production: environmentConfigSchema,
  }),
});

export const updateFlagSchema = createFlagSchema.partial().omit({ flagKey: true });

export type CreateFlagInput = z.infer<typeof createFlagSchema>;
export type UpdateFlagInput = z.infer<typeof updateFlagSchema>;
export type OperatorExpression = z.infer<typeof operatorExpressionSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type EnvironmentConfig = z.infer<typeof environmentConfigSchema>;

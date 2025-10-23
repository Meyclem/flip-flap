import { z } from "zod";

export const environmentSchema = z.enum(["development", "staging", "production"]);

export const createApiKeySchema = z.object({
  environment: environmentSchema,
  description: z.string().max(500)
    .optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type Environment = z.infer<typeof environmentSchema>;

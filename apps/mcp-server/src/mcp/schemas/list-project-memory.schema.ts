import { z } from 'zod/v4';

export const ListProjectMemoryInputSchema = z.object({
  projectName: z.string().min(1),
  eventLimit: z.number().int().positive().max(500).optional(),
  includePayload: z.boolean().optional(),
  contentSnippetChars: z.number().int().nonnegative().max(2000).optional(),
});

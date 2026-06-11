import { z } from 'zod/v4';

export const SearchProjectContextInputSchema = z.object({
  projectName: z.string().min(1),
  query: z.string().min(1),
  conversationId: z.string().optional(),
  topK: z.number().int().positive().optional(),
});

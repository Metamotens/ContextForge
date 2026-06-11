import { z } from 'zod/v4';

export const SearchProjectContextInputSchema = z.object({
  projectName: z.string().min(1),
  query: z.string().min(1),
  conversationId: z.string().optional(),
  topK: z.number().int().positive().optional(),
});

export type SearchProjectContextInput = z.infer<typeof SearchProjectContextInputSchema>;
export type SearchProjectContextResult = { eventId: string; snippet: string; score: number };
export type SearchProjectContextOutput = {
  results: SearchProjectContextResult[];
  /** Formatted memory block ready to use as context. Empty string when no relevant memory exists. */
  contextBlock: string;
  tokensUsed: number;
  truncated: boolean;
};

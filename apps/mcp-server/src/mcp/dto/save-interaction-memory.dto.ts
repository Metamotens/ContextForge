import { z } from 'zod/v4';

export const RoleSchema = z.enum(['user', 'assistant', 'system']);

export const SaveInteractionMemoryInputSchema = z.object({
  projectName: z.string().min(1),
  provider: z.string().min(1),
  userName: z.string().min(1),
  conversationId: z.string().min(1),
  role: RoleSchema,
  content: z.string().min(1),
  isSummary: z.boolean().optional(),
});

export type SaveInteractionMemoryInput = z.infer<typeof SaveInteractionMemoryInputSchema>;

export const SaveInteractionMemoryOutputSchema = z.object({
  eventId: z.string(),
  saved: z.boolean(),
  summaryEventId: z.string().nullable(),
  summaryReason: z.string(),
});

export type SaveInteractionMemoryOutput = z.infer<typeof SaveInteractionMemoryOutputSchema>;

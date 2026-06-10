import { z } from 'zod/v4';

export const ListProjectMemoryInputSchema = z.object({
  projectName: z.string().min(1),
  eventLimit: z.number().int().positive().max(500).optional(),
  includePayload: z.boolean().optional(),
  contentSnippetChars: z.number().int().nonnegative().max(2000).optional(),
});

export type ListProjectMemoryInput = z.infer<typeof ListProjectMemoryInputSchema>;

export interface ListProjectMemoryConversation {
  id: string;
  provider: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  summaryCount: number;
}

export interface ListProjectMemoryEvent {
  id: string;
  conversationId: string;
  role: string;
  contentSnippet: string;
  isSummary: boolean;
  createdAt: string;
}

export interface ListProjectMemoryQdrantPoint {
  id: string;
  conversationId: string;
  provider: string;
  userName: string;
  createdAt: string;
  summarySnippet: string;
}

export interface ListProjectMemoryOutput {
  projectId: string;
  projectName: string;
  counts: {
    conversations: number;
    events: number;
    summaries: number;
    qdrantPointsListed: number;
  };
  conversations: ListProjectMemoryConversation[];
  events: ListProjectMemoryEvent[];
  qdrantPoints: ListProjectMemoryQdrantPoint[];
  warnings: string[];
}

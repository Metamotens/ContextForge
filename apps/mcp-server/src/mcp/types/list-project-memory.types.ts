import type { z } from 'zod/v4';

import { ListProjectMemoryInputSchema } from '@mcp/schemas/list-project-memory.schema';

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

export interface ListProjectMemoryVectorPoint {
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
    vectorSummariesListed: number;
  };
  conversations: ListProjectMemoryConversation[];
  events: ListProjectMemoryEvent[];
  vectorPoints: ListProjectMemoryVectorPoint[];
  warnings: string[];
}

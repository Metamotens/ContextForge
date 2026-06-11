import type { QueryResultRow } from 'pg';

export interface UpsertProjectInput {
  id: string;
  name: string;
}

export interface UpsertConversationInput {
  id: string;
  projectId: string;
  provider: string;
  userName: string;
}

export interface InsertPromptEventInput {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isSummary: boolean;
}

export interface ConversationCounters {
  turnCount: number;
  estimatedTokens: number;
}

export interface CountersRow extends QueryResultRow {
  turn_count: string;
  estimated_tokens: string;
}

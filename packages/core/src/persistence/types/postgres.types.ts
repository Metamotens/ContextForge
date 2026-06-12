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
  model: string;
  title?: string | null;
}

export interface ListEventsByProjectOptions {
  projectId: string;
  limit: number;
  offset?: number;
  conversationId?: string;
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

export interface PromptEventRow extends QueryResultRow {
  id: string;
  role: string;
  content: string;
  created_at: Date;
}

export interface LastSummaryResult {
  id: string;
  content: string;
  createdAt: Date;
}

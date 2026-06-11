export type SummaryKind = 'rolling' | 'milestone' | 'final';

export interface SummaryPayload extends Record<string, unknown> {
  project_id: string;
  conversation_id: string;
  provider: string;
  user_name: string;
  created_at: string;
  is_summary: boolean;
  summary_text: string;
  summary_kind: SummaryKind;
}

export interface IndexSummaryInput {
  eventId: string;
  projectId: string;
  conversationId: string;
  provider: string;
  userName: string;
  createdAtIso: string;
  vector: number[];
  summaryText: string;
  summaryKind?: SummaryKind;
}

export interface SearchSummariesInput {
  projectId: string;
  conversationId?: string;
  queryVector: number[];
  topK?: number;
}

export interface ScrollByProjectIdInput {
  projectId: string;
  limit?: number;
  withPayload?: boolean;
}

export interface ScrolledSummaryPoint {
  id: string;
  payload: SummaryPayload;
}

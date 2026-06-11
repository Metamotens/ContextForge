export type SummaryKind = 'rolling' | 'milestone' | 'final';

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
  payload: {
    conversation_id?: string;
    provider?: string;
    user_name?: string;
    created_at?: string;
    summary_text?: string;
    summary_kind?: SummaryKind;
  };
}

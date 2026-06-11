export interface PersistEventInput {
  projectName: string;
  provider: string;
  userName: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isSummary?: boolean;
}

export interface PersistEventOutput {
  eventId: string;
  saved: boolean;
  summaryEventId: string | null;
  summaryReason: string;
}

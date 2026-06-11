export interface MaybeGenerateSummaryInput {
  projectName: string;
  conversationId: string;
  triggerEventId: string;
}

export interface MaybeGenerateSummaryResult {
  generated: boolean;
  summaryEventId: string | null;
  summaryText: string | null;
  reason: string;
  turnCount: number;
  estimatedTokens: number;
}

export interface SummaryContentInput {
  projectName: string;
  conversationId: string;
  recentTurns: Array<{ role: string; content: string; createdAt: Date }>;
  turnCount: number;
  estimatedTokens: number;
}

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

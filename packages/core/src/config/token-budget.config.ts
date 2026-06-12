export const TokenBudget = {
  topKDefault: Number(process.env.TOPK_DEFAULT) || 3,
  topKMax: Number(process.env.TOPK_MAX) || 5,
  scoreThreshold: Number(process.env.SCORE_THRESHOLD) || 0.72,
  maxContextTokens: Number(process.env.MAX_CONTEXT_TOKENS) || 1_200,
} as const;

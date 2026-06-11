export const SummaryConfig = {
  turnThreshold: Number(process.env.SUMMARY_TURN_THRESHOLD) || 8,
  tokenThreshold: Number(process.env.SUMMARY_TOKEN_THRESHOLD) || 4_000,
  chatModel: process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2',
  maxOutputTokens: Number(process.env.SUMMARY_MAX_OUTPUT_TOKENS) || 512,
  timeoutMs: Number(process.env.SUMMARY_LLM_TIMEOUT_MS) || 60_000,
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
} as const;

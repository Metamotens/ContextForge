import type { ContextSearchResult } from '../../common/types/context-search-result.types';

export interface ContextSearchInput {
  projectName: string;
  query: string;
  conversationId?: string;
  topK?: number;
}

export interface ContextSearchOutput {
  results: ContextSearchResult[];
  tokensUsed: number;
  truncated: boolean;
}

import type { ContextSearchResult } from '../../common/types/context-search-result.types';
import type { CompressedContext } from '../../common/types/context-enrichment.types';

export interface EnrichmentInput {
  projectName: string;
  query: string;
  conversationId?: string;
  topK?: number;
}

export interface EnrichmentOutput extends CompressedContext {
  results: ContextSearchResult[];
}

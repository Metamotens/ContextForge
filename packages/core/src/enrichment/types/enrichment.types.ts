import type { CompressedContext } from '../../common/types/context-enrichment.types';
import type { ContextSearchResult } from '../../common/types/context-search-result.types';

export interface EnrichmentInput {
  projectName: string;
  query: string;
  conversationId?: string;
  topK?: number;
}

export interface EnrichmentOutput extends CompressedContext {
  results: ContextSearchResult[];
}

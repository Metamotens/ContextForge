import { Injectable } from '@nestjs/common';
import { ContextRetrievalService, ContextSearchResult } from '../retrieval/context-retrieval.service';
import { ContextCompressionService, CompressedContext } from './context-compression.service';

export interface EnrichmentInput {
  projectName: string;
  query: string;
  conversationId?: string;
  topK?: number;
}

export interface EnrichmentOutput extends CompressedContext {
  results: ContextSearchResult[];
}

@Injectable()
export class PromptEnrichmentService {
  constructor(
    private readonly contextRetrieval: ContextRetrievalService,
    private readonly compression: ContextCompressionService,
  ) {}

  async enrich(input: EnrichmentInput): Promise<EnrichmentOutput> {
    const normalizedQuery = input.query.trim().replace(/\s+/g, ' ');

    const retrieved = await this.contextRetrieval.search({
      projectName: input.projectName,
      query: normalizedQuery,
      conversationId: input.conversationId,
      topK: input.topK,
    });

    const compressed = this.compression.compress(
      retrieved.results,
      retrieved.tokensUsed,
      retrieved.truncated,
    );

    return { ...compressed, results: retrieved.results };
  }
}

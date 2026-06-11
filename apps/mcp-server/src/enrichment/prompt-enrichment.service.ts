import { Injectable } from '@nestjs/common';

import { ContextRetrievalService } from '@retrieval/context-retrieval.service';
import { ContextCompressionService } from '@enrichment/context-compression.service';
import type { EnrichmentInput, EnrichmentOutput } from '@enrichment/types/enrichment.types';

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

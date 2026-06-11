import { Module } from '@nestjs/common';

import { ContextRetrievalService } from '@retrieval/context-retrieval.service';
import { SummaryService } from '@retrieval/summary.service';

import { ContextCompressionService } from '@enrichment/context-compression.service';
import { EmbeddingService } from '@enrichment/embedding.service';
import { InteractionPersistenceService } from '@enrichment/interaction-persistence.service';
import { PromptEnrichmentService } from '@enrichment/prompt-enrichment.service';

// PostgresModule and QdrantModule are @Global() — no need to import them here.
@Module({
  providers: [
    EmbeddingService,
    ContextCompressionService,
    ContextRetrievalService,
    SummaryService,
    PromptEnrichmentService,
    InteractionPersistenceService,
  ],
  exports: [EmbeddingService, PromptEnrichmentService, InteractionPersistenceService],
})
export class EnrichmentModule {}

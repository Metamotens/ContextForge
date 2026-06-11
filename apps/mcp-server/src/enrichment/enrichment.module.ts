import { Module } from '@nestjs/common';

import { EmbeddingService } from './embedding.service';
import { ContextCompressionService } from './context-compression.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { InteractionPersistenceService } from './interaction-persistence.service';
import { ContextRetrievalService } from '../retrieval/context-retrieval.service';
import { SummaryService } from '../retrieval/summary.service';

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
  exports: [
    EmbeddingService,
    PromptEnrichmentService,
    InteractionPersistenceService,
  ],
})
export class EnrichmentModule {}

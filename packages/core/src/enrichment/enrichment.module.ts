import { Module } from '@nestjs/common';

import { ContextRetrievalService } from '../retrieval/context-retrieval.service';
import { SummaryService } from '../retrieval/summary.service';
import { ContextCompressionService } from './context-compression.service';
import { EmbeddingService } from './embedding.service';
import { InteractionPersistenceService } from './interaction-persistence.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { SummaryLlmService } from './summary-llm.service';

// PostgresModule and PgVectorModule are @Global() — no need to import them here.
@Module({
  providers: [
    EmbeddingService,
    SummaryLlmService,
    ContextCompressionService,
    ContextRetrievalService,
    SummaryService,
    PromptEnrichmentService,
    InteractionPersistenceService,
  ],
  exports: [EmbeddingService, SummaryLlmService, PromptEnrichmentService, InteractionPersistenceService],
})
export class EnrichmentModule {}

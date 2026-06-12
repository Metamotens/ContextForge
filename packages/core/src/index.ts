// Common
export type { CompressedContext } from './common/types/context-enrichment.types';
export type { ContextSearchResult } from './common/types/context-search-result.types';
export { deterministicUuid } from './common/utils/identity.util';
export { estimateTokens } from './common/utils/token-estimation.util';
export { snippet } from './common/utils/text.util';

// Config
export { SummaryConfig } from './config/summary.config';
export { TokenBudget } from './config/token-budget.config';

// Persistence — modules
export { PostgresModule } from './persistence/postgres/postgres.module';
export { PgVectorModule } from './persistence/pgvector/pgvector.module';

// Persistence — services
export { PostgresService } from './persistence/postgres/postgres.service';
export { PgVectorService } from './persistence/pgvector/pgvector.service';

// Persistence — types
export type {
  ConversationCounters,
  CountersRow,
  InsertPromptEventInput,
  LastSummaryResult,
  PromptEventRow,
  UpsertConversationInput,
  UpsertProjectInput,
} from './persistence/types/postgres.types';
export type {
  IndexSummaryInput,
  ScrollByProjectIdInput,
  ScrolledSummaryPoint,
  SearchSummariesInput,
  SummaryKind,
} from './persistence/types/vector.types';

// Enrichment — module
export { EnrichmentModule } from './enrichment/enrichment.module';

// Enrichment — services
export { ContextCompressionService } from './enrichment/context-compression.service';
export { EmbeddingService } from './enrichment/embedding.service';
export { InteractionPersistenceService } from './enrichment/interaction-persistence.service';
export { PromptEnrichmentService } from './enrichment/prompt-enrichment.service';
export { SummaryLlmService } from './enrichment/summary-llm.service';

// Enrichment — types
export type { EnrichmentInput, EnrichmentOutput } from './enrichment/types/enrichment.types';
export type {
  PersistEventInput,
  PersistEventOutput,
} from './enrichment/types/interaction-persistence.types';
export type { RollingSummaryInput } from './enrichment/summary-llm.service';

// Retrieval — services
export { ContextRetrievalService } from './retrieval/context-retrieval.service';
export { SummaryService } from './retrieval/summary.service';

// Retrieval — types
export type {
  ContextSearchInput,
  ContextSearchOutput,
} from './retrieval/types/context-search.types';
export type {
  MaybeGenerateSummaryInput,
  MaybeGenerateSummaryResult,
} from './retrieval/types/summary.types';

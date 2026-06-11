import type { z } from 'zod/v4';

import type { ContextSearchResult } from '../../common/types/context-search-result.types';
import type { EnrichmentOutput } from '../../enrichment/types/enrichment.types';
import { SearchProjectContextInputSchema } from '../schemas/search-project-context.schema';

export type SearchProjectContextInput = z.infer<typeof SearchProjectContextInputSchema>;
export type SearchProjectContextResult = ContextSearchResult;
export type SearchProjectContextOutput = EnrichmentOutput;

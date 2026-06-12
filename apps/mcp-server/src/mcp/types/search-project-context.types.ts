import type { z } from 'zod/v4';

import type { ContextSearchResult, EnrichmentOutput } from '@contextforge/core';
import { SearchProjectContextInputSchema } from '@mcp/schemas/search-project-context.schema';

export type SearchProjectContextInput = z.infer<typeof SearchProjectContextInputSchema>;
export type SearchProjectContextResult = ContextSearchResult;
export type SearchProjectContextOutput = EnrichmentOutput;

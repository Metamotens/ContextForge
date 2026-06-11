import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { QdrantService } from '../persistence/qdrant/qdrant.service';
import { EmbeddingService } from '../enrichment/embedding.service';
import { deterministicUuid } from '../common/utils/identity.util';
import { estimateTokens } from '../common/utils/token-estimation.util';
import { TokenBudget } from '../config/token-budget.config';
import type { ContextSearchResult } from '../common/types/context-search-result.types';
import type {
  ContextSearchInput,
  ContextSearchOutput,
} from './types/context-search.types';

@Injectable()
export class ContextRetrievalService {
  private readonly logger = new Logger(ContextRetrievalService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(input: ContextSearchInput): Promise<ContextSearchOutput> {
    const projectId = deterministicUuid('project', input.projectName);
    const conversationId = input.conversationId
      ? deterministicUuid('conversation', input.conversationId)
      : undefined;
    const queryVector = await this.embeddingService.embed(input.query);

    const explicitTopK = input.topK;
    const initialTopK = explicitTopK ?? TokenBudget.topKDefault;

    let candidates = await this.qdrantService.searchSummaries({
      projectId,
      conversationId,
      queryVector,
      topK: initialTopK,
    });

    if (!explicitTopK && this.isLowConfidence(candidates)) {
      this.logger.log(
        `Low confidence results for project=${input.projectName}, retrying with topK=${TokenBudget.topKMax}`,
      );
      candidates = await this.qdrantService.searchSummaries({
        projectId,
        conversationId,
        queryVector,
        topK: TokenBudget.topKMax,
      });
    }

    const deduplicated = this.deduplicateByHash(candidates);
    return this.applyTokenBudget(deduplicated);
  }

  private isLowConfidence(results: Array<{ score?: number }>): boolean {
    if (results.length === 0) return true;
    return results.every((r) => (r.score ?? 0) < TokenBudget.scoreThreshold);
  }

  private deduplicateByHash(
    results: Array<{ id: string | number; score?: number; payload?: Record<string, unknown> | null }>,
  ): ContextSearchResult[] {
    const seen = new Set<string>();
    const output: ContextSearchResult[] = [];

    for (const point of results) {
      const snippet =
        typeof point.payload?.summary_text === 'string'
          ? point.payload.summary_text
          : '(summary payload unavailable)';
      const hash = createHash('sha256').update(snippet).digest('hex');
      if (seen.has(hash)) continue;
      seen.add(hash);
      output.push({ eventId: String(point.id), snippet, score: point.score ?? 0 });
    }

    return output;
  }

  private applyTokenBudget(results: ContextSearchResult[]): ContextSearchOutput {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const accepted: ContextSearchResult[] = [];
    let tokensUsed = 0;
    let truncated = false;

    for (const item of sorted) {
      const tokens = estimateTokens(item.snippet);
      if (tokensUsed + tokens > TokenBudget.maxContextTokens) {
        truncated = true;
        break;
      }
      accepted.push(item);
      tokensUsed += tokens;
    }

    return { results: accepted, tokensUsed, truncated };
  }
}

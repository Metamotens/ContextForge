import { Injectable } from '@nestjs/common';

import type { CompressedContext } from '../common/types/context-enrichment.types';
import type { ContextSearchResult } from '../common/types/context-search-result.types';

@Injectable()
export class ContextCompressionService {
  compress(
    results: ContextSearchResult[],
    tokensUsed: number,
    truncated: boolean,
  ): CompressedContext {
    if (results.length === 0) {
      return { contextBlock: '', snippetCount: 0, tokensUsed: 0, truncated: false };
    }

    const suffix = truncated ? ' (truncated)' : '';
    const lines: string[] = [
      `[ContextForge memory — ${results.length} snippet${results.length !== 1 ? 's' : ''}, ~${tokensUsed} tokens${suffix}]`,
    ];
    for (const r of results) {
      lines.push(`- (${r.score.toFixed(2)}) ${r.snippet}`);
    }

    return {
      contextBlock: lines.join('\n'),
      snippetCount: results.length,
      tokensUsed,
      truncated,
    };
  }
}

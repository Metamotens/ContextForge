import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { SummaryConfig } from '@config/summary.config';
import { SummaryLlmService } from '@enrichment/summary-llm.service';
import { PostgresService } from '@persistence/postgres/postgres.service';
import type {
  MaybeGenerateSummaryInput,
  MaybeGenerateSummaryResult,
} from '@retrieval/types/summary.types';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly postgres: PostgresService,
    private readonly summaryLlm: SummaryLlmService,
  ) {}

  async maybeGenerateSummary(input: MaybeGenerateSummaryInput): Promise<MaybeGenerateSummaryResult> {
    const counters = await this.postgres.countTurnsSinceLastSummary(input.conversationId);

    const reachedTurnThreshold = counters.turnCount >= SummaryConfig.turnThreshold;
    const reachedTokenThreshold = counters.estimatedTokens >= SummaryConfig.tokenThreshold;

    if (!reachedTurnThreshold && !reachedTokenThreshold) {
      return {
        generated: false,
        summaryEventId: null,
        summaryText: null,
        reason: `below threshold (turns=${counters.turnCount}/${SummaryConfig.turnThreshold}, tokens=${counters.estimatedTokens}/${SummaryConfig.tokenThreshold})`,
        turnCount: counters.turnCount,
        estimatedTokens: counters.estimatedTokens,
      };
    }

    const [lastSummary, newTurns] = await Promise.all([
      this.postgres.fetchLastSummary(input.conversationId),
      this.postgres.fetchTurnsSinceLastSummary(input.conversationId),
    ]);

    if (newTurns.length === 0) {
      return {
        generated: false,
        summaryEventId: null,
        summaryText: null,
        reason: 'no new turns to summarize',
        turnCount: counters.turnCount,
        estimatedTokens: counters.estimatedTokens,
      };
    }

    const summaryText = await this.summaryLlm.generateRollingSummary({
      projectName: input.projectName,
      lastSummaryText: lastSummary?.content ?? null,
      turns: newTurns,
    });

    if (!summaryText) {
      this.logger.warn(`LLM summary failed for conversation=${input.conversationId}, skipping.`);
      return {
        generated: false,
        summaryEventId: null,
        summaryText: null,
        reason: 'llm_failed',
        turnCount: counters.turnCount,
        estimatedTokens: counters.estimatedTokens,
      };
    }

    const summaryEventId = randomUUID();

    await this.postgres.insertPromptEvent({
      id: summaryEventId,
      conversationId: input.conversationId,
      role: 'system',
      content: summaryText,
      isSummary: true,
    });

    const reasonParts: string[] = [];
    if (reachedTurnThreshold) reasonParts.push(`turns=${counters.turnCount}`);
    if (reachedTokenThreshold) reasonParts.push(`tokens=${counters.estimatedTokens}`);
    this.logger.log(`LLM summary generated for conversation=${input.conversationId} (${reasonParts.join(', ')}) eventId=${summaryEventId}`);

    return {
      generated: true,
      summaryEventId,
      summaryText,
      reason: `threshold reached (${reasonParts.join(', ')})`,
      turnCount: counters.turnCount,
      estimatedTokens: counters.estimatedTokens,
    };
  }
}

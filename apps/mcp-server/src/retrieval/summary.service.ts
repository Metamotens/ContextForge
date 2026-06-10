import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PostgresService } from '../persistence/postgres/postgres.service';

export interface MaybeGenerateSummaryInput {
  projectName: string;
  conversationId: string;
  triggerEventId: string;
}

export interface MaybeGenerateSummaryResult {
  generated: boolean;
  summaryEventId: string | null;
  summaryText: string | null;
  reason: string;
  turnCount: number;
  estimatedTokens: number;
}

export interface SummaryContentInput {
  projectName: string;
  conversationId: string;
  recentTurns: Array<{ role: string; content: string; createdAt: Date }>;
  turnCount: number;
  estimatedTokens: number;
}

const SUMMARY_TURN_THRESHOLD = 8;
const SUMMARY_TOKEN_THRESHOLD = 4_000;
const RECENT_TURNS_FOR_SUMMARY = 8;
const MAX_SNIPPET_CHARS = 240;

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly postgres: PostgresService) { }

  async maybeGenerateSummary(input: MaybeGenerateSummaryInput): Promise<MaybeGenerateSummaryResult> {
    const counters = await this.postgres.countTurnsSinceLastSummary(input.conversationId);

    const reachedTurnThreshold = counters.turnCount >= SUMMARY_TURN_THRESHOLD;
    const reachedTokenThreshold = counters.estimatedTokens >= SUMMARY_TOKEN_THRESHOLD;

    if (!reachedTurnThreshold && !reachedTokenThreshold) {
      return {
        generated: false,
        summaryEventId: null,
        summaryText: null,
        reason: `below threshold (turns=${counters.turnCount}/${SUMMARY_TURN_THRESHOLD}, tokens=${counters.estimatedTokens}/${SUMMARY_TOKEN_THRESHOLD})`,
        turnCount: counters.turnCount,
        estimatedTokens: counters.estimatedTokens,
      };
    }

    const recentTurns = await this.postgres.fetchRecentTurns(input.conversationId, RECENT_TURNS_FOR_SUMMARY);

    const summaryText = this.buildDeterministicSummary({
      projectName: input.projectName,
      conversationId: input.conversationId,
      recentTurns,
      turnCount: counters.turnCount,
      estimatedTokens: counters.estimatedTokens,
    });

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
    this.logger.log(`Summary generated for conversation=${input.conversationId} (${reasonParts.join(', ')}) eventId=${summaryEventId}`);

    return {
      generated: true,
      summaryEventId,
      summaryText,
      reason: `threshold reached (${reasonParts.join(', ')})`,
      turnCount: counters.turnCount,
      estimatedTokens: counters.estimatedTokens,
    };
  }

  buildDeterministicSummary(input: SummaryContentInput): string {
    const lines: string[] = [];
    lines.push(`[summary] project=${input.projectName} conversation=${input.conversationId} turns=${input.turnCount} ~tokens=${input.estimatedTokens}`);

    for (const turn of input.recentTurns) {
      const cleaned = turn.content.replace(/\s+/g, ' ').trim();
      const snippet = cleaned.length > MAX_SNIPPET_CHARS ? `${cleaned.slice(0, MAX_SNIPPET_CHARS - 1)}…` : cleaned;
      const line = `- (${turn.role}) ${snippet}`;
      lines.push(line);
    }

    return lines.join('\n');
  }
}

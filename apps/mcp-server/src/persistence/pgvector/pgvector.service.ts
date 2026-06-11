import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

import type {
  IndexSummaryInput,
  ScrollByProjectIdInput,
  ScrolledSummaryPoint,
  SearchSummariesInput,
} from '@persistence/types/vector.types';

@Injectable()
export class PgVectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgVectorService.name);
  private readonly pool: Pool;
  private readonly topKDefault = Number(process.env.TOPK_DEFAULT) || 3;
  private readonly pendingRetries: Map<string, IndexSummaryInput> = new Map();

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER ?? 'contextforge',
      password: process.env.POSTGRES_PASSWORD ?? '',
      database: process.env.POSTGRES_DB ?? 'contextforge',
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  async onModuleInit(): Promise<void> {
    const result = await this.pool.query<{ ok: number }>('SELECT 1 AS ok');
    this.logger.log(`PgVector pool ready (ping=${result.rows[0]?.ok})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('PgVector pool closed');
  }

  async indexSummary(input: IndexSummaryInput): Promise<void> {
    await this.flushPendingRetries();
    const vec = `[${input.vector.join(',')}]`;
    await this.pool.query(
      `UPDATE prompt_events SET embedding = $1::vector WHERE id = $2`,
      [vec, input.eventId],
    );
  }

  enqueueRetry(input: IndexSummaryInput): void {
    this.pendingRetries.set(input.eventId, input);
    this.logger.log(`Enqueued retry for eventId=${input.eventId} (pending=${this.pendingRetries.size})`);
  }

  private async flushPendingRetries(): Promise<void> {
    if (this.pendingRetries.size === 0) return;

    this.logger.log(`Flushing ${this.pendingRetries.size} pending retry(s)`);
    for (const [eventId, retryInput] of this.pendingRetries) {
      try {
        const vec = `[${retryInput.vector.join(',')}]`;
        await this.pool.query(
          `UPDATE prompt_events SET embedding = $1::vector WHERE id = $2`,
          [vec, eventId],
        );
        this.pendingRetries.delete(eventId);
        this.logger.log(`Retry succeeded for eventId=${eventId}`);
      } catch (error) {
        this.logger.warn(`Retry still failing for eventId=${eventId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async searchSummaries(
    input: SearchSummariesInput,
  ): Promise<Array<{ id: string; score: number; payload: { summary_text: string } }>> {
    const topK = input.topK ?? this.topKDefault;
    const vec = `[${input.queryVector.join(',')}]`;

    const conversationFilter = input.conversationId
      ? `AND c.id = '${input.conversationId}'`
      : '';

    const result = await this.pool.query<{ id: string; content: string; score: number }>(
      `SELECT pe.id,
              pe.content,
              (1 - (pe.embedding <=> $1::vector))::float AS score
         FROM prompt_events pe
         JOIN conversations c ON c.id = pe.conversation_id
        WHERE pe.is_summary = true
          AND pe.embedding IS NOT NULL
          AND c.project_id = $2
          ${conversationFilter}
        ORDER BY pe.embedding <=> $1::vector
        LIMIT $3`,
      [vec, input.projectId, topK],
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: Number(row.score),
      payload: { summary_text: row.content },
    }));
  }

  async deleteByProjectId(_projectId: string): Promise<void> {
    // No-op: CASCADE DELETE on conversations/prompt_events already clears embeddings
  }

  async scrollByProjectId(input: ScrollByProjectIdInput): Promise<ScrolledSummaryPoint[]> {
    const limit = input.limit ?? 100;

    const result = await this.pool.query<{
      id: string;
      content: string;
      provider: string;
      user_name: string;
      created_at: Date;
      conversation_id: string;
    }>(
      `SELECT pe.id,
              pe.content,
              pe.conversation_id,
              c.provider,
              c.user_name,
              pe.created_at
         FROM prompt_events pe
         JOIN conversations c ON c.id = pe.conversation_id
        WHERE pe.is_summary = true
          AND pe.embedding IS NOT NULL
          AND c.project_id = $1
        ORDER BY pe.created_at DESC
        LIMIT $2`,
      [input.projectId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      payload: {
        conversation_id: row.conversation_id,
        provider: row.provider,
        user_name: row.user_name,
        created_at: row.created_at.toISOString(),
        summary_text: row.content,
      },
    }));
  }
}

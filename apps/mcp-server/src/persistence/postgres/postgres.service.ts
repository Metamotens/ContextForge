import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

import type {
  ConversationCounters,
  CountersRow,
  InsertPromptEventInput,
  UpsertConversationInput,
  UpsertProjectInput,
} from '@persistence/types/postgres.types';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private readonly pool: Pool;

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
    this.logger.log(`Connected to PostgreSQL ${process.env.POSTGRES_DB ?? 'contextforge'} (ping=${result.rows[0]?.ok})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('PostgreSQL pool closed');
  }

  async upsertProject(input: UpsertProjectInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [input.id, input.name],
    );
  }

  async findProjectIdByName(name: string): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>('SELECT id FROM projects WHERE name = $1 LIMIT 1', [name]);
    return result.rows[0]?.id ?? null;
  }

  async upsertConversation(input: UpsertConversationInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO conversations (id, project_id, provider, user_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT (id) DO UPDATE
         SET updated_at = now()`,
      [input.id, input.projectId, input.provider, input.userName],
    );
  }

  async insertPromptEvent(input: InsertPromptEventInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO prompt_events (id, conversation_id, role, content, is_summary, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [input.id, input.conversationId, input.role, input.content, input.isSummary],
    );
  }

  async countTurnsSinceLastSummary(conversationId: string): Promise<ConversationCounters> {
    const result = await this.pool.query<CountersRow>(
      `SELECT
         count(*)::text AS turn_count,
         COALESCE(sum(length(content)), 0)::text AS estimated_tokens
       FROM prompt_events
       WHERE conversation_id = $1
         AND role IN ('user', 'assistant')
         AND is_summary = false
         AND created_at > COALESCE(
           (SELECT max(created_at) FROM prompt_events WHERE conversation_id = $1 AND is_summary = true),
           '1970-01-01'::timestamptz
         )`,
      [conversationId],
    );
    return {
      turnCount: Number(result.rows[0]?.turn_count ?? 0),
      estimatedTokens: Math.ceil(Number(result.rows[0]?.estimated_tokens ?? 0) / 4),
    };
  }

  async fetchRecentTurns(conversationId: string, limit: number): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
    const result = await this.pool.query<QueryResultRow & { role: string; content: string; created_at: Date; }>(
      `SELECT role, content, created_at
         FROM prompt_events
        WHERE conversation_id = $1
          AND role IN ('user', 'assistant')
          AND is_summary = false
        ORDER BY created_at DESC
        LIMIT $2`,
      [conversationId, limit],
    );
    return result.rows.map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async deleteProject(projectId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM prompt_events
          WHERE conversation_id IN (
            SELECT id FROM conversations WHERE project_id = $1
          )`,
        [projectId],
      );
      await client.query(`DELETE FROM conversations WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listConversationsByProject(
    projectId: string,
  ): Promise<
    Array<{
      id: string;
      provider: string;
      userName: string;
      createdAt: Date;
      updatedAt: Date;
      eventCount: number;
      summaryCount: number;
    }>
  > {
    const result = await this.pool.query<{
      id: string;
      provider: string;
      user_name: string;
      created_at: Date;
      updated_at: Date;
      event_count: string;
      summary_count: string;
    }>(
      `SELECT
         c.id,
         c.provider,
         c.user_name,
         c.created_at,
         c.updated_at,
         COALESCE(e.total_count, 0)::text AS event_count,
         COALESCE(e.summary_count, 0)::text AS summary_count
       FROM conversations c
       LEFT JOIN (
         SELECT conversation_id,
                count(*) AS total_count,
                count(*) FILTER (WHERE is_summary) AS summary_count
         FROM prompt_events
         GROUP BY conversation_id
       ) e ON e.conversation_id = c.id
       WHERE c.project_id = $1
       ORDER BY c.created_at DESC`,
      [projectId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      userName: row.user_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      eventCount: Number(row.event_count),
      summaryCount: Number(row.summary_count),
    }));
  }

  async listEventsByProject(
    projectId: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      conversationId: string;
      role: string;
      content: string;
      isSummary: boolean;
      createdAt: Date;
    }>
  > {
    const result = await this.pool.query<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      is_summary: boolean;
      created_at: Date;
    }>(
      `SELECT pe.id, pe.conversation_id, pe.role, pe.content, pe.is_summary, pe.created_at
         FROM prompt_events pe
         JOIN conversations c ON c.id = pe.conversation_id
        WHERE c.project_id = $1
        ORDER BY pe.created_at DESC
        LIMIT $2`,
      [projectId, limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      isSummary: row.is_summary,
      createdAt: row.created_at,
    }));
  }

  async countByProject(projectId: string): Promise<{
    conversations: number;
    events: number;
    summaries: number;
  }> {
    const result = await this.pool.query<{
      conversations: string;
      events: string;
      summaries: string;
    }>(
      `SELECT
         count(DISTINCT c.id)::text                              AS conversations,
         count(pe.id)::text                                      AS events,
         count(pe.id) FILTER (WHERE pe.is_summary = true)::text AS summaries
       FROM conversations c
       LEFT JOIN prompt_events pe ON pe.conversation_id = c.id
       WHERE c.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    return {
      conversations: Number(row?.conversations ?? 0),
      events: Number(row?.events ?? 0),
      summaries: Number(row?.summaries ?? 0),
    };
  }
}

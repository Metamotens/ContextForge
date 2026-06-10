import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

export interface UpsertProjectInput {
  id: string;
  name: string;
}

export interface UpsertConversationInput {
  id: string;
  projectId: string;
  provider: string;
  userName: string;
}

export interface InsertPromptEventInput {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isSummary: boolean;
}

interface CountersRow extends QueryResultRow {
  turn_count: string;
  estimated_tokens: string;
}

export interface ConversationCounters {
  turnCount: number;
  estimatedTokens: number;
}

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
}

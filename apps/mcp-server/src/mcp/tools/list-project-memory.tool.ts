import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { deterministicUuid, PgVectorService, PostgresService, snippet } from '@contextforge/core';
import { ListProjectMemoryInputSchema } from '@mcp/schemas/list-project-memory.schema';
import type {
  ListProjectMemoryConversation,
  ListProjectMemoryEvent,
  ListProjectMemoryInput,
  ListProjectMemoryOutput,
  ListProjectMemoryVectorPoint,
} from '@mcp/types/list-project-memory.types';

const DEFAULT_EVENT_LIMIT = 50;
const DEFAULT_SNIPPET_CHARS = 240;

@Injectable()
export class ListProjectMemoryTool {
  constructor(
    private readonly postgres: PostgresService,
    private readonly pgVectorService: PgVectorService,
  ) {}

  @Tool({
    name: 'list_project_memory',
    description:
      'Read-only inspection of all stored memory for a project: returns project row, counts (conversations, events, summaries, vector points), per-conversation metadata, recent prompt events, and the indexed vector summary points.',
    parameters: ListProjectMemoryInputSchema,
  })
  async run(input: ListProjectMemoryInput): Promise<ListProjectMemoryOutput> {
    const projectId = deterministicUuid('project', input.projectName);
    const eventLimit = input.eventLimit ?? DEFAULT_EVENT_LIMIT;
    const snippetChars = input.contentSnippetChars ?? DEFAULT_SNIPPET_CHARS;
    const includePayload = input.includePayload ?? true;
    const warnings: string[] = [];

    process.stderr.write(
      `[ListProjectMemoryTool] project=${input.projectName} projectId=${projectId} eventLimit=${eventLimit}\n`,
    );

    const counts = await this.postgres.countByProject(projectId);

    const conversations: ListProjectMemoryConversation[] = (
      await this.postgres.listConversationsByProject(projectId)
    ).map((row) => ({
      id: row.id,
      provider: row.provider,
      userName: row.userName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      eventCount: row.eventCount,
      summaryCount: row.summaryCount,
    }));

    const events: ListProjectMemoryEvent[] = (await this.postgres.listEventsByProject(projectId, eventLimit)).map(
      (row) => ({
        id: row.id,
        conversationId: row.conversationId,
        role: row.role,
        contentSnippet: snippetChars === 0 ? '' : snippet(row.content, snippetChars),
        isSummary: row.isSummary,
        createdAt: row.createdAt.toISOString(),
      }),
    );

    let vectorPoints: ListProjectMemoryVectorPoint[] = [];
    try {
      const scrolled = await this.pgVectorService.scrollByProjectId({
        projectId,
        limit: 500,
        withPayload: true,
      });
      vectorPoints = scrolled.map((point) => ({
        id: point.id,
        conversationId: point.payload.conversation_id ?? '',
        provider: point.payload.provider ?? '',
        userName: point.payload.user_name ?? '',
        createdAt: point.payload.created_at ?? '',
        summarySnippet: snippetChars === 0 || !includePayload
          ? ''
          : snippet(point.payload.summary_text ?? '', snippetChars),
      }));
    } catch (error) {
      warnings.push(
        `pgvector_scroll_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.stderr.write(
        `[ListProjectMemoryTool] PgVector scroll failed for project_id=${projectId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
    }

    return {
      projectId,
      projectName: input.projectName,
      counts: {
        conversations: counts.conversations,
        events: counts.events,
        summaries: counts.summaries,
        vectorSummariesListed: vectorPoints.length,
      },
      conversations,
      events,
      vectorPoints,
      warnings,
    };
  }
}

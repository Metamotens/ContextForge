import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { PostgresService } from '../../persistence/postgres/postgres.service';
import { QdrantService } from '../../persistence/qdrant/qdrant.service';
import { deterministicUuid } from '../../common/utils/identity.util';
import { snippet } from '../../common/utils/text.util';
import { ListProjectMemoryInputSchema } from '../schemas/list-project-memory.schema';
import type {
  ListProjectMemoryConversation,
  ListProjectMemoryEvent,
  ListProjectMemoryInput,
  ListProjectMemoryOutput,
  ListProjectMemoryQdrantPoint,
} from '../types/list-project-memory.types';

const DEFAULT_EVENT_LIMIT = 50;
const DEFAULT_SNIPPET_CHARS = 240;

@Injectable()
export class ListProjectMemoryTool {
  constructor(
    private readonly postgres: PostgresService,
    private readonly qdrantService: QdrantService,
  ) {}

  @Tool({
    name: 'list_project_memory',
    description:
      'Read-only inspection of all stored memory for a project: returns project row, counts (conversations, events, summaries, Qdrant points), per-conversation metadata, recent prompt events, and the indexed Qdrant summary points.',
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

    let qdrantPoints: ListProjectMemoryQdrantPoint[] = [];
    try {
      const scrolled = await this.qdrantService.scrollByProjectId({
        projectId,
        limit: 500,
        withPayload: true,
      });
      qdrantPoints = scrolled.map((point) => ({
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
        `qdrant_scroll_failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.stderr.write(
        `[ListProjectMemoryTool] Qdrant scroll failed for project_id=${projectId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
    }

    return {
      projectId,
      projectName: input.projectName,
      counts: {
        conversations: counts.conversations,
        events: counts.events,
        summaries: counts.summaries,
        qdrantPointsListed: qdrantPoints.length,
      },
      conversations,
      events,
      qdrantPoints,
      warnings,
    };
  }

}

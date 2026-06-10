import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Tool } from '@rekog/mcp-nest';

import { QdrantService } from '../../persistence/qdrant/qdrant.service';
import { PostgresService } from '../../persistence/postgres/postgres.service';
import { SummaryService } from '../../retrieval/summary.service';
import { deterministicUuid } from '../../common/utils/identity.util';
import { buildDeterministicVector } from '../../common/utils/vector.util';
import {
  SaveInteractionMemoryInput,
  SaveInteractionMemoryInputSchema,
  SaveInteractionMemoryOutput,
} from '../dto/save-interaction-memory.dto';

@Injectable()
export class SaveInteractionMemoryTool {
  private readonly embeddingVectorSize = Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly postgres: PostgresService,
    private readonly summaryService: SummaryService,
  ) {}

  @Tool({
    name: 'save_interaction_memory',
    description:
      'Persist a conversation event in Postgres and trigger automatic summary generation. Only role=system + isSummary=true is also indexed in Qdrant.',
    parameters: SaveInteractionMemoryInputSchema,
  })
  async run(input: SaveInteractionMemoryInput): Promise<SaveInteractionMemoryOutput> {
    process.stderr.write(
      `[SaveInteractionMemoryTool] project=${input.projectName} role=${input.role} isSummary=${input.isSummary ?? false}\n`,
    );

    const projectId = deterministicUuid('project', input.projectName);
    const conversationUuid = deterministicUuid('conversation', input.conversationId);
    const eventId = randomUUID();
    const isSummaryFlag = input.isSummary === true;

    await this.postgres.upsertProject({ id: projectId, name: input.projectName });
    await this.postgres.upsertConversation({
      id: conversationUuid,
      projectId,
      provider: input.provider,
      userName: input.userName,
    });
    await this.postgres.insertPromptEvent({
      id: eventId,
      conversationId: conversationUuid,
      role: input.role,
      content: input.content,
      isSummary: isSummaryFlag,
    });

    if (isSummaryFlag && input.role === 'system') {
      await this.indexInQdrantSafely(
        eventId,
        projectId,
        conversationUuid,
        input.provider,
        input.userName,
        input.content,
      );
    }

    const summaryResult = await this.summaryService.maybeGenerateSummary({
      projectName: input.projectName,
      conversationId: conversationUuid,
      triggerEventId: eventId,
    });

    if (summaryResult.generated && summaryResult.summaryEventId && summaryResult.summaryText) {
      await this.indexInQdrantSafely(
        summaryResult.summaryEventId,
        projectId,
        conversationUuid,
        input.provider,
        input.userName,
        summaryResult.summaryText,
      );
    }

    return {
      eventId,
      saved: true,
      summaryEventId: summaryResult.summaryEventId,
      summaryReason: summaryResult.reason,
    };
  }

  private async indexInQdrantSafely(
    eventId: string,
    projectId: string,
    conversationId: string,
    provider: string,
    userName: string,
    summaryText: string,
  ): Promise<void> {
    try {
      await this.qdrantService.indexSummary({
        eventId,
        projectId,
        conversationId,
        provider,
        userName,
        createdAtIso: new Date().toISOString(),
        vector: buildDeterministicVector(summaryText, this.embeddingVectorSize),
        summaryText,
      });
    } catch (error) {
      process.stderr.write(
        `[SaveInteractionMemoryTool] Qdrant index failed for eventId=${eventId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
    }
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PostgresService } from '../persistence/postgres/postgres.service';
import { QdrantService, IndexSummaryInput } from '../persistence/qdrant/qdrant.service';
import { SummaryService } from '../retrieval/summary.service';
import { EmbeddingService } from './embedding.service';
import { deterministicUuid } from '../common/utils/identity.util';

export interface PersistEventInput {
  projectName: string;
  provider: string;
  userName: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isSummary?: boolean;
}

export interface PersistEventOutput {
  eventId: string;
  saved: boolean;
  summaryEventId: string | null;
  summaryReason: string;
}

@Injectable()
export class InteractionPersistenceService {
  constructor(
    private readonly postgres: PostgresService,
    private readonly qdrant: QdrantService,
    private readonly summary: SummaryService,
    private readonly embedding: EmbeddingService,
  ) {}

  async persistEvent(input: PersistEventInput): Promise<PersistEventOutput> {
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
      await this.indexSafely(eventId, projectId, conversationUuid, input.provider, input.userName, input.content);
    }

    const summaryResult = await this.summary.maybeGenerateSummary({
      projectName: input.projectName,
      conversationId: conversationUuid,
      triggerEventId: eventId,
    });

    if (summaryResult.generated && summaryResult.summaryEventId && summaryResult.summaryText) {
      await this.indexSafely(
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

  private async indexSafely(
    eventId: string,
    projectId: string,
    conversationId: string,
    provider: string,
    userName: string,
    summaryText: string,
  ): Promise<void> {
    const qdrantInput: IndexSummaryInput = {
      eventId,
      projectId,
      conversationId,
      provider,
      userName,
      createdAtIso: new Date().toISOString(),
      vector: [],
      summaryText,
    };

    try {
      qdrantInput.vector = await this.embedding.embed(summaryText);
      await this.qdrant.indexSummary(qdrantInput);
    } catch (error) {
      process.stderr.write(
        `[InteractionPersistenceService] Qdrant index failed for eventId=${eventId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      if (qdrantInput.vector.length > 0) {
        this.qdrant.enqueueRetry(qdrantInput);
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { deterministicUuid } from '../common/utils/identity.util';
import { EmbeddingService } from './embedding.service';
import type {
  PersistEventInput,
  PersistEventOutput,
} from './types/interaction-persistence.types';
import { PgVectorService } from '../persistence/pgvector/pgvector.service';
import { PostgresService } from '../persistence/postgres/postgres.service';
import type { IndexSummaryInput, SummaryKind } from '../persistence/types/vector.types';
import { SummaryService } from '../retrieval/summary.service';

@Injectable()
export class InteractionPersistenceService {
  constructor(
    private readonly postgres: PostgresService,
    private readonly pgVector: PgVectorService,
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
      await this.indexSafely(eventId, projectId, conversationUuid, input.provider, input.userName, input.content, 'milestone');
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
        'rolling',
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
    summaryKind: SummaryKind,
  ): Promise<void> {
    const input: IndexSummaryInput = {
      eventId,
      projectId,
      conversationId,
      provider,
      userName,
      createdAtIso: new Date().toISOString(),
      vector: [],
      summaryText,
      summaryKind,
    };

    try {
      input.vector = await this.embedding.embed(summaryText);
      await this.pgVector.indexSummary(input);
    } catch (error) {
      process.stderr.write(
        `[InteractionPersistenceService] PgVector index failed for eventId=${eventId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      if (input.vector.length > 0) {
        this.pgVector.enqueueRetry(input);
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

interface SummaryPayload extends Record<string, unknown> {
  project_id: string;
  conversation_id: string;
  provider: string;
  user_name: string;
  created_at: string;
  is_summary: boolean;
  summary_text: string;
}

interface IndexSummaryInput {
  eventId: string;
  projectId: string;
  conversationId: string;
  provider: string;
  userName: string;
  createdAtIso: string;
  vector: number[];
  summaryText: string;
}

interface SearchSummariesInput {
  projectId: string;
  conversationId?: string;
  queryVector: number[];
  topK?: number;
}

@Injectable()
export class QdrantService {
  private readonly qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
  private readonly qdrantApiKey = process.env.QDRANT_API_KEY;
  private readonly qdrantCollectionName = process.env.QDRANT_COLLECTION_NAME ?? 'conversation_summaries';
  private readonly embeddingVectorSize = Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;
  private readonly topKDefault = Number(process.env.TOPK_DEFAULT) || 3;
  private readonly client = new QdrantClient({ url: this.qdrantUrl, apiKey: this.qdrantApiKey });
  private initialized = false;

  private readonly pendingRetries: Map<string, IndexSummaryInput> = new Map();

  private log(message: string): void {
    process.stderr.write(`[QdrantService] ${message}\n`);
  }

  async ensureCollection(): Promise<void> {
    if (this.initialized) return;

    const collectionName = this.qdrantCollectionName;
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((collection) => collection.name === collectionName);

    if (!exists) {
      await this.client.createCollection(collectionName, {
        vectors: { size: this.embeddingVectorSize, distance: 'Cosine' },
      });
      this.log(`Created Qdrant collection: ${collectionName}`);
    }

    this.initialized = true;
  }

  async indexSummary(input: IndexSummaryInput): Promise<void> {
    await this.ensureCollection();
    await this.flushPendingRetries();

    const payload: SummaryPayload = {
      project_id: input.projectId,
      conversation_id: input.conversationId,
      provider: input.provider,
      user_name: input.userName,
      created_at: input.createdAtIso,
      is_summary: true,
      summary_text: input.summaryText,
    };

    await this.client.upsert(this.qdrantCollectionName, {
      wait: true,
      points: [{ id: input.eventId, vector: input.vector, payload }],
    });
  }

  enqueueRetry(input: IndexSummaryInput): void {
    this.pendingRetries.set(input.eventId, input);
    this.log(`Enqueued retry for eventId=${input.eventId} (pending=${this.pendingRetries.size})`);
  }

  private async flushPendingRetries(): Promise<void> {
    if (this.pendingRetries.size === 0) return;

    this.log(`Flushing ${this.pendingRetries.size} pending retry(s)`);
    for (const [eventId, retryInput] of this.pendingRetries) {
      try {
        const payload: SummaryPayload = {
          project_id: retryInput.projectId,
          conversation_id: retryInput.conversationId,
          provider: retryInput.provider,
          user_name: retryInput.userName,
          created_at: retryInput.createdAtIso,
          is_summary: true,
          summary_text: retryInput.summaryText,
        };
        await this.client.upsert(this.qdrantCollectionName, {
          wait: true,
          points: [{ id: retryInput.eventId, vector: retryInput.vector, payload }],
        });
        this.pendingRetries.delete(eventId);
        this.log(`Retry succeeded for eventId=${eventId}`);
      } catch (error) {
        this.log(`Retry still failing for eventId=${eventId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.ensureCollection();
    await this.client.delete(this.qdrantCollectionName, {
      wait: true,
      filter: {
        must: [{ key: 'project_id', match: { value: projectId } }],
      },
    });
    this.log(`Deleted all points for project_id=${projectId}`);
  }

  async searchSummaries(input: SearchSummariesInput) {
    await this.ensureCollection();

    const topK = input.topK ?? this.topKDefault;
    const mustFilters: Array<Record<string, unknown>> = [
      {
        key: 'project_id',
        match: { value: input.projectId },
      },
      {
        key: 'is_summary',
        match: { value: true },
      },
    ];

    if (input.conversationId) {
      mustFilters.push({ key: 'conversation_id', match: { value: input.conversationId } });
    }

    return this.client.search(this.qdrantCollectionName, {
      vector: input.queryVector,
      limit: topK,
      filter: { must: mustFilters },
    });
  }
}

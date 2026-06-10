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

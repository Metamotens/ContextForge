import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';

const MAX_CACHE_SIZE = 512;

type EmbeddingProvider = 'ollama' | 'openai';

const PROVIDER_DEFAULTS: Record<
  EmbeddingProvider,
  { vectorSize: number; model: string }
> = {
  ollama: { vectorSize: 768, model: 'nomic-embed-text' },
  openai: { vectorSize: 1536, model: 'text-embedding-3-small' },
};

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: EmbeddingProvider;
  private readonly openaiApiKey?: string;
  private readonly openaiModel: string;
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  readonly vectorSize: number;

  private readonly cache = new Map<string, number[]>();

  constructor() {
    this.provider = this.resolveProvider();
    const defaults = PROVIDER_DEFAULTS[this.provider];

    this.vectorSize =
      Number(process.env.EMBEDDING_VECTOR_SIZE) || defaults.vectorSize;

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          '[EmbeddingService] OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai.',
        );
      }
      this.openaiApiKey = apiKey;
      this.openaiModel =
        process.env.OPENAI_EMBEDDING_MODEL ?? defaults.model;
      this.ollamaUrl = '';
      this.ollamaModel = '';
    } else {
      this.ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
      this.ollamaModel =
        process.env.OLLAMA_EMBEDDING_MODEL ?? defaults.model;
      this.openaiModel = '';
    }
  }

  onModuleInit(): void {
    const model =
      this.provider === 'ollama' ? this.ollamaModel : this.openaiModel;
    this.logger.log(
      `Initialized — provider=${this.provider} model=${model} vectorSize=${this.vectorSize}`,
    );
  }

  async embed(text: string): Promise<number[]> {
    const normalized = text.trim();
    const cacheKey = createHash('sha256').update(normalized).digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const vector =
      this.provider === 'ollama'
        ? await this.callOllama(normalized)
        : await this.callOpenAI(normalized);

    this.assertVectorSize(vector);

    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, vector);
    return vector;
  }

  private resolveProvider(): EmbeddingProvider {
    const raw = (process.env.EMBEDDING_PROVIDER ?? 'ollama').toLowerCase();
    if (raw === 'openai' || raw === 'ollama') return raw;
    throw new Error(
      `[EmbeddingService] Unsupported EMBEDDING_PROVIDER="${raw}". Use "ollama" or "openai".`,
    );
  }

  private assertVectorSize(vector: number[]): void {
    if (vector.length !== this.vectorSize) {
      throw new Error(
        `[EmbeddingService] Expected vector size ${this.vectorSize}, got ${vector.length}. ` +
          `Update EMBEDDING_VECTOR_SIZE for provider=${this.provider}.`,
      );
    }
  }

  private async callOllama(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.ollamaModel, input: text }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(
        `Ollama embeddings API ${response.status}: ${bodyText}. ` +
          `Is Ollama running at ${this.ollamaUrl}? Try: ollama pull ${this.ollamaModel}`,
      );
    }

    const data = (await response.json()) as { embeddings: number[][] };
    const vector = data.embeddings?.[0];
    if (!vector?.length) {
      throw new Error(
        `Ollama returned empty embedding for model=${this.ollamaModel}. ` +
          `Try: ollama pull ${this.ollamaModel}`,
      );
    }
    return vector;
  }

  private async callOpenAI(text: string): Promise<number[]> {
    const body: Record<string, unknown> = {
      model: this.openaiModel,
      input: text,
    };
    if (this.vectorSize !== 1536) {
      body['dimensions'] = this.vectorSize;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`OpenAI embeddings API ${response.status}: ${bodyText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0].embedding;
  }
}

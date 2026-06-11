CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE prompt_events ADD COLUMN IF NOT EXISTS embedding vector;

CREATE INDEX IF NOT EXISTS idx_prompt_events_embedding_cosine
  ON prompt_events USING hnsw (embedding vector_cosine_ops)
  WHERE is_summary = true AND embedding IS NOT NULL;

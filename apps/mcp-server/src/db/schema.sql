-- ContextForge — database schema (idempotent)
-- PostgreSQL 16+ with pgvector
-- Apply: pnpm db:init

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL,
  user_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  is_summary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prompt_events ADD COLUMN IF NOT EXISTS embedding vector(768);

DO $$
BEGIN
  ALTER TABLE prompt_events ALTER COLUMN embedding TYPE vector(768);
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_project_created_desc
  ON conversations(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_events_conversation_created_asc
  ON prompt_events(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_prompt_events_conversation_is_summary
  ON prompt_events(conversation_id, is_summary);

DROP INDEX IF EXISTS idx_prompt_events_embedding_cosine;
CREATE INDEX idx_prompt_events_embedding_cosine
  ON prompt_events USING hnsw (embedding vector_cosine_ops)
  WHERE is_summary = true AND embedding IS NOT NULL;

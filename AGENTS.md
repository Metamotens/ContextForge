# ContextForge — Agent Orchestrator

Index for AI agents working in this repo: where things live, how to verify changes, and which skills to load.
Workflow details belong in each skill's `SKILL.md`, not here.

## Project snapshot

ContextForge is a **pnpm monorepo** that captures IDE conversation memory via **MCP**, stores it in **PostgreSQL + pgvector**, and exposes **REST** for a future Angular dashboard.

| Layer | Package / app | Role |
|-------|---------------|------|
| Core | [`packages/core`](packages/core) | Schema SQL, `db:init`, Postgres, pgvector, enrichment, retrieval |
| Contracts | [`packages/shared`](packages/shared) | REST DTOs (API ↔ dashboard) |
| MCP | [`apps/mcp-server`](apps/mcp-server) | STDIO MCP server + smoke scripts |
| API | [`apps/api`](apps/api) | HTTP observability (`/api/*`) |
| Dashboard | `apps/dashboard` | (pending) Angular UI |

**Plans:** [`plans/specifications.md`](plans/specifications.md) (architecture), [`plans/improves.md`](plans/improves.md) (schema UX), [`plans/improvements2.md`](plans/improvements2.md) (monorepo layout), [`plans/knowledge-entries.md`](plans/knowledge-entries.md) (future RAG layer).

**Env:** `.env` at repo root; apps load it via `--env-file=../../.env`.

## Verification

Prerequisites: PostgreSQL 16+ with pgvector, Ollama (for `test:e2e` LLM/embeddings). Configure `POSTGRES_*` and `OLLAMA_*` in `.env`.

| Command | Where | What it checks |
|---------|--------|----------------|
| `pnpm build` | root | TypeScript build: core → shared → mcp-server → api |
| `pnpm db:init` | root → core | Applies [`packages/core/src/persistence/database/schema.sql`](packages/core/src/persistence/database/schema.sql) idempotently |
| `pnpm db:smoke` | root | Postgres connectivity, schema (`projects.name` UNIQUE, `conversations.model/title`), pgvector + HNSW |
| `pnpm test:e2e` | root | Full pipeline: persist turns → LLM summary → embeddings → semantic search → KPI ≥30% token reduction |

Run order after schema changes: **`db:init` → `db:smoke` → `test:e2e`**.

If Postgres is not running, `db:init` and `db:smoke` fail with `ECONNREFUSED` on `postgres:connect`; `db:smoke` then skips schema/pgvector checks.

### Workspace scripts (`package.json`)

| Package | Key scripts |
|---------|-------------|
| `@contextforge/root` | `build`, `build:core`, `dev:mcp`, `dev:api`, `db:init`, `db:smoke`, `test:e2e`, `format` |
| `@contextforge/core` | `build`, `db:init` |
| `@contextforge/shared` | `build` |
| `@contextforge/mcp-server` | `start:dev`, `db:smoke`, `test:e2e` (also delegates `db:init` → core) |
| `@contextforge/api` | `start:dev` |

## Key paths

| Topic | Path |
|-------|------|
| DB schema | `packages/core/src/persistence/database/schema.sql` |
| DB init script | `packages/core/scripts/db-init.ts` |
| MCP tools | `apps/mcp-server/src/mcp/tools/` |
| MCP Zod schemas | `apps/mcp-server/src/mcp/schemas/` |
| REST controllers | `apps/api/src/*/` |
| Shared DTOs | `packages/shared/src/*.dto.ts` |
| Smoke scripts | `apps/mcp-server/src/scripts/smoke-*.ts` |

## Installed skills

Read the relevant `SKILL.md` before tasks in that domain.

| Skill | Path | Description |
|-------|------|-------------|
| antfu | [skills/antfu/SKILL.md](skills/antfu/SKILL.md) | pnpm monorepos, ESLint, Vitest, library/app setup |
| pnpm | [skills/pnpm/SKILL.md](skills/pnpm/SKILL.md) | Workspaces, filtering, workspace protocol |
| nestjs-best-practices | [skills/nestjs-best-practices/SKILL.md](skills/nestjs-best-practices/SKILL.md) | NestJS modules, DI, security, performance |
| postgresql-code-review | [skills/postgresql-code-review/SKILL.md](skills/postgresql-code-review/SKILL.md) | JSONB, schema design, RLS, anti-patterns |
| postgresql-optimization | [skills/postgresql-optimization/SKILL.md](skills/postgresql-optimization/SKILL.md) | Query tuning, indexes, pgvector performance |

## Register a new skill

1. Copy `skills/_template/` to `skills/<skill-name>/`.
2. Edit `skills/<skill-name>/SKILL.md` (frontmatter + instructions).
3. Add a row to the table above.
4. See `skills/README.md` for conventions.

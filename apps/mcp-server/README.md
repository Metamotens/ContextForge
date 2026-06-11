# ContextForge MCP Server

Minimal NestJS skeleton for the ContextForge MCP-first MVP.

## Tools

- `save_interaction_memory` — persist a conversation event (role: user | assistant | system) and trigger automatic summary generation.
- `search_project_context` — semantic search over conversation summaries with adaptive topK and token-budgeted output.
- `delete_project_memory` — delete all stored memory for a project (Postgres cascade).
- `list_project_memory` — read-only inspection of a project's full memory state (counts, conversations, recent events, indexed summaries).

## Run

1. Install dependencies: `pnpm install`
2. Apply database schema: `pnpm db:init`
3. Start in dev mode: `pnpm start:dev`

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled server (`dist/main.js`) |
| `pnpm start:dev` | Run server in dev mode with `.env` |
| `pnpm db:init` | Apply `src/db/schema.sql` to Postgres |
| `pnpm db:smoke` | Quick connectivity check (Postgres + pgvector) |
| `pnpm test:e2e` | Full E2E test (persist, summarize, vector search) — requires Ollama |
| `pnpm format` | Format code with Prettier |

The MCP is consumed over STDIO by an MCP client (e.g. Cursor, opencode).

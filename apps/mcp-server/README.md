# ContextForge MCP Server

Minimal NestJS skeleton for the ContextForge MCP-first MVP.

## Tools

- `save_interaction_memory` — persist a conversation event (role: user | assistant | system) and trigger automatic summary generation.
- `search_project_context` — semantic search over conversation summaries with adaptive topK and token-budgeted output.
- `delete_project_memory` — delete all stored memory for a project (Postgres + Qdrant cascade).
- `list_project_memory` — read-only inspection of a project's full memory state (counts, conversations, recent events, Qdrant points).

## Run

1. Install dependencies:
   - `pnpm install`
2. Start in dev mode:
   - `pnpm start:dev`

## Build

- `pnpm build` produces `dist/main.js`. The MCP is consumed over STDIO by an MCP client (e.g. opencode).

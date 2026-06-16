# ContextForge MCP Server

NestJS MCP server exposing ContextForge memory tools over **Streamable HTTP**.

## Tools

- `save_interaction_memory` — persist a conversation event (role: user | assistant | system) and trigger automatic summary generation.
- `search_project_context` — semantic search over conversation summaries with adaptive topK and token-budgeted output.
- `delete_project_memory` — delete all stored memory for a project (Postgres cascade).
- `list_project_memory` — read-only inspection of a project's full memory state (counts, conversations, recent events, indexed summaries).

## Run (local dev)

1. Install dependencies: `pnpm install`
2. Apply database schema: `pnpm db:init`
3. Start in dev mode: `pnpm start:dev`

The server listens on `http://0.0.0.0:${MCP_PORT}/mcp` (default port `3030`).

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled server (`dist/main.js`) |
| `pnpm start:dev` | Run server in dev mode with `.env` |
| `pnpm db:init` | Apply core schema (`packages/core/.../database/schema.sql`) via `@contextforge/core` |
| `pnpm db:smoke` | Quick connectivity check (Postgres + pgvector) |
| `pnpm test:e2e` | Full E2E test (persist, summarize, vector search) — requires Ollama |
| `pnpm format` | Format code with Prettier |

## Docker (metaserver)

From the **repo root** (`~/contextforge/ContextForge`):

```bash
cp .env.docker.example .env.docker
docker compose up -d --build
docker compose logs -f mcp
```

Build only the MCP service:

```bash
docker compose build mcp
```

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/mcp
```

## Connect Cursor (remote)

Copy [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example) to `.cursor/mcp.json` (or global `~/.cursor/mcp.json`) and set your server URL:

```json
{
  "mcpServers": {
    "contextforge": {
      "url": "http://192.168.68.71:3030/mcp"
    }
  }
}
```

Reload MCP servers in Cursor after changing the config.

## Environment profiles

| Profile | File | `POSTGRES_HOST` | `OLLAMA_URL` |
|---------|------|-----------------|--------------|
| Dev from Windows/LAN | `.env` | LAN IP (`192.168.68.71`) | `http://192.168.68.71:11434` |
| Docker container | `.env.docker` | `contextforge-postgres` | `http://contextforge-ollama:11434` |

Smokes (`db:smoke`, `test:e2e`) from the host use `.env` with the LAN IP.

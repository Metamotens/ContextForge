---
name: sdd-phase-plan
overview: "MVP SDD en dos fases: Fase 1 memoria MCP + retrieval con pgvector; extensión monorepo con API REST para observabilidad y futuro dashboard Angular; Fase 2 orquestación de subagentes."
todos:
  - id: bootstrap-local-stack
    content: Stack local PostgreSQL (+ pgvector) y Ollama; variables en .env raíz
    status: completed
  - id: build-mcp-server-skeleton
    content: Servidor NestJS MCP (STDIO) y registro de tools
    status: completed
  - id: implement-minimal-data-model
    content: Modelo mínimo (projects, conversations, prompt_events) + schema.sql
    status: completed
  - id: implement-summary-indexing
    content: Resúmenes LLM e indexación vectorial en pgvector (solo is_summary=true)
    status: completed
  - id: implement-context-retrieval-flow
    content: search_project_context con topK adaptativo y presupuesto de tokens
    status: completed
  - id: validate-e2e-mvp
    content: Smoke E2E IDE→MCP→Postgres/pgvector→contexto enriquecido
    status: completed
  - id: monorepo-restructure
    content: pnpm workspace, packages/core, packages/shared, apps/api REST
    status: completed
  - id: dashboard-angular
    content: App Angular en apps/dashboard consumiendo API + shared DTOs
    status: pending
  - id: phase2-subagents-design
    content: Diseñar fase 2 con supervisor-workers y consolidación compacta
    status: pending
isProject: false
---

# Plan SDD por fases (MCP-first y ahorro de tokens)

## Decisiones cerradas

- Interceptación en **modo MCP-first** (sin proxy global), compatible multi-IDE (`Cursor`, `Claude Code`, `OpenCode`, VS Code con cliente MCP).
- Base relacional en **PostgreSQL local** con extensión **pgvector** (sin Qdrant en la implementación actual).
- **Monorepo pnpm** (`apps/*`, `packages/*`); sin Nx.
- Lógica de negocio compartida en **`@contextforge/core`**; contrato REST en **`@contextforge/shared`**.
- Objetivo principal: **minimizar tokens y costo** por interacción sin perder calidad de respuesta.
- Retención en `prompt_events`: **ilimitada**.
- Estrategia de vectorización: **solo resúmenes** (`is_summary=true`); embeddings en columna `prompt_events.embedding`.
- **API HTTP** separada del MCP (`apps/api`) para observabilidad y futuro dashboard Angular.
- `.env` en la **raíz del repo**; apps lo cargan vía `--env-file=../../.env`.

## Alcance

- **Fase 1 (MVP):** capturar contexto, recuperar memoria del proyecto, enriquecer prompt, persistir aprendizaje vía MCP.
- **Fase 1.5 (hecho):** monorepo + API REST de observabilidad.
- **Fase 1.6 (pendiente):** dashboard Angular en `apps/dashboard`.
- **Fase 2:** subagentes por tarea para repartir contexto y devolver síntesis compacta.

## Estructura del proyecto (actual)

```text
ContextForge/
├── pnpm-workspace.yaml       # apps/* + packages/*
├── package.json              # @contextforge/root — scripts build/dev/format
├── tsconfig.base.json        # opciones TS compartidas
├── .prettierrc               # Prettier global
├── .prettierignore
├── .env                      # variables compartidas (raíz)
├── AGENTS.md                 # índice de agent skills
├── plans/
│   ├── specifications.md
│   └── resumenes-llm-ollama.md
├── skills/                   # skills del proyecto (nestjs, pnpm, antfu, postgresql…)
│
├── packages/
│   ├── core/                 # @contextforge/core — lógica compartida
│   │   └── src/
│   │       ├── common/       # tipos y utils compartidos
│   │       ├── config/       # token-budget, summary
│   │       ├── persistence/  # PostgresService, PgVectorService + módulos
│   │       ├── enrichment/   # embedding, summary LLM, persistencia, retrieval
│   │       ├── retrieval/    # ContextRetrievalService, SummaryService
│   │       └── index.ts      # barrel público del paquete
│   │
│   └── shared/               # @contextforge/shared — DTOs REST (API ↔ Angular)
│       └── src/
│           ├── project.dto.ts
│           ├── conversation.dto.ts
│           ├── prompt-event.dto.ts
│           ├── stats.dto.ts
│           ├── search.dto.ts
│           ├── health.dto.ts
│           └── index.ts        # re-exports (sin definir tipos inline)
│
└── apps/
    ├── mcp-server/           # @contextforge/mcp-server — MCP STDIO
    │   └── src/
    │       ├── main.ts       # createApplicationContext, transport STDIO
    │       ├── app.module.ts
    │       ├── db/schema.sql
    │       ├── mcp/
    │       │   ├── mcp.module.ts
    │       │   ├── schemas/  # Zod (validación MCP)
    │       │   ├── types/    # tipos inferidos de schemas
    │       │   └── tools/    # 4 MCP tools
    │       └── scripts/      # db-init, smoke-test, smoke-summary
    │
    ├── api/                  # @contextforge/api — NestJS HTTP REST
    │   └── src/
    │       ├── main.ts       # app.listen(), prefix /api
    │       ├── app.module.ts
    │       ├── health/       # HealthModule
    │       ├── stats/        # StatsModule
    │       └── projects/     # ProjectsModule
    │
    └── dashboard/            # (futuro) Angular observabilidad
```

### Flujo de dependencias

```mermaid
graph TD
  mcpServer["apps/mcp-server"] --> core["packages/core"]
  api["apps/api"] --> core
  api --> shared["packages/shared"]
  dashboard["apps/dashboard"] --> shared
  core --> postgres[("PostgreSQL + pgvector")]
  ollama[("Ollama")] --> core
```

### Scripts raíz (`package.json`)

| Script | Descripción |
|--------|-------------|
| `pnpm build` | Build core → shared → mcp-server → api |
| `pnpm dev:mcp` | MCP server en dev (ts-node) |
| `pnpm dev:api` | API HTTP en dev (puerto `API_PORT`, default 3000) |
| `pnpm format` | Prettier en todo el monorepo |

Scripts por app (desde cada `apps/*` o vía filter):

| App | Scripts relevantes |
|-----|-------------------|
| `mcp-server` | `db:init`, `db:smoke`, `test:e2e` (smoke-summary) |
| `core` | `build` (tsc composite → `dist/`) |
| `shared` | `build` (tsc composite → `dist/`) |

## Organización de tipos y contratos

| Capa | Ubicación | Contiene |
|------|-----------|----------|
| Core compartido | `packages/core/src/common/types/` | `ContextSearchResult`, `CompressedContext` |
| Persistencia | `packages/core/src/persistence/types/` | Contratos Postgres y pgvector |
| Retrieval | `packages/core/src/retrieval/types/` | Búsqueda y resúmenes |
| Enrichment | `packages/core/src/enrichment/types/` | Enriquecimiento y persistencia |
| REST (API ↔ UI) | `packages/shared/src/*.dto.ts` | DTOs HTTP (`ProjectDto`, `ConversationDto`, …) |
| Borde MCP (schemas) | `apps/mcp-server/src/mcp/schemas/` | Esquemas Zod |
| Borde MCP (tipos) | `apps/mcp-server/src/mcp/types/` | `z.infer` y outputs de tools |

Reglas:

- **`@contextforge/core`**: servicios NestJS, módulos globales (`PostgresModule`, `PgVectorModule`, `EnrichmentModule`), utilidades. Export vía `packages/core/src/index.ts`.
- **`@contextforge/shared`**: solo tipos/DTOs del contrato REST; un archivo por entidad; `index.ts` solo re-exporta.
- **`apps/mcp-server`**: borde MCP (tools, schemas, scripts). Importa `@contextforge/core`.
- **`apps/api`**: controllers + services por feature module. Importa `@contextforge/core` y `@contextforge/shared`.
- Servicios `@Injectable` en core no exportan contratos desde archivos de servicio; tipos viven en `{module}/types/` o en `shared`.

### TypeScript y path aliases

**Base:** `tsconfig.base.json` (sin `types: node` global).

| Paquete/App | Config | Notas |
|-------------|--------|-------|
| `packages/core` | `tsconfig.json` | `composite: true`, emite `dist/` + `.d.ts` |
| `packages/shared` | `tsconfig.json` | `composite: true`, sin `@types/node` |
| `apps/mcp-server` | `tsconfig.json` + `tsconfig.dev.json` | Project reference → core; dev usa paths a source de core |
| `apps/api` | `tsconfig.json` + `tsconfig.dev.json` | Project references → core + shared |

**Aliases locales (solo en apps):**

| Alias | App | Resuelve a |
|-------|-----|------------|
| `@mcp/*` | mcp-server | `src/mcp/*` |
| `@app/*` | mcp-server | `src/*` |
| `@api/*` | api | `src/*` |

**Dependencias workspace:** `"@contextforge/core": "workspace:*"` en `package.json` de cada app.

**Build apps:** `tsc` + `tsc-alias`. **Dev:** `TS_NODE_PROJECT=tsconfig.dev.json` + `tsconfig-paths/register`.

### MCP tools (`apps/mcp-server`)

| Tool | Rol |
|------|-----|
| `search_project_context` | Búsqueda semántica + `contextBlock` con presupuesto de tokens |
| `save_interaction_memory` | Persistir turno; dispara resumen + embedding si umbral |
| `list_project_memory` | Inspección read-only de memoria del proyecto |
| `delete_project_memory` | Borrado completo del proyecto (CASCADE) |

### API REST (`apps/api`, prefijo `/api`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Liveness; ping a PostgreSQL |
| `GET` | `/stats` | Estadísticas globales |
| `GET` | `/projects` | Listar proyectos |
| `GET` | `/projects/:id` | Detalle de proyecto |
| `GET` | `/projects/:id/stats` | Contadores del proyecto |
| `GET` | `/projects/:id/conversations` | Conversaciones del proyecto |
| `GET` | `/projects/:id/events?limit=` | Eventos recientes |
| `GET` | `/projects/:id/search?q=` | Búsqueda semántica (misma lógica que MCP) |

Organización NestJS: módulos por feature (`HealthModule`, `StatsModule`, `ProjectsModule`); módulos globales de core importados una vez en `AppModule`.

### Embeddings (proveedor configurable)

- Default dev: **Ollama** (`EMBEDDING_PROVIDER=ollama`, `nomic-embed-text`, 768 dims).
- Producción opcional: **OpenAI** (`EMBEDDING_PROVIDER=openai`, `text-embedding-3-small`, 1536 dims).
- Dimensión alineada con columna `prompt_events.embedding vector(768)` en schema (ajustar si cambia modelo).

## Modelos de tablas PostgreSQL (Fase 1)

Schema aplicable: [apps/mcp-server/src/db/schema.sql](../apps/mcp-server/src/db/schema.sql) (`pnpm db:init` desde mcp-server).

### Principios de diseño

- Minimizar tablas y campos: persistir solo lo imprescindible para enriquecer prompts.
- Evitar complejidad temprana: métricas avanzadas y cache semántica en iteraciones posteriores.
- Preparar migración cloud: IDs UUID, timestamps UTC y relaciones simples.

### 1) `projects`

- **Objetivo:** identificar el proyecto.
- **Campos:** `id` UUID PK, `name` VARCHAR(180), `created_at` TIMESTAMPTZ.

### 2) `conversations`

- **Objetivo:** agrupar eventos por sesión de trabajo.
- **Campos:** `id`, `project_id` FK, `provider`, `user_name`, `created_at`, `updated_at`.
- **Índices:** `(project_id, created_at DESC)`.

### 3) `prompt_events`

- **Objetivo:** guardar cada turno y resúmenes.
- **Campos:** `id`, `conversation_id` FK, `role`, `content`, `is_summary`, `created_at`, **`embedding vector(768)`** (nullable; solo resúmenes indexados).
- **Índices:** `(conversation_id, created_at ASC)`, `(conversation_id, is_summary)`, HNSW cosine en `embedding` donde `is_summary=true`.
- **Retención:** ilimitada.

## Estrategia de indexación vectorial (pgvector)

> **Nota:** el plan original contemplaba Qdrant; la implementación usa **pgvector dentro de PostgreSQL**.

- Embeddings en **`prompt_events.embedding`** solo para filas con `is_summary=true`.
- Búsqueda: cosine distance (`<=>`) vía `PgVectorService.searchSummaries`.
- Metadatos de conversación/proyecto: JOIN con `conversations` / `projects` (no payload Qdrant separado).
- `summary_kind` (`rolling`, `milestone`, `final`) se usa en lógica de indexación, no como columna DB.

### Reglas de indexación

- Se genera embedding **solo** para eventos con `is_summary=true` (resúmenes rolling o milestone).
- No se indexan turnos `user` / `assistant` crudos.
- Umbrales de resumen rolling:
  - `SUMMARY_TURN_THRESHOLD` (default 8), o
  - `SUMMARY_TOKEN_THRESHOLD` (default 4000 tokens estimados).

### Generación de resumen (LLM Ollama rolling)

- **Servicio:** `SummaryLlmService` en `packages/core/src/enrichment/`.
- **Config:** `OLLAMA_CHAT_MODEL` (default `qwen3:4b`), `SUMMARY_MAX_OUTPUT_TOKENS`, `SUMMARY_LLM_TIMEOUT_MS`.
- **Fail-open:** fallo LLM no bloquea `save_interaction_memory`.
- Detalle: [resumenes-llm-ollama.md](resumenes-llm-ollama.md).

### Tolerancia a fallos (indexación)

- Fallo al escribir embedding → log + cola de reintento en `PgVectorService`.
- Borrado de proyecto → CASCADE en Postgres (embeddings incluidos).

### Búsqueda (`search_project_context` / API search)

- Filtro por `project_id` (vía nombre de proyecto → UUID determinista).
- Filtro opcional por `conversation_id`.
- `topK` adaptativo (3 → 5 si baja confianza); umbral `SCORE_THRESHOLD`.
- Presupuesto `MAX_CONTEXT_TOKENS`; snippets resumidos, nunca turnos crudos completos.

## Relaciones clave

```mermaid
flowchart LR
  Projects[projects] --> Conversations[conversations]
  Conversations --> PromptEvents[prompt_events]
  PromptEvents --> Embedding["embedding (pgvector)"]
```

## Arquitectura runtime

```mermaid
flowchart LR
  IDEClient[IDE MCP Client] -->|STDIO| MCPServer[apps/mcp-server]
  Dashboard[apps/dashboard] -->|HTTP| API[apps/api]
  MCPServer --> Core[packages/core]
  API --> Core
  API --> Shared[packages/shared]
  Core --> Postgres[(PostgreSQL pgvector)]
  Core --> Ollama[(Ollama embeddings + chat)]
```

## Checklist técnico

### Fase 1 — MVP MCP (completada)

- [x] PostgreSQL + pgvector + schema (`projects`, `conversations`, `prompt_events`, HNSW).
- [x] `.env` raíz con `POSTGRES_*`, `OLLAMA_*`, `EMBEDDING_*`, `TOPK_*`, `SUMMARY_*`.
- [x] MCP server NestJS STDIO con 4 tools.
- [x] Resúmenes LLM rolling + embeddings solo en `is_summary=true`.
- [x] Retrieval adaptativo + compresión con presupuesto de tokens.
- [x] Smoke tests: `db:smoke`, `test:e2e` (smoke-summary); KPI reducción contexto ≥ 30%.

### Fase 1.5 — Monorepo + API (completada)

- [x] `pnpm-workspace.yaml` + root `package.json`.
- [x] `packages/core` con servicios extraídos del mcp-server.
- [x] `packages/shared` con DTOs REST por archivo.
- [x] `apps/api` HTTP con módulos por feature y health check con ping DB.
- [x] TypeScript project references + builds composite.
- [x] Prettier global en raíz.

### Pendiente

- [ ] `docker-compose.yml` en repo (Postgres + pgvector + Ollama) — hoy infra manual/local.
- [ ] `apps/dashboard` Angular consumiendo `@contextforge/shared`.
- [ ] Fase 2: orquestación subagentes (ver abajo).

## Fase 2: subagentes por tarea (reparto de contexto)

### 1) Orquestación Supervisor-Workers

- Grafo de tareas con Supervisor; workers por dominio (`security`, `performance`, `testing`, `docs`).
- Ubicación prevista: `packages/core/src/orchestration/` o app dedicada según evolucione el monorepo.

### 2) Síntesis final compacta

- Consolidar salidas de workers en resumen de alta densidad; prohibir volcado crudo al hilo principal.

### 3) Métricas comparativas Fase 1 vs Fase 2

- Medir tokens, costo y calidad; documentar en `docs/phase2-evaluation.md` (pendiente).

## Estrategia de migración futura a cloud

- Capa de acceso en `packages/core` desacoplada del transporte (MCP vs HTTP).
- Postgres cloud compatible; mismo schema + pgvector.
- Script export/import y migraciones versionadas (pendiente).

## Riesgos y mitigaciones

- **Subagentes demasiado pronto:** bloquear Fase 2 hasta KPIs Fase 1 estables.
- **Contexto excesivo:** token budget + topK adaptativo + compresión.
- **Lock-in LLM:** `EmbeddingService` con adapter Ollama/OpenAI.
- **Drift documentación ↔ código:** mantener este archivo alineado tras cambios estructurales.

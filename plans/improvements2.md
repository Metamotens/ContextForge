# improvements2 — Reorganización monorepo

Estado tras implementación del análisis de viabilidad (ver plan asociado).

## Hecho

- **Schema en core**
  - Ubicación: `packages/core/src/persistence/database/schema.sql`
  - Init: `pnpm db:init` → `@contextforge/core` (`packages/core/scripts/db-init.ts`)
  - Motivo: el esquema es contrato de persistencia compartido por MCP y API, no del adaptador MCP.

- **Carpeta `database/`**
  - `packages/core/src/persistence/database/schema.sql`
  - Migraciones versionadas (`migrations/`): **pendiente** (cuando haya staging/prod o `knowledge_entries`).

- **Adaptadores separados (runtime)**
  - `apps/mcp-server` = transporte MCP; tools usan `@contextforge/core`.
  - `apps/api` = transporte REST; services usan `@contextforge/core`.
  - Sin acceso directo a PostgreSQL desde lógica de apps en runtime.
  - Excepción aceptable: scripts operativos de smoke en `apps/mcp-server/src/scripts/` (asserts SQL).

## Diferido — no implementar stubs vacíos

- **Módulo `knowledge/` en core** — esperar a [knowledge-entries.md](knowledge-entries.md) (pipeline de ingestión + tabla).
- **`knowledge-entry.dto.ts`** — junto con endpoints `GET/POST /projects/:id/knowledge`.
- **`migrations/`** — cuando se adopte herramienta de migraciones o cambios estructurales (p. ej. `knowledge_entries`).

## Diferido — Fase 1.6

- **`apps/dashboard/`** — scaffold Angular real al iniciar dashboard (consumir `@contextforge/shared`, proxy a API). No placeholder vacío antes de arrancar Fase 1.6.

## Referencia original

| Propuesta | Destino |
|-----------|---------|
| Mover schema | `packages/core/src/persistence/database/schema.sql` |
| database/ | Sí (schema); migrations/ más adelante |
| knowledge module | Fase 2+ con knowledge-entries |
| KnowledgeEntryDto | Fase 2+ |
| apps/dashboard | Fase 1.6 |
| Adaptadores delgados | Cumplido en runtime |

- Hacer `projects.name` único:
  - `name VARCHAR(180) NOT NULL UNIQUE`

- Añadir `model` a `conversations`:
  - `provider VARCHAR(80) NOT NULL`
  - `model VARCHAR(120) NOT NULL`
  - Ejemplo: `provider=ollama`, `model=qwen2.5-coder:7b`

- Añadir `title` a `conversations`:
  - `title VARCHAR(255)`
  - Pensado para el dashboard y trazabilidad de sesiones.

- Crear tabla `knowledge_entries` para separar conocimiento persistente del historial de conversación:
  - `id UUID PRIMARY KEY`
  - `project_id UUID REFERENCES projects(id)`
  - `source_prompt_event_id UUID REFERENCES prompt_events(id)`
  - `category VARCHAR(80)`
  - `content TEXT`
  - `embedding vector(768)`
  - `created_at`
  - `updated_at`

- Crear índice HNSW sobre `knowledge_entries.embedding`:
  - `USING hnsw (embedding vector_cosine_ops)`

- Mantener sin cambios por ahora:
  - `prompt_events`
  - `embedding` dentro de `prompt_events`
  - métricas avanzadas
  - `retrieval_events`
  - autenticación/usuarios
  - multi-tenant

- Objetivo del modelo:
  - `projects`
    - `conversations`
      - `prompt_events`
    - `knowledge_entries`

- Beneficio:
  - Separar claramente:
    - Historial de conversaciones (`prompt_events`)
    - Conocimiento consolidado del proyecto (`knowledge_entries`)
  - Facilitar MCP, API REST, dashboard Angular y RAG sobre memoria persistente.
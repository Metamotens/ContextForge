import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

function log(message: string): void {
  process.stdout.write(`[db:init] ${message}\n`);
}

function err(message: string): void {
  process.stderr.write(`[db:init][error] ${message}\n`);
}

function resolveSchemaPath(): string {
  return join(__dirname, '..', 'src', 'persistence', 'database', 'schema.sql');
}

async function main(): Promise<number> {
  const sqlPath = resolveSchemaPath();
  const sql = readFileSync(sqlPath, 'utf8');

  const pool = new Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER ?? 'contextforge',
    password: process.env.POSTGRES_PASSWORD ?? '',
    database: process.env.POSTGRES_DB ?? 'contextforge',
    connectionTimeoutMillis: 5_000,
  });

  log(
    `Connecting to ${process.env.POSTGRES_USER ?? 'contextforge'}@${process.env.POSTGRES_HOST ?? 'localhost'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? 'contextforge'}`,
  );
  log(`Schema file: ${sqlPath}`);

  try {
    await pool.query(sql);
    log('Schema applied successfully');

    const checks = await pool.query<{
      extname: string;
      tablename: string;
      indexname: string;
    }>(`
      SELECT extname, '' AS tablename, '' AS indexname
        FROM pg_extension WHERE extname IN ('pgcrypto', 'vector')
      UNION ALL
      SELECT '', tablename, '' FROM pg_tables
        WHERE schemaname = 'public' AND tablename IN ('projects', 'conversations', 'prompt_events')
      UNION ALL
      SELECT '', '', indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_prompt_events_embedding_cosine'
    `);

    const extensions = checks.rows.filter((r) => r.extname).map((r) => r.extname);
    const tables = checks.rows.filter((r) => r.tablename).map((r) => r.tablename);
    const hasHnsw = checks.rows.some((r) => r.indexname === 'idx_prompt_events_embedding_cosine');

    log(`extensions: ${extensions.join(', ')}`);
    log(`tables: ${tables.join(', ')}`);
    log(`hnsw index: ${hasHnsw ? 'ok' : 'missing'}`);

    const col = await pool.query<{ data_type: string; udt_name: string }>(
      `SELECT data_type, udt_name FROM information_schema.columns
        WHERE table_name = 'prompt_events' AND column_name = 'embedding'`,
    );
    log(`prompt_events.embedding: ${col.rows[0]?.udt_name ?? 'missing'}`);

    const schemaCols = await pool.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name IN ('model', 'title')`,
    );
    const modelCol = schemaCols.rows.find((r) => r.column_name === 'model');
    const titleCol = schemaCols.rows.find((r) => r.column_name === 'title');
    log(`conversations.model: ${modelCol ? `nullable=${modelCol.is_nullable}` : 'missing'}`);
    log(`conversations.title: ${titleCol ? `nullable=${titleCol.is_nullable}` : 'missing'}`);

    const uniqueName = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname = 'projects_name_unique'`,
    );
    log(`projects.name unique: ${uniqueName.rows.length === 1 ? 'ok' : 'missing'}`);

    const ok =
      extensions.includes('vector') &&
      tables.length === 3 &&
      hasHnsw &&
      col.rows[0]?.udt_name === 'vector' &&
      modelCol?.is_nullable === 'NO' &&
      titleCol?.is_nullable === 'YES' &&
      uniqueName.rows.length === 1;

    if (!ok) {
      err('Verification failed — check output above');
      return 1;
    }

    log('Database ready');
    return 0;
  } catch (e) {
    if (e && typeof e === 'object' && 'errors' in e && Array.isArray((e as AggregateError).errors)) {
      const agg = e as AggregateError;
      const detail = agg.errors
        .map((inner) => (inner instanceof Error ? inner.message : String(inner)))
        .join('; ');
      err(detail || agg.message || 'PostgreSQL connection failed');
    } else {
      err(e instanceof Error ? e.message : String(e));
    }
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));

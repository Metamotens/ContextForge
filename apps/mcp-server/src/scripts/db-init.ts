import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';

function log(message: string): void {
  process.stdout.write(`[db:init] ${message}\n`);
}

function err(message: string): void {
  process.stderr.write(`[db:init][error] ${message}\n`);
}

async function main(): Promise<number> {
  const sqlPath = join(dirname(__dirname), 'db', 'schema.sql');
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

    const ok =
      extensions.includes('vector') &&
      tables.length === 3 &&
      hasHnsw &&
      col.rows[0]?.udt_name === 'vector';

    if (!ok) {
      err('Verification failed — check output above');
      return 1;
    }

    log('Database ready');
    return 0;
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));

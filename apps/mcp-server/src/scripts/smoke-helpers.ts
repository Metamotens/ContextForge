import { Pool } from 'pg';

export interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: process.env.POSTGRES_USER ?? 'contextforge',
      password: process.env.POSTGRES_PASSWORD ?? '',
      database: process.env.POSTGRES_DB ?? 'contextforge',
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function execPsql(sql: string): Promise<string> {
  const result = await getPool().query(sql);
  if (result.rows.length === 0) {
    return result.rowCount != null ? String(result.rowCount) : '';
  }
  if (result.rows.length === 1 && Object.keys(result.rows[0]).length === 1) {
    return String(Object.values(result.rows[0])[0] ?? '');
  }
  return result.rows.map((row) => Object.values(row).join('|')).join('\n');
}

export async function closePsqlPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

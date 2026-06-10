import { execFileSync } from 'node:child_process';

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

function log(message: string): void {
  process.stdout.write(`[smoke] ${message}\n`);
}

function err(message: string): void {
  process.stderr.write(`[smoke][error] ${message}\n`);
}

function dockerExecPsql(sql: string): string {
  const password = process.env.POSTGRES_PASSWORD ?? '';
  const user = process.env.POSTGRES_USER ?? 'contextforge';
  const database = process.env.POSTGRES_DB ?? 'contextforge';

  const stdout = execFileSync(
    'docker',
    ['exec', '-i', '-e', `PGPASSWORD=${password}`, 'contextforge-postgres', 'psql', '-U', user, '-d', database, '-tA', '-c', sql,],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  return stdout.trim();
}

function curlJson(url: string): unknown {
  const stdout = execFileSync('curl.exe', ['-sS', '-m', '5', url], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  return JSON.parse(stdout);
}

function checkPostgres(stepResults: StepResult[]): void {
  try {
    const ping = dockerExecPsql('SELECT 1');
    const counts = dockerExecPsql("SELECT (SELECT count(*) FROM projects) || '|' || (SELECT count(*) FROM conversations) || '|' || (SELECT count(*) FROM prompt_events)");
    const [projects, conversations, events] = counts.split('|');

    stepResults.push({ name: 'postgres:connect', ok: ping === '1', detail: `SELECT 1 returned ${ping}` });
    stepResults.push({ name: 'postgres:tables', ok: true, detail: `projects=${projects}, conversations=${conversations}, prompt_events=${events}` });
  } catch (e) {
    stepResults.push({ name: 'postgres:connect', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function checkQdrant(stepResults: StepResult[]): void {
  const baseUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
  const collectionName = process.env.QDRANT_COLLECTION_NAME ?? 'conversation_summaries';
  const vectorSize = Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;

  try {
    const collections = curlJson(`${baseUrl}/collections`) as { result: { collections: Array<{ name: string }> } };
    const exists = collections.result.collections.some((c) => c.name === collectionName);

    if (!exists) {
      execFileSync(
        'curl.exe',
        [
          '-sS',
          '-m',
          '10',
          '-X',
          'PUT',
          `${baseUrl}/collections/${collectionName}`,
          '-H',
          'Content-Type: application/json',
          '-d',
          JSON.stringify({ vectors: { size: vectorSize, distance: 'Cosine' } }),
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
      );
      stepResults.push({
        name: 'qdrant:collection',
        ok: true,
        detail: `created '${collectionName}' (size=${vectorSize}, distance=Cosine)`,
      });
    } else {
      const info = curlJson(`${baseUrl}/collections/${collectionName}`) as {
        result: {
          points_count?: number;
          config?: { params?: { vectors?: { size?: number } | unknown } };
        };
      };
      const params = info.result.config?.params?.vectors;
      const size = params && typeof params === 'object' && 'size' in params ? (params as { size: number }).size : '?';
      stepResults.push({
        name: 'qdrant:collection',
        ok: true,
        detail: `exists '${collectionName}' (size=${size}, points=${info.result.points_count ?? 0})`,
      });
    }
  } catch (e) {
    stepResults.push({ name: 'qdrant:collection', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function main(): number {
  log('ContextForge connectivity smoke test');
  log(`cwd=${process.cwd()}`);
  log(
    `env: POSTGRES=${process.env.POSTGRES_USER ?? '?'}@${process.env.POSTGRES_HOST ?? 'localhost'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? '?'} | QDRANT=${process.env.QDRANT_URL ?? 'http://localhost:6333'} | collection=${process.env.QDRANT_COLLECTION_NAME ?? 'conversation_summaries'}`,
  );

  const stepResults: StepResult[] = [];

  checkPostgres(stepResults);
  checkQdrant(stepResults);

  log('--- results ---');
  for (const step of stepResults) {
    const mark = step.ok ? 'OK ' : 'FAIL';
    process.stdout.write(`  [${mark}] ${step.name}: ${step.detail}\n`);
  }

  const allOk = stepResults.every((s) => s.ok);
  if (allOk) {
    log('smoke test PASSED');
    return 0;
  }
  err('smoke test FAILED');
  return 1;
}

const exitCode = main();
process.exit(exitCode);

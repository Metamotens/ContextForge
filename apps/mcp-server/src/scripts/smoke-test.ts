import { StepResult, closePsqlPool, execPsql } from '@app/scripts/smoke-helpers';

function log(message: string): void {
  process.stdout.write(`[smoke] ${message}\n`);
}

function err(message: string): void {
  process.stderr.write(`[smoke][error] ${message}\n`);
}

async function checkPostgres(stepResults: StepResult[]): Promise<void> {
  try {
    const ping = await execPsql('SELECT 1');
    const counts = await execPsql(
      "SELECT (SELECT count(*) FROM projects) || '|' || (SELECT count(*) FROM conversations) || '|' || (SELECT count(*) FROM prompt_events)",
    );
    const [projects, conversations, events] = counts.split('|');

    stepResults.push({ name: 'postgres:connect', ok: ping === '1', detail: `SELECT 1 returned ${ping}` });
    stepResults.push({
      name: 'postgres:tables',
      ok: true,
      detail: `projects=${projects}, conversations=${conversations}, prompt_events=${events}`,
    });
  } catch (e) {
    stepResults.push({ name: 'postgres:connect', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function checkPgVector(stepResults: StepResult[]): Promise<void> {
  try {
    const extName = await execPsql(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
    stepResults.push({
      name: 'pgvector:extension',
      ok: extName === 'vector',
      detail: `pg_extension.extname=${extName || '(not found)'}`,
    });
  } catch (e) {
    stepResults.push({ name: 'pgvector:extension', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }

  try {
    const colName = await execPsql(
      `SELECT column_name FROM information_schema.columns WHERE table_name='prompt_events' AND column_name='embedding'`,
    );
    stepResults.push({
      name: 'pgvector:embedding-column',
      ok: colName === 'embedding',
      detail: `prompt_events.embedding column=${colName || '(not found)'}`,
    });
  } catch (e) {
    stepResults.push({ name: 'pgvector:embedding-column', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function main(): Promise<number> {
  log('ContextForge connectivity smoke test');
  log(`cwd=${process.cwd()}`);
  log(
    `env: POSTGRES=${process.env.POSTGRES_USER ?? '?'}@${process.env.POSTGRES_HOST ?? 'localhost'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? '?'}`,
  );

  const stepResults: StepResult[] = [];

  await checkPostgres(stepResults);
  await checkPgVector(stepResults);
  await closePsqlPool();

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

main().then(
  (code) => { process.exit(code); },
  (e) => {
    process.stderr.write(`[smoke][error] ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    process.exit(1);
  },
);

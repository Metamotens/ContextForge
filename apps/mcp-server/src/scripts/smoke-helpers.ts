import { execFileSync } from 'node:child_process';

export interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

export function dockerExecPsql(sql: string): string {
  const password = process.env.POSTGRES_PASSWORD ?? '';
  const user = process.env.POSTGRES_USER ?? 'contextforge';
  const database = process.env.POSTGRES_DB ?? 'contextforge';
  const stdout = execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${password}`,
      'contextforge-postgres',
      'psql',
      '-U',
      user,
      '-d',
      database,
      '-tA',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  return stdout.trim();
}

export function curlJson(url: string): unknown {
  const stdout = execFileSync('curl.exe', ['-sS', '-m', '5', url], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  return JSON.parse(stdout);
}

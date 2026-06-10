import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { SaveInteractionMemoryTool } from '../mcp/tools/save-interaction-memory.tool';
import { ContextRetrievalService } from '../retrieval/context-retrieval.service';
import { deterministicUuid } from '../common/utils/identity.util';
import { StepResult, dockerExecPsql, curlJson } from './smoke-helpers';
import { execFileSync } from 'child_process';

const PROJECT_NAME = 'smoke-summary';
const PROVIDER = 'smoke-test';
const USER_NAME = 'smoke-runner';
const CONVERSATION_ID = `conv-smoke-${Date.now()}`;

function log(message: string): void {
  process.stdout.write(`[smoke-summary] ${message}\n`);
}

function resetSmokeData(stepResults: StepResult[]): void {
  try {
    const projectUuid = deterministicUuid('project', PROJECT_NAME);
    const deleted = dockerExecPsql(`DELETE FROM prompt_events WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = '${projectUuid}')`);
    const deletedConv = dockerExecPsql(`DELETE FROM conversations WHERE project_id = '${projectUuid}'`);
    const deletedProj = dockerExecPsql(`DELETE FROM projects WHERE id = '${projectUuid}'`);
    stepResults.push({
      name: 'reset:postgres',
      ok: true,
      detail: `cleaned events=${deleted}, conv=${deletedConv}, proj=${deletedProj}`,
    });
  } catch (e) {
    stepResults.push({
      name: 'reset:postgres',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  try {
    const collectionName = process.env.QDRANT_COLLECTION_NAME ?? 'conversation_summaries';
    const baseUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
    const projectUuid = deterministicUuid('project', PROJECT_NAME);
    const filterPayload = JSON.stringify({
      filter: {
        must: [
          {
            key: 'project_id',
            match: { value: projectUuid },
          },
        ],
      },
    });
    execFileSync(
      'curl.exe',
      ['-sS', '-m', '10', '-X', 'POST', `${baseUrl}/collections/${collectionName}/points/delete`, '-H', 'Content-Type: application/json', '-d', filterPayload],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    stepResults.push({ name: 'reset:qdrant', ok: true, detail: `deleted points for project_id=${projectUuid}` });
  } catch (e) {
    stepResults.push({ name: 'reset:qdrant', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function buildLargeUserTurn(index: number): string {
  const base = `User turn ${index}: refactor the cache layer to use sharded keyspaces and add observability for the new metrics endpoint. `;
  return base.repeat(20);
}

function buildLargeAssistantTurn(index: number): string {
  const base = `Assistant turn ${index}: I will refactor by introducing a sharding strategy, then wire metrics, then validate with benchmarks. `;
  return base.repeat(20);
}

async function main(): Promise<number> {
  log('ContextForge summary smoke test');
  log(`project=${PROJECT_NAME} conversation=${CONVERSATION_ID}`);

  const stepResults: StepResult[] = [];
  resetSmokeData(stepResults);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.init();

  const tool = app.get(SaveInteractionMemoryTool);
  const contextRetrieval = app.get(ContextRetrievalService);

  try {
    const totalTurns = 9;
    let summariesGenerated = 0;
    for (let i = 0; i < totalTurns; i += 1) {
      const userResult = await tool.run({
        projectName: PROJECT_NAME,
        provider: PROVIDER,
        userName: USER_NAME,
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: buildLargeUserTurn(i + 1),
      });
      const assistantResult = await tool.run({
        projectName: PROJECT_NAME,
        provider: PROVIDER,
        userName: USER_NAME,
        conversationId: CONVERSATION_ID,
        role: 'assistant',
        content: buildLargeAssistantTurn(i + 1),
      });
      if (userResult.summaryEventId) summariesGenerated += 1;
      if (assistantResult.summaryEventId) summariesGenerated += 1;
      process.stdout.write(
        `  turn ${i + 1}: user=${userResult.eventId.slice(0, 8)} assistant=${assistantResult.eventId.slice(0, 8)} summary=${userResult.summaryEventId?.slice(0, 8) ?? '-'}/${assistantResult.summaryEventId?.slice(0, 8) ?? '-'}\n`,
      );
    }

    const eventCountRaw = dockerExecPsql(
      `SELECT (SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}') || '|' || (SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}' AND pe.is_summary=true)`,
    );
    const [totalEvents, summaryEvents] = eventCountRaw.split('|').map((s) => Number(s));

    stepResults.push({
      name: 'postgres:events',
      ok: totalEvents >= totalTurns * 2,
      detail: `total=${totalEvents} (expected >=${totalTurns * 2}) summary=${summaryEvents}`,
    });

    const collectionName = process.env.QDRANT_COLLECTION_NAME ?? 'conversation_summaries';
    const baseUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

    const collectionInfo = curlJson(`${baseUrl}/collections/${collectionName}`) as {
      result: { points_count?: number };
    };
    const totalPoints = collectionInfo.result.points_count ?? 0;
    stepResults.push({
      name: 'qdrant:points',
      ok: totalPoints >= 1,
      detail: `points=${totalPoints} (expected >=1)`,
    });

    stepResults.push({
      name: 'summary:triggered',
      ok: summariesGenerated >= 1,
      detail: `summaries generated in run=${summariesGenerated} (expected >=1), summary events in db=${summaryEvents}`,
    });

    // --- E2E: search round-trip ---
    const searchResult = await contextRetrieval.search({
      projectName: PROJECT_NAME,
      query: 'cache refactoring sharding metrics observability',
    });
    stepResults.push({
      name: 'search:results',
      ok: searchResult.results.length >= 1 && searchResult.tokensUsed > 0,
      detail: `results=${searchResult.results.length} tokensUsed=${searchResult.tokensUsed} truncated=${searchResult.truncated} topScore=${searchResult.results[0]?.score.toFixed(4) ?? 'n/a'}`,
    });

    // --- E2E: verify only is_summary=true events are indexed in Qdrant ---
    // Qdrant point count for this project must equal Postgres summary event count
    const qdrantScrollRaw = execFileSync(
      'curl.exe',
      [
        '-sS', '-m', '10', '-X', 'POST',
        `${baseUrl}/collections/${collectionName}/points/count`,
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({ filter: { must: [{ key: 'project_id', match: { value: deterministicUuid('project', PROJECT_NAME) } }] } }),
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    const qdrantProjectCount = (JSON.parse(qdrantScrollRaw) as { result?: { count?: number } }).result?.count ?? 0;
    stepResults.push({
      name: 'qdrant:only-summaries',
      ok: qdrantProjectCount === summaryEvents && summaryEvents > 0,
      detail: `qdrant points for project=${qdrantProjectCount}, postgres summaries=${summaryEvents} (must be equal)`,
    });

    // --- E2E: KPI context reduction >= 30% ---
    // Baseline = estimated tokens of all non-summary turns in the project
    const rawTokensRaw = dockerExecPsql(
      `SELECT COALESCE(sum(length(content)), 0) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}' AND pe.is_summary=false`,
    );
    const rawChars = Number(rawTokensRaw) || 0;
    const baselineTokens = Math.ceil(rawChars / 4);
    const retrievedTokens = searchResult.tokensUsed;
    const reductionPct = baselineTokens > 0
      ? Math.round((1 - retrievedTokens / baselineTokens) * 100)
      : 0;
    stepResults.push({
      name: 'kpi:context-reduction',
      ok: reductionPct >= 30,
      detail: `baseline=${baselineTokens} tokens, retrieved=${retrievedTokens} tokens, reduction=${reductionPct}% (target >=30%)`,
    });
  } catch (e) {
    stepResults.push({
      name: 'execution',
      ok: false,
      detail: e instanceof Error ? (e.stack ?? e.message) : String(e),
    });
  } finally {
    await app.close();
  }

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
  log('smoke test FAILED');
  return 1;
}

main().then(
  (code) => {
    process.exit(code);
  },
  (e) => {
    process.stderr.write(`[smoke-summary][error] ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    process.exit(1);
  },
);

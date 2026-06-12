import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { deterministicUuid, InteractionPersistenceService, PromptEnrichmentService } from '@contextforge/core';
import { AppModule } from '@app/app.module';
import { StepResult, closePsqlPool, execPsql } from '@app/scripts/smoke-helpers';

const PROJECT_NAME = 'smoke-summary';
const PROVIDER = 'smoke-test';
const USER_NAME = 'smoke-runner';
const CONVERSATION_ID = `conv-smoke-${Date.now()}`;

function log(message: string): void {
  process.stdout.write(`[smoke-summary] ${message}\n`);
}

async function resetSmokeData(stepResults: StepResult[]): Promise<void> {
  try {
    const projectUuid = deterministicUuid('project', PROJECT_NAME);
    const deleted = await execPsql(`DELETE FROM prompt_events WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = '${projectUuid}')`);
    const deletedConv = await execPsql(`DELETE FROM conversations WHERE project_id = '${projectUuid}'`);
    const deletedProj = await execPsql(`DELETE FROM projects WHERE id = '${projectUuid}'`);
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
  await resetSmokeData(stepResults);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.init();

  const persistence = app.get(InteractionPersistenceService);
  const enrichment = app.get(PromptEnrichmentService);

  try {
    // --- Phase 1: save turns and trigger summary ---
    const totalTurns = 9;
    let summariesGenerated = 0;
    for (let i = 0; i < totalTurns; i += 1) {
      const userResult = await persistence.persistEvent({
        projectName: PROJECT_NAME,
        provider: PROVIDER,
        userName: USER_NAME,
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: buildLargeUserTurn(i + 1),
      });
      const assistantResult = await persistence.persistEvent({
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

    // --- Postgres event count ---
    const eventCountRaw = await execPsql(
      `SELECT (SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}') || '|' || (SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}' AND pe.is_summary=true)`,
    );
    const [totalEvents, summaryEvents] = eventCountRaw.split('|').map((s) => Number(s));

    stepResults.push({
      name: 'postgres:events',
      ok: totalEvents >= totalTurns * 2,
      detail: `total=${totalEvents} (expected >=${totalTurns * 2}) summary=${summaryEvents}`,
    });

    // --- pgvector embedding count ---
    const embeddingCountRaw = await execPsql(
      `SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id = pe.conversation_id JOIN projects p ON p.id = c.project_id WHERE p.name = '${PROJECT_NAME}' AND pe.is_summary = true AND pe.embedding IS NOT NULL`,
    );
    const totalEmbeddings = Number(embeddingCountRaw);
    stepResults.push({
      name: 'pgvector:embeddings',
      ok: totalEmbeddings >= 1,
      detail: `embeddings=${totalEmbeddings} (expected >=1)`,
    });

    stepResults.push({
      name: 'summary:triggered',
      ok: summariesGenerated >= 1,
      detail: `summaries generated in run=${summariesGenerated} (expected >=1), summary events in db=${summaryEvents}`,
    });

    // --- Verify LLM summary content (not deterministic header) ---
    if (summaryEvents > 0) {
      const lastSummaryRaw = await execPsql(
        `SELECT content FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}' AND pe.is_summary=true ORDER BY pe.created_at DESC LIMIT 1`,
      );
      const isDeterministic = lastSummaryRaw.trim().startsWith('[summary] project=');
      stepResults.push({
        name: 'summary:llm-generated',
        ok: !isDeterministic,
        detail: `summary does not start with deterministic header: ok=${!isDeterministic} preview=${JSON.stringify(lastSummaryRaw.slice(0, 120))}`,
      });
    }

    // --- Phase 2: search via PromptEnrichmentService (tests full pipeline) ---
    const enrichResult = await enrichment.enrich({
      projectName: PROJECT_NAME,
      query: 'cache refactoring sharding metrics observability',
    });

    stepResults.push({
      name: 'search:results',
      ok: enrichResult.results.length >= 1 && enrichResult.tokensUsed > 0,
      detail: `results=${enrichResult.results.length} tokensUsed=${enrichResult.tokensUsed} truncated=${enrichResult.truncated} topScore=${enrichResult.results[0]?.score.toFixed(4) ?? 'n/a'}`,
    });

    // contextBlock must be a non-empty formatted string when results are present
    const contextBlockOk =
      enrichResult.snippetCount > 0
        ? enrichResult.contextBlock.startsWith('[ContextForge memory') && enrichResult.contextBlock.includes('\n-')
        : enrichResult.contextBlock === '';
    stepResults.push({
      name: 'search:contextBlock',
      ok: contextBlockOk,
      detail: `snippets=${enrichResult.snippetCount} contextBlock=${JSON.stringify(enrichResult.contextBlock.slice(0, 120))}`,
    });

    // --- Circular memory: search for a term present in saved content ---
    const circularResult = await enrichment.enrich({
      projectName: PROJECT_NAME,
      query: 'sharding strategy benchmarks wire metrics',
      conversationId: CONVERSATION_ID,
    });
    stepResults.push({
      name: 'search:circular-memory',
      ok: circularResult.results.length >= 1,
      detail: `Saved turns retrievable after persist: results=${circularResult.results.length} topScore=${circularResult.results[0]?.score.toFixed(4) ?? 'n/a'}`,
    });

    // --- Only is_summary=true has embeddings in pgvector ---
    const onlySummariesRaw = await execPsql(
      `SELECT count(*) FROM prompt_events pe JOIN conversations c ON c.id = pe.conversation_id JOIN projects p ON p.id = c.project_id WHERE p.name = '${PROJECT_NAME}' AND pe.embedding IS NOT NULL AND pe.is_summary = false`,
    );
    const nonSummaryWithEmbedding = Number(onlySummariesRaw);
    stepResults.push({
      name: 'pgvector:only-summaries',
      ok: nonSummaryWithEmbedding === 0 && summaryEvents > 0,
      detail: `non-summary rows with embedding=${nonSummaryWithEmbedding} (must be 0), postgres summaries=${summaryEvents}`,
    });

    // --- KPI: context reduction >= 30% vs sending all raw turns ---
    const rawTokensRaw = await execPsql(
      `SELECT COALESCE(sum(length(content)), 0) FROM prompt_events pe JOIN conversations c ON c.id=pe.conversation_id JOIN projects p ON p.id=c.project_id WHERE p.name='${PROJECT_NAME}' AND pe.is_summary=false`,
    );
    const rawChars = Number(rawTokensRaw) || 0;
    const baselineTokens = Math.ceil(rawChars / 4);
    const retrievedTokens = enrichResult.tokensUsed;
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
    await closePsqlPool();
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
  (code) => { process.exit(code); },
  (e) => {
    process.stderr.write(`[smoke-summary][error] ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    process.exit(1);
  },
);

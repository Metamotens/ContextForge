import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SummaryConfig } from '../config/summary.config';

export interface RollingSummaryInput {
  projectName: string;
  lastSummaryText: string | null;
  turns: Array<{ role: string; content: string }>;
}

const SYSTEM_PROMPT = `You are a memory compression assistant for an AI coding project.
Your job is to produce a dense, actionable summary of a conversation for future retrieval via semantic search.

Include:
- Key decisions made
- Tasks completed or in progress
- Files, modules, or components discussed
- Errors encountered and how they were resolved
- The current state of the work

Exclude:
- Greetings and small talk
- Redundant or repetitive content
- Secrets, credentials, or personal data
- Technical metadata like UUIDs or internal IDs

Write in concise prose or short bullet points. Do not include section headers or prefixes like "[summary]".
Respond only with the summary text, nothing else.`.trim();

const MAX_CONTENT_CHARS = 800;
const MAX_TURNS_IN_WINDOW = 20;

@Injectable()
export class SummaryLlmService implements OnModuleInit {
  private readonly logger = new Logger(SummaryLlmService.name);

  onModuleInit(): void {
    this.logger.log(
      `Initialized — ollamaUrl=${SummaryConfig.ollamaUrl} chatModel=${SummaryConfig.chatModel} timeoutMs=${SummaryConfig.timeoutMs}`,
    );
  }

  async generateRollingSummary(input: RollingSummaryInput): Promise<string | null> {
    const userMessage = this.buildUserMessage(input);

    try {
      const result = await this.callOllama(userMessage);
      if (!result) {
        this.logger.warn(`[SummaryLlmService] LLM returned empty response for project=${input.projectName}`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `[SummaryLlmService] LLM call failed for project=${input.projectName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private buildUserMessage(input: RollingSummaryInput): string {
    const lines: string[] = [];

    lines.push(`Project: ${input.projectName}`);
    lines.push('');
    lines.push('## Previous summary');
    lines.push(input.lastSummaryText ?? 'None — this is the first summary for this conversation.');

    lines.push('');
    lines.push('## New turns since that summary');

    const turns = input.turns.slice(-MAX_TURNS_IN_WINDOW);
    for (const turn of turns) {
      const content = turn.content.length > MAX_CONTENT_CHARS
        ? `${turn.content.slice(0, MAX_CONTENT_CHARS)}… [truncated]`
        : turn.content;
      lines.push(`### ${turn.role}`);
      lines.push(content);
    }

    return lines.join('\n');
  }

  private async callOllama(userMessage: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SummaryConfig.timeoutMs);

    try {
      const response = await fetch(`${SummaryConfig.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: SummaryConfig.chatModel,
          stream: false,
          options: { num_predict: SummaryConfig.maxOutputTokens },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Ollama chat API ${response.status}: ${body}. Is Ollama running at ${SummaryConfig.ollamaUrl}? Try: ollama pull ${SummaryConfig.chatModel}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const text = data.message?.content?.trim() ?? '';
      return text.length > 0 ? text : null;
    } finally {
      clearTimeout(timer);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { PromptEnrichmentService } from '../../enrichment/prompt-enrichment.service';
import {
  SearchProjectContextInput,
  SearchProjectContextInputSchema,
  SearchProjectContextOutput,
} from '../dto/search-project-context.dto';

@Injectable()
export class SearchProjectContextTool {
  constructor(private readonly enrichment: PromptEnrichmentService) {}

  @Tool({
    name: 'search_project_context',
    description:
      'STEP 1 of the ContextForge memory workflow — call this BEFORE responding to every user message. ' +
      'Searches past conversation summaries for context relevant to the current query and returns a ' +
      'ready-to-use contextBlock string within a strict token budget. ' +
      'Incorporate the contextBlock into your reasoning to ground your response in project history.',
    parameters: SearchProjectContextInputSchema,
  })
  async run(input: SearchProjectContextInput): Promise<SearchProjectContextOutput> {
    process.stderr.write(
      `[SearchProjectContextTool] project=${input.projectName} topK=${input.topK ?? 'auto'}\n`,
    );

    try {
      return await this.enrichment.enrich({
        projectName: input.projectName,
        query: input.query,
        conversationId: input.conversationId,
        topK: input.topK,
      });
    } catch (error) {
      process.stderr.write(
        `[SearchProjectContextTool] search failed: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      return { results: [], contextBlock: '', tokensUsed: 0, truncated: false };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { ContextRetrievalService } from '../../retrieval/context-retrieval.service';
import {
  SearchProjectContextInput,
  SearchProjectContextInputSchema,
  SearchProjectContextOutput,
} from '../dto/search-project-context.dto';

@Injectable()
export class SearchProjectContextTool {
  constructor(private readonly contextRetrieval: ContextRetrievalService) {}

  @Tool({
    name: 'search_project_context',
    description:
      'Search project context from conversation summaries. Returns relevant snippets within a token budget, with adaptive result expansion when confidence is low.',
    parameters: SearchProjectContextInputSchema,
  })
  async run(input: SearchProjectContextInput): Promise<SearchProjectContextOutput> {
    process.stderr.write(
      `[SearchProjectContextTool] project=${input.projectName} topK=${input.topK ?? 'auto'}\n`,
    );

    try {
      return await this.contextRetrieval.search({
        projectName: input.projectName,
        query: input.query,
        conversationId: input.conversationId,
        topK: input.topK,
      });
    } catch (error) {
      process.stderr.write(
        `[SearchProjectContextTool] search failed: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      return { results: [], tokensUsed: 0, truncated: false };
    }
  }
}

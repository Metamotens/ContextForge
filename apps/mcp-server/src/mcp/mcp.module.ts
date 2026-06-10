import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';

import { SaveInteractionMemoryTool } from './tools/save-interaction-memory.tool';
import { SearchProjectContextTool } from './tools/search-project-context.tool';
import { SummaryService } from '../retrieval/summary.service';
import { ContextRetrievalService } from '../retrieval/context-retrieval.service';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'contextforge-mcp-server',
      version: '0.1.0',
      transport: McpTransportType.STDIO,
    }),
  ],
  providers: [SummaryService, ContextRetrievalService, SaveInteractionMemoryTool, SearchProjectContextTool],
})
export class McpServerModule {}

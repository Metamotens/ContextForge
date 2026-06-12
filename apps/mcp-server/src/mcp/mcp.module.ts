import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';

import { EnrichmentModule } from '@contextforge/core';

import { DeleteProjectMemoryTool } from '@mcp/tools/delete-project-memory.tool';
import { ListProjectMemoryTool } from '@mcp/tools/list-project-memory.tool';
import { SaveInteractionMemoryTool } from '@mcp/tools/save-interaction-memory.tool';
import { SearchProjectContextTool } from '@mcp/tools/search-project-context.tool';

@Module({
  imports: [
    EnrichmentModule,
    McpModule.forRoot({
      name: 'contextforge-mcp-server',
      version: '0.1.0',
      transport: McpTransportType.STDIO,
    }),
  ],
  providers: [
    SaveInteractionMemoryTool,
    SearchProjectContextTool,
    DeleteProjectMemoryTool,
    ListProjectMemoryTool,
  ],
})
export class McpServerModule {}

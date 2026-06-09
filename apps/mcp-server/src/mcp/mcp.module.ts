import { Module } from "@nestjs/common";
import { McpModule, McpTransportType } from "@rekog/mcp-nest";

import { SaveInteractionMemoryTool } from "./tools/save-interaction-memory.tool";
import { SearchProjectContextTool } from "./tools/search-project-context.tool";

@Module({
  imports: [
    McpModule.forRoot({
      name: "contextforge-mcp-server",
      version: "0.1.0",
      transport: McpTransportType.STDIO,
    }),
  ],
  providers: [SaveInteractionMemoryTool, SearchProjectContextTool],
})
export class McpServerModule {}

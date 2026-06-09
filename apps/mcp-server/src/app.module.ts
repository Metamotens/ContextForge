import { Module } from "@nestjs/common";
import { McpServerModule } from "./mcp/mcp.module";
import { QdrantModule } from "./persistence/qdrant/qdrant.module";

@Module({
  imports: [QdrantModule, McpServerModule],
})
export class AppModule {}

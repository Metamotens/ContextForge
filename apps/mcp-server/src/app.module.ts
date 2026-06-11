import { Module } from '@nestjs/common';

import { McpServerModule } from '@mcp/mcp.module';
import { PostgresModule } from '@persistence/postgres/postgres.module';
import { QdrantModule } from '@persistence/qdrant/qdrant.module';

@Module({
  imports: [PostgresModule, QdrantModule, McpServerModule],
})
export class AppModule {}

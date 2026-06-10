import { Module } from '@nestjs/common';
import { McpServerModule } from './mcp/mcp.module';
import { QdrantModule } from './persistence/qdrant/qdrant.module';
import { PostgresModule } from './persistence/postgres/postgres.module';

@Module({
  imports: [PostgresModule, QdrantModule, McpServerModule],
})
export class AppModule {}

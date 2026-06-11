import { Module } from '@nestjs/common';

import { McpServerModule } from '@mcp/mcp.module';
import { PgVectorModule } from '@persistence/pgvector/pgvector.module';
import { PostgresModule } from '@persistence/postgres/postgres.module';

@Module({
  imports: [PostgresModule, PgVectorModule, McpServerModule],
})
export class AppModule {}

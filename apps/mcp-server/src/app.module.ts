import { Module } from '@nestjs/common';

import { EnrichmentModule, PgVectorModule, PostgresModule } from '@contextforge/core';

import { McpServerModule } from '@mcp/mcp.module';

@Module({
  imports: [PostgresModule, PgVectorModule, EnrichmentModule, McpServerModule],
})
export class AppModule {}

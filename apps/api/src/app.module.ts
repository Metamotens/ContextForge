import { Module } from '@nestjs/common';

import { EnrichmentModule, PgVectorModule, PostgresModule } from '@contextforge/core';

import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [PostgresModule, PgVectorModule, EnrichmentModule, HealthModule, StatsModule, ProjectsModule],
})
export class AppModule {}

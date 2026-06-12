import { Module } from '@nestjs/common';

import { EnrichmentModule, PostgresModule } from '@contextforge/core';

import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

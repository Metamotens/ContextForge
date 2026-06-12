import { Injectable } from '@nestjs/common';

import { PostgresService } from '@contextforge/core';
import type { GlobalStatsDto } from '@contextforge/shared';

@Injectable()
export class StatsService {
  constructor(private readonly postgres: PostgresService) {}

  getGlobalStats(): Promise<GlobalStatsDto> {
    return this.postgres.getGlobalStats();
  }
}

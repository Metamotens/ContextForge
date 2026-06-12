import { Controller, Get } from '@nestjs/common';

import type { GlobalStatsDto } from '@contextforge/shared';

import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  getStats(): Promise<GlobalStatsDto> {
    return this.stats.getGlobalStats();
  }
}

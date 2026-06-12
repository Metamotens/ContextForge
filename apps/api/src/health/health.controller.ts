import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PostgresService } from '@contextforge/core';
import type { HealthDto } from '@contextforge/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly postgres: PostgresService) {}

  @Get()
  async check(): Promise<HealthDto> {
    try {
      await this.postgres.ping();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

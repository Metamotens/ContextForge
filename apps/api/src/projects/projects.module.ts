import { Module } from '@nestjs/common';

import { EnrichmentModule } from '@contextforge/core';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [EnrichmentModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}

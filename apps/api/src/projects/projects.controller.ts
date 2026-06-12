import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import type {
  ConversationDto,
  ProjectDto,
  ProjectStatsDto,
  PromptEventDto,
  SearchResponseDto,
} from '@contextforge/shared';

import { ProjectsService } from './projects.service';

const DEFAULT_EVENT_LIMIT = 50;

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  listProjects(): Promise<ProjectDto[]> {
    return this.projects.listProjects();
  }

  @Get(':id/stats')
  getProjectStats(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectStatsDto> {
    return this.projects.getProjectStats(id);
  }

  @Get(':id/conversations')
  listConversations(@Param('id', ParseUUIDPipe) id: string): Promise<ConversationDto[]> {
    return this.projects.listConversations(id);
  }

  @Get(':id/events')
  listEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_EVENT_LIMIT), ParseIntPipe) limit: number,
  ): Promise<PromptEventDto[]> {
    return this.projects.listEvents(id, limit);
  }

  @Get(':id/search')
  search(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('q') query = '',
  ): Promise<SearchResponseDto> {
    return this.projects.search(id, query);
  }

  @Get(':id')
  getProject(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDto> {
    return this.projects.getProject(id);
  }
}

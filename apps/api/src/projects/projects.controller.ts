import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import type {
  ConversationDto,
  IndexedSummaryDto,
  ProjectDto,
  ProjectStatsDto,
  PromptEventDto,
  SearchResponseDto,
} from '@contextforge/shared';

import { ProjectsService } from './projects.service';

const DEFAULT_EVENT_LIMIT = 50;
const DEFAULT_EVENT_OFFSET = 0;
const DEFAULT_SUMMARY_LIMIT = 100;

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
    @Query('offset', new DefaultValuePipe(DEFAULT_EVENT_OFFSET), ParseIntPipe) offset: number,
    @Query('conversationId', new ParseUUIDPipe({ optional: true })) conversationId?: string,
  ): Promise<PromptEventDto[]> {
    return this.projects.listEvents(id, limit, offset, conversationId);
  }

  @Get(':id/summaries')
  listSummaries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_SUMMARY_LIMIT), ParseIntPipe) limit: number,
  ): Promise<IndexedSummaryDto[]> {
    return this.projects.listSummaries(id, limit);
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

  @Delete(':id')
  @HttpCode(204)
  deleteProject(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projects.deleteProject(id);
  }
}

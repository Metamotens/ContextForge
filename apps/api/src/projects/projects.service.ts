import { Injectable, NotFoundException } from '@nestjs/common';

import { PostgresService, PromptEnrichmentService } from '@contextforge/core';
import type {
  ConversationDto,
  ProjectDto,
  ProjectStatsDto,
  PromptEventDto,
  SearchResponseDto,
} from '@contextforge/shared';

const DEFAULT_EVENT_LIMIT = 50;
const MAX_EVENT_LIMIT = 200;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly postgres: PostgresService,
    private readonly enrichment: PromptEnrichmentService,
  ) {}

  listProjects(): Promise<ProjectDto[]> {
    return this.postgres.listProjects();
  }

  async getProject(id: string): Promise<ProjectDto> {
    const project = await this.postgres.findProjectById(id);
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async getProjectStats(id: string): Promise<ProjectStatsDto> {
    await this.getProject(id);
    return this.postgres.countByProject(id);
  }

  async listConversations(id: string): Promise<ConversationDto[]> {
    await this.getProject(id);
    const rows = await this.postgres.listConversationsByProject(id);
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      userName: row.userName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      eventCount: row.eventCount,
      summaryCount: row.summaryCount,
    }));
  }

  async listEvents(id: string, limit: number): Promise<PromptEventDto[]> {
    await this.getProject(id);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_EVENT_LIMIT);
    const rows = await this.postgres.listEventsByProject(id, safeLimit);
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      isSummary: row.isSummary,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async search(id: string, query: string): Promise<SearchResponseDto> {
    const project = await this.getProject(id);
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return { results: [], contextBlock: '', snippetCount: 0, tokensUsed: 0, truncated: false };
    }

    return this.enrichment.enrich({
      projectName: project.name,
      query: trimmedQuery,
    });
  }
}

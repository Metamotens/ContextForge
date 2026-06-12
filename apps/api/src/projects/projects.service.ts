import { Injectable, NotFoundException } from '@nestjs/common';

import { PgVectorService, PostgresService, PromptEnrichmentService } from '@contextforge/core';
import type {
  ConversationDto,
  IndexedSummaryDto,
  ProjectDto,
  ProjectStatsDto,
  PromptEventDto,
  SearchResponseDto,
} from '@contextforge/shared';

const DEFAULT_EVENT_LIMIT = 50;
const MAX_EVENT_LIMIT = 200;
const DEFAULT_SUMMARY_LIMIT = 100;
const MAX_SUMMARY_LIMIT = 500;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly postgres: PostgresService,
    private readonly pgVector: PgVectorService,
    private readonly enrichment: PromptEnrichmentService,
  ) {}

  listProjects(): Promise<ProjectDto[]> {
    return this.postgres.listProjects().then((rows) => rows.map((row) => this.toProjectDto(row)));
  }

  async getProject(id: string): Promise<ProjectDto> {
    const project = await this.postgres.findProjectById(id);
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.toProjectDto(project);
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
      model: row.model,
      title: row.title,
      userName: row.userName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      eventCount: row.eventCount,
      summaryCount: row.summaryCount,
    }));
  }

  async listEvents(
    id: string,
    limit: number,
    offset: number,
    conversationId?: string,
  ): Promise<PromptEventDto[]> {
    await this.getProject(id);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_EVENT_LIMIT);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.postgres.listEventsByProject({
      projectId: id,
      limit: safeLimit,
      offset: safeOffset,
      conversationId,
    });
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      isSummary: row.isSummary,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listSummaries(id: string, limit: number): Promise<IndexedSummaryDto[]> {
    await this.getProject(id);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_SUMMARY_LIMIT);
    const scrolled = await this.pgVector.scrollByProjectId({ projectId: id, limit: safeLimit });
    return scrolled.map((point) => ({
      id: point.id,
      conversationId: point.payload.conversation_id ?? '',
      provider: point.payload.provider ?? '',
      userName: point.payload.user_name ?? '',
      content: point.payload.summary_text ?? '',
      createdAt: point.payload.created_at ?? '',
    }));
  }

  async deleteProject(id: string): Promise<void> {
    await this.getProject(id);
    await this.postgres.deleteProject(id);
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

  private toProjectDto(row: { id: string; name: string; createdAt: Date }): ProjectDto {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

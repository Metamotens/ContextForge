import { Service, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  ConversationDto,
  GlobalStatsDto,
  HealthDto,
  IndexedSummaryDto,
  ProjectDto,
  ProjectStatsDto,
  PromptEventDto,
  SearchResponseDto,
} from '@contextforge/shared';

@Service()
export class ApiService {
  private http = inject(HttpClient);

  health = httpResource<HealthDto>(() => ({ url: '/api/health' }));

  globalStats = httpResource<GlobalStatsDto>(() => ({ url: '/api/stats' }));

  projects = httpResource<ProjectDto[]>(() => ({ url: '/api/projects' }));

  project(id: () => string | undefined) {
    return httpResource<ProjectDto>(() => {
      const value = id();
      return value ? { url: `/api/projects/${value}` } : undefined;
    });
  }

  projectStats(id: () => string | undefined) {
    return httpResource<ProjectStatsDto>(() => {
      const value = id();
      return value ? { url: `/api/projects/${value}/stats` } : undefined;
    });
  }

  conversations(id: () => string | undefined) {
    return httpResource<ConversationDto[]>(() => {
      const value = id();
      return value ? { url: `/api/projects/${value}/conversations` } : undefined;
    });
  }

  events(
    id: () => string | undefined,
    params: () => { limit: number; offset: number; conversationId?: string },
  ) {
    return httpResource<PromptEventDto[]>(() => {
      const projectId = id();
      if (!projectId) return undefined;
      const { limit, offset, conversationId } = params();
      const query: Record<string, string | number> = { limit, offset };
      if (conversationId) query['conversationId'] = conversationId;
      return { url: `/api/projects/${projectId}/events`, params: query };
    });
  }

  summaries(id: () => string | undefined, limit: () => number) {
    return httpResource<IndexedSummaryDto[]>(() => {
      const value = id();
      return value
        ? { url: `/api/projects/${value}/summaries`, params: { limit: limit() } }
        : undefined;
    });
  }

  search(id: () => string | undefined, query: () => string) {
    return httpResource<SearchResponseDto>(() => {
      const projectId = id();
      const q = query().trim();
      return projectId && q
        ? { url: `/api/projects/${projectId}/search`, params: { q } }
        : undefined;
    });
  }

  deleteProject(id: string) {
    return firstValueFrom(this.http.delete(`/api/projects/${id}`));
  }
}

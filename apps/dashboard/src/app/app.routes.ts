import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/overview.page').then((m) => m.OverviewPage),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/projects.page').then((m) => m.ProjectsPage),
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./pages/project-summary.page').then((m) => m.ProjectSummaryPage),
      },
      {
        path: 'projects/:projectId/conversations',
        loadComponent: () =>
          import('./pages/conversations.page').then((m) => m.ConversationsPage),
      },
      {
        path: 'projects/:projectId/conversations/:convId',
        loadComponent: () =>
          import('./pages/conversation-detail.page').then((m) => m.ConversationDetailPage),
      },
      {
        path: 'projects/:projectId/events',
        loadComponent: () =>
          import('./pages/system-events.page').then((m) => m.SystemEventsPage),
      },
      {
        path: 'projects/:projectId/search',
        loadComponent: () =>
          import('./pages/semantic-search.page').then((m) => m.SemanticSearchPage),
      },
      {
        path: 'projects/:projectId/summaries',
        loadComponent: () =>
          import('./pages/semantic-summaries.page').then((m) => m.SemanticSummariesPage),
      },
    ],
  },
];

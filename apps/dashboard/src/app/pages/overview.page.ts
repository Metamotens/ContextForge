import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-overview-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <h2 class="font-title-sm text-title-sm text-on-surface">Overview Global</h2>
    </header>

    <div class="space-y-6 p-margin-page">
      @if (stats.isLoading()) {
        <p class="text-on-surface-variant">Cargando métricas...</p>
      } @else if (stats.hasValue()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (card of kpiCards(); track card.label) {
            <div
              class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
              [class]="card.stagger"
            >
              <p
                class="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
              >
                {{ card.label }}
              </p>
              <p class="mt-2 font-display-lg text-display-lg text-on-surface">{{ card.value }}</p>
            </div>
          }
        </div>
      }

      <div
        class="animate-fade-in-up stagger-5 overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-low"
      >
        <div
          class="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-5 py-4"
        >
          <h3 class="font-title-sm text-title-sm text-on-surface">Proyectos Recientes</h3>
          <a routerLink="/projects" class="text-body-sm font-medium text-primary hover:text-primary-fixed"
            >Ver todos</a
          >
        </div>
        <div class="overflow-x-auto">
          @if (projects.hasValue()) {
            <table class="w-full border-collapse text-left">
              <thead>
                <tr
                  class="border-b border-outline-variant/30 bg-surface-container-lowest/50 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
                >
                  <th class="px-5 py-3 font-semibold">Proyecto</th>
                  <th class="px-5 py-3 font-semibold">Creado</th>
                  <th class="px-5 py-3 text-right font-semibold">ID</th>
                </tr>
              </thead>
              <tbody class="font-body-sm text-body-sm text-on-surface">
                @for (project of projects.value() ?? []; track project.id) {
                  <tr
                    class="group cursor-pointer border-b border-outline-variant/10 transition-all duration-200 hover:scale-[1.005] hover:bg-zinc-800/50"
                    [routerLink]="['/projects', project.id]"
                  >
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex h-8 w-8 items-center justify-center rounded border border-outline-variant/30 bg-surface-container group-hover:border-primary/50"
                        >
                          <span class="material-symbols-outlined text-[16px] text-primary"
                            >terminal</span
                          >
                        </div>
                        <span class="font-medium">{{ project.name }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-3 font-code-sm text-on-surface-variant">
                      {{ project.createdAt | date: 'short' }}
                    </td>
                    <td class="px-5 py-3 text-right font-code-sm text-on-surface-variant">
                      {{ project.id.slice(0, 8) }}...
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="px-5 py-8 text-center text-on-surface-variant">
                      No hay proyectos registrados
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
})
export class OverviewPage {
  private api = inject(ApiService);

  stats = this.api.globalStats;
  projects = this.api.projects;

  kpiCards = computed(() => {
    const data = this.stats.value();
    if (!data) return [];
    return [
      { label: 'Proyectos', value: data.totalProjects, stagger: 'stagger-1' },
      { label: 'Conversaciones', value: data.totalConversations, stagger: 'stagger-2' },
      { label: 'Eventos', value: data.totalEvents, stagger: 'stagger-3' },
      { label: 'Resúmenes', value: data.totalSummaries, stagger: 'stagger-4' },
    ];
  });
}

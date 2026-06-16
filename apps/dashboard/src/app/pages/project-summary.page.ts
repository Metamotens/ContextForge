import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-project-summary-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a routerLink="/projects" class="text-on-surface-variant hover:text-primary">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">
          @if (project.hasValue()) {
            {{ project.value()!.name }}
          } @else {
            Resumen del Proyecto
          }
        </h2>
      </div>
    </header>

    <div class="space-y-6 p-margin-page">
      @if (project.isLoading() || stats.isLoading()) {
        <p class="text-on-surface-variant">Cargando proyecto...</p>
      } @else if (project.hasValue()) {
        <div class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-6">
          <p class="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            Detalles
          </p>
          <p class="mt-2 font-headline-md text-headline-md text-on-surface">{{ project.value()!.name }}</p>
          <p class="mt-1 font-code-sm text-code-sm text-on-surface-variant">
            ID: {{ project.value()!.id }}
          </p>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Creado: {{ project.value()!.createdAt | date: 'medium' }}
          </p>
        </div>

        @if (stats.hasValue()) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            @for (card of statCards(); track card.label) {
              <div
                class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
              >
                <p class="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  {{ card.label }}
                </p>
                <p class="mt-2 font-display-lg text-display-lg text-primary">{{ card.value }}</p>
              </div>
            }
          </div>
        }

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          @for (link of quickLinks(); track link.path) {
            <a
              [routerLink]="link.path"
              class="flex items-center gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 transition-all hover:border-primary/50 hover:bg-surface-container-high"
            >
              <span class="material-symbols-outlined text-primary">{{ link.icon }}</span>
              <span class="font-body-base text-body-base">{{ link.label }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class ProjectSummaryPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  project = this.api.project(() => this.projectId());
  stats = this.api.projectStats(() => this.projectId());

  statCards = computed(() => {
    const data = this.stats.value();
    if (!data) return [];
    return [
      { label: 'Conversaciones', value: data.conversations },
      { label: 'Eventos', value: data.events },
      { label: 'Resúmenes', value: data.summaries },
    ];
  });

  quickLinks = computed(() => {
    const id = this.projectId();
    if (!id) return [];
    const base = `/projects/${id}`;
    return [
      { path: `${base}/conversations`, label: 'Conversaciones', icon: 'forum' },
      { path: `${base}/events`, label: 'Eventos', icon: 'bolt' },
      { path: `${base}/search`, label: 'Búsqueda', icon: 'search' },
      { path: `${base}/summaries`, label: 'Resúmenes', icon: 'summarize' },
    ];
  });
}

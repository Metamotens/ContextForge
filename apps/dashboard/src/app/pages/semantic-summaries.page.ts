import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-semantic-summaries-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a [routerLink]="['/projects', projectId()]" class="text-on-surface-variant hover:text-primary">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">Resúmenes Semánticos</h2>
      </div>
    </header>

    <div class="space-y-4 p-margin-page">
      @if (summaries.isLoading()) {
        <p class="text-on-surface-variant">Cargando resúmenes...</p>
      } @else if (summaries.hasValue()) {
        @for (summary of summaries.value() ?? []; track summary.id) {
          <article
            class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">summarize</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">
                  {{ summary.provider }} · {{ summary.userName }}
                </span>
              </div>
              <time class="font-code-sm text-code-sm text-on-surface-variant">{{
                summary.createdAt | date: 'medium'
              }}</time>
            </div>
            <pre class="whitespace-pre-wrap font-body-base text-body-base text-on-surface">{{
              summary.content
            }}</pre>
            <p class="mt-2 font-code-sm text-code-sm text-on-surface-variant">
              conv: {{ summary.conversationId.slice(0, 12) }}...
            </p>
          </article>
        } @empty {
          <div
            class="flex flex-col items-center rounded-xl border border-dashed border-outline-variant p-12 text-center"
          >
            <span class="material-symbols-outlined mb-3 text-[40px] text-outline">summarize</span>
            <p class="text-on-surface-variant">No hay resúmenes indexados</p>
          </div>
        }
      }
    </div>
  `,
})
export class SemanticSummariesPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  limit = signal(100);

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  summaries = this.api.summaries(() => this.projectId(), () => this.limit());
}

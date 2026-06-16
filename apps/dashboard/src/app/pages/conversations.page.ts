import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-conversations-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a [routerLink]="['/projects', projectId()]" class="text-on-surface-variant hover:text-primary">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">Conversaciones</h2>
      </div>
    </header>

    <div class="p-margin-page">
      @if (conversations.isLoading()) {
        <p class="text-on-surface-variant">Cargando conversaciones...</p>
      } @else if (conversations.hasValue()) {
        <div class="space-y-3">
          @for (conv of conversations.value() ?? []; track conv.id) {
            <a
              [routerLink]="['/projects', projectId(), 'conversations', conv.id]"
              class="block animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 transition-all hover:border-primary/50 hover:bg-surface-container-high"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="font-title-sm text-title-sm text-on-surface">
                    {{ conv.title || 'Sin título' }}
                  </h3>
                  <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    {{ conv.provider }} · {{ conv.userName }}
                  </p>
                  <p class="mt-1 font-code-sm text-code-sm text-on-surface-variant">
                    Modelo: {{ conv.model }}
                  </p>
                </div>
                <div class="text-right font-body-sm text-body-sm text-on-surface-variant">
                  <p>{{ conv.eventCount }} eventos</p>
                  <p>{{ conv.summaryCount }} resúmenes</p>
                  <p class="mt-1">{{ conv.updatedAt | date: 'short' }}</p>
                </div>
              </div>
            </a>
          } @empty {
            <div
              class="flex flex-col items-center rounded-xl border border-dashed border-outline-variant p-12 text-center"
            >
              <span class="material-symbols-outlined mb-3 text-[40px] text-outline">forum</span>
              <p class="text-on-surface-variant">No hay conversaciones en este proyecto</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ConversationsPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  conversations = this.api.conversations(() => this.projectId());
}

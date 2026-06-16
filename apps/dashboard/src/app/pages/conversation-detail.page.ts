import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-conversation-detail-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a
          [routerLink]="['/projects', projectId(), 'conversations']"
          class="text-on-surface-variant hover:text-primary"
        >
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">Detalle de Conversación</h2>
      </div>
    </header>

    <div class="space-y-4 p-margin-page">
      @if (events.isLoading()) {
        <p class="text-on-surface-variant">Cargando eventos...</p>
      } @else if (events.hasValue()) {
        @for (event of events.value() ?? []; track event.id) {
          <article
            class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-4"
            [class.border-primary/40]="event.isSummary"
          >
            <div class="mb-2 flex items-center justify-between">
              <span
                class="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-label-caps text-label-caps uppercase"
                [class]="roleClass(event.role)"
              >
                {{ event.role }}
                @if (event.isSummary) {
                  <span class="material-symbols-outlined text-[14px]">summarize</span>
                }
              </span>
              <time class="font-code-sm text-code-sm text-on-surface-variant">{{
                event.createdAt | date: 'medium'
              }}</time>
            </div>
            <pre
              class="whitespace-pre-wrap font-code-sm text-code-sm text-on-surface"
              >{{ event.content }}</pre
            >
          </article>
        } @empty {
          <p class="text-on-surface-variant">No hay eventos en esta conversación</p>
        }

        <div class="flex justify-center gap-3 pt-4">
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="offset() === 0"
            class="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="(events.value()?.length ?? 0) < limit()"
            class="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      }
    </div>
  `,
})
export class ConversationDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  limit = signal(50);
  offset = signal(0);

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  conversationId = toSignal(this.route.paramMap.pipe(map((p) => p.get('convId') ?? undefined)), {
    initialValue: undefined,
  });

  events = this.api.events(
    () => this.projectId(),
    () => ({
      limit: this.limit(),
      offset: this.offset(),
      conversationId: this.conversationId(),
    }),
  );

  roleClass(role: string) {
    if (role === 'user') return 'bg-primary/10 text-primary';
    if (role === 'assistant') return 'bg-emerald-500/10 text-emerald-400';
    return 'bg-surface-container-high text-on-surface-variant';
  }

  prevPage() {
    this.offset.update((v) => Math.max(0, v - this.limit()));
    this.events.reload();
  }

  nextPage() {
    this.offset.update((v) => v + this.limit());
    this.events.reload();
  }
}

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-system-events-page',
  imports: [RouterLink, DatePipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a [routerLink]="['/projects', projectId()]" class="text-on-surface-variant hover:text-primary">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">Eventos de Sistema</h2>
      </div>
    </header>

    <div class="p-margin-page">
      @if (events.isLoading()) {
        <p class="text-on-surface-variant">Cargando eventos...</p>
      } @else if (events.hasValue()) {
        <div
          class="overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-low"
        >
          <table class="w-full border-collapse text-left">
            <thead>
              <tr
                class="border-b border-outline-variant/30 font-label-caps text-label-caps uppercase text-on-surface-variant"
              >
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Contenido</th>
                <th class="px-4 py-3">Resumen</th>
                <th class="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant font-body-sm text-body-sm">
              @for (event of events.value() ?? []; track event.id) {
                <tr class="transition-colors hover:bg-surface-container-high">
                  <td class="px-4 py-3">
                    <span class="rounded bg-surface-container-high px-2 py-0.5 font-code-sm">{{
                      event.role
                    }}</span>
                  </td>
                  <td class="max-w-md truncate px-4 py-3 font-code-sm">{{ event.content }}</td>
                  <td class="px-4 py-3">
                    @if (event.isSummary) {
                      <span class="material-symbols-outlined text-primary">check_circle</span>
                    }
                  </td>
                  <td class="px-4 py-3 font-code-sm text-on-surface-variant">
                    {{ event.createdAt | date: 'short' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-on-surface-variant">
                    No hay eventos
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex justify-center gap-3">
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="offset() === 0"
            class="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <span class="self-center font-code-sm text-on-surface-variant">offset {{ offset() }}</span>
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
export class SystemEventsPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  limit = signal(50);
  offset = signal(0);

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  events = this.api.events(
    () => this.projectId(),
    () => ({ limit: this.limit(), offset: this.offset() }),
  );

  prevPage() {
    this.offset.update((v) => Math.max(0, v - this.limit()));
    this.events.reload();
  }

  nextPage() {
    this.offset.update((v) => v + this.limit());
    this.events.reload();
  }
}

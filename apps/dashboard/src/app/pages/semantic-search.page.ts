import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { form, FormField, required } from '@angular/forms/signals';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-semantic-search-page',
  imports: [RouterLink, FormField, DecimalPipe],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <a [routerLink]="['/projects', projectId()]" class="text-on-surface-variant hover:text-primary">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </a>
        <h2 class="font-title-sm text-title-sm text-on-surface">Búsqueda Semántica</h2>
      </div>
    </header>

    <div class="space-y-6 p-margin-page">
      <form
        (submit)="runSearch($event)"
        class="animate-fade-in-up rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
      >
        <label class="mb-2 block font-label-caps text-label-caps text-on-surface-variant" for="search-q">
          Consulta semántica
        </label>
        <div class="flex gap-3">
          <input
            id="search-q"
            type="text"
            [formField]="searchForm.query"
            placeholder="Buscar contexto del proyecto..."
            class="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-on-surface transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <button
            type="submit"
            [disabled]="!canSearch()"
            class="rounded-lg bg-primary-container px-4 py-2 font-medium text-on-primary-container transition-all active:scale-95 disabled:opacity-50"
          >
            Buscar
          </button>
        </div>
      </form>

      @if (submitted() && search.isLoading()) {
        <p class="text-on-surface-variant">Buscando...</p>
      } @else if (submitted() && search.hasValue()) {
        @let result = search.value()!;
        <div class="grid gap-4 lg:grid-cols-2">
          <section class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-5">
            <h3 class="font-title-sm text-title-sm text-on-surface">Resultados</h3>
            <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {{ result.snippetCount }} snippets · {{ result.tokensUsed }} tokens
              @if (result.truncated) {
                · truncado
              }
            </p>
            <ul class="mt-4 space-y-3">
              @for (item of result.results; track item.eventId) {
                <li class="rounded border border-outline-variant/30 bg-surface-container-lowest p-3">
                  <p class="font-code-sm text-code-sm text-on-surface">{{ item.snippet }}</p>
                  <p class="mt-1 font-body-sm text-body-sm text-primary">
                    score: {{ item.score | number: '1.2-2' }}
                  </p>
                </li>
              } @empty {
                <li class="text-on-surface-variant">Sin resultados</li>
              }
            </ul>
          </section>

          <section class="rounded-lg border border-outline-variant/50 bg-surface-container-low p-5">
            <h3 class="font-title-sm text-title-sm text-on-surface">Context Block</h3>
            <pre
              class="mt-4 max-h-96 overflow-auto whitespace-pre-wrap font-code-sm text-code-sm text-on-surface-variant"
              >{{ result.contextBlock }}</pre
            >
          </section>
        </div>
      }
    </div>
  `,
})
export class SemanticSearchPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  submitted = signal(false);
  activeQuery = signal('');

  searchModel = signal({ query: '' });
  searchForm = form(this.searchModel, (schema) => {
    required(schema.query);
  });

  projectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('projectId') ?? undefined)), {
    initialValue: undefined,
  });

  search = this.api.search(
    () => this.projectId(),
    () => this.activeQuery(),
  );

  canSearch = computed(() => this.searchModel().query.trim().length > 0);

  runSearch(event: Event) {
    event.preventDefault();
    const q = this.searchModel().query.trim();
    if (!q) return;
    this.activeQuery.set(q);
    this.submitted.set(true);
    this.search.reload();
  }
}

import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen">
      <aside
        class="fixed left-0 top-0 z-50 hidden h-screen w-sidebar-width flex-col space-y-stack-gap border-r border-outline-variant bg-surface-container-lowest p-gutter md:flex"
      >
        <div class="mb-4 flex items-center gap-3 border-b border-outline-variant/30 px-2 py-4">
          <div
            class="flex h-8 w-8 items-center justify-center rounded bg-primary-fixed shadow-inner"
          >
            <span class="material-symbols-outlined fill-icon text-lg text-on-primary-fixed"
              >hub</span
            >
          </div>
          <div>
            <h1 class="font-headline-md text-lg font-bold tracking-tight text-primary">
              ContextForge
            </h1>
            <div class="mt-0.5 flex items-center gap-1.5">
              @if (healthy()) {
                <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">System Healthy</span>
              } @else {
                <span class="h-2 w-2 rounded-full bg-red-500"></span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">Offline</span>
              }
            </div>
          </div>
        </div>

        <nav class="flex-1 space-y-1">
          <a
            routerLink="/"
            routerLinkActive="bg-secondary-container text-on-secondary-container"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-on-surface-variant transition-all duration-200 hover:scale-[1.01] hover:bg-surface-container-high hover:text-on-surface active:scale-95"
          >
            <span class="material-symbols-outlined text-[20px]">dashboard</span>
            <span class="font-body-base text-body-base font-medium">Overview</span>
          </a>
          <a
            routerLink="/projects"
            routerLinkActive="bg-secondary-container text-on-secondary-container"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-on-surface-variant transition-all duration-200 hover:scale-[1.01] hover:bg-surface-container-high hover:text-on-surface active:scale-95"
          >
            <span class="material-symbols-outlined text-[20px]">folder</span>
            <span class="font-body-base text-body-base font-medium">Projects</span>
          </a>
        </nav>

        @if (projectId()) {
          <div class="space-y-1 border-t border-outline-variant/30 pt-4">
            <p
              class="px-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
            >
              Proyecto
            </p>
            @for (tab of projectTabs(); track tab.path) {
              <a
                [routerLink]="tab.path"
                routerLinkActive="bg-secondary-container text-on-secondary-container"
                class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-on-surface"
              >
                <span class="material-symbols-outlined text-[18px]">{{ tab.icon }}</span>
                <span class="font-body-sm text-body-sm">{{ tab.label }}</span>
              </a>
            }
          </div>
        }
      </aside>

      <main class="min-h-screen flex-1 md:ml-sidebar-width">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  private url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  health = this.api.health;

  healthy = computed(() => this.health.hasValue() && this.health.value()?.status === 'ok');

  projectId = computed(() => {
    const match = this.url().match(/\/projects\/([^/?]+)/);
    return match?.[1] ?? null;
  });

  projectTabs = computed(() => {
    const id = this.projectId();
    if (!id) return [];
    const base = `/projects/${id}`;
    return [
      { path: base, label: 'Resumen', icon: 'analytics' },
      { path: `${base}/conversations`, label: 'Conversaciones', icon: 'forum' },
      { path: `${base}/events`, label: 'Eventos', icon: 'bolt' },
      { path: `${base}/search`, label: 'Búsqueda', icon: 'search' },
      { path: `${base}/summaries`, label: 'Resúmenes', icon: 'summarize' },
    ];
  });
}

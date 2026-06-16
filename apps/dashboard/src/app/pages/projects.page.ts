import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import type { ProjectDto } from '@contextforge/shared';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-projects-page',
  imports: [RouterLink, DatePipe, FormField],
  template: `
    <header
      class="sticky top-0 z-10 flex h-subnav-height items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-page backdrop-blur-xl"
    >
      <h2 class="font-title-sm text-title-sm text-on-surface">Proyectos</h2>
    </header>

    <div class="p-margin-page">
      <div
        class="overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-low"
      >
        <div class="overflow-x-auto">
          @if (projects.isLoading()) {
            <p class="p-6 text-on-surface-variant">Cargando proyectos...</p>
          } @else if (projects.hasValue()) {
            <table class="w-full border-collapse text-left">
              <thead>
                <tr
                  class="border-b border-outline-variant/30 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
                >
                  <th class="w-2/5 px-4 py-3">Proyecto</th>
                  <th class="w-1/5 px-4 py-3">Creado</th>
                  <th class="w-1/5 px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant font-body-sm text-body-sm">
                @for (project of projects.value() ?? []; track project.id) {
                  <tr class="group transition-colors duration-200 hover:bg-surface-container-high">
                    <td class="px-4 py-4">
                      <a
                        [routerLink]="['/projects', project.id]"
                        class="flex items-center gap-3"
                      >
                        <div
                          class="flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-surface-container-highest group-hover:border-primary/50"
                        >
                          <span class="material-symbols-outlined text-[18px] text-primary"
                            >folder</span
                          >
                        </div>
                        <div>
                          <div
                            class="font-title-sm text-title-sm text-on-surface group-hover:text-primary"
                          >
                            {{ project.name }}
                          </div>
                          <div class="mt-0.5 font-code-sm text-code-sm text-on-surface-variant">
                            id: {{ project.id.slice(0, 12) }}
                          </div>
                        </div>
                      </a>
                    </td>
                    <td class="px-4 py-4 font-code-sm text-code-sm text-on-surface-variant">
                      {{ project.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-4 py-4 text-right">
                      <button
                        type="button"
                        (click)="openDelete(project)"
                        class="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                        title="Eliminar"
                      >
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="px-4 py-12 text-center">
                      <div
                        class="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-12"
                      >
                        <div
                          class="animate-float mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest"
                        >
                          <span class="material-symbols-outlined text-[32px] text-outline"
                            >folder_off</span
                          >
                        </div>
                        <h4 class="font-title-sm text-title-sm text-on-surface">
                          No hay proyectos
                        </h4>
                        <p class="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                          Los proyectos aparecerán aquí cuando el MCP capture memoria.
                        </p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>

    @if (deleteTarget()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="mx-4 w-full max-w-md scale-100 rounded-xl border border-outline-variant bg-surface-container-low opacity-100 shadow-xl"
        >
          <div class="border-b border-outline-variant/50 p-6">
            <div class="flex items-start gap-4">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-error/20 bg-error/10"
              >
                <span class="material-symbols-outlined text-error">warning</span>
              </div>
              <div>
                <h3 class="font-title-sm text-title-sm text-on-surface">Eliminar Proyecto</h3>
                <p class="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                  ¿Eliminar
                  <span
                    class="rounded bg-surface-container-highest px-1 font-code-sm text-on-surface"
                    >{{ deleteTarget()!.name }}</span
                  >? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>
          <div class="border-b border-outline-variant/50 bg-surface-container-lowest/50 p-6">
            <label
              class="mb-2 block font-label-caps text-label-caps text-on-surface-variant"
              for="confirm-text"
              >Escribe el nombre del proyecto para confirmar:</label
            >
            <input
              id="confirm-text"
              type="text"
              [formField]="deleteForm.confirmName"
              class="w-full rounded-lg border border-error/50 bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-outline-variant transition-all focus:border-error focus:ring-1 focus:ring-error focus:outline-none"
              [placeholder]="deleteTarget()!.name"
            />
          </div>
          <div class="flex items-center justify-end gap-3 rounded-b-xl bg-surface-container-low p-6">
            <button
              type="button"
              (click)="closeDelete()"
              class="rounded-lg border border-outline-variant bg-surface-container-highest px-4 py-2 text-body-base transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmDelete()"
              [disabled]="!canDelete() || deleting()"
              class="rounded-lg bg-error px-4 py-2 font-medium text-on-error shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ deleting() ? 'Eliminando...' : 'Eliminar Permanentemente' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProjectsPage {
  private api = inject(ApiService);
  private router = inject(Router);

  projects = this.api.projects;
  deleteTarget = signal<ProjectDto | null>(null);
  deleting = signal(false);

  deleteModel = signal({ confirmName: '' });
  deleteForm = form(this.deleteModel, (schema) => {
    required(schema.confirmName);
  });

  canDelete = computed(() => {
    const target = this.deleteTarget();
    return target !== null && this.deleteModel().confirmName === target.name;
  });

  openDelete(project: ProjectDto) {
    this.deleteTarget.set(project);
    this.deleteModel.set({ confirmName: '' });
  }

  closeDelete() {
    this.deleteTarget.set(null);
    this.deleteModel.set({ confirmName: '' });
  }

  async confirmDelete() {
    const target = this.deleteTarget();
    if (!target || !this.canDelete()) return;
    this.deleting.set(true);
    try {
      await this.api.deleteProject(target.id);
      this.projects.reload();
      this.closeDelete();
      if (this.router.url.includes(target.id)) {
        await this.router.navigate(['/projects']);
      }
    } finally {
      this.deleting.set(false);
    }
  }
}

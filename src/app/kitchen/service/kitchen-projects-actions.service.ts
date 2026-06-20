import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { KitchenProjectDetailResponse, KitchenProjectListResponse } from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from './kitchen-project-transition-guard.service';
import { KitchenService } from './kitchen.service';
import { KitchenStateService } from './kitchen-state.service';

@Injectable({ providedIn: 'root' })
export class KitchenProjectsActionsService {
  private readonly kitchenService = inject(KitchenService);
  private readonly transitionGuard = inject(KitchenProjectTransitionGuardService);
  private readonly stateService = inject(KitchenStateService);
  private readonly router = inject(Router);

  readonly projects = signal<KitchenProjectListResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly cloningProjectId = signal<number | null>(null);
  readonly deleteConfirmationProjectId = signal<number | null>(null);
  readonly deletingProjectId = signal<number | null>(null);

  loadProjects(): void {
    if (this.deletingProjectId() !== null) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.deleteConfirmationProjectId.set(null);
    this.kitchenService.getProjects().subscribe({
      next: projects => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się wczytać listy projektów');
        this.loading.set(false);
      }
    });
  }

  openProject(projectId: number): void {
    this.transitionGuard.confirmUnsavedAndProceed('otworz inny projekt', {
      onProceed: () => {
        this.loading.set(true);
        this.kitchenService.getProjectById(projectId).pipe(
          finalize(() => this.loading.set(false))
        ).subscribe({
          next: (project: KitchenProjectDetailResponse) => {
            this.stateService.loadProject(project);
            this.router.navigate(['/kitchen'], { queryParams: { projectId: project.id } });
          },
          error: () => {
            this.error.set('Nie udało się wczytać projektu');
          }
        });
      }
    });
  }

  confirmDelete(projectId: number): void {
    if (this.deletingProjectId() === null) {
      this.deleteConfirmationProjectId.set(projectId);
    }
  }

  cancelDelete(): void {
    this.deleteConfirmationProjectId.set(null);
  }

  deleteProject(projectId: number): void {
    if (this.deletingProjectId() !== null) {
      return;
    }

    this.deleteConfirmationProjectId.set(null);
    this.deletingProjectId.set(projectId);
    this.kitchenService.deleteProject(projectId).pipe(
      finalize(() => this.deletingProjectId.set(null))
    ).subscribe({
      next: () => {
        this.projects.update(list => list.filter(p => p.id !== projectId));
      },
      error: () => {
        this.error.set('Nie udało się usunąć projektu');
      }
    });
  }

  cloneProject(projectId: number): void {
    if (this.cloningProjectId() !== null) {
      return;
    }
    this.transitionGuard.confirmUnsavedAndProceed('otworz sklonowany projekt', {
      onProceed: () => {
        this.cloningProjectId.set(projectId);
        this.kitchenService.cloneProject(projectId).pipe(
          finalize(() => this.cloningProjectId.set(null))
        ).subscribe({
          next: (cloned: KitchenProjectDetailResponse) => {
            this.stateService.loadProject(cloned);
            this.router.navigate(['/kitchen'], { queryParams: { projectId: cloned.id } });
          },
          error: () => {
            this.error.set('Nie udało się sklonować projektu');
          }
        });
      }
    });
  }

  createNewProject(): void {
    this.transitionGuard.confirmUnsavedAndProceed('utworz nowy projekt', {
      onProceed: () => {
        this.stateService.startNewProject();
        this.router.navigate(['/kitchen']);
      }
    });
  }
}

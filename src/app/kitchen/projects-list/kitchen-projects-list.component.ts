import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KitchenService } from '../service/kitchen.service';
import { KitchenProjectTransitionGuardService } from '../service/kitchen-project-transition-guard.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import {
  KitchenProjectListResponse,
  ProjectStatus,
  getStatusColor,
  getStatusLabel as getLabel
} from '../model/kitchen-project.model';

type SortField = 'updatedAt' | 'createdAt' | 'totalCost' | 'status';

const STATUS_ORDER: ProjectStatus[] = [
  'DRAFT',
  'OFFER_SENT',
  'ACCEPTED',
  'IN_PRODUCTION',
  'IN_INSTALLATION',
  'COMPLETED',
  'CANCELLED'
];

@Component({
  selector: 'app-kitchen-projects-list',
  templateUrl: './kitchen-projects-list.component.html',
  styleUrls: ['./kitchen-projects-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenProjectsListComponent implements OnInit {
  // TODO(CODEX): This list screen still mixes loading data, delete/clone/open actions,
  // filter/sort workflow and presentation logic in one smart component. If this route
  // keeps evolving, extract a small facade for data/actions and simplify error handling.
  private readonly kitchenService = inject(KitchenService);
  private readonly projectTransitionGuard = inject(KitchenProjectTransitionGuardService);
  private readonly stateService = inject(KitchenStateService);
  private readonly router = inject(Router);

  projects: KitchenProjectListResponse[] = [];
  filteredAndSortedProjects: KitchenProjectListResponse[] = [];
  loading = false;
  error: string | null = null;

  deletingProjectId: number | null = null;
  cloningProjectId: number | null = null;

  activeStatusFilters: Set<ProjectStatus> = new Set();

  sortField: SortField = 'updatedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  readonly flowSteps: Array<{ status: ProjectStatus; num: number; label: string; color: string }> = [
    { status: 'DRAFT', num: 1, label: 'Szkic', color: '#6b7280' },
    { status: 'OFFER_SENT', num: 2, label: 'Oferta wyslana', color: '#2563eb' },
    { status: 'ACCEPTED', num: 3, label: 'Zaakceptowany', color: '#16a34a' },
    { status: 'IN_PRODUCTION', num: 4, label: 'W produkcji', color: '#ea580c' },
    { status: 'IN_INSTALLATION', num: 5, label: 'W montazu', color: '#7c3aed' },
    { status: 'COMPLETED', num: 6, label: 'Zakonczony', color: '#065f46' }
  ];

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;

    this.kitchenService.getProjects().subscribe({
      next: projects => {
        this.projects = projects;
        this.updateFilteredList();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading projects:', err);
        this.error = 'Nie udalo sie wczytac listy projektow';
        this.loading = false;
      }
    });
  }

  openProject(projectId: number): void {
    this.projectTransitionGuard.confirmUnsavedAndProceed('otwórz inny projekt', {
      onProceed: () => {
        this.loading = true;

        this.kitchenService.getProjectById(projectId).subscribe({
          next: project => {
            this.stateService.loadProject(project);
            this.router.navigate(['/kitchen'], {
              queryParams: { projectId: project.id }
            });
          },
          error: err => {
            console.error('Error loading project:', err);
            this.error = 'Nie udalo sie wczytac projektu';
            this.loading = false;
          }
        });
      }
    });
  }

  confirmDelete(projectId: number): void {
    this.deletingProjectId = projectId;
  }

  cancelDelete(): void {
    this.deletingProjectId = null;
  }

  deleteProject(projectId: number): void {
    this.kitchenService.deleteProject(projectId).subscribe({
      next: () => {
        this.projects = this.projects.filter(project => project.id !== projectId);
        this.deletingProjectId = null;
        this.updateFilteredList();
      },
      error: err => {
        console.error('Error deleting project:', err);
        this.error = 'Nie udalo sie usunac projektu';
        this.deletingProjectId = null;
      }
    });
  }

  cloneProject(projectId: number): void {
    if (this.cloningProjectId !== null) {
      return;
    }

    this.projectTransitionGuard.confirmUnsavedAndProceed('otwórz sklonowany projekt', {
      onProceed: () => {
        this.cloningProjectId = projectId;

        this.kitchenService.cloneProject(projectId).subscribe({
          next: cloned => {
            this.cloningProjectId = null;
            this.stateService.loadProject(cloned);
            this.router.navigate(['/kitchen'], { queryParams: { projectId: cloned.id } });
          },
          error: err => {
            console.error('Error cloning project:', err);
            this.error = 'Nie udalo sie sklonowac projektu';
            this.cloningProjectId = null;
          }
        });
      }
    });
  }

  createNewProject(): void {
    this.projectTransitionGuard.confirmUnsavedAndProceed('utwórz nowy projekt', {
      onProceed: () => {
        this.stateService.startNewProject();
        this.router.navigate(['/kitchen']);
      }
    });
  }

  toggleStatusFilter(status: ProjectStatus): void {
    if (this.activeStatusFilters.has(status)) {
      this.activeStatusFilters.delete(status);
    } else {
      this.activeStatusFilters.add(status);
    }
    this.activeStatusFilters = new Set(this.activeStatusFilters);
    this.updateFilteredList();
  }

  isFilterActive(status: ProjectStatus): boolean {
    return this.activeStatusFilters.has(status);
  }

  get hasActiveFilters(): boolean {
    return this.activeStatusFilters.size > 0;
  }

  clearFilters(): void {
    this.activeStatusFilters = new Set();
    this.updateFilteredList();
  }

  setSortField(field: SortField): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.updateFilteredList();
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) {
      return '';
    }
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  countByStatus(status: ProjectStatus): number {
    return this.projects.filter(project => project.status === status).length;
  }

  private updateFilteredList(): void {
    let list = this.projects;

    if (this.activeStatusFilters.size > 0) {
      list = list.filter(project => this.activeStatusFilters.has(project.status));
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (this.sortField) {
        case 'updatedAt':
          return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        case 'createdAt':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'totalCost':
          return dir * (a.totalCost - b.totalCost);
        case 'status':
          return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        default:
          return 0;
      }
    });

    this.filteredAndSortedProjects = list;
  }

  trackById(_index: number, project: KitchenProjectListResponse): number {
    return project.id;
  }

  getStatusLabel(status: ProjectStatus): string {
    return getLabel(status);
  }

  getStatusColor(status: ProjectStatus): string {
    return getStatusColor(status);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCost(cost: number): string {
    return cost.toLocaleString('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    });
  }
}

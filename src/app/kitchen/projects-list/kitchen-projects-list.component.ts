import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
  KitchenProjectListResponse,
  ProjectStatus,
  getStatusColor,
  getStatusLabel as getLabel
} from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from '../service/kitchen-project-transition-guard.service';
import { KitchenService } from '../service/kitchen.service';
import { KitchenStateService } from '../service/kitchen-state.service';

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

const CANCELLED_FLOW_STEP = {
  color: '#991b1b',
  activeBackground: '#fee2e233',
  idleBackground: '#fee2e214',
  idleBorder: '#fca5a5'
} as const;

@Component({
  selector: 'app-kitchen-projects-list',
  templateUrl: './kitchen-projects-list.component.html',
  styleUrls: ['./kitchen-projects-list.component.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class KitchenProjectsListComponent implements OnInit {
  private readonly kitchenService = inject(KitchenService);
  private readonly projectTransitionGuard = inject(KitchenProjectTransitionGuardService);
  private readonly stateService = inject(KitchenStateService);
  private readonly router = inject(Router);

  readonly currentProjectId = this.stateService.currentProjectId;
  readonly projectTransitionInProgress = this.projectTransitionGuard.isTransitioning;
  readonly cancelledFlowStepStyles = CANCELLED_FLOW_STEP;

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
    { status: 'OFFER_SENT', num: 2, label: 'Oferta wysłana', color: '#2563eb' },
    { status: 'ACCEPTED', num: 3, label: 'Zaakceptowany', color: '#16a34a' },
    { status: 'IN_PRODUCTION', num: 4, label: 'W produkcji', color: '#ea580c' },
    { status: 'IN_INSTALLATION', num: 5, label: 'W montażu', color: '#7c3aed' },
    { status: 'COMPLETED', num: 6, label: 'Zakończony', color: '#065f46' }
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
        this.error = 'Nie udało się wczytać listy projektów';
        this.loading = false;
      }
    });
  }

  openProject(projectId: number): void {
    this.projectTransitionGuard.confirmUnsavedAndProceed('otworz inny projekt', {
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
            this.error = 'Nie udało się wczytać projektu';
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
        this.error = 'Nie udało się usunąć projektu';
        this.deletingProjectId = null;
      }
    });
  }

  cloneProject(projectId: number): void {
    if (this.cloningProjectId !== null) {
      return;
    }

    this.projectTransitionGuard.confirmUnsavedAndProceed('otworz sklonowany projekt', {
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
            this.error = 'Nie udało się sklonować projektu';
            this.cloningProjectId = null;
          }
        });
      }
    });
  }

  createNewProject(): void {
    this.projectTransitionGuard.confirmUnsavedAndProceed('utworz nowy projekt', {
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

  get visibleProjectsCountLabel(): string {
    return this.projectCountLabel(this.filteredAndSortedProjects.length);
  }

  get allProjectsCountLabel(): string {
    return this.projectCountLabel(this.projects.length);
  }

  get activeStatusesCountLabel(): string {
    return this.pluralize(this.activeStatusFilters.size, 'aktywny filtr', 'aktywne filtry', 'aktywnych filtrów');
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
    return this.sortDirection === 'asc' ? ' \u2191' : ' \u2193';
  }

  countByStatus(status: ProjectStatus): number {
    return this.projects.filter(project => project.status === status).length;
  }

  trackById(_index: number, project: KitchenProjectListResponse): number {
    return project.id;
  }

  trackByFlowStepStatus(_index: number, step: { status: ProjectStatus }): ProjectStatus {
    return step.status;
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

  projectCountLabel(count: number): string {
    return this.pluralize(count, 'projekt', 'projekty', 'projektów');
  }

  wallCountLabel(count: number): string {
    return this.pluralize(count, 'ściana', 'ściany', 'ścian');
  }

  cabinetCountLabel(count: number): string {
    return this.pluralize(count, 'szafka', 'szafki', 'szafek');
  }

  isCurrentProject(projectId: number): boolean {
    return this.currentProjectId() === projectId;
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

  private pluralize(count: number, singular: string, paucal: string, plural: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (count === 1) {
      return `${count} ${singular}`;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return `${count} ${paucal}`;
    }

    return `${count} ${plural}`;
  }
}

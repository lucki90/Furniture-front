import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KitchenService } from '../service/kitchen.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import {
  KitchenProjectListResponse,
  ProjectStatus,
  getStatusLabel as getLabel,
  getStatusColor
} from '../model/kitchen-project.model';

type SortField = 'updatedAt' | 'createdAt' | 'totalCost' | 'status';

const STATUS_ORDER: ProjectStatus[] = [
  'DRAFT', 'OFFER_SENT', 'ACCEPTED', 'IN_PRODUCTION', 'IN_INSTALLATION', 'COMPLETED', 'CANCELLED'
];

@Component({
  selector: 'app-kitchen-projects-list',
  templateUrl: './kitchen-projects-list.component.html',
  styleUrls: ['./kitchen-projects-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenProjectsListComponent implements OnInit {

  private kitchenService = inject(KitchenService);
  private stateService = inject(KitchenStateService);
  private router = inject(Router);

  projects: KitchenProjectListResponse[] = [];
  filteredAndSortedProjects: KitchenProjectListResponse[] = [];
  loading = false;
  error: string | null = null;

  // Potwierdzenie usuwania
  deletingProjectId: number | null = null;

  // Filtry statusów
  activeStatusFilters: Set<ProjectStatus> = new Set();

  // Sortowanie
  sortField: SortField = 'updatedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Dane kroków diagramu flow (bez CANCELLED — osobno na dole)
  readonly flowSteps: Array<{ status: ProjectStatus; num: number; label: string; color: string }> = [
    { status: 'DRAFT',           num: 1, label: 'Szkic',          color: '#6b7280' },
    { status: 'OFFER_SENT',      num: 2, label: 'Oferta wysłana', color: '#2563eb' },
    { status: 'ACCEPTED',        num: 3, label: 'Zaakceptowany',  color: '#16a34a' },
    { status: 'IN_PRODUCTION',   num: 4, label: 'W produkcji',    color: '#ea580c' },
    { status: 'IN_INSTALLATION', num: 5, label: 'W montażu',      color: '#7c3aed' },
    { status: 'COMPLETED',       num: 6, label: 'Zakończony',      color: '#065f46' },
  ];

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;

    this.kitchenService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.updateFilteredList();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.error = 'Nie udało się wczytać listy projektów';
        this.loading = false;
      }
    });
  }

  openProject(projectId: number): void {
    this.loading = true;

    this.kitchenService.getProjectById(projectId).subscribe({
      next: (project) => {
        this.stateService.loadProject(project);
        this.router.navigate(['/kitchen'], {
          queryParams: { projectId: project.id }
        });
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.error = 'Nie udało się wczytać projektu';
        this.loading = false;
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
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.deletingProjectId = null;
        this.updateFilteredList();
      },
      error: (err) => {
        console.error('Error deleting project:', err);
        this.error = 'Nie udało się usunąć projektu';
        this.deletingProjectId = null;
      }
    });
  }

  createNewProject(): void {
    this.stateService.clearAll();
    this.router.navigate(['/kitchen']);
  }

  // ============ FILTRY ============

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

  // ============ SORTOWANIE ============

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
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  // ============ DIAGRAM FLOW ============

  /** Liczba projektów w danym statusie (z pełnej listy, nie filtrowanej) */
  countByStatus(status: ProjectStatus): number {
    return this.projects.filter(p => p.status === status).length;
  }

  // ============ INTERNAL ============

  private updateFilteredList(): void {
    let list = this.projects;

    // Filtrowanie po statusach
    if (this.activeStatusFilters.size > 0) {
      list = list.filter(p => this.activeStatusFilters.has(p.status));
    }

    // Sortowanie
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

  // ============ FORMATOWANIE ============

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

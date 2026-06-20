import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  KitchenProjectListResponse,
  ProjectStatus,
  getStatusColor,
  getStatusLabel as getLabel
} from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from '../service/kitchen-project-transition-guard.service';
import { KitchenProjectsActionsService } from '../service/kitchen-projects-actions.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class KitchenProjectsListComponent implements OnInit {
  readonly actions = inject(KitchenProjectsActionsService);
  private readonly stateService = inject(KitchenStateService);
  private readonly transitionGuard = inject(KitchenProjectTransitionGuardService);

  readonly currentProjectId = this.stateService.currentProjectId;
  readonly projectTransitionInProgress = this.transitionGuard.isTransitioning;
  readonly cancelledFlowStepStyles = CANCELLED_FLOW_STEP;

  private readonly _activeStatusFilters = signal<Set<ProjectStatus>>(new Set());
  private readonly _sortField = signal<SortField>('updatedAt');
  private readonly _sortDirection = signal<'asc' | 'desc'>('desc');

  private readonly _filteredAndSortedProjects = computed(() => {
    const projects = this.actions.projects();
    const filters = this._activeStatusFilters();
    const field = this._sortField();
    const dir = this._sortDirection() === 'asc' ? 1 : -1;
    let list = filters.size > 0 ? projects.filter(p => filters.has(p.status)) : projects;
    return [...list].sort((a, b) => {
      switch (field) {
        case 'updatedAt': return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        case 'createdAt': return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'totalCost': return dir * (a.totalCost - b.totalCost);
        case 'status':    return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        default: return 0;
      }
    });
  });

  get loading() { return this.actions.loading(); }
  get error() { return this.actions.error(); }
  get projects() { return this.actions.projects(); }
  get deleteConfirmationProjectId() { return this.actions.deleteConfirmationProjectId(); }
  get deletingProjectId() { return this.actions.deletingProjectId(); }
  get cloningProjectId() { return this.actions.cloningProjectId(); }
  get filteredAndSortedProjects() { return this._filteredAndSortedProjects(); }
  get hasActiveFilters() { return this._activeStatusFilters().size > 0; }
  get sortField() { return this._sortField(); }

  readonly flowSteps: Array<{ status: ProjectStatus; num: number; label: string; color: string }> = [
    { status: 'DRAFT', num: 1, label: 'Szkic', color: '#6b7280' },
    { status: 'OFFER_SENT', num: 2, label: 'Oferta wysłana', color: '#2563eb' },
    { status: 'ACCEPTED', num: 3, label: 'Zaakceptowany', color: '#16a34a' },
    { status: 'IN_PRODUCTION', num: 4, label: 'W produkcji', color: '#ea580c' },
    { status: 'IN_INSTALLATION', num: 5, label: 'W montażu', color: '#7c3aed' },
    { status: 'COMPLETED', num: 6, label: 'Zakończony', color: '#065f46' }
  ];

  ngOnInit(): void {
    this.actions.loadProjects();
  }

  loadProjects(): void { this.actions.loadProjects(); }
  openProject(id: number): void { this.actions.openProject(id); }
  confirmDelete(id: number): void { this.actions.confirmDelete(id); }
  cancelDelete(): void { this.actions.cancelDelete(); }
  deleteProject(id: number): void { this.actions.deleteProject(id); }
  cloneProject(id: number): void { this.actions.cloneProject(id); }
  createNewProject(): void { this.actions.createNewProject(); }

  toggleStatusFilter(status: ProjectStatus): void {
    this._activeStatusFilters.update(current => {
      const next = new Set(current);
      if (next.has(status)) { next.delete(status); } else { next.add(status); }
      return next;
    });
  }

  isFilterActive(status: ProjectStatus): boolean {
    return this._activeStatusFilters().has(status);
  }

  clearFilters(): void {
    this._activeStatusFilters.set(new Set());
  }

  setSortField(field: SortField): void {
    if (this._sortField() === field) {
      this._sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this._sortField.set(field);
      this._sortDirection.set('desc');
    }
  }

  getSortIcon(field: SortField): string {
    if (this._sortField() !== field) { return ''; }
    return this._sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  get visibleProjectsCountLabel(): string { return this.projectCountLabel(this._filteredAndSortedProjects().length); }
  get allProjectsCountLabel(): string { return this.projectCountLabel(this.actions.projects().length); }
  get activeStatusesCountLabel(): string {
    return this.pluralize(this._activeStatusFilters().size, 'aktywny filtr', 'aktywne filtry', 'aktywnych filtrów');
  }

  countByStatus(status: ProjectStatus): number {
    return this.actions.projects().filter(p => p.status === status).length;
  }

  trackById(_index: number, project: KitchenProjectListResponse): number { return project.id; }
  trackByFlowStepStatus(_index: number, step: { status: ProjectStatus }): ProjectStatus { return step.status; }
  getStatusLabel(status: ProjectStatus): string { return getLabel(status); }
  getStatusColor(status: ProjectStatus): string { return getStatusColor(status); }
  isCurrentProject(projectId: number): boolean { return this.currentProjectId() === projectId; }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatCost(cost: number): string {
    return cost.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
  }

  projectCountLabel(count: number): string { return this.pluralize(count, 'projekt', 'projekty', 'projektów'); }
  wallCountLabel(count: number): string { return this.pluralize(count, 'ściana', 'ściany', 'ścian'); }
  cabinetCountLabel(count: number): string { return this.pluralize(count, 'szafka', 'szafki', 'szafek'); }

  private pluralize(count: number, singular: string, paucal: string, plural: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (count === 1) { return `${count} ${singular}`; }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) { return `${count} ${paucal}`; }
    return `${count} ${plural}`;
  }
}

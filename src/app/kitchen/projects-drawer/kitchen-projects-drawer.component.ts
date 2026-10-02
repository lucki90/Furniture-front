import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import {
  KitchenProjectDetailResponse,
  KitchenProjectListResponse,
  PROJECT_STATUSES,
  ProjectStatus,
  getStatusColor,
  getStatusLabel
} from '../model/kitchen-project.model';
import { KitchenService } from '../service/kitchen.service';
import { BodyScrollLockService } from '../../shared/dom/body-scroll-lock.service';

interface StatusFilterVm {
  value: ProjectStatus | null;
  label: string;
}

@Component({
  selector: 'app-kitchen-projects-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kitchen-projects-drawer.component.html',
  styleUrls: ['./kitchen-projects-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenProjectsDrawerComponent implements OnChanges, OnDestroy {
  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  private readonly kitchenService = inject(KitchenService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly bodyScrollLock = inject(BodyScrollLockService);

  @Input() open = false;
  @Input() currentProjectId: number | null = null;
  @Input() openingProjectId: number | null = null;
  @Input() isTransitioning = false;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() openProjectRequested = new EventEmitter<number>();
  @Output() createProjectRequested = new EventEmitter<void>();

  readonly statusFilters: StatusFilterVm[] = [
    { value: null, label: 'Wszystkie' },
    ...PROJECT_STATUSES.map(status => ({ value: status.value, label: getStatusLabel(status.value) }))
  ];

  readonly projects = signal<KitchenProjectListResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly activeStatus = signal<ProjectStatus | null>(null);
  readonly cloningProjectId = signal<number | null>(null);
  readonly deletingProjectId = signal<number | null>(null);

  readonly visibleProjects = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const status = this.activeStatus();
    return this.projects().filter(project => {
      const matchesStatus = status === null || project.status === status;
      const matchesSearch = query.length === 0 || project.name.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  });

  readonly projectsCountLabel = computed(
    () => `${this.visibleProjects().length} z ${this.projects().length} projektow`
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.loadProjects();
      this.lockBodyScroll();
      queueMicrotask(() => this.searchInput?.nativeElement?.focus());
    } else if (changes['open']?.currentValue === false) {
      this.unlockBodyScroll();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closeRequested.emit();
    }
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);

    this.kitchenService.getProjects().subscribe({
      next: projects => {
        this.projects.set(this.sortByUpdatedAtDesc(projects));
        this.loading.set(false);
      },
      error: err => {
        console.error('Error loading projects drawer list:', err);
        this.error.set('Nie udalo sie wczytac listy projektow');
        this.loading.set(false);
      }
    });
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.error.set(null);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.activeStatus.set(null);
    this.error.set(null);
  }

  selectStatus(status: ProjectStatus | null): void {
    this.activeStatus.update(active => active === status ? null : status);
    this.error.set(null);
  }

  isStatusActive(status: ProjectStatus | null): boolean {
    return this.activeStatus() === status;
  }

  requestCreateProject(): void {
    if (this.isBusy()) {
      return;
    }
    this.createProjectRequested.emit();
  }

  requestOpenProject(projectId: number): void {
    if (projectId === this.currentProjectId || this.isBusy()) {
      return;
    }
    this.openProjectRequested.emit(projectId);
  }

  cloneProject(projectId: number): void {
    if (this.cloningProjectId() !== null || this.isBusy()) {
      return;
    }

    this.cloningProjectId.set(projectId);
    this.kitchenService.cloneProject(projectId).subscribe({
      next: cloned => {
        this.cloningProjectId.set(null);
        this.error.set(null);
        const clonedListItem = this.mapProjectDetailToListItem(cloned);
        this.projects.update(projects => this.sortByUpdatedAtDesc([
          clonedListItem,
          ...projects.filter(project => project.id !== clonedListItem.id)
        ]));
        this.toast.success('Projekt zostal sklonowany');
      },
      error: err => {
        console.error('Error cloning project from drawer:', err);
        this.error.set('Nie udalo sie sklonowac projektu');
        this.cloningProjectId.set(null);
      }
    });
  }

  confirmDelete(project: KitchenProjectListResponse): void {
    if (project.id === this.currentProjectId || this.deletingProjectId() !== null || this.isBusy()) {
      return;
    }

    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunac projekt "${project.name}"?`,
      confirmText: 'Usun'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.deletingProjectId.set(project.id);
      this.kitchenService.deleteProject(project.id).subscribe({
        next: () => {
          this.projects.update(projects => projects.filter(item => item.id !== project.id));
          this.deletingProjectId.set(null);
          this.error.set(null);
          this.toast.success('Projekt zostal usuniety');
        },
        error: err => {
          console.error('Error deleting project from drawer:', err);
          this.error.set('Nie udalo sie usunac projektu');
          this.deletingProjectId.set(null);
        }
      });
    });
  }

  trackByProjectId(_index: number, project: KitchenProjectListResponse): number {
    return project.id;
  }

  isCurrentProject(projectId: number): boolean {
    return projectId === this.currentProjectId;
  }

  getStatusLabel(status: ProjectStatus): string {
    return getStatusLabel(status);
  }

  getStatusColor(status: ProjectStatus): string {
    return getStatusColor(status);
  }

  formatCost(cost: number): string {
    return cost.toLocaleString('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0
    });
  }

  formatUpdatedAt(dateString: string): string {
    const updated = new Date(dateString);
    const now = Date.now();
    const diffMs = Math.max(0, now - updated.getTime());
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.round(diffMs / minute));
      return `${minutes} min temu`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.round(diffMs / hour));
      return `${hours} godz. temu`;
    }

    return updated.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  wallCountLabel(count: number): string {
    return this.pluralize(count, 'sciana', 'sciany', 'scian');
  }

  cabinetCountLabel(count: number): string {
    return this.pluralize(count, 'szafka', 'szafki', 'szafek');
  }

  private sortByUpdatedAtDesc(projects: readonly KitchenProjectListResponse[]): KitchenProjectListResponse[] {
    return [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  private mapProjectDetailToListItem(project: KitchenProjectDetailResponse): KitchenProjectListResponse {
    const walls = project.walls ?? [];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      totalCost: project.totalCost,
      wallCount: walls.length,
      cabinetCount: walls.reduce((sum, wall) => sum + (wall.cabinetCount ?? 0), 0),
      version: project.version,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  private lockBodyScroll(): void {
    this.bodyScrollLock.lock();
  }

  private unlockBodyScroll(): void {
    this.bodyScrollLock.unlock();
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

  private isBusy(): boolean {
    return this.isTransitioning || this.openingProjectId !== null;
  }
}

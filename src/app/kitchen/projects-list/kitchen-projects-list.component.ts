import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KitchenService } from '../service/kitchen.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenProjectListResponse, KitchenProjectDetailResponse, PROJECT_STATUSES, ProjectStatus } from '../model/kitchen-project.model';

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
  loading = false;
  error: string | null = null;

  // Dla potwierdzenia usuwania
  deletingProjectId: number | null = null;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;

    this.kitchenService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
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

  getStatusLabel(status: ProjectStatus): string {
    return PROJECT_STATUSES.find(s => s.value === status)?.label ?? status;
  }

  getStatusClass(status: ProjectStatus): string {
    switch (status) {
      case 'DRAFT': return 'status-draft';
      case 'CALCULATED': return 'status-calculated';
      case 'CONFIRMED': return 'status-confirmed';
      case 'IN_PRODUCTION': return 'status-production';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
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

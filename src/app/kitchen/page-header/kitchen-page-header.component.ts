import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectStatus } from '../model/kitchen-project.model';

export interface KitchenPageStatusOption {
  value: ProjectStatus;
  label: string;
}

@Component({
  selector: 'app-kitchen-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kitchen-page-header.component.html',
  styleUrls: ['./kitchen-page-header.component.css']
})
export class KitchenPageHeaderComponent {
  @Input() projectDisplayName = 'Nowy projekt kuchni';
  @Input() projectId: number | null = null;
  @Input() projectVersion: number | null = null;
  @Input() projectSubtitle = 'Projektuj i wyceniaj zabudowe kuchenna';
  @Input() projectStatusLabel = '';
  @Input() projectStatusColor = '#64748b';
  @Input() allowedTransitions: KitchenPageStatusOption[] = [];
  @Input() isChangingStatus = false;
  @Input() isSavingProject = false;
  @Input() isCalculatingProject = false;
  @Input() totalCabinetCount = 0;
  @Input() hasProjectId = false;

  @Output() saveProject = new EventEmitter<void>();
  @Output() calculateProject = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<ProjectStatus>();

  onStatusSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (value) {
      this.statusChange.emit(value as ProjectStatus);
      select.value = '';
    }
  }
}

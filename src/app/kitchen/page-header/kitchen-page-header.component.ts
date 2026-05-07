import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectStatus } from '../model/kitchen-project.model';

export interface KitchenPageStatusOption {
  value: ProjectStatus;
  label: string;
}

export type KitchenPageView = 'config' | 'costs';

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
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() view: KitchenPageView = 'config';
  @Input() hasCalculationResult = false;
  @Input() isEditingCabinet = false;

  @Output() saveProject = new EventEmitter<void>();
  @Output() calculateProject = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<ProjectStatus>();
  @Output() undoAction = new EventEmitter<void>();
  @Output() redoAction = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<KitchenPageView>();

  setView(view: KitchenPageView): void {
    if (this.isEditingCabinet) return;
    if (this.view === view) return;
    this.viewChange.emit(view);
  }

  onStatusSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (value) {
      this.statusChange.emit(value as ProjectStatus);
      select.value = '';
    }
  }
}

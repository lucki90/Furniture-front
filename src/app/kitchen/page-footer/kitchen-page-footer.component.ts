import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';

@Component({
  selector: 'app-kitchen-page-footer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './kitchen-page-footer.component.html',
  styleUrls: ['./kitchen-page-footer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenPageFooterComponent {
  @Input() totalCabinetCount = 0;
  @Input() projectResult: MultiWallCalculateResponse | null = null;
  @Input() adjustedTotalCost = 0;
  @Input() wallsCount = 0;
  @Input() isSavingProject = false;
  @Input() isCalculatingProject = false;
  @Input() editingCabinetId: string | null = null;
  @Input() currentProjectId: number | null = null;
  @Input() isExporting = false;

  @Output() saveProject = new EventEmitter<void>();
  @Output() calculateProject = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() downloadExcel = new EventEmitter<void>();

  // TODO(CODEX): Footer nadal jest wizualnie czescia kitchen-page workflow,
  // ale ma juz wlasny kontrakt. Jesli pozniej pojawi sie realny eksport PDF
  // i instrukcja, warto nie dopinac ich tutaj "na szybko", tylko wydzielic
  // osobny export-actions component albo zasilic footer pelnym modelem akcji.
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';

/**
 * Lekka, stale widoczna stopka edytora: podsumowanie projektu, eksport listy
 * plyt do Excela oraz podstawowe akcje workflow. Eksport oferty PDF pozostaje
 * w zakladce wyceny, gdzie dostepne sa jego opcje i kontekst cenowy.
 */
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
  @Input() isExcelExporting = false;

  @Output() saveProject = new EventEmitter<void>();
  @Output() calculateProject = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() downloadExcel = new EventEmitter<void>();
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetListComponent } from '../cabinet-list/kitchen-cabinet-list.component';
import { WallType } from '../model/kitchen-project.model';

@Component({
  selector: 'app-kitchen-cabinets-section',
  standalone: true,
  imports: [CommonModule, KitchenCabinetListComponent],
  templateUrl: './kitchen-cabinets-section.component.html',
  styleUrls: ['./kitchen-cabinets-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenCabinetsSectionComponent {
  @Input() result: CabinetResponse | null = null;
  @Input() hasEditingCabinet = false;
  @Input() cabinets: KitchenCabinet[] = [];
  @Input() selectedWallType: WallType = 'MAIN';
  @Input() selectedWallLabel = '';
  @Input() selectedWallTotalCost = 0;
  @Input() totalCabinetCount = 0;
  @Input() totalCost = 0;
  @Input() fitsOnWall = true;
  @Input() editingCabinetId: string | null = null;
  @Input() usedWidthMm = 0;
  @Input() wallWidthMm = 0;

  @Output() clearSelectedWallCabinets = new EventEmitter<void>();
  @Output() editCabinet = new EventEmitter<string>();
  @Output() removeCabinet = new EventEmitter<string>();
  @Output() cloneCabinet = new EventEmitter<string>();

  /** Procent zajętej szerokości ściany (0-100). */
  get fitPercent(): number {
    if (this.wallWidthMm <= 0) return 0;
    return Math.min(100, Math.round((this.usedWidthMm / this.wallWidthMm) * 100));
  }
}


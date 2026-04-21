import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetListComponent } from '../cabinet-list/kitchen-cabinet-list.component';

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
  @Input() selectedWallLabel = '';
  @Input() selectedWallTotalCost = 0;
  @Input() totalCabinetCount = 0;
  @Input() totalCost = 0;
  @Input() fitsOnWall = true;
  @Input() editingCabinetId: string | null = null;

  @Output() clearSelectedWallCabinets = new EventEmitter<void>();
  @Output() editCabinet = new EventEmitter<string>();
  @Output() removeCabinet = new EventEmitter<string>();
  @Output() cloneCabinet = new EventEmitter<string>();
}


import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KitchenFloorPlanComponent } from '../floor-plan/kitchen-floor-plan.component';
import { KitchenLayoutComponent } from '../kitchen-layout/kitchen-layout.component';
import { CabinetFormComponent } from '../cabinet-form/cabinet-form.component';
import { WallConfigComponent } from '../wall-config/wall-config.component';
import { CabinetCalculatedEvent, KitchenCabinet } from '../model/kitchen-state.model';

@Component({
  selector: 'app-kitchen-workspace-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KitchenFloorPlanComponent,
    KitchenLayoutComponent,
    CabinetFormComponent,
    WallConfigComponent
  ],
  templateUrl: './kitchen-workspace-section.component.html',
  styleUrls: ['./kitchen-workspace-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenWorkspaceSectionComponent {
  @Input() editingCabinetId: string | null = null;
  @Input() editingCabinet: KitchenCabinet | null = null;
  @Input() hasSelectedWall = false;
  @Input() selectedWallLabel = '';
  @Input() wallLength = 3600;
  @Input() wallHeight = 2600;

  @Output() addWallRequested = new EventEmitter<void>();
  @Output() wallRemoved = new EventEmitter<string>();
  @Output() wallLengthChange = new EventEmitter<number>();
  @Output() wallHeightChange = new EventEmitter<number>();
  @Output() wallConfigChanged = new EventEmitter<void>();
  @Output() cabinetCalculated = new EventEmitter<CabinetCalculatedEvent>();
  @Output() cancelEdit = new EventEmitter<void>();

  onWallLengthInput(value: string): void {
    const parsedValue = Number(value);
    if (!Number.isNaN(parsedValue)) {
      this.wallLengthChange.emit(parsedValue);
    }
  }

  onWallHeightInput(value: string): void {
    const parsedValue = Number(value);
    if (!Number.isNaN(parsedValue)) {
      this.wallHeightChange.emit(parsedValue);
    }
  }
}

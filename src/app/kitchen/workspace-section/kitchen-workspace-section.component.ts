import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KitchenFloorPlanComponent } from '../floor-plan/kitchen-floor-plan.component';
import { KitchenLayoutComponent } from '../kitchen-layout/kitchen-layout.component';
import { CabinetFormComponent } from '../cabinet-form/cabinet-form.component';
import { WallConfigComponent } from '../wall-config/wall-config.component';
import { CabinetCalculatedEvent, KitchenCabinet } from '../model/kitchen-state.model';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';

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
  @Input() roomWidthMm: number | null = null;
  @Input() roomDepthMm: number | null = null;
  @Input() projectResult: MultiWallCalculateResponse | null = null;

  @Output() addWallRequested = new EventEmitter<void>();
  @Output() wallRemoved = new EventEmitter<string>();
  @Output() wallLengthChange = new EventEmitter<number>();
  @Output() wallHeightChange = new EventEmitter<number>();
  @Output() roomWidthChange = new EventEmitter<number | null>();
  @Output() roomDepthChange = new EventEmitter<number | null>();
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

  onRoomWidthInput(value: string | number | null): void {
    this.roomWidthChange.emit(this.parseOptionalDimension(value));
  }

  onRoomDepthInput(value: string | number | null): void {
    this.roomDepthChange.emit(this.parseOptionalDimension(value));
  }

  private parseOptionalDimension(value: string | number | null): number | null {
    if (value === '' || value === null) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }
}

import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WallType } from '../model/kitchen-project.model';
import { CabinetOnFloorPlan } from './floor-plan-door-arcs';
import { CountertopOnFloorPlan, WallPosition } from './floor-plan-layout.builder';

@Component({
  selector: 'g[appFloorPlanWallGroup]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floor-plan-wall-group.component.html',
  styleUrls: ['./kitchen-floor-plan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorPlanWallGroupComponent {
  @Input({ required: true }) wallPosition!: WallPosition;
  @Input() cabinets: CabinetOnFloorPlan[] = [];
  @Input() countertops: CountertopOnFloorPlan[] = [];
  @Input() selected = false;
  @Input() canRemoveWall = false;
  @Input() editingCabinetId: string | null = null;
  @Input() showCountertop = true;
  @Input() showUpperCabinets = true;

  wallSelected = output<string>();
  wallRemoved = output<string>();

  protected trackByCabinetId = (_: number, cab: CabinetOnFloorPlan) => cab.cabinetId;
  protected trackByCountertopX = (_: number, countertop: CountertopOnFloorPlan) => countertop.x;

  protected onWallClick(): void {
    this.wallSelected.emit(this.wallPosition.wall.id);
  }

  protected onRemoveWall(event: Event): void {
    event.stopPropagation();
    this.wallRemoved.emit(this.wallPosition.wall.id);
  }

  protected isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }

  protected getWallShortLabel(type: WallType): string {
    switch (type) {
      case 'MAIN': return 'G';
      case 'LEFT': return 'L';
      case 'RIGHT': return 'P';
      case 'CORNER_LEFT': return 'NL';
      case 'CORNER_RIGHT': return 'NP';
      case 'ISLAND': return 'W';
      default: return type;
    }
  }

  protected getWallColor(type: WallType, isSelected: boolean): string {
    if (isSelected) {
      return '#1976d2';
    }
    if (type === 'ISLAND') {
      return '#8d6e63';
    }
    return '#9e9e9e';
  }

  protected getWallTooltip(): string {
    const wall = this.wallPosition.wall;
    return `${wall.type}: ${wall.widthMm}mm, ${wall.cabinets.length} szafek`;
  }

  protected getCabinetFill(cab: CabinetOnFloorPlan): string {
    if (this.isEditing(cab.cabinetId)) {
      return '#fbbf24';
    }
    if (cab.isFreestanding) {
      return '#e0e0e0';
    }
    if (cab.isCorner) {
      return '#ffb74d';
    }
    switch (cab.zone) {
      case 'TOP': return '#90caf9';
      case 'FULL': return '#ce93d8';
      case 'BOTTOM':
      default: return '#a5d6a7';
    }
  }

  protected getCabinetStroke(cab: CabinetOnFloorPlan): string {
    if (this.isEditing(cab.cabinetId)) {
      return '#f59e0b';
    }
    if (cab.isFreestanding) {
      return '#9e9e9e';
    }
    if (cab.isCorner) {
      return '#ef6c00';
    }
    switch (cab.zone) {
      case 'TOP': return '#1565c0';
      case 'FULL': return '#7b1fa2';
      case 'BOTTOM':
      default: return '#388e3c';
    }
  }
}

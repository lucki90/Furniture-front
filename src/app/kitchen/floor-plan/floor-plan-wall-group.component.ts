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
    if (type === 'ISLAND') {
      return isSelected ? 'rgba(25, 118, 210, 0.22)' : 'rgba(141, 110, 99, 0.22)';
    }
    return isSelected ? '#1976d2' : '#9e9e9e';
  }

  protected getWallTooltip(): string {
    const wall = this.wallPosition.wall;
    return `${wall.type}: ${wall.widthMm}mm, ${wall.cabinets.length} szafek`;
  }

  protected getWallMetaText(): string {
    const wall = this.wallPosition.wall;
    return `${wall.widthMm}x${wall.heightMm}mm · ${this.formatCabinetCount(wall.cabinets.length)}`;
  }

  protected getWallLabelTransform(): string | null {
    if (!this.isVerticalWall()) {
      return null;
    }
    return `rotate(-90 ${this.wallPosition.labelX} ${this.wallPosition.labelY})`;
  }

  protected getWallMetaTransform(): string | null {
    if (!this.isVerticalWall()) {
      return null;
    }
    return `rotate(-90 ${this.getWallMetaX()} ${this.getWallMetaY()})`;
  }

  protected getWallMetaX(): number {
    const wallType = this.wallPosition.wall.type;
    if (wallType === 'LEFT') {
      return this.wallPosition.labelX - 12;
    }
    if (wallType === 'RIGHT') {
      return this.wallPosition.labelX + 12;
    }
    return this.wallPosition.labelX;
  }

  protected getWallMetaY(): number {
    return this.wallPosition.isHorizontal
      ? this.wallPosition.labelY + 9
      : this.wallPosition.labelY;
  }

  protected getWallMetaAnchor(): 'middle' {
    return 'middle';
  }

  private formatCabinetCount(count: number): string {
    if (count === 1) {
      return '1 szafka';
    }
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
      return `${count} szafki`;
    }
    return `${count} szafek`;
  }

  private isVerticalWall(): boolean {
    const wallType = this.wallPosition.wall.type;
    return wallType === 'LEFT' || wallType === 'RIGHT';
  }

  protected getCabinetFill(cab: CabinetOnFloorPlan): string {
    if (cab.hasDepthCollision) {
      return '#ffcdd2';
    }
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
    if (cab.hasDepthCollision) {
      return '#c62828';
    }
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

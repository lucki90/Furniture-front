import { Component, computed, inject, Input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenStateService } from '../service/kitchen-state.service';
import { buildFloorPlanArcs, FloorPlanArc } from './floor-plan-door-arcs';
import {
  buildCabinetsForWall,
  buildCountertopsForWall,
  buildWallPositions,
  CountertopOnFloorPlan,
  WallPosition
} from './floor-plan-layout.builder';
import { FloorPlanWallGroupComponent } from './floor-plan-wall-group.component';
import { FloorPlanOverlayLayerComponent } from './floor-plan-overlay-layer.component';

interface CornerCountertopViz {
  x: number;
  y: number;
  sizePx: number;
  miterX1: number;
  miterY1: number;
  miterX2: number;
  miterY2: number;
  label: string;
}

@Component({
  selector: 'app-kitchen-floor-plan',
  standalone: true,
  imports: [CommonModule, FloorPlanWallGroupComponent, FloorPlanOverlayLayerComponent],
  templateUrl: './kitchen-floor-plan.component.html',
  styleUrls: ['./kitchen-floor-plan.component.css']
})
export class KitchenFloorPlanComponent {
  private stateService = inject(KitchenStateService);

  @Input() editingCabinetId: string | null = null;

  readonly walls = this.stateService.walls;
  readonly selectedWallId = this.stateService.selectedWallId;
  readonly showCountertop = this.stateService.showCountertop;
  readonly showUpperCabinets = this.stateService.showUpperCabinets;
  readonly showDoorArcs = signal(false);

  addWallRequested = output<void>();
  wallRemoved = output<string>();

  private readonly SVG_WIDTH = 320;
  private readonly SVG_HEIGHT = 240;
  private readonly WALL_THICKNESS = 10;
  private readonly PADDING = 30;
  private readonly COUNTERTOP_OVERHANG = 30;
  private readonly COUNTERTOP_STANDARD_DEPTH = 600;

  readonly wallPositions = computed((): WallPosition[] => {
    return buildWallPositions(this.walls(), {
      svgWidth: this.SVG_WIDTH,
      svgHeight: this.SVG_HEIGHT,
      wallThickness: this.WALL_THICKNESS,
      padding: this.PADDING
    });
  });

  readonly cornerCountertopPositions = computed((): CornerCountertopViz[] => {
    if (!this.showCountertop()) return [];

    const positions = this.wallPositions();
    const result: CornerCountertopViz[] = [];

    const main = positions.find(p => p.wall.type === 'MAIN');
    const cornerLeft = positions.find(p => p.wall.type === 'CORNER_LEFT');
    const cornerRight = positions.find(p => p.wall.type === 'CORNER_RIGHT');
    const leftWall = positions.find(p => p.wall.type === 'LEFT');
    const rightWall = positions.find(p => p.wall.type === 'RIGHT');

    const horizontalWalls = [main, cornerLeft, cornerRight].filter(Boolean) as WallPosition[];

    for (const horizontal of horizontalWalls) {
      if (leftWall) {
        const corner = this.buildCornerViz(horizontal, leftWall, 'left');
        if (corner) result.push(corner);
      }
      if (rightWall) {
        const corner = this.buildCornerViz(horizontal, rightWall, 'right');
        if (corner) result.push(corner);
      }
    }

    return result;
  });

  readonly doorArcData = computed((): FloorPlanArc[] => {
    if (!this.showDoorArcs()) return [];

    const cabinets = this.wallPositions().flatMap(position => this.getCabinetsForWall(position));
    return buildFloorPlanArcs(cabinets);
  });

  onWallClick(wallId: string): void {
    this.stateService.selectWall(wallId);
  }

  onAddWall(): void {
    this.addWallRequested.emit();
  }

  onRemoveWall(wallId: string): void {
    this.wallRemoved.emit(wallId);
  }

  isSelected(wallId: string): boolean {
    return this.selectedWallId() === wallId;
  }

  canRemoveWall(): boolean {
    return this.walls().length > 1;
  }

  getWallLabel(type: string): string {
    return this.stateService.getWallLabel(type as never);
  }

  getCabinetsForWall(pos: WallPosition) {
    return buildCabinetsForWall(pos, this.WALL_THICKNESS, {
      plinthHeightMm: this.stateService.plinthHeightMm(),
      upperFillerHeightMm: this.stateService.upperFillerHeightMm()
    });
  }

  getCountertopsForWall(pos: WallPosition): CountertopOnFloorPlan[] {
    return buildCountertopsForWall(pos, {
      wallThickness: this.WALL_THICKNESS,
      countertopOverhang: this.COUNTERTOP_OVERHANG,
      countertopStandardDepth: this.COUNTERTOP_STANDARD_DEPTH
    });
  }

  private buildCornerViz(
    horizontal: WallPosition,
    vertical: WallPosition,
    side: 'left' | 'right'
  ): CornerCountertopViz | null {
    const scale = horizontal.scale;
    const depthPx = this.COUNTERTOP_STANDARD_DEPTH * scale;
    const mainTop = horizontal.y;

    if (side === 'left') {
      const cornerX = horizontal.x;
      const cornerY = mainTop - depthPx;
      const vertRightEdge = vertical.x + vertical.width;
      if (Math.abs(vertRightEdge - cornerX) > 2) return null;

      return {
        x: cornerX,
        y: cornerY,
        sizePx: depthPx,
        miterX1: cornerX,
        miterY1: mainTop,
        miterX2: cornerX + depthPx,
        miterY2: cornerY,
        label: `${this.COUNTERTOP_STANDARD_DEPTH}×${this.COUNTERTOP_STANDARD_DEPTH}mm`
      };
    }

    const cornerX = horizontal.x + horizontal.width;
    const cornerY = mainTop - depthPx;
    const vertLeftEdge = vertical.x;
    if (Math.abs(vertLeftEdge - cornerX) > 2) return null;

    return {
      x: cornerX - depthPx,
      y: cornerY,
      sizePx: depthPx,
      miterX1: cornerX,
      miterY1: mainTop,
      miterX2: cornerX - depthPx,
      miterY2: cornerY,
      label: `${this.COUNTERTOP_STANDARD_DEPTH}×${this.COUNTERTOP_STANDARD_DEPTH}mm`
    };
  }
}

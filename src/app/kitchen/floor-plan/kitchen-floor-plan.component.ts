import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, Input, output, signal } from '@angular/core';
import {
  CornerCountertopResponse,
  MultiWallCalculateResponse
} from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { buildFloorPlanArcs, FloorPlanArc } from './floor-plan-door-arcs';
import {
  buildCabinetsForWall,
  buildCountertopsForWall,
  buildWallPositions,
  CountertopOnFloorPlan,
  WallPosition
} from './floor-plan-layout.builder';
import { FloorPlanOverlayLayerComponent } from './floor-plan-overlay-layer.component';
import { FloorPlanWallGroupComponent } from './floor-plan-wall-group.component';

interface CornerCountertopViz {
  x: number;
  y: number;
  widthPx: number;
  depthPx: number;
  miterX1: number;
  miterY1: number;
  miterX2: number;
  miterY2: number;
  label: string;
}

interface RoomGuideViz {
  x: number;
  y: number;
  width: number;
  height: number;
  widthMm: number;
  depthMm: number;
}

@Component({
  selector: 'app-kitchen-floor-plan',
  standalone: true,
  imports: [CommonModule, FloorPlanWallGroupComponent, FloorPlanOverlayLayerComponent],
  templateUrl: './kitchen-floor-plan.component.html',
  styleUrls: ['./kitchen-floor-plan.component.css']
})
export class KitchenFloorPlanComponent {
  private readonly stateService = inject(KitchenStateService);
  private readonly projectResultSignal = signal<MultiWallCalculateResponse | null>(null);
  // TODO(CODEX): Island offset is currently a visual-only experiment for the top view.
  // If the UX proves valuable, decide whether it should persist in project state or stay as
  // a local editor aid with explicit reset semantics.
  private readonly islandVisualOffsetXmm = signal(0);
  private readonly islandVisualOffsetYmm = signal(0);

  @Input() editingCabinetId: string | null = null;

  @Input() set projectResult(value: MultiWallCalculateResponse | null) {
    this.projectResultSignal.set(value);
  }

  readonly walls = this.stateService.walls;
  readonly selectedWallId = this.stateService.selectedWallId;
  readonly showCountertop = this.stateService.showCountertop;
  readonly showUpperCabinets = this.stateService.showUpperCabinets;
  readonly roomWidthMm = this.stateService.currentProjectRoomWidthMm;
  readonly roomDepthMm = this.stateService.currentProjectRoomDepthMm;
  readonly showDoorArcs = signal(false);
  readonly hasIslandWall = computed(() => this.walls().some(wall => wall.type === 'ISLAND'));

  addWallRequested = output<void>();
  wallRemoved = output<string>();

  private readonly SVG_WIDTH = 320;
  private readonly SVG_HEIGHT = 252;
  private readonly WALL_THICKNESS = 10;
  private readonly PADDING = 10;
  private readonly COUNTERTOP_OVERHANG = 30;
  private readonly COUNTERTOP_STANDARD_DEPTH = 600;

  protected readonly svgWidth = this.SVG_WIDTH;
  protected readonly svgHeight = this.SVG_HEIGHT;
  protected readonly sceneInset = 6;

  constructor() {
    effect(() => {
      if (!this.hasIslandWall()) {
        this.resetIslandVisualOffset();
      }
    });
  }

  readonly wallPositions = computed((): WallPosition[] =>
    buildWallPositions(this.walls(), {
      svgWidth: this.SVG_WIDTH,
      svgHeight: this.SVG_HEIGHT,
      wallThickness: this.WALL_THICKNESS,
      padding: this.PADDING,
      roomWidthMm: this.roomWidthMm(),
      roomDepthMm: this.roomDepthMm(),
      islandOffsetXmm: this.islandVisualOffsetXmm(),
      islandOffsetYmm: this.islandVisualOffsetYmm()
    })
  );

  readonly roomGuide = computed((): RoomGuideViz | null => {
    const roomWidthMm = normalizePositiveDimension(this.roomWidthMm());
    const roomDepthMm = normalizePositiveDimension(this.roomDepthMm());
    if (!roomWidthMm || !roomDepthMm) {
      return null;
    }

    const mainWall = this.wallPositions().find(position => position.wall.type === 'MAIN');
    if (!mainWall) {
      return null;
    }

    const width = roomWidthMm * mainWall.scale;
    const height = roomDepthMm * mainWall.scale;
    return {
      x: this.svgWidth / 2 - width / 2,
      y: mainWall.y + mainWall.height - height,
      width,
      height,
      widthMm: roomWidthMm,
      depthMm: roomDepthMm
    };
  });

  readonly cornerCountertopPositions = computed((): CornerCountertopViz[] => {
    const projectResult = this.projectResultSignal();
    if (!this.showCountertop() || !projectResult?.cornerCountertops?.length) {
      return [];
    }

    const positions = this.wallPositions();
    const walls = this.walls();

    return projectResult.cornerCountertops
      .map(cornerCountertop => this.buildCornerViz(cornerCountertop, positions, walls))
      .filter((corner): corner is CornerCountertopViz => corner !== null);
  });

  readonly doorArcData = computed((): FloorPlanArc[] => {
    if (!this.showDoorArcs()) {
      return [];
    }

    const cabinets = this.wallPositions().flatMap(position => this.getCabinetsForWall(position));
    return buildFloorPlanArcs(cabinets);
  });

  onWallClick(wallId: string): void {
    this.stateService.selectWall(wallId);
  }

  onAddWall(): void {
    this.addWallRequested.emit();
  }

  nudgeIsland(dxMm: number, dyMm: number): void {
    if (!this.hasIslandWall()) {
      return;
    }

    this.islandVisualOffsetXmm.update(value => value + dxMm);
    this.islandVisualOffsetYmm.update(value => value + dyMm);
  }

  resetIslandVisualOffset(): void {
    this.islandVisualOffsetXmm.set(0);
    this.islandVisualOffsetYmm.set(0);
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
      upperFillerHeightMm: this.stateService.upperFillerHeightMm(),
      fillerWidthMm: this.stateService.fillerWidthMm()
    });
  }

  getCountertopsForWall(pos: WallPosition): CountertopOnFloorPlan[] {
    return buildCountertopsForWall(pos, {
      wallThickness: this.WALL_THICKNESS,
      countertopOverhang: this.COUNTERTOP_OVERHANG,
      countertopStandardDepth: this.COUNTERTOP_STANDARD_DEPTH,
      fillerWidthMm: this.stateService.fillerWidthMm()
    });
  }

  private buildCornerViz(
    cornerCountertop: CornerCountertopResponse,
    positions: WallPosition[],
    walls: WallWithCabinets[]
  ): CornerCountertopViz | null {
    const wallA = walls[cornerCountertop.wallAIndex];
    const wallB = walls[cornerCountertop.wallBIndex];
    if (!wallA || !wallB) {
      return null;
    }

    const horizontal = positions.find(position => position.wall.id === wallA.id);
    const vertical = positions.find(position => position.wall.id === wallB.id);
    if (!horizontal || !vertical) {
      return null;
    }

    const side = wallB.type === 'LEFT'
      ? 'left'
      : wallB.type === 'RIGHT'
        ? 'right'
        : null;
    if (!side) {
      return null;
    }

    const scale = horizontal.scale;
    const widthPx = cornerCountertop.cornerWidthMm * scale;
    const depthPx = cornerCountertop.cornerDepthMm * scale;
    const mainTop = horizontal.y;
    const label = `${cornerCountertop.cornerWidthMm}x${cornerCountertop.cornerDepthMm}mm`;

    if (side === 'left') {
      const cornerX = horizontal.x;
      const cornerY = mainTop - depthPx;
      const verticalRightEdge = vertical.x + vertical.width;
      if (Math.abs(verticalRightEdge - cornerX) > 2) {
        return null;
      }

      return {
        x: cornerX,
        y: cornerY,
        widthPx,
        depthPx,
        miterX1: cornerX,
        miterY1: mainTop,
        miterX2: cornerX + widthPx,
        miterY2: cornerY,
        label
      };
    }

    const cornerX = horizontal.x + horizontal.width;
    const cornerY = mainTop - depthPx;
    const verticalLeftEdge = vertical.x;
    if (Math.abs(verticalLeftEdge - cornerX) > 2) {
      return null;
    }

    return {
      x: cornerX - widthPx,
      y: cornerY,
      widthPx,
      depthPx,
      miterX1: cornerX,
      miterY1: mainTop,
      miterX2: cornerX - widthPx,
      miterY2: cornerY,
      label
    };
  }
}

function normalizePositiveDimension(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

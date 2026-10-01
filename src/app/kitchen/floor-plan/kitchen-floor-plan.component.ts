import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, Input, output, signal } from '@angular/core';
import {
  CornerCountertopResponse,
  MultiWallCalculateResponse
} from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';
import { buildFloorPlanArcs, CabinetOnFloorPlan, FloorPlanArc } from './floor-plan-door-arcs';
import {
  buildCabinetsForWall,
  buildCountertopsForWall,
  buildWallPositions,
  CountertopOnFloorPlan,
  WallPosition
} from './floor-plan-layout.builder';
import { WallTopology } from '../service/corner-layout/corner-layout.model';
import { cornerIssueCabinetIds } from '../service/corner-layout/corner-issue-messages';
import { resolveWallTopology } from '../service/corner-layout/wall-topology.resolver';
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

/** Ściana na rzucie z gotowymi szafkami i blatami — stabilna referencja dla szablonu. */
interface FloorPlanWallView {
  position: WallPosition;
  cabinets: CabinetOnFloorPlan[];
  countertops: CountertopOnFloorPlan[];
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
  styleUrls: ['./kitchen-floor-plan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenFloorPlanComponent {
  private readonly stateService = inject(KitchenStateService);
  private readonly layoutService = inject(KitchenProjectLayoutService);
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

  /** Narożniki z typów ścian — te same, które wyznaczają położenie ścian na rzucie. */
  private readonly topology = computed((): WallTopology => resolveWallTopology(this.walls()));

  /** Szafki objęte błędem narożnika — podświetlane na czerwono. */
  private readonly cornerConflictCabinetIds = computed((): ReadonlySet<string> => new Set(
    this.layoutService.issues()
      .filter(issue => issue.severity === 'ERROR')
      .flatMap(issue => cornerIssueCabinetIds(issue))
  ));

  readonly wallViews = computed((): FloorPlanWallView[] => {
    const junctionSides = this.layoutService.layout().junctionSides;
    const conflictIds = this.cornerConflictCabinetIds();
    return this.wallPositions().map(position => {
      const cornerConstraints = this.layoutService.constraintsFor(position.wall.id);
      return {
        position,
        cabinets: buildCabinetsForWall(position, this.WALL_THICKNESS, {
          plinthHeightMm: this.stateService.plinthHeightMm(),
          upperFillerHeightMm: this.stateService.upperFillerHeightMm(),
          fillerWidthMm: this.stateService.fillerWidthMm(),
          cornerConstraints,
          cornerJunctionSides: junctionSides,
          cornerConflictCabinetIds: conflictIds
        }),
        countertops: buildCountertopsForWall(position, {
          wallThickness: this.WALL_THICKNESS,
          countertopOverhang: this.COUNTERTOP_OVERHANG,
          countertopStandardDepth: this.COUNTERTOP_STANDARD_DEPTH,
          fillerWidthMm: this.stateService.fillerWidthMm(),
          cornerConstraints
        })
      };
    });
  });

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
    const topology = this.topology();

    return projectResult.cornerCountertops
      .map(cornerCountertop => this.buildCornerViz(cornerCountertop, positions, walls, topology))
      .filter((corner): corner is CornerCountertopViz => corner !== null);
  });

  readonly doorArcData = computed((): FloorPlanArc[] => {
    if (!this.showDoorArcs()) {
      return [];
    }

    const cabinets = this.wallViews().flatMap(view => view.cabinets);
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

  /**
   * Blat narożny z odpowiedzi backendu rysowany w narożniku z topologii ścian. Indeksy z odpowiedzi wskazują tylko
   * parę ścian requestu; para spoza bieżącej topologii (np. nieaktualny wynik po zmianie ścian) nie jest rysowana.
   */
  private buildCornerViz(
    cornerCountertop: CornerCountertopResponse,
    positions: WallPosition[],
    walls: WallWithCabinets[],
    topology: WallTopology
  ): CornerCountertopViz | null {
    const pairIds = [walls[cornerCountertop.wallAIndex]?.id, walls[cornerCountertop.wallBIndex]?.id];
    const corner = topology.corners.find(candidate =>
      pairIds.includes(candidate.a.wallId) && pairIds.includes(candidate.b.wallId));
    if (!corner) {
      return null;
    }

    const horizontal = positions.find(position => position.wall.id === corner.a.wallId);
    const vertical = positions.find(position => position.wall.id === corner.b.wallId);
    if (!horizontal || !vertical) {
      return null;
    }

    const side = corner.connectionType === 'L_CORNER_LEFT' ? 'left' : 'right';

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

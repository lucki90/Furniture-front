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
import { CornerCountertopOverlay, FloorPlanOverlayLayerComponent } from './floor-plan-overlay-layer.component';
import { FloorPlanWallGroupComponent } from './floor-plan-wall-group.component';
import {
  cornerJointGeometryPx,
  CornerJointGeometryPx,
  cornerJointLabel,
  cornerJointPoints,
  cutCountertopsAtMiter,
  toSvgPoints
} from './floor-plan-corner-joints';

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

  /**
   * Narożniki z cięciem 45° (z układu narożników frontu) w geometrii rzutu — blaty obu ścian są tam przycinane po
   * przekątnej. Głębokość jak rysowanych blatów (`COUNTERTOP_STANDARD_DEPTH`).
   */
  private readonly miterCorners = computed((): CornerJointGeometryPx[] => {
    const positions = this.wallPositions();
    const corners = this.topology().corners;
    return this.layoutService.layout().countertopJoints
      .filter(joint => joint.type === 'MITER_45')
      .map(joint => corners.find(corner => corner.id === joint.cornerId))
      .map(corner => corner
        ? cornerJointGeometryPx(corner, positions, this.COUNTERTOP_STANDARD_DEPTH, this.COUNTERTOP_STANDARD_DEPTH)
        : null)
      .filter((geometry): geometry is CornerJointGeometryPx => geometry !== null);
  });

  readonly wallViews = computed((): FloorPlanWallView[] => {
    const layout = this.layoutService.layout();
    const junctionSides = layout.junctionSides;
    const conflictIds = this.cornerConflictCabinetIds();
    const miterCorners = this.miterCorners();
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
        countertops: cutAtMiterCorners(position.wall.id, buildCountertopsForWall(position, {
          wallThickness: this.WALL_THICKNESS,
          countertopOverhang: this.COUNTERTOP_OVERHANG,
          countertopStandardDepth: this.COUNTERTOP_STANDARD_DEPTH,
          fillerWidthMm: this.stateService.fillerWidthMm(),
          cornerConstraints,
          countertopTrim: layout.countertopTrimsByWallId.get(position.wall.id)
        }), miterCorners)
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

  readonly cornerCountertopPositions = computed((): CornerCountertopOverlay[] => {
    const projectResult = this.projectResultSignal();
    if (!this.showCountertop() || !projectResult?.cornerCountertops?.length) {
      return [];
    }

    const positions = this.wallPositions();
    const walls = this.walls();
    const topology = this.topology();

    return projectResult.cornerCountertops
      .map(cornerCountertop => this.buildCornerViz(cornerCountertop, positions, walls, topology))
      .filter((corner): corner is CornerCountertopOverlay => corner !== null);
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
   * Połączenie blatów z odpowiedzi backendu rysowane w narożniku z topologii ścian: kwadrat narożny, linia złącza
   * według typu i jego nazwa. Indeksy z odpowiedzi wskazują tylko parę ścian requestu; para spoza bieżącej topologii
   * (np. nieaktualny wynik po zmianie ścian) nie jest rysowana.
   */
  private buildCornerViz(
    cornerCountertop: CornerCountertopResponse,
    positions: WallPosition[],
    walls: WallWithCabinets[],
    topology: WallTopology
  ): CornerCountertopOverlay | null {
    // Narożnik, w którym blaty się nie łączą, ma zerowe wymiary — nie ma czego rysować.
    if (cornerCountertop.cornerWidthMm <= 0 || cornerCountertop.cornerDepthMm <= 0) {
      return null;
    }
    const pairIds = [walls[cornerCountertop.wallAIndex]?.id, walls[cornerCountertop.wallBIndex]?.id];
    const corner = topology.corners.find(candidate =>
      pairIds.includes(candidate.a.wallId) && pairIds.includes(candidate.b.wallId));
    const geometry = corner
      ? cornerJointGeometryPx(corner, positions, cornerCountertop.cornerDepthMm, cornerCountertop.cornerWidthMm)
      : null;
    if (!geometry) {
      return null;
    }

    const { wallCorner, innerCorner } = geometry;
    const passingWallId = cornerCountertop.ownerWallIndex != null
      ? walls[cornerCountertop.ownerWallIndex]?.id
      : undefined;
    return {
      x: Math.min(wallCorner.x, innerCorner.x),
      y: innerCorner.y,
      widthPx: Math.abs(innerCorner.x - wallCorner.x),
      depthPx: wallCorner.y - innerCorner.y,
      jointPoints: toSvgPoints(cornerJointPoints(
        geometry, cornerCountertop.jointType, passingWallId, this.layoutService.cornerSettings().lyzwaRecessMm)),
      jointType: cornerCountertop.jointType,
      jointLabel: cornerJointLabel(cornerCountertop.jointType),
      label: `${cornerCountertop.cornerWidthMm}x${cornerCountertop.cornerDepthMm}mm`
    };
  }
}

/** Blaty ściany przycięte po przekątnej w jej narożnikach z cięciem 45°. */
function cutAtMiterCorners(
  wallId: string,
  countertops: CountertopOnFloorPlan[],
  miterCorners: readonly CornerJointGeometryPx[]
): CountertopOnFloorPlan[] {
  return miterCorners.reduce((current, geometry) => {
    if (geometry.wallAId === wallId) {
      return cutCountertopsAtMiter(current, geometry, 'A');
    }
    return geometry.wallBId === wallId ? cutCountertopsAtMiter(current, geometry, 'B') : current;
  }, countertops);
}

function normalizePositiveDimension(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

import { Injectable, inject } from '@angular/core';
import { CabinetSide, WALL_TYPES, WallType } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { computeCountertopRunsMm } from '../floor-plan/floor-plan-layout.builder';
import { COUNTERTOP_DEPTH_DEFAULT_MM } from '../kitchen-layout/kitchen-layout.constants';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';
import { KitchenGeometryService } from '../service/kitchen-geometry.service';
import { OfferViewImage } from '../service/project-pricing.service';
import { buildOfferElevation } from './offer-elevation.builder';
import { buildOfferFloorPlan } from './offer-floor-plan.builder';
import { OfferSvgDrawing } from './offer-svg';
import { rasterizeSvgToPngBase64 } from './offer-svg-rasterizer';

/** Rysunek widoku z podpisem — przed zamianą na obraz. */
export interface OfferViewDrawing {
  title: string;
  drawing: OfferSvgDrawing;
}

/** Limit widoków oferty — taki sam jak w backendzie (`OfferViewsDecoder.MAX_VIEWS`). */
export const MAX_OFFER_VIEWS = 8;

const WALL_ORDER: readonly WallType[] = WALL_TYPES.map(wallType => wallType.value);
const ISLAND_SIDES: ReadonlyArray<{ side: CabinetSide; label: string }> = [
  { side: 'FRONT', label: 'strona frontowa' },
  { side: 'BACK', label: 'strona tylna' }
];

/**
 * Widoki poglądowe do oferty z bieżącego stanu edytora: rzut z góry i widok od frontu każdej ściany z szafkami
 * (wyspa — każda strona z szafkami osobno). Geometria pochodzi z tych samych źródeł co elewacja i rzut edytora.
 */
@Injectable({ providedIn: 'root' })
export class OfferViewsService {
  private readonly stateService = inject(KitchenStateService);
  private readonly layoutService = inject(KitchenProjectLayoutService);
  private readonly geometryService = inject(KitchenGeometryService);

  buildDrawings(): OfferViewDrawing[] {
    const walls = this.stateService.walls();
    if (!walls.some(wall => wall.cabinets.length > 0)) {
      return [];
    }
    const drawings: OfferViewDrawing[] = [{ title: 'Rzut z góry', drawing: this.floorPlan(walls) }];
    [...walls]
      .sort((a, b) => WALL_ORDER.indexOf(a.type) - WALL_ORDER.indexOf(b.type))
      .forEach(wall => drawings.push(...this.wallDrawings(wall)));
    return drawings.slice(0, MAX_OFFER_VIEWS);
  }

  async render(): Promise<OfferViewImage[]> {
    return Promise.all(this.buildDrawings().map(async view => ({
      title: view.title,
      pngBase64: await rasterizeSvgToPngBase64(view.drawing)
    })));
  }

  private floorPlan(walls: WallWithCabinets[]): OfferSvgDrawing {
    return buildOfferFloorPlan({
      walls,
      roomWidthMm: this.stateService.currentProjectRoomWidthMm(),
      roomDepthMm: this.stateService.currentProjectRoomDepthMm(),
      plinthHeightMm: this.stateService.plinthHeightMm(),
      upperFillerHeightMm: this.stateService.upperFillerHeightMm(),
      fillerWidthMm: this.stateService.fillerWidthMm(),
      layout: this.layoutService.layout(),
      wallLabel: type => this.stateService.getWallLabel(type)
    });
  }

  private wallDrawings(wall: WallWithCabinets): OfferViewDrawing[] {
    const label = this.stateService.getWallLabel(wall.type);
    if (wall.type !== 'ISLAND') {
      return wall.cabinets.length > 0
        ? [{ title: `${label} — ${wall.widthMm} × ${wall.heightMm} mm`, drawing: this.elevation(wall, wall.cabinets) }]
        : [];
    }
    return ISLAND_SIDES
      .map(({ side, label: sideLabel }) => ({
        sideLabel,
        cabinets: wall.cabinets.filter(cabinet => (cabinet.cabinetSide ?? 'FRONT') === side)
      }))
      .filter(side => side.cabinets.length > 0)
      .map(side => ({
        title: `${label}, ${side.sideLabel} — ${wall.widthMm} mm`,
        drawing: this.elevation(wall, side.cabinets)
      }));
  }

  private elevation(wall: WallWithCabinets, cabinets: WallWithCabinets['cabinets']): OfferSvgDrawing {
    const layout = this.layoutService.layout();
    const fillerWidthMm = this.stateService.fillerWidthMm();
    const wallsById = new Map(this.stateService.walls().map(item => [item.id, item]));
    const cabinetIds = new Set(cabinets.map(cabinet => cabinet.id));
    const positions = this.geometryService.calculateCabinetPositions(wall.cabinets, {
      ...this.layoutService.geometrySettingsFor(wall),
      wallWidthMm: wall.widthMm,
      cornerConstraints: this.layoutService.constraintsFor(wall.id)
    }).filter(position => cabinetIds.has(position.cabinetId));
    const countertopRuns = wall.countertopConfig?.enabled === false
      ? []
      : computeCountertopRunsMm({ ...wall, cabinets }, positions, fillerWidthMm,
        layout.countertopTrimsByWallId.get(wall.id));

    return buildOfferElevation({
      wall,
      cabinets,
      positions,
      feetHeightMm: wall.plinthConfig?.heightMm ?? this.stateService.plinthHeightMm(),
      upperFillerHeightMm: this.stateService.upperFillerHeightMm(),
      fillerWidthMm,
      countertopThicknessMm: this.stateService.countertopThicknessMm(),
      countertopRuns,
      plinthEnabled: wall.plinthConfig?.enabled !== false,
      cornerJunctionSides: layout.junctionSides,
      cornerGhosts: layout.ghosts.filter(ghost => ghost.wallId === wall.id),
      feetHeightMmFor: wallId => wallsById.get(wallId)?.plinthConfig?.heightMm ?? this.stateService.plinthHeightMm(),
      countertopDepthMmFor: wallId =>
        wallsById.get(wallId)?.countertopConfig?.manualDepthMm ?? COUNTERTOP_DEPTH_DEFAULT_MM
    });
  }
}

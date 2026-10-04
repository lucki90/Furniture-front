import { Injectable } from '@angular/core';
import {
  CabinetCalculationResult,
  isFreestandingAppliance,
  KitchenCabinet,
  WallWithCabinets,
  cabinetRequiresCountertop
} from '../model/kitchen-state.model';
import { CabinetSide, ProjectCabinetRequest, ProjectWallRequest, WallConnectionRequest } from '../model/kitchen-project.model';
import { SegmentRequest, SegmentFormData, SegmentType, SegmentFrontType } from '../cabinet-form/model/segment.model';
import { CountertopRequest } from '../model/countertop.model';
import { PlinthRequest } from '../model/plinth.model';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { ProjectWallCabinetsBuilder } from './project-wall-cabinets.builder';
import { resolveWallTopology, toWallConnectionRequests } from './corner-layout/wall-topology.resolver';
import { resolveWallCornerConstraints } from './corner-layout/project-corner-layout.builder';
import { createCornerGeometrySettings } from './corner-layout/corner-reach';
import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import { WallBuildSettings } from './project-request-builder.models';
import { KitchenGeometryService } from './kitchen-geometry.service';

export type { WallBuildSettings } from './project-request-builder.models';

@Injectable({ providedIn: 'root' })
export class ProjectRequestBuilderService {
  private readonly addonsBuilder = new ProjectWallAddonsRequestBuilder();
  private readonly wallCabinetsBuilder: ProjectWallCabinetsBuilder;

  constructor(private readonly geometryService: KitchenGeometryService = new KitchenGeometryService()) {
    this.wallCabinetsBuilder = new ProjectWallCabinetsBuilder(this.addonsBuilder, this.geometryService);
  }

  // TODO(CODEX): Ten builder robi dużo sensownej roboty, ale nadal zawiera wiedzę domenową o pozycjonowaniu i mapowaniu requestów projektu. To miejsce jest krytyczne dla zgodności frontend-backend, więc warto dalej uszczelniać typy wejścia/wyjścia i pilnować, żeby nowe wyjątki per typ szafki trafiały do mniejszych builderów zamiast wracać do jednej dużej klasy.
  enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right', fillerWidthMm: number): number {
    return this.addonsBuilder.enclosureOuterWidthMm(cab, side, fillerWidthMm);
  }

  buildProjectWalls(walls: WallWithCabinets[], settings: WallBuildSettings): ProjectWallRequest[] {
    // Pozycje wysyłane do backendu uwzględniają strefy narożne sąsiednich ścian (auto-przesunięcie).
    const cornerConstraints = resolveWallCornerConstraints(
      walls,
      wall => ({
        wallType: wall.type,
        wallHeightMm: wall.heightMm,
        plinthHeightMm: settings.plinthHeightMm,
        countertopThicknessMm: settings.countertopThicknessMm,
        upperFillerHeightMm: settings.upperFillerHeightMm,
        fillerWidthMm: settings.fillerWidthMm
      }),
      createCornerGeometrySettings(
        settings.fillerWidthMm,
        (settings.materialDefaults ?? DEFAULT_MATERIAL_DEFAULTS).frontBoardThickness
      ),
      this.geometryService
    );

    return walls.map(wall => {
      const cabinets = this.wallCabinetsBuilder.buildCabinets(wall, settings, cornerConstraints.get(wall.id));
      const leftOverhangMm = wall.type === 'ISLAND'
        ? this.computeIslandSideOverhang(wall, 'left', settings.fillerWidthMm)
        : this.computeLinearSideOverhang(wall.cabinets, 'left', settings.fillerWidthMm);
      const rightOverhangMm = wall.type === 'ISLAND'
        ? this.computeIslandSideOverhang(wall, 'right', settings.fillerWidthMm)
        : this.computeLinearSideOverhang(wall.cabinets, 'right', settings.fillerWidthMm);

      return {
        wallType: wall.type,
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        cabinets,
        countertop: this.addonsBuilder.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm),
        plinth: this.addonsBuilder.buildPlinthRequest(wall, settings.plinthHeightMm),
        islandDepthMm: wall.islandDepthMm,
        adjacentToWall: wall.adjacentToWall,
        leftSidePanelEnabled: wall.leftSidePanelEnabled,
        rightSidePanelEnabled: wall.rightSidePanelEnabled,
        backBlendaEnabled: wall.backBlendaEnabled
      };
    });
  }

  /** Połączenia narożne wyliczone z typów ścian; indeksy odpowiadają kolejności `walls` w requeście. */
  /** Szafka bez pozycji na ścianie (zapis presetu). */
  buildCabinetConfiguration(
    cabinet: KitchenCabinet,
    materialDefaults: typeof DEFAULT_MATERIAL_DEFAULTS = DEFAULT_MATERIAL_DEFAULTS
  ): ProjectCabinetRequest {
    return this.wallCabinetsBuilder.buildCabinetConfiguration(cabinet, materialDefaults);
  }

  buildConnections(walls: WallWithCabinets[]): WallConnectionRequest[] {
    return toWallConnectionRequests(resolveWallTopology(walls), walls);
  }

  buildCountertopRequest(wall: WallWithCabinets, leftOverhangMm = 0, rightOverhangMm = 0): CountertopRequest {
    return this.addonsBuilder.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm);
  }

  buildPlinthRequest(wall: WallWithCabinets, fallbackPlinthHeightMm: number): PlinthRequest {
    return this.addonsBuilder.buildPlinthRequest(wall, fallbackPlinthHeightMm);
  }

  mapCalculationResult(result: {
    summaryCosts?: number; totalCost?: number;
    boardTotalCost?: number; boardsCost?: number; boardCosts?: number;
    componentTotalCost?: number; componentsCost?: number; componentCosts?: number;
    jobTotalCost?: number; jobsCost?: number; jobCosts?: number;
  }): CabinetCalculationResult | undefined {
    if (!result) return undefined;

    return {
      totalCost: result.summaryCosts ?? result.totalCost ?? 0,
      boardCosts: result.boardTotalCost ?? result.boardsCost ?? result.boardCosts ?? 0,
      componentCosts: result.componentTotalCost ?? result.componentsCost ?? result.componentCosts ?? 0,
      jobCosts: result.jobTotalCost ?? result.jobsCost ?? result.jobCosts ?? 0
    };
  }

  mapSegmentResponseToFormData(seg: SegmentRequest): SegmentFormData {
    const formData: SegmentFormData = {
      segmentType: seg.segmentType as SegmentType,
      height: seg.height,
      orderIndex: seg.orderIndex
    };

    if (seg.drawerRequest) {
      formData.drawerQuantity = seg.drawerRequest.drawerQuantity;
      formData.drawerModel = seg.drawerRequest.drawerModel;
    }
    if (seg.shelfQuantity !== null && seg.shelfQuantity !== undefined) {
      formData.shelfQuantity = seg.shelfQuantity;
    }
    if (seg.frontType) {
      formData.frontType = seg.frontType as SegmentFrontType;
    }
    if (seg.ovenHeightType) {
      formData.ovenHeightType = seg.ovenHeightType;
    }
    if (seg.microwaveType) {
      formData.microwaveType = seg.microwaveType;
    }
    if (seg.dishwasherType) {
      formData.dishwasherType = seg.dishwasherType;
    }
    if (seg.liftMechanismType) {
      formData.liftMechanismType = seg.liftMechanismType;
    }

    return formData;
  }

  private computeLinearSideOverhang(cabinets: KitchenCabinet[], side: 'left' | 'right', fillerWidthMm: number): number {
    // Liczymy overhang TYLKO ze szafek, na ktorych faktycznie lezy blat (requiresCountertop=true).
    // Filtr `!== TOP` byl zbyt szeroki — wlaczal FULL (TALL_CABINET, BASE_FRIDGE), ktore PRZERYWAJA blat,
    // wiec ich enclosure nie powinno wpiywac na overhang segmentu blatu.
    const supportingCabinets = cabinets.filter(cabinet => cabinetRequiresCountertop(cabinet));
    if (supportingCabinets.length === 0) {
      return 0;
    }

    const edgeCabinet = side === 'left'
      ? supportingCabinets[0]
      : supportingCabinets[supportingCabinets.length - 1];

    return this.enclosureOuterWidthMm(edgeCabinet, side, fillerWidthMm);
  }

  private computeIslandSideOverhang(wall: WallWithCabinets, side: 'left' | 'right', fillerWidthMm: number): number {
    const cabinetSides: CabinetSide[] = ['FRONT', 'BACK'];

    return cabinetSides.reduce((maxOverhang, cabinetSide) => {
      // Ten sam filtr co `computeLinearSideOverhang` i floor-plan `computeIslandSideEnclosureMm` —
      // pod blatem licza sie TYLKO szafki wymagajace blatu (requiresCountertop).
      // FULL (TALL_CABINET, BASE_FRIDGE) i freestanding AGD NIE utrzymuja blatu wyspy.
      const sideCabinets = wall.cabinets.filter(cabinet =>
        (cabinet.cabinetSide ?? 'FRONT') === cabinetSide && cabinetRequiresCountertop(cabinet)
      );
      if (sideCabinets.length === 0) {
        return maxOverhang;
      }

      const edgeCabinet = side === 'left'
        ? sideCabinets[0]
        : sideCabinets[sideCabinets.length - 1];

      return Math.max(maxOverhang, this.enclosureOuterWidthMm(edgeCabinet, side, fillerWidthMm));
    }, 0);
  }
}

import { Injectable } from '@angular/core';
import {
  CabinetCalculationResult,
  isFreestandingAppliance,
  KitchenCabinet,
  WallWithCabinets,
  requiresCountertop
} from '../model/kitchen-state.model';
import { CabinetSide, ProjectWallRequest, WallConnectionRequest } from '../model/kitchen-project.model';
import { SegmentRequest, SegmentFormData, SegmentType, SegmentFrontType } from '../cabinet-form/model/segment.model';
import { CountertopRequest } from '../model/countertop.model';
import { PlinthRequest } from '../model/plinth.model';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { ProjectWallConnectionBuilder } from './project-wall-connection.builder';
import { ProjectWallCabinetsBuilder } from './project-wall-cabinets.builder';
import { WallBuildSettings } from './project-request-builder.models';

export type { WallBuildSettings } from './project-request-builder.models';

@Injectable({ providedIn: 'root' })
export class ProjectRequestBuilderService {
  private readonly addonsBuilder = new ProjectWallAddonsRequestBuilder();
  private readonly wallConnectionBuilder = new ProjectWallConnectionBuilder();
  private readonly wallCabinetsBuilder = new ProjectWallCabinetsBuilder(this.addonsBuilder);

  // TODO(CODEX): Ten builder robi duzo sensownej roboty, ale nadal zawiera wiedze domenowa o pozycjonowaniu i mapowaniu requestow projektu. To miejsce jest krytyczne dla zgodnosci frontend-backend, wiec warto dalej uszczelniac typy wejscia/wyjscia i pilnowac, zeby nowe wyjatki per typ szafki trafialy do mniejszych builderow zamiast wracac do jednej duzej klasy.
  enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right', fillerWidthMm: number): number {
    return this.addonsBuilder.enclosureOuterWidthMm(cab, side, fillerWidthMm);
  }

  buildProjectWalls(walls: WallWithCabinets[], settings: WallBuildSettings): ProjectWallRequest[] {
    return walls.map(wall => {
      const cabinets = this.wallCabinetsBuilder.buildCabinets(wall, settings);
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
        plinth: this.addonsBuilder.buildPlinthRequest(wall),
        islandDepthMm: wall.islandDepthMm,
        adjacentToWall: wall.adjacentToWall,
        leftSidePanelEnabled: wall.leftSidePanelEnabled,
        rightSidePanelEnabled: wall.rightSidePanelEnabled,
        backBlendaEnabled: wall.backBlendaEnabled
      };
    });
  }

  // TODO(CODEX): Faza 13.6 domknela klasyczny U-shape (jedno L_CORNER_LEFT + jedno L_CORNER_RIGHT),
  // ale ta auto-detekcja nadal zaklada najwyzej jedno polaczenie dla kazdej sciany LEFT/RIGHT.
  // Przy bardziej niestandardowych ukladach wielosciennych warto docelowo oprzec to o jawny model
  // polaczen w UI zamiast o heurystyke "najblizszej" sciany poziomej.
  buildConnections(walls: WallWithCabinets[]): WallConnectionRequest[] {
    return this.wallConnectionBuilder.buildConnections(walls);
  }

  buildCountertopRequest(wall: WallWithCabinets, leftOverhangMm = 0, rightOverhangMm = 0): CountertopRequest {
    return this.addonsBuilder.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm);
  }

  buildPlinthRequest(wall: WallWithCabinets): PlinthRequest {
    return this.addonsBuilder.buildPlinthRequest(wall);
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

    return formData;
  }

  private computeLinearSideOverhang(cabinets: KitchenCabinet[], side: 'left' | 'right', fillerWidthMm: number): number {
    // Liczymy overhang TYLKO ze szafek, na ktorych faktycznie lezy blat (requiresCountertop=true).
    // Filtr `!== TOP` byl zbyt szeroki — wlaczal FULL (TALL_CABINET, BASE_FRIDGE), ktore PRZERYWAJA blat,
    // wiec ich enclosure nie powinno wpiywac na overhang segmentu blatu.
    const supportingCabinets = cabinets.filter(cabinet => requiresCountertop(cabinet.type));
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
        (cabinet.cabinetSide ?? 'FRONT') === cabinetSide && requiresCountertop(cabinet.type)
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

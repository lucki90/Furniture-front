import { Injectable } from '@angular/core';
import { KitchenCabinet, CabinetCalculationResult, WallWithCabinets, requiresCountertop, isFreestandingAppliance } from '../model/kitchen-state.model';
import { ProjectWallRequest, WallConnectionRequest } from '../model/kitchen-project.model';
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
      const bottomCabs = wall.cabinets.filter(c => requiresCountertop(c.type) || isFreestandingAppliance(c.type));
      const leftOverhangMm = bottomCabs.length > 0
        ? this.enclosureOuterWidthMm(bottomCabs[0], 'left', settings.fillerWidthMm)
        : 0;
      const rightOverhangMm = bottomCabs.length > 0
        ? this.enclosureOuterWidthMm(bottomCabs[bottomCabs.length - 1], 'right', settings.fillerWidthMm)
        : 0;

      return {
        wallType: wall.type,
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        cabinets,
        countertop: this.addonsBuilder.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm),
        plinth: this.addonsBuilder.buildPlinthRequest(wall)
      };
    });
  }

  // TODO(CODEX): Ta auto-detekcja zwraca dzis najwyzej jedno polaczenie dla kazdej sciany LEFT/RIGHT. To moze sie rozjechac z widokiem floor-plan, ktory umie narysowac wiecej niz jeden naroznik dla tego samego boku ukladu. W bardziej zlozonych ukladach L/U backend dostanie niepelny zestaw polaczen i kalkulacja naroznych blatow bedzie niekompletna.
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
}

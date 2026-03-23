import { Injectable } from '@angular/core';
import {
  KitchenCabinet,
  CabinetCalculationResult,
  WallWithCabinets,
  isUpperCabinetType,
  requiresCountertop,
  isFreestandingAppliance,
  hasSegments
} from '../model/kitchen-state.model';
import {
  ProjectCabinetRequest,
  ProjectWallRequest,
  DrawerRequest,
  CornerCabinetRequest,
  CascadeSegmentRequest
} from '../model/kitchen-project.model';
import { CountertopRequest, DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { PlinthRequest, DEFAULT_PLINTH_REQUEST } from '../model/plinth.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { mapSegmentToRequest, SegmentFormData, SegmentType, SegmentFrontType } from '../cabinet-form/model/segment.model';
import { EnclosureType } from '../cabinet-form/model/enclosure.model';

export interface WallBuildSettings {
  plinthHeightMm: number;
  countertopThicknessMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectRequestBuilderService {

  /**
   * Zwraca szerokość obudowy bocznej dla danej szafki i strony (w mm).
   */
  enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right', fillerWidthMm: number): number {
    const type = side === 'left' ? cab.leftEnclosureType : cab.rightEnclosureType;
    if (!type || type === 'NONE') return 0;
    if (type === 'PARALLEL_FILLER_STRIP') {
      const override = side === 'left' ? cab.leftFillerWidthOverrideMm : cab.rightFillerWidthOverrideMm;
      return override ?? fillerWidthMm;
    }
    return 18; // SIDE_PLATE_WITH_PLINTH | SIDE_PLATE_TO_FLOOR
  }

  /**
   * Buduje tablicę ProjectWallRequest na podstawie stanu ścian i ustawień globalnych.
   */
  buildProjectWalls(walls: WallWithCabinets[], settings: WallBuildSettings): ProjectWallRequest[] {
    return walls.map(wall => {
      let currentXBottom = 0;
      let currentXTop = 0;

      const { plinthHeightMm, countertopThicknessMm, upperFillerHeightMm, fillerWidthMm } = settings;
      const wallH = wall.heightMm;

      const bottomCabsInWall = wall.cabinets.filter(c => requiresCountertop(c.type));
      const maxBaseCorpusH = bottomCabsInWall.length > 0
        ? Math.max(...bottomCabsInWall.map(c => c.height))
        : 720;
      const countertopH = plinthHeightMm + maxBaseCorpusH + countertopThicknessMm;

      const cabinets: ProjectCabinetRequest[] = wall.cabinets.map(cab => {
        let drawerRequest: DrawerRequest | undefined;
        if (cab.type === KitchenCabinetType.BASE_WITH_DRAWERS && cab.drawerQuantity && cab.drawerModel) {
          drawerRequest = {
            drawerQuantity: cab.drawerQuantity,
            drawerModel: cab.drawerModel,
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }
        if (cab.type === KitchenCabinetType.BASE_SINK && (cab as any).sinkFrontType === 'DRAWER') {
          drawerRequest = {
            drawerQuantity: 1,
            drawerModel: (cab as any).sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }
        if (cab.type === KitchenCabinetType.BASE_COOKTOP && (cab as any).cooktopFrontType === 'DRAWERS') {
          drawerRequest = {
            drawerQuantity: cab.drawerQuantity ?? 3,
            drawerModel: cab.drawerModel ?? 'ANTARO_TANDEMBOX',
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }
        if (cab.type === KitchenCabinetType.BASE_OVEN && cab.drawerModel) {
          drawerRequest = {
            drawerQuantity: 1,
            drawerModel: cab.drawerModel,
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }

        let segments = undefined;
        if (hasSegments(cab.type) && cab.segments && cab.segments.length > 0) {
          segments = cab.segments.map((segment, index) => {
            const segmentWithIndex: SegmentFormData = { ...segment, orderIndex: index };
            return mapSegmentToRequest(segmentWithIndex);
          });
        }

        let cascadeSegments: CascadeSegmentRequest[] | undefined;
        if (cab.type === KitchenCabinetType.UPPER_CASCADE &&
            cab.cascadeLowerHeight && cab.cascadeLowerDepth &&
            cab.cascadeUpperHeight && cab.cascadeUpperDepth) {
          const lowerLiftUp = cab.cascadeLowerIsLiftUp ?? false;
          const upperLiftUp = cab.cascadeUpperIsLiftUp ?? false;
          cascadeSegments = [
            {
              orderIndex: 0, height: cab.cascadeLowerHeight, depth: cab.cascadeLowerDepth,
              frontType: lowerLiftUp ? 'UPWARDS' : 'ONE_DOOR', shelfQuantity: 0,
              isLiftUp: lowerLiftUp, isFrontExtended: cab.cascadeLowerIsFrontExtended ?? false
            },
            {
              orderIndex: 1, height: cab.cascadeUpperHeight, depth: cab.cascadeUpperDepth,
              frontType: upperLiftUp ? 'UPWARDS' : 'ONE_DOOR', shelfQuantity: 0,
              isLiftUp: upperLiftUp, isFrontExtended: false
            }
          ];
        }

        let cornerRequest: CornerCabinetRequest | undefined;
        if (cab.type === KitchenCabinetType.CORNER_CABINET && cab.cornerWidthA && cab.cornerMechanism) {
          cornerRequest = {
            widthA: cab.cornerWidthA,
            widthB: cab.cornerWidthB ?? null,
            mechanism: cab.cornerMechanism,
            shelfQuantity: cab.cornerShelfQuantity,
            upperCabinet: cab.isUpperCorner ?? false,
            cornerOpeningType: cab.cornerOpeningType,
            frontUchylnyWidthMm: cab.cornerFrontUchylnyWidthMm
          };
        }

        const isTop = isUpperCabinetType(cab.type);
        const leftEncW = this.enclosureOuterWidthMm(cab, 'left', fillerWidthMm);
        const rightEncW = this.enclosureOuterWidthMm(cab, 'right', fillerWidthMm);
        let posX: number;
        if (isTop) {
          posX = currentXTop + leftEncW;
          currentXTop = posX + cab.width + rightEncW;
        } else {
          posX = currentXBottom + leftEncW;
          currentXBottom = posX + cab.width + rightEncW;
        }

        let computedPosY = 0;
        if (isTop) {
          if (cab.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
            computedPosY = countertopH + (cab.gapFromCountertopMm ?? 500);
          } else {
            computedPosY = wallH - upperFillerHeightMm - cab.height;
          }
        }

        const request: ProjectCabinetRequest = {
          cabinetId: cab.name || cab.id,
          kitchenCabinetType: cab.type,
          openingType: cab.openingType,
          height: cab.height,
          width: cab.width,
          depth: cab.depth,
          positionX: posX,
          positionY: computedPosY,
          shelfQuantity: cab.shelfQuantity,
          varnishedFront: false,
          materialRequest: {
            boxMaterial: 'CHIPBOARD',
            boxBoardThickness: 18,
            boxColor: 'WHITE',
            boxVeneerColor: 'WHITE',
            frontMaterial: 'CHIPBOARD',
            frontBoardThickness: 18,
            frontColor: 'WHITE',
            frontVeneerColor: 'WHITE'
          },
          drawerRequest,
          segments,
          cascadeSegments,
          cornerRequest,
          positioningMode: cab.positioningMode,
          gapFromCountertopMm: cab.gapFromCountertopMm,
          leftEnclosure: (cab.leftEnclosureType && cab.leftEnclosureType !== 'NONE')
            ? { type: cab.leftEnclosureType as EnclosureType, supportPlate: cab.leftSupportPlate ?? false, fillerWidthOverrideMm: cab.leftFillerWidthOverrideMm ?? null }
            : undefined,
          rightEnclosure: (cab.rightEnclosureType && cab.rightEnclosureType !== 'NONE')
            ? { type: cab.rightEnclosureType as EnclosureType, supportPlate: cab.rightSupportPlate ?? false, fillerWidthOverrideMm: cab.rightFillerWidthOverrideMm ?? null }
            : undefined,
          distanceFromWallMm: cab.distanceFromWallMm ?? null,
          bottomWreathOnFloor: cab.bottomWreathOnFloor ?? false,
          sinkFrontType: (cab as any).sinkFrontType,
          sinkApronEnabled: (cab as any).sinkApronEnabled ?? true,
          sinkApronHeightMm: (cab as any).sinkApronHeightMm ?? 150,
          cooktopType: (cab as any).cooktopType,
          cooktopFrontType: (cab as any).cooktopFrontType,
          hoodFrontType: (cab as any).hoodFrontType,
          hoodScreenEnabled: (cab as any).hoodScreenEnabled ?? false,
          hoodScreenHeightMm: (cab as any).hoodScreenHeightMm ?? 0,
          ovenHeightType: (cab as any).ovenHeightType,
          ovenLowerSectionType: (cab as any).ovenLowerSectionType,
          ovenApronEnabled: (cab as any).ovenApronEnabled ?? false,
          ovenApronHeightMm: (cab as any).ovenApronHeightMm ?? 0,
          fridgeSectionType: (cab as any).fridgeSectionType,
          lowerFrontHeightMm: (cab as any).lowerFrontHeightMm ?? 0,
          fridgeFreestandingType: (cab as any).fridgeFreestandingType,
          isLiftUp: (cab as any).isLiftUp ?? false,
          isFrontExtended: (cab as any).isFrontExtended ?? false
        };
        return request;
      });

      const bottomCabs = wall.cabinets.filter(c => requiresCountertop(c.type) || isFreestandingAppliance(c.type));
      const leftOverhangMm = bottomCabs.length > 0 ? this.enclosureOuterWidthMm(bottomCabs[0], 'left', fillerWidthMm) : 0;
      const rightOverhangMm = bottomCabs.length > 0 ? this.enclosureOuterWidthMm(bottomCabs[bottomCabs.length - 1], 'right', fillerWidthMm) : 0;

      return {
        wallType: wall.type,
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        cabinets,
        countertop: this.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm),
        plinth: this.buildPlinthRequest(wall)
      };
    });
  }

  /**
   * Buduje CountertopRequest na podstawie konfiguracji ściany.
   */
  buildCountertopRequest(wall: WallWithCabinets, leftOverhangMm = 0, rightOverhangMm = 0): CountertopRequest {
    const config = wall.countertopConfig;
    if (!config || !config.enabled) {
      return { ...DEFAULT_COUNTERTOP_REQUEST, enabled: false };
    }
    const jointType = (config.jointType as any) ?? DEFAULT_COUNTERTOP_REQUEST.jointType;
    const edgeType = (config.edgeType as any) ?? DEFAULT_COUNTERTOP_REQUEST.frontEdgeType;
    const sideExtra = config.sideOverhangExtraMm ?? 5;
    return {
      enabled: true,
      materialType: (config.materialType as any) ?? DEFAULT_COUNTERTOP_REQUEST.materialType,
      colorCode: config.colorCode,
      thicknessMm: config.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm,
      manualLengthMm: config.manualLengthMm,
      manualDepthMm: config.manualDepthMm ?? 600,
      frontOverhangMm: config.frontOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm,
      backOverhangMm: DEFAULT_COUNTERTOP_REQUEST.backOverhangMm,
      leftOverhangMm: leftOverhangMm + sideExtra,
      rightOverhangMm: rightOverhangMm + sideExtra,
      jointType,
      frontEdgeType: edgeType,
      leftEdgeType: DEFAULT_COUNTERTOP_REQUEST.leftEdgeType,
      rightEdgeType: DEFAULT_COUNTERTOP_REQUEST.rightEdgeType,
      backEdgeType: DEFAULT_COUNTERTOP_REQUEST.backEdgeType
    };
  }

  /**
   * Buduje PlinthRequest na podstawie konfiguracji ściany.
   */
  buildPlinthRequest(wall: WallWithCabinets): PlinthRequest {
    const config = wall.plinthConfig;
    if (!config || !config.enabled) {
      return { ...DEFAULT_PLINTH_REQUEST, enabled: false };
    }
    return {
      enabled: true,
      feetType: (config.feetType as any) ?? DEFAULT_PLINTH_REQUEST.feetType,
      materialType: (config.materialType as any) ?? DEFAULT_PLINTH_REQUEST.materialType,
      colorCode: config.colorCode,
      setbackMm: config.setbackMm ?? DEFAULT_PLINTH_REQUEST.setbackMm
    };
  }

  /**
   * Mapuje wynik kalkulacji (dwa formaty: /add i /load) na CabinetCalculationResult.
   */
  mapCalculationResult(result: any): CabinetCalculationResult | undefined {
    if (!result) return undefined;
    return {
      totalCost: result.summaryCosts ?? result.totalCost ?? 0,
      boardCosts: result.boardTotalCost ?? result.boardsCost ?? result.boardCosts ?? 0,
      componentCosts: result.componentTotalCost ?? result.componentsCost ?? result.componentCosts ?? 0,
      jobCosts: result.jobTotalCost ?? result.jobsCost ?? result.jobCosts ?? 0
    };
  }

  /**
   * Mapuje SegmentRequest (z API) na SegmentFormData (dla stanu aplikacji).
   */
  mapSegmentResponseToFormData(seg: any): SegmentFormData {
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

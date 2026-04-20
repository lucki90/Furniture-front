import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import {
  KitchenCabinet,
  WallWithCabinets,
  isUpperCabinetType,
  cabinetHasSegments
} from '../model/kitchen-state.model';
import {
  ProjectCabinetRequest,
  DrawerRequest,
  CornerCabinetRequest,
  CascadeSegmentRequest
} from '../model/kitchen-project.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { mapSegmentToRequest, SegmentFormData } from '../cabinet-form/model/segment.model';
import { EnclosureType } from '../cabinet-form/model/enclosure.model';
import { WallBuildSettings } from './project-request-builder.models';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';

export class ProjectWallCabinetsBuilder {
  constructor(private readonly addonsBuilder: ProjectWallAddonsRequestBuilder) {}

  buildCabinets(wall: WallWithCabinets, settings: WallBuildSettings): ProjectCabinetRequest[] {
    let currentXBottom = 0;
    let currentXTop = 0;

    const { plinthHeightMm, countertopThicknessMm, upperFillerHeightMm, fillerWidthMm } = settings;
    const materialDefaults = settings.materialDefaults ?? DEFAULT_MATERIAL_DEFAULTS;
    const wallHeightMm = wall.heightMm;
    const countertopHeightMm = this.calculateCountertopHeight(wall, plinthHeightMm, countertopThicknessMm);

    return wall.cabinets.map(cab => {
      const isTop = isUpperCabinetType(cab.type);
      const leftEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'left', fillerWidthMm);
      const rightEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'right', fillerWidthMm);
      const positionX = isTop ? currentXTop + leftEncW : currentXBottom + leftEncW;

      if (isTop) {
        currentXTop = positionX + cab.width + rightEncW;
      } else {
        currentXBottom = positionX + cab.width + rightEncW;
      }

      return {
        cabinetId: cab.name || cab.id,
        kitchenCabinetType: cab.type,
        openingType: cab.openingType,
        height: cab.height,
        width: cab.width,
        depth: cab.depth,
        positionX,
        positionY: this.calculatePositionY(cab, wallHeightMm, upperFillerHeightMm, countertopHeightMm),
        shelfQuantity: cab.shelfQuantity,
        // TODO: per-projekt overrides - gdy projekt/szafka ma nadpisane materiały/kolory/okleiny,
        //   użyj ich zamiast globalnych defaults `materialDefaults`. Patrz kitchen-state.service.ts -> TODO ProjectMaterialOverrides.
        //   Priorytet: cab.materialOverride ?? materialDefaults (per szafka) -> wall.materialOverride ?? materialDefaults (per ściana) -> materialDefaults (global)
        varnishedFront: materialDefaults.varnishedFront,
        materialRequest: {
          boxMaterial: materialDefaults.boxMaterial,
          boxBoardThickness: materialDefaults.boxBoardThickness,
          boxColor: materialDefaults.boxColor,
          boxVeneerColor: materialDefaults.boxColor,
          frontMaterial: materialDefaults.frontMaterial,
          frontBoardThickness: materialDefaults.frontBoardThickness,
          frontColor: materialDefaults.frontColor,
          frontVeneerColor: materialDefaults.frontColor
        },
        drawerRequest: this.buildDrawerRequest(cab),
        segments: this.buildSegments(cab),
        cascadeSegments: this.buildCascadeSegments(cab),
        cornerRequest: this.buildCornerRequest(cab),
        positioningMode: cab.positioningMode,
        gapFromCountertopMm: cab.gapFromCountertopMm,
        leftEnclosure: this.mapEnclosure(cab, 'left'),
        rightEnclosure: this.mapEnclosure(cab, 'right'),
        distanceFromWallMm: cab.distanceFromWallMm ?? null,
        bottomWreathOnFloor: cab.bottomWreathOnFloor ?? false,
        ...this.buildTypeSpecificFields(cab)
      };
    });
  }

  private calculateCountertopHeight(
    wall: WallWithCabinets,
    plinthHeightMm: number,
    countertopThicknessMm: number
  ): number {
    const bottomCabinets = wall.cabinets.filter(cab => !isUpperCabinetType(cab.type));
    const maxBaseCorpusH = bottomCabinets.length > 0 ? Math.max(...bottomCabinets.map(cab => cab.height)) : 720;
    return plinthHeightMm + maxBaseCorpusH + countertopThicknessMm;
  }

  private calculatePositionY(
    cab: KitchenCabinet,
    wallHeightMm: number,
    upperFillerHeightMm: number,
    countertopHeightMm: number
  ): number {
    if (!isUpperCabinetType(cab.type)) {
      return 0;
    }

    if (cab.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
      return countertopHeightMm + (cab.gapFromCountertopMm ?? 500);
    }

    return wallHeightMm - upperFillerHeightMm - cab.height;
  }

  private buildDrawerRequest(cab: KitchenCabinet): DrawerRequest | undefined {
    if (cab.type === KitchenCabinetType.BASE_WITH_DRAWERS) {
      return {
        drawerQuantity: cab.drawerQuantity,
        drawerModel: cab.drawerModel,
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

    if (cab.type === KitchenCabinetType.BASE_SINK && cab.sinkFrontType === 'DRAWER') {
      return {
        drawerQuantity: 1,
        drawerModel: cab.sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

    if (cab.type === KitchenCabinetType.BASE_COOKTOP && cab.cooktopFrontType === 'DRAWERS') {
      return {
        drawerQuantity: cab.drawerQuantity ?? 3,
        drawerModel: cab.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

    if (cab.type === KitchenCabinetType.BASE_OVEN && cab.drawerModel) {
      return {
        drawerQuantity: 1,
        drawerModel: cab.drawerModel,
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

    return undefined;
  }

  private buildSegments(cab: KitchenCabinet) {
    if (!cabinetHasSegments(cab) || !cab.segments?.length) {
      return undefined;
    }

    return cab.segments.map((segment: SegmentFormData, index: number) => {
      const segmentWithIndex: SegmentFormData = { ...segment, orderIndex: index };
      return mapSegmentToRequest(segmentWithIndex);
    });
  }

  private buildCascadeSegments(cab: KitchenCabinet): CascadeSegmentRequest[] | undefined {
    if (
      cab.type !== KitchenCabinetType.UPPER_CASCADE ||
      !cab.cascadeLowerHeight ||
      !cab.cascadeLowerDepth ||
      !cab.cascadeUpperHeight ||
      !cab.cascadeUpperDepth
    ) {
      return undefined;
    }

    const lowerLiftUp = cab.cascadeLowerIsLiftUp ?? false;
    const upperLiftUp = cab.cascadeUpperIsLiftUp ?? false;

    return [
      {
        orderIndex: 0,
        height: cab.cascadeLowerHeight,
        depth: cab.cascadeLowerDepth,
        frontType: lowerLiftUp ? 'UPWARDS' : 'ONE_DOOR',
        shelfQuantity: 0,
        isLiftUp: lowerLiftUp,
        isFrontExtended: cab.cascadeLowerIsFrontExtended ?? false
      },
      {
        orderIndex: 1,
        height: cab.cascadeUpperHeight,
        depth: cab.cascadeUpperDepth,
        frontType: upperLiftUp ? 'UPWARDS' : 'ONE_DOOR',
        shelfQuantity: 0,
        isLiftUp: upperLiftUp,
        isFrontExtended: false
      }
    ];
  }

  private buildCornerRequest(cab: KitchenCabinet): CornerCabinetRequest | undefined {
    if (cab.type !== KitchenCabinetType.CORNER_CABINET || !cab.cornerWidthA || !cab.cornerMechanism) {
      return undefined;
    }

    return {
      widthA: cab.cornerWidthA,
      widthB: cab.cornerWidthB ?? null,
      mechanism: cab.cornerMechanism,
      shelfQuantity: cab.cornerShelfQuantity,
      upperCabinet: cab.isUpperCorner ?? false,
      cornerOpeningType: cab.cornerOpeningType,
      frontUchylnyWidthMm: cab.cornerFrontUchylnyWidthMm
    };
  }

  private mapEnclosure(cab: KitchenCabinet, side: 'left' | 'right') {
    const type = side === 'left' ? cab.leftEnclosureType : cab.rightEnclosureType;
    if (!type || type === 'NONE') {
      return undefined;
    }

    return {
      type: type as EnclosureType,
      supportPlate: side === 'left' ? cab.leftSupportPlate ?? false : cab.rightSupportPlate ?? false,
      fillerWidthOverrideMm: side === 'left'
        ? cab.leftFillerWidthOverrideMm ?? null
        : cab.rightFillerWidthOverrideMm ?? null
    };
  }

  private buildTypeSpecificFields(cab: KitchenCabinet): Partial<ProjectCabinetRequest> {
    switch (cab.type) {
      case KitchenCabinetType.BASE_SINK:
        return {
          sinkFrontType: cab.sinkFrontType,
          sinkApronEnabled: cab.sinkApronEnabled,
          sinkApronHeightMm: cab.sinkApronHeightMm
        };
      case KitchenCabinetType.BASE_COOKTOP:
        return {
          cooktopType: cab.cooktopType,
          cooktopFrontType: cab.cooktopFrontType
        };
      case KitchenCabinetType.UPPER_HOOD:
        return {
          hoodFrontType: cab.hoodFrontType,
          hoodScreenEnabled: cab.hoodScreenEnabled,
          hoodScreenHeightMm: cab.hoodScreenHeightMm
        };
      case KitchenCabinetType.BASE_OVEN:
        return {
          ovenHeightType: cab.ovenHeightType,
          ovenLowerSectionType: cab.ovenLowerSectionType,
          ovenApronEnabled: cab.ovenApronEnabled,
          ovenApronHeightMm: cab.ovenApronHeightMm
        };
      case KitchenCabinetType.BASE_FRIDGE:
        return {
          fridgeSectionType: cab.fridgeSectionType,
          lowerFrontHeightMm: cab.lowerFrontHeightMm
        };
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return { fridgeFreestandingType: cab.fridgeFreestandingType };
      case KitchenCabinetType.UPPER_ONE_DOOR:
      case KitchenCabinetType.UPPER_TWO_DOOR:
        return {
          isLiftUp: cab.isLiftUp,
          isFrontExtended: cab.isFrontExtended
        };
      case KitchenCabinetType.UPPER_DRAINER:
        return { drainerFrontType: cab.drainerFrontType };
      default:
        return {};
    }
  }
}

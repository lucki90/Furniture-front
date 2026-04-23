import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import {
  KitchenCabinet,
  WallWithCabinets,
  isUpperCabinetType,
  isFullHeightAnchor,
  getCabinetZone,
  requiresCountertop,
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

    // Pre-scan: collect FULL-zone anchor positions for UPPER auto-repositioning.
    const anchors = this.buildAnchorPositions(wall.cabinets, plinthHeightMm, fillerWidthMm);

    return wall.cabinets.map(cab => {
      const isTop = isUpperCabinetType(cab.type);
      const leftEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'left', fillerWidthMm);
      const rightEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'right', fillerWidthMm);

      let positionX: number;
      if (isTop) {
        // Auto-reposition UPPER beside any anchor it can't or must not be above.
        // For RELATIVE_TO_COUNTERTOP: geometric check (tallTop > ceilingY) doesn't apply —
        // only explicit blockUpperAbove=true anchors still force repositioning.
        const effectiveAnchors = (cab.positioningMode === 'RELATIVE_TO_COUNTERTOP')
          ? anchors.filter(a => a.blockUpperAbove)
          : anchors;
        const rawX = this.skipPastConflictingAnchors(currentXTop, leftEncW, cab.width, cab.height, wallHeightMm, upperFillerHeightMm, effectiveAnchors);
        positionX = rawX + leftEncW;
        currentXTop = positionX + cab.width + rightEncW;
      } else {
        positionX = currentXBottom + leftEncW;
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
        positionY: this.calculatePositionY(
          cab, wallHeightMm, upperFillerHeightMm, countertopHeightMm, plinthHeightMm
        ),
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
        gapFromAnchorMm: cab.gapFromAnchorMm ?? undefined,
        blockUpperAbove: cab.blockUpperAbove ?? false,
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
    // Uwzględniaj tylko szafki z blatem (BASE_*), wyklucz TALL_CABINET i BASE_FRIDGE (FULL zone)
    // oraz wolnostojące AGD — spójne z backendem CabinetPositionCalculator.findMaxBaseCorpusHeight()
    const bottomCabinets = wall.cabinets.filter(cab => requiresCountertop(cab.type));
    const maxBaseCorpusH = bottomCabinets.length > 0 ? Math.max(...bottomCabinets.map(cab => cab.height)) : 720;
    return plinthHeightMm + maxBaseCorpusH + countertopThicknessMm;
  }

  /**
   * Pre-scan: compute FULL-zone anchor (TALL_CABINET / BASE_FRIDGE) body positions
   * in sequential bottom-X order. Used for UPPER auto-repositioning.
   */
  private buildAnchorPositions(
    cabinets: KitchenCabinet[],
    plinthHeightMm: number,
    fillerWidthMm: number
  ): Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number; blockUpperAbove: boolean }> {
    let scanX = 0;
    const result: Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number; blockUpperAbove: boolean }> = [];

    for (const cab of cabinets) {
      // getCabinetZone handles CORNER_CABINET with isUpperCorner=true → 'TOP' (isUpperCabinetType does not)
      if (getCabinetZone(cab) === 'TOP') continue; // TOP cabs don't advance the bottom X cursor
      const leftEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'left', fillerWidthMm);
      const rightEncW = this.addonsBuilder.enclosureOuterWidthMm(cab, 'right', fillerWidthMm);
      const xBodyStart = scanX + leftEncW;
      const xBodyEnd = xBodyStart + cab.width;
      const xAfterAnchor = xBodyEnd + rightEncW;

      if (isFullHeightAnchor(cab.type)) {
        result.push({ xBodyStart, xBodyEnd, xAfterAnchor, tallTop: plinthHeightMm + cab.height, blockUpperAbove: cab.blockUpperAbove ?? false });
      } else if (cab.blockUpperAbove) {
        // BOTTOM cabinet with explicit block — tallTop (plinthH + baseH ≈ 820mm) never exceeds
        // ceilingY, so only blockUpperAbove flag drives repositioning. Added so skipPast... fires.
        result.push({ xBodyStart, xBodyEnd, xAfterAnchor, tallTop: plinthHeightMm + cab.height, blockUpperAbove: true });
      }
      scanX = xAfterAnchor;
    }
    return result;
  }

  /**
   * Returns the raw start-X (in mm, before adding UPPER's left enclosure) past all
   * FULL-zone anchors that this UPPER cabinet cannot fit above in CEILING mode.
   * When positionY from ceiling < anchor.tallTop, jump past the anchor so the UPPER
   * is placed beside it rather than overlapping.
   *
   * @param leftBodyOffset - UPPER's left enclosure width; body starts this far from rawX.
   *   Overlap is checked against the actual UPPER body [rawX+offset, rawX+offset+width],
   *   not the raw cursor, to avoid false conflicts when a left filler pushes the body clear.
   */
  private skipPastConflictingAnchors(
    startX: number,
    leftBodyOffset: number,
    upperWidth: number,
    upperHeight: number,
    wallHeightMm: number,
    upperFillerHeightMm: number,
    anchors: Array<{ xBodyStart: number; xBodyEnd: number; xAfterAnchor: number; tallTop: number; blockUpperAbove: boolean }>
  ): number {
    const upperCeilingY = wallHeightMm - upperFillerHeightMm - upperHeight;
    let candidateX = startX;
    let changed = true;
    while (changed) {
      changed = false;
      for (const anchor of anchors) {
        const upperBodyStart = candidateX + leftBodyOffset;
        const upperBodyEnd = upperBodyStart + upperWidth;
        if (anchor.xBodyStart < upperBodyEnd && anchor.xBodyEnd > upperBodyStart) {
          // Przesuń obok kotwicy gdy: (a) geometrycznie nie mieści się, lub (b) blokada jawna
          if (anchor.tallTop > upperCeilingY || anchor.blockUpperAbove) {
            candidateX = anchor.xAfterAnchor;
            changed = true;
            break; // restart scan from new candidateX
          }
        }
      }
    }
    return candidateX;
  }

  private calculatePositionY(
    cab: KitchenCabinet,
    wallHeightMm: number,
    upperFillerHeightMm: number,
    countertopHeightMm: number,
    plinthHeightMm: number
  ): number {
    if (!isUpperCabinetType(cab.type)) {
      // Szafki pełnowysoke (TALL_CABINET, BASE_FRIDGE) fizycznie stoją NA cokole → positionY = plinthH.
      // Spójne z backendem: CabinetPositionCalculator zwraca plinthH dla isBaseCabinet || isTallCabinet,
      // a PlacementValidator zakłada anchor.positionY = plinthH przy obliczaniu anchorTop.
      // Pozostałe szafki dolne (BASE_*) — positionY = 0 (podłoga, cokół renderowany osobno).
      return isFullHeightAnchor(cab.type) ? plinthHeightMm : 0;
    }

    if (cab.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
      return countertopHeightMm + (cab.gapFromCountertopMm ?? 500);
    }

    // RELATIVE_TO_CEILING: szafka wisząca zawsze pozycjonowana od sufitu w dół.
    // gapFromAnchorMm służy wyłącznie do walidacji minimalnego odstępu od kotwicy (TALL/BASE_FRIDGE)
    // — nie wpływa na obliczoną pozycję.
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

import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import {
  KitchenCabinet,
  WallWithCabinets,
  getCabinetZone,
  cabinetHasSegments
} from '../model/kitchen-state.model';
import {
  CabinetSide,
  ProjectCabinetRequest,
  DrawerRequest,
  CornerCabinetRequest,
  CascadeSegmentRequest
} from '../model/kitchen-project.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { mapSegmentToRequest, SegmentFormData } from '../cabinet-form/model/segment.model';
import { EnclosureType } from '../cabinet-form/model/enclosure.model';
import { CornerMechanismType, isMagicCorner, isLeMans } from '../cabinet-form/model/corner-cabinet.model';
import { WallBuildSettings } from './project-request-builder.models';
import { ProjectWallAddonsRequestBuilder } from './project-wall-addons-request.builder';
import { KitchenGeometryService } from './kitchen-geometry.service';

export class ProjectWallCabinetsBuilder {
  constructor(
    private readonly addonsBuilder: ProjectWallAddonsRequestBuilder,
    private readonly geometryService: KitchenGeometryService
  ) {}

  buildCabinets(wall: WallWithCabinets, settings: WallBuildSettings): ProjectCabinetRequest[] {
    if (wall.type === 'ISLAND') {
      return this.buildIslandCabinets(wall, settings);
    }

    return this.buildCabinetsForSide(wall, wall.cabinets, settings, 'FRONT');
  }

  private buildIslandCabinets(wall: WallWithCabinets, settings: WallBuildSettings): ProjectCabinetRequest[] {
    // Klucz scalania = stabilny `cab.id` z frontendu (NIE `cabinetId`/`name`!).
    // `request.cabinetId = cab.name || cab.id`, a `name` jest edytowalna i nieunikalna —
    // dwie szafki wyspy o tej samej nazwie kasowalyby sie w mapie i druga gubilaby sie
    // w finalnej rekonstrukcji kolejnosci.
    const requestsByCabinetUiId = new Map<string, ProjectCabinetRequest>();

    for (const side of ['FRONT', 'BACK'] as CabinetSide[]) {
      const cabinetsForSide = wall.cabinets.filter(cabinet => (cabinet.cabinetSide ?? 'FRONT') === side);
      const requests = this.buildCabinetsForSide(wall, cabinetsForSide, settings, side);
      // `buildCabinetsForSide` zachowuje kolejnosc wejscia, wiec mozemy zipowac po indeksie.
      cabinetsForSide.forEach((cabinet, index) => {
        const request = requests[index];
        if (request) {
          requestsByCabinetUiId.set(cabinet.id, request);
        }
      });
    }

    return wall.cabinets
      .map(cabinet => requestsByCabinetUiId.get(cabinet.id))
      .filter((request): request is ProjectCabinetRequest => !!request);
  }

  private buildCabinetsForSide(
    wall: WallWithCabinets,
    cabinets: KitchenCabinet[],
    settings: WallBuildSettings,
    cabinetSide: CabinetSide
  ): ProjectCabinetRequest[] {
    const { plinthHeightMm, countertopThicknessMm, upperFillerHeightMm, fillerWidthMm } = settings;
    const materialDefaults = settings.materialDefaults ?? DEFAULT_MATERIAL_DEFAULTS;

    // Delegate X/Y position calculation to KitchenGeometryService (single source of truth).
    // wallType is intentionally omitted: buildCabinetsForSide always works with per-side
    // cabinets (island is pre-split in buildIslandCabinets), so the standard linear path
    // in calculateCabinetPositions is always correct here.
    const positions = this.geometryService.calculateCabinetPositions(cabinets, {
      wallHeightMm: wall.heightMm,
      plinthHeightMm,
      countertopThicknessMm,
      upperFillerHeightMm,
      fillerWidthMm
    });
    // Key: cabinet.id (stable UI id). CabinetPosition.cabinetId === cabinet.id (set in geometry service).
    const positionMap = new Map(positions.map(p => [p.cabinetId, p]));

    return cabinets.map(cab => {
      const pos = positionMap.get(cab.id);
      const positionX = pos?.x ?? 0;

      // positionY convention differs between SVG display and backend API:
      // - Geometry service returns plinthHeightMm for BOTTOM zone (SVG: body starts above plinth).
      // - Backend expects 0 for BOTTOM zone (floor-level coordinate; plinth is separate).
      // - FULL (TALL/BASE_FRIDGE) and TOP zones use geometry service Y directly (same as backend).
      const zone = getCabinetZone(cab);
      const positionY = zone === 'BOTTOM' ? 0 : (pos?.y ?? 0);

      return {
        cabinetId: cab.name || cab.id,
        kitchenCabinetType: cab.type,
        openingType: cab.openingType,
        height: cab.height,
        width: cab.width,
        depth: cab.depth,
        positionX,
        positionY,
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
        gapBeforeMm: Math.max(0, cab.gapBeforeMm ?? 0),
        cabinetSide,
        leftEnclosure: this.mapEnclosure(cab, 'left'),
        rightEnclosure: this.mapEnclosure(cab, 'right'),
        distanceFromWallMm: cab.distanceFromWallMm ?? null,
        bottomWreathOnFloor: cab.bottomWreathOnFloor ?? false,
        ...this.buildTypeSpecificFields(cab)
      };
    });
  }

  private buildDrawerRequest(cab: KitchenCabinet): DrawerRequest | undefined {
    if (cab.type === KitchenCabinetType.BASE_CARGO && cab.cargoVariant === 'DRAWERS') {
      return {
        drawerQuantity: cab.drawerQuantity ?? 3,
        drawerModel: cab.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

    if (cab.type === KitchenCabinetType.BASE_CARGO && cab.cargoVariant === 'MECHANISM') {
      return {
        drawerQuantity: cab.drawerQuantity ?? 3,
        drawerModel: null,
        drawerBaseHdf: false,
        drawerFrontDetails: null
      };
    }

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

    const blindPanelSplitEnabled = cab.blindPanelSplitEnabled ?? cab.blindPanelVisibleWidthMm != null;
    // Faza 1 — parametry systemowe (handedness/angle/thickness/line) tylko dla jednostronnych
    // systemów Type B (Magic Corner, Le Mans); dla pozostałych mechanizmów zostają null.
    const isSystemMechanism = isMagicCorner(cab.cornerMechanism as CornerMechanismType)
      || isLeMans(cab.cornerMechanism as CornerMechanismType);

    return {
      widthA: cab.cornerWidthA,
      widthB: cab.cornerWidthB ?? null,
      mechanism: cab.cornerMechanism,
      shelfQuantity: cab.cornerShelfQuantity,
      upperCabinet: cab.isUpperCorner ?? false,
      cornerOpeningType: cab.cornerOpeningType,
      frontUchylnyWidthMm: cab.cornerFrontUchylnyWidthMm,
      cornerHandleType: cab.cornerHandleType,
      // Iteracja 2 [B1] — wyślij FS1 tylko gdy split włączony
      blindPanelVisibleWidthMm: blindPanelSplitEnabled ? (cab.blindPanelVisibleWidthMm ?? 150) : null,
      // Iter.4 [A2 C] — BE only, propagacja gdyby pole było ustawione (UI dropdown w Iter.5)
      wreathConstructionType: cab.wreathConstructionType ?? null,
      // Faza 1 — systemowe parametry Le Mans / Magic Corner (Type B)
      handedness: isSystemMechanism ? (cab.cornerHandedness ?? null) : null,
      openingAngleDeg: isSystemMechanism ? (cab.cornerOpeningAngleDeg ?? null) : null,
      frontThicknessMm: isSystemMechanism ? (cab.cornerFrontThicknessMm ?? null) : null,
      systemLine: isSystemMechanism ? (cab.cornerSystemLine ?? null) : null
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
      case KitchenCabinetType.BASE_CARGO:
        return {
          cargoVariant: cab.cargoVariant,
          cargoBrand: cab.cargoBrand
        };
      case KitchenCabinetType.PANTRY_PASSAGE:
        return {
          pantryPassageFrontType: cab.pantryPassageFrontType
        };
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
      case KitchenCabinetType.UPPER_LIFT_UP:
        return {
          isLiftUp: true,
          isFrontExtended: cab.isFrontExtended,
          liftMechanismType: cab.liftMechanismType ?? 'GAS_GTV',
          allowThirdLiftMechanism: cab.allowThirdLiftMechanism ?? false,
          hfUpperFrontHeightMm: cab.hfUpperFrontHeightMm ?? null
        };
      case KitchenCabinetType.UPPER_DRAINER:
        return { drainerFrontType: cab.drainerFrontType };
      default:
        return {};
    }
  }
}

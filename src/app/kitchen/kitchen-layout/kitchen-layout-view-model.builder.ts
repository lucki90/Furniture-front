import { SegmentFormData } from '../cabinet-form/model/segment.model';
import { CabinetPosition, CabinetZone, getCabinetZone, isFreestandingAppliance, KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CABINET_RENDER_REGISTRY } from './strategies/cabinet-render-registry';
import { CabinetRenderContext, DisplayFront, DisplayHandle } from './strategies/cabinet-render-context';
import { OVEN_HEIGHT_COMPACT_MM, OVEN_HEIGHT_STANDARD_MM, PLATE_THICKNESS_MM } from './kitchen-layout.constants';

export interface DisplayFoot {
  x: number;
  y1: number;
  y2: number;
}

export interface VisualCabinetPosition {
  cabinetId: string;
  name?: string;
  type: KitchenCabinetType;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  bodyHeight: number;
  zone: CabinetZone;
  isOverflow: boolean;
  isCorner: boolean;
  cornerWidthB?: number;
  fronts: DisplayFront[];
  handles: DisplayHandle[];
  feet: DisplayFoot[];
  feetHeight: number;
  drawerQuantity?: number;
  segments?: SegmentFormData[];
  heightDiff?: number;
  depthDiff?: number;
  leftEnclosureType?: string;
  rightEnclosureType?: string;
  leftEnclosureDisplayWidth: number;
  rightEnclosureDisplayWidth: number;
  ovenSeparatorDisplayY?: number;
  isFreestandingAppliance: boolean;
}

export interface KitchenLayoutViewModelInput {
  cabinetPositions: CabinetPosition[];
  cabinets: KitchenCabinet[];
  scale: number;
  wallWidth: number;
  wallDisplayHeight: number;
  scaleVert: number;
  feetHeightMm: number;
  fillerWidthMm: number;
  standardBottomHeight: number;
  standardTopHeight: number;
  standardBottomDepth: number;
  standardTopDepth: number;
  frontGap: number;
}

export function buildVisualCabinetPositions(input: KitchenLayoutViewModelInput): VisualCabinetPosition[] {
  return input.cabinetPositions.map(position => {
    const originalCabinet = input.cabinets.find(cabinet => cabinet.id === position.cabinetId);
    const zone: CabinetZone = originalCabinet ? getCabinetZone(originalCabinet) : 'BOTTOM';
    const cabinetType = originalCabinet?.type ?? KitchenCabinetType.BASE_ONE_DOOR;
    const depth = originalCabinet?.depth ?? 560;
    const cabinetData = originalCabinet as (KitchenCabinet & Record<string, unknown>) | undefined;

    const isCorner = cabinetType === KitchenCabinetType.CORNER_CABINET;
    const cornerWidthB = isCorner ? (cabinetData?.cornerWidthB as number | undefined) : undefined;
    const drawerQuantity = cabinetData?.drawerQuantity as number | undefined;
    const shelfQuantity = originalCabinet?.shelfQuantity;
    const segments = cabinetData?.segments as SegmentFormData[] | undefined;
    const cascadeLowerHeight = cabinetData?.cascadeLowerHeight as number | undefined;
    const cascadeUpperHeight = cabinetData?.cascadeUpperHeight as number | undefined;

    const displayX = position.x * input.scale;
    const displayWidth = position.width * input.scale;
    const displayHeight = Math.round(position.height * input.scaleVert);

    const feetHeightPx = Math.round(input.feetHeightMm * input.scaleVert);
    const displayY = resolveDisplayY(zone, position, displayHeight, feetHeightPx, input.wallDisplayHeight, input.scaleVert);
    const isOverflow = displayX + displayWidth > input.wallWidth;
    const hasFeet = zone === 'BOTTOM' || zone === 'FULL';
    const feetHeight = hasFeet ? feetHeightPx : 0;
    const bodyHeight = zone === 'FULL' ? displayHeight - feetHeight : displayHeight;
    const feet = generateFeet(displayX, displayY + bodyHeight, displayWidth, feetHeight, input.wallDisplayHeight);

    const ovenConfig = cabinetType === KitchenCabinetType.BASE_OVEN ? {
      ovenHeightType: cabinetData?.ovenHeightType as string | undefined,
      ovenLowerSectionType: cabinetData?.ovenLowerSectionType as string | undefined,
      ovenApronEnabled: cabinetData?.ovenApronEnabled as boolean | undefined,
      ovenApronHeightMm: cabinetData?.ovenApronHeightMm as number | undefined
    } : undefined;

    const fridgeConfig = (cabinetType === KitchenCabinetType.BASE_FRIDGE || cabinetType === KitchenCabinetType.BASE_FRIDGE_FREESTANDING) ? {
      fridgeSectionType: cabinetData?.fridgeSectionType as string | undefined,
      lowerFrontHeightMm: cabinetData?.lowerFrontHeightMm as number | undefined,
      fridgeFreestandingType: cabinetData?.fridgeFreestandingType as string | undefined,
      heightMm: originalCabinet?.height,
      upperSections: cabinetData?.segments as SegmentFormData[] | undefined
    } : undefined;

    const { fronts, handles } = generateVisualElements({
      type: cabinetType,
      displayX,
      bodyY: displayY,
      displayWidth,
      bodyHeight,
      frontGap: input.frontGap,
      scaleVert: input.scaleVert,
      drawerQuantity,
      segments,
      shelfQuantity,
      cascadeLowerHeight,
      cascadeUpperHeight,
      ovenConfig,
      fridgeConfig
    });

    let ovenSeparatorDisplayY: number | undefined;
    if (cabinetType === KitchenCabinetType.BASE_OVEN && ovenConfig?.ovenLowerSectionType !== 'NONE') {
      const apronHeight = ovenConfig?.ovenApronEnabled ? (ovenConfig.ovenApronHeightMm ?? 0) : 0;
      const ovenSlotHeight = ovenConfig?.ovenHeightType === 'COMPACT' ? OVEN_HEIGHT_COMPACT_MM : OVEN_HEIGHT_STANDARD_MM;
      ovenSeparatorDisplayY = displayY + Math.round((PLATE_THICKNESS_MM + apronHeight + ovenSlotHeight) * input.scaleVert);
      if (ovenSeparatorDisplayY >= displayY + bodyHeight || ovenSeparatorDisplayY <= displayY) {
        ovenSeparatorDisplayY = undefined;
      }
    }

    const standardHeight = zone === 'TOP' ? input.standardTopHeight : input.standardBottomHeight;
    const standardDepth = zone === 'TOP' ? input.standardTopDepth : input.standardBottomDepth;
    const heightDiff = position.height - standardHeight;
    const depthDiff = depth - standardDepth;

    const leftFillerMm = originalCabinet?.leftFillerWidthOverrideMm ?? input.fillerWidthMm;
    const rightFillerMm = originalCabinet?.rightFillerWidthOverrideMm ?? input.fillerWidthMm;
    const leftEncType = originalCabinet?.leftEnclosureType;
    const rightEncType = originalCabinet?.rightEnclosureType;
    const leftEnclosureDisplayWidth = calculateEnclosureDisplayWidth(leftEncType, leftFillerMm, input.scale);
    const rightEnclosureDisplayWidth = calculateEnclosureDisplayWidth(rightEncType, rightFillerMm, input.scale);

    return {
      cabinetId: position.cabinetId,
      name: position.name,
      type: cabinetType,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      depth,
      displayX,
      displayY,
      displayWidth,
      displayHeight,
      bodyHeight,
      zone,
      isOverflow,
      isCorner,
      cornerWidthB,
      fronts,
      handles,
      feet,
      feetHeight,
      drawerQuantity,
      segments,
      heightDiff: heightDiff !== 0 ? heightDiff : undefined,
      depthDiff: depthDiff !== 0 ? depthDiff : undefined,
      leftEnclosureType: leftEncType,
      rightEnclosureType: rightEncType,
      leftEnclosureDisplayWidth,
      rightEnclosureDisplayWidth,
      ovenSeparatorDisplayY,
      isFreestandingAppliance: isFreestandingAppliance(cabinetType)
    };
  });
}

function resolveDisplayY(
  zone: CabinetZone,
  position: CabinetPosition,
  displayHeight: number,
  feetHeightPx: number,
  wallDisplayHeight: number,
  scaleVert: number
): number {
  switch (zone) {
    case 'FULL':
      return wallDisplayHeight - displayHeight;
    case 'TOP':
      return wallDisplayHeight - Math.round((position.y + position.height) * scaleVert);
    case 'BOTTOM':
    default:
      return wallDisplayHeight - feetHeightPx - displayHeight;
  }
}

function generateFeet(
  displayX: number,
  bottomY: number,
  displayWidth: number,
  feetHeight: number,
  wallDisplayHeight: number
): DisplayFoot[] {
  if (feetHeight <= 0) {
    return [];
  }

  const margin = Math.max(3, displayWidth * 0.1);
  return [
    { x: displayX + margin, y1: bottomY, y2: wallDisplayHeight },
    { x: displayX + displayWidth - margin, y1: bottomY, y2: wallDisplayHeight }
  ];
}

function generateVisualElements(ctx: CabinetRenderContext & { type: KitchenCabinetType }): { fronts: DisplayFront[]; handles: DisplayHandle[] } {
  const fronts: DisplayFront[] = [];
  const handles: DisplayHandle[] = [];
  CABINET_RENDER_REGISTRY[ctx.type]?.(ctx, fronts, handles);
  return { fronts, handles };
}

function calculateEnclosureDisplayWidth(type: string | undefined, fillerMm: number, scale: number): number {
  if (!type || type === 'NONE') {
    return 0;
  }

  const widthMm = type === 'PARALLEL_FILLER_STRIP' ? fillerMm : PLATE_THICKNESS_MM;
  return Math.max(1, Math.round(widthMm * scale));
}

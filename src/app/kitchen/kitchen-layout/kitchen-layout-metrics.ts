import { getCabinetZone, KitchenCabinet, requiresCountertop, WallWithCabinets } from '../model/kitchen-state.model';

export const MIN_WORKSPACE_GAP_MM = 450;
const DEFAULT_BOTTOM_CORPUS_HEIGHT_MM = 720;
const DEFAULT_TOP_CORPUS_HEIGHT_MM = 720;
const DEFAULT_WALL_HEIGHT_MM = 2400;

export interface KitchenLayoutGapWarning {
  message: string;
  minMm: number;
  actualMm: number;
}

export interface KitchenLayoutGapDimensionLine {
  x: number;
  y1: number;
  y2: number;
  label: string;
  isWarning: boolean;
}

export interface KitchenLayoutMetricsInput {
  cabinets: KitchenCabinet[];
  wallHeightMm: number;
  plinthHeightMm: number;
  countertopThicknessMm: number;
  upperFillerHeightMm: number;
  wallDisplayWidth: number;
  wallDisplayHeight: number;
  hasBottomCabinets: boolean;
  hasHangingCabinets: boolean;
}

export interface KitchenLayoutMetrics {
  realBottomZoneMm: number;
  realTopZoneMm: number;
  realCounterMm: number;
  actualGapMm: number;
  realGapMm: number;
  totalRealMm: number;
  scaleVert: number;
  topZoneHeight: number;
  gapZoneY: number;
  gapZoneHeight: number;
  counterZoneY: number;
  counterZoneHeight: number;
  bottomZoneY: number;
  bottomZoneHeight: number;
  fillerHeightPx: number;
  gapMm: number;
  isWorkspaceGapViolation: boolean;
  gapDimensionLine: KitchenLayoutGapDimensionLine | null;
}

export function buildKitchenLayoutMetrics(input: KitchenLayoutMetricsInput): KitchenLayoutMetrics {
  const realBottomZoneMm = calculateBottomZoneMm(input.cabinets, input.plinthHeightMm);
  const realTopZoneMm = calculateTopZoneMm(input.cabinets, input.upperFillerHeightMm);
  const realCounterMm = input.countertopThicknessMm;
  const actualGapMm = (input.wallHeightMm || DEFAULT_WALL_HEIGHT_MM) - realTopZoneMm - realCounterMm - realBottomZoneMm;
  const realGapMm = Math.max(actualGapMm, MIN_WORKSPACE_GAP_MM);
  const totalRealMm = realTopZoneMm + realGapMm + realCounterMm + realBottomZoneMm;
  const scaleVert = input.wallDisplayHeight / totalRealMm;
  const topZoneHeight = Math.round(realTopZoneMm * scaleVert);
  const gapZoneHeight = Math.round(realGapMm * scaleVert);
  const counterZoneHeight = Math.round(realCounterMm * scaleVert);
  const bottomZoneHeight = Math.round(realBottomZoneMm * scaleVert);
  const gapZoneY = topZoneHeight;
  const counterZoneY = topZoneHeight + gapZoneHeight;
  const bottomZoneY = counterZoneY + counterZoneHeight;
  const fillerHeightPx = Math.round(input.upperFillerHeightMm * scaleVert);
  const gapMm = Math.round(actualGapMm);
  const isWorkspaceGapViolation = input.hasBottomCabinets && input.hasHangingCabinets && actualGapMm < MIN_WORKSPACE_GAP_MM;

  return {
    realBottomZoneMm,
    realTopZoneMm,
    realCounterMm,
    actualGapMm,
    realGapMm,
    totalRealMm,
    scaleVert,
    topZoneHeight,
    gapZoneY,
    gapZoneHeight,
    counterZoneY,
    counterZoneHeight,
    bottomZoneY,
    bottomZoneHeight,
    fillerHeightPx,
    gapMm,
    isWorkspaceGapViolation,
    gapDimensionLine: buildGapDimensionLine(
      input.wallDisplayWidth,
      topZoneHeight,
      gapZoneHeight,
      actualGapMm,
      input.hasBottomCabinets,
      input.hasHangingCabinets
    )
  };
}

export function buildCooktopGapWarning(
  selectedWall: WallWithCabinets | undefined,
  hasHangingCabinets: boolean,
  actualGapMm: number
): KitchenLayoutGapWarning | null {
  if (!hasHangingCabinets || !selectedWall) {
    return null;
  }

  const cooktopCabinet = selectedWall.cabinets.find(cabinet => cabinet.type === 'BASE_COOKTOP');
  if (!cooktopCabinet) {
    return null;
  }

  const minMm = cooktopCabinet.cooktopType === 'GAS' ? 750 : 600;
  const actualMm = Math.round(actualGapMm);
  if (actualMm >= minMm) {
    return null;
  }

  const typeName = cooktopCabinet.cooktopType === 'GAS' ? 'gazowej' : 'indukcyjnej';
  return {
    message: `Odległość między płytą ${typeName} a szafką powyżej: ${actualMm}mm (wymagane min. ${minMm}mm)`,
    minMm,
    actualMm
  };
}

function calculateBottomZoneMm(cabinets: KitchenCabinet[], plinthHeightMm: number): number {
  const bottomCabinets = cabinets.filter(cabinet => requiresCountertop(cabinet.type));
  const maxHeightMm = bottomCabinets.length > 0
    ? Math.max(...bottomCabinets.map(cabinet => cabinet.height))
    : DEFAULT_BOTTOM_CORPUS_HEIGHT_MM;

  return plinthHeightMm + maxHeightMm;
}

function calculateTopZoneMm(cabinets: KitchenCabinet[], upperFillerHeightMm: number): number {
  const topCabinets = cabinets.filter(cabinet => getCabinetZone(cabinet) === 'TOP');
  const maxHeightMm = topCabinets.length > 0
    ? Math.max(...topCabinets.map(cabinet => cabinet.height))
    : DEFAULT_TOP_CORPUS_HEIGHT_MM;

  return maxHeightMm + upperFillerHeightMm;
}

function buildGapDimensionLine(
  wallDisplayWidth: number,
  topZoneHeight: number,
  gapZoneHeight: number,
  actualGapMm: number,
  hasBottomCabinets: boolean,
  hasHangingCabinets: boolean
): KitchenLayoutGapDimensionLine | null {
  if (!hasBottomCabinets || !hasHangingCabinets) {
    return null;
  }

  return {
    x: wallDisplayWidth + 4,
    y1: topZoneHeight,
    y2: topZoneHeight + gapZoneHeight,
    label: `${Math.round(actualGapMm)} mm`,
    isWarning: actualGapMm < MIN_WORKSPACE_GAP_MM
  };
}

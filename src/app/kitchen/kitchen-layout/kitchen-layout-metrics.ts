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

/** Minimalny zalecany luz montażowy między skrajną szafką a ścianą boczną (mm). Poniżej → zaleca się blendę boczną. */
export const SIDE_WALL_CLEARANCE_MM = 50;

export interface KitchenLayoutSideFillerWarning {
  /** Strony, których dotyczy ostrzeżenie (skrajne szafki przy ścianie bez blendy bocznej). */
  sides: ('left' | 'right')[];
  message: string;
}

/** Minimalna pozycja/szerokość szafki potrzebna do wykrycia szafek skrajnych przy ścianie. */
export interface KitchenLayoutCabinetSpan {
  cabinetId: string;
  x: number;
  width: number;
}

/**
 * Ostrzeżenie nieblokujące: szafka skrajna styka się ze ścianą boczną (luz < {@link SIDE_WALL_CLEARANCE_MM} mm)
 * i nie ma po tej stronie blendy bocznej / panelu bocznego (obudowy).
 *
 * <p>To NIE jest inny sposób liczenia płyt — formuła pozostaje bez zmian. To wyłącznie uwaga do pozycjonowania:
 * bez blendy front uchylny / zawias może kolidować ze ścianą, a montaż nie ma luzu (książka Wasiak v.2.3 —
 * odstęp od ściany bocznej). Zalecenie: dodać blendę boczną (min. 20 mm) na skrajnej szafce.</p>
 *
 * <p>Reguły wygaszania:</p>
 * <ul>
 *   <li>ISLAND → pomijamy (wyspa nie ma ścian bocznych; używa paneli bocznych).</li>
 *   <li>CORNER_LEFT → wygaszamy lewą stronę (łączy się z sąsiednią ścianą, nie ze ścianą boczną).</li>
 *   <li>CORNER_RIGHT → wygaszamy prawą stronę.</li>
 * </ul>
 *
 * TODO(uklad-L-U): dla ścian LEFT/RIGHT (pionowych w układzie L/U) krawędź stykająca się z narożnikiem jest
 * wykrywana tylko heurystycznie po typie ściany — możliwe nadmiarowe ostrzeżenie po stronie wewnętrznego narożnika.
 * Docelowo powiązać z modelem połączeń ścian (WallConnection), aby wygaszać dokładnie krawędź narożną.
 */
export function buildSideFillerWarning(
  selectedWall: WallWithCabinets | undefined,
  spans: KitchenLayoutCabinetSpan[],
  wallWidthMm: number
): KitchenLayoutSideFillerWarning | null {
  if (!selectedWall || selectedWall.type === 'ISLAND' || spans.length === 0 || wallWidthMm <= 0) {
    return null;
  }

  const cabinetsById = new Map(selectedWall.cabinets.map(cabinet => [cabinet.id, cabinet]));

  let leftSpan = spans[0];
  let rightSpan = spans[0];
  for (const span of spans) {
    if (span.x < leftSpan.x) {
      leftSpan = span;
    }
    if (span.x + span.width > rightSpan.x + rightSpan.width) {
      rightSpan = span;
    }
  }

  const sides: ('left' | 'right')[] = [];

  const leftConnectedToWall = selectedWall.type === 'CORNER_LEFT';
  const leftGapMm = leftSpan.x;
  if (!leftConnectedToWall && leftGapMm < SIDE_WALL_CLEARANCE_MM && hasNoSideFiller(cabinetsById.get(leftSpan.cabinetId), 'left')) {
    sides.push('left');
  }

  const rightConnectedToWall = selectedWall.type === 'CORNER_RIGHT';
  const rightGapMm = wallWidthMm - (rightSpan.x + rightSpan.width);
  if (!rightConnectedToWall && rightGapMm < SIDE_WALL_CLEARANCE_MM && hasNoSideFiller(cabinetsById.get(rightSpan.cabinetId), 'right')) {
    sides.push('right');
  }

  if (sides.length === 0) {
    return null;
  }

  return { sides, message: buildSideFillerMessage(sides) };
}

function hasNoSideFiller(cabinet: KitchenCabinet | undefined, side: 'left' | 'right'): boolean {
  if (!cabinet) {
    return false;
  }
  const enclosureType = side === 'left' ? cabinet.leftEnclosureType : cabinet.rightEnclosureType;
  return !enclosureType || enclosureType === 'NONE';
}

function buildSideFillerMessage(sides: ('left' | 'right')[]): string {
  const label = sides.length === 2 ? 'lewa i prawa' : sides[0] === 'left' ? 'lewa' : 'prawa';
  const subject = sides.length === 2 ? 'Skrajne szafki stykają się' : 'Skrajna szafka styka się';
  return `${subject} ze ścianą boczną bez blendy bocznej (${label}). Zalecane dodanie blendy bocznej `
    + `(min. 20 mm) — zabezpiecza front/zawias przed kolizją ze ścianą i daje luz montażowy.`;
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

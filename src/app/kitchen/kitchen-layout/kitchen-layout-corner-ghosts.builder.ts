import { CabinetZone, cabinetRequiresCountertop, getCabinetZone } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { CornerGhost, CornerGhostKind, CornerReservedZone } from '../service/corner-layout/corner-layout.model';
import { resolveCabinetVerticalBox } from './kitchen-layout-view-model.builder';

export interface CornerLayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cień szafki sąsiedniej ściany na elewacji (px). */
export interface CornerGhostView {
  key: string;
  cabinetId: string;
  kind: CornerGhostKind;
  zone: CabinetZone;
  body: CornerLayoutRect;
  /** Front ramienia szafki L. */
  front: CornerLayoutRect | null;
  /** Krawędź blatu szafki sąsiedniej ściany. */
  countertop: CornerLayoutRect | null;
  conflict: boolean;
  title: string;
}

/** Strefa narożna oglądanej ściany (px). */
export interface CornerReservedZoneView {
  key: string;
  rect: CornerLayoutRect;
  title: string;
}

export interface CornerGhostLayerView {
  ghosts: CornerGhostView[];
  reservedZones: CornerReservedZoneView[];
}

export const EMPTY_CORNER_GHOST_LAYER: CornerGhostLayerView = { ghosts: [], reservedZones: [] };

/** Pionowy pas elewacji (px). */
export interface CornerLayoutBand {
  y: number;
  height: number;
}

export interface CornerGhostLayerInput {
  ghosts: readonly CornerGhost[];
  reservedZones: readonly CornerReservedZone[];
  scale: number;
  scaleVert: number;
  wallDisplayHeight: number;
  topZone: CornerLayoutBand;
  counterZone: CornerLayoutBand;
  bottomZone: CornerLayoutBand;
  showUpperCabinets: boolean;
  showCountertop: boolean;
  /** Wysokość cokołu ściany, na której stoi szafka. */
  feetHeightMmFor: (wallId: string) => number;
  /** Głębokość blatu ściany, na której stoi szafka. */
  countertopDepthMmFor: (wallId: string) => number;
  cabinetLabel: (ghost: CornerGhost) => string;
  wallLabel: (type: WallType) => string;
}

/**
 * Warstwa elewacji przy narożnikach: szafki sąsiednich ścian jako cienie (bok albo ramię szafki L, z krawędzią blatu)
 * i zakreskowane strefy narożne. Szafki górne i ich strefy znikają razem z przełącznikiem szafek górnych.
 */
export function buildCornerGhostLayer(input: CornerGhostLayerInput): CornerGhostLayerView {
  return {
    ghosts: input.ghosts
      .map(ghost => ghostView(ghost, input))
      .filter(view => input.showUpperCabinets || view.zone !== 'TOP'),
    reservedZones: input.reservedZones
      .filter(zone => input.showUpperCabinets || zone.level !== 'UPPER')
      .map(zone => reservedZoneView(zone, input))
  };
}

function ghostView(ghost: CornerGhost, input: CornerGhostLayerInput): CornerGhostView {
  const zone = getCabinetZone(ghost.cabinet);
  const box = resolveCabinetVerticalBox(
    zone,
    ghost.cabinet.type,
    ghost.sourcePosition,
    input.feetHeightMmFor(ghost.sourceWallId),
    input.scaleVert,
    input.wallDisplayHeight
  );
  const span = (startMm: number, endMm: number): CornerLayoutRect => ({
    x: startMm * input.scale,
    y: box.displayY,
    width: (endMm - startMm) * input.scale,
    height: box.bodyHeight
  });
  const front = ghost.frontStartMm !== null && ghost.frontEndMm !== null
    ? span(ghost.frontStartMm, ghost.frontEndMm)
    : null;
  const conflictNote = ghost.conflict ? ' — koliduje w narożniku' : '';

  return {
    key: `${ghost.wallEnd}|${ghost.cabinet.id}`,
    cabinetId: ghost.cabinet.id,
    kind: ghost.kind,
    zone,
    body: span(ghost.startMm, ghost.endMm),
    front,
    countertop: countertopRect(ghost, input),
    conflict: ghost.conflict,
    title: `${input.wallLabel(ghost.sourceWallType)}: ${input.cabinetLabel(ghost)}${conflictNote}`
  };
}

/** Krawędź blatu sąsiedniej ściany od narożnika: głębokość blatu, a nad ramieniem szafki L — całe ramię. */
function countertopRect(ghost: CornerGhost, input: CornerGhostLayerInput): CornerLayoutRect | null {
  if (!input.showCountertop || !cabinetRequiresCountertop(ghost.cabinet)) {
    return null;
  }
  const depthMm = ghost.kind === 'L_ARM'
    ? ghost.endMm - ghost.startMm
    : input.countertopDepthMmFor(ghost.sourceWallId);
  const startMm = ghost.wallEnd === 'START' ? ghost.startMm : ghost.endMm - depthMm;
  return {
    x: startMm * input.scale,
    y: input.counterZone.y,
    width: depthMm * input.scale,
    height: input.counterZone.height
  };
}

function reservedZoneView(zone: CornerReservedZone, input: CornerGhostLayerInput): CornerReservedZoneView {
  const band = zone.level === 'BASE' ? input.bottomZone : input.topZone;
  const widthMm = zone.endMm - zone.startMm;
  const levelLabel = zone.level === 'BASE' ? 'dolna' : 'górna';
  return {
    key: `${zone.wallEnd}|${zone.level}`,
    rect: { x: zone.startMm * input.scale, y: band.y, width: widthMm * input.scale, height: band.height },
    title: `Strefa narożna ${levelLabel}: ${Math.round(widthMm)} mm zajmują szafki sąsiedniej ściany`
  };
}

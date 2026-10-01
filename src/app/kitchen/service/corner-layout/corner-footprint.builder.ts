import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { isBlindType } from '../../cabinet-form/model/corner-cabinet.model';
import { CabinetPosition, KitchenCabinet, WallWithCabinets } from '../../model/kitchen-state.model';
import { ProjectWallAddonsRequestBuilder } from '../project-wall-addons-request.builder';
import {
  CornerFootprint,
  CornerGeometrySettings,
  CornerLevel,
  CornerRectMm,
  WallCorner,
  WallEnd
} from './corner-layout.model';
import { cabinetReachMm, isCabinetOnCornerLevel } from './corner-reach';

/** Pozycje szafek (lewa krawędź korpusu, mm) per ściana — wynik `KitchenGeometryService`. */
export type CabinetPositionsByWallId = ReadonlyMap<string, readonly CabinetPosition[]>;

const addonsBuilder = new ProjectWallAddonsRequestBuilder();

/**
 * Rzuty szafek obu ścian narożnika w układzie narożnika. Szafka ściany A zajmuje `u ∈ [bliższa, dalsza krawędź]`
 * i `v ∈ [0, zasięg]`, szafka ściany B — odwrotnie. Odcinek wzdłuż ściany obejmuje obudowy boczne. Szafka L
 * (typ A) stojąca w narożniku ma dodatkowe ramię wzdłuż sąsiedniej ściany o długości `cornerWidthB`.
 *
 * Spójne z backendem: `CornerFootprintFactory`.
 */
export function buildCornerFootprints(
  corner: WallCorner,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  level: CornerLevel,
  settings: CornerGeometrySettings
): CornerFootprint[] {
  return [
    ...wallFootprints(walls, corner.a.wallId, corner.a.end, true, positionsByWallId, level, settings),
    ...wallFootprints(walls, corner.b.wallId, corner.b.end, false, positionsByWallId, level, settings)
  ];
}

/** Lewa krawędź szafki na jej ścianie razem z lewą obudową. */
export function cabinetStartWithEnclosureMm(cabinet: KitchenCabinet, x: number, settings: CornerGeometrySettings): number {
  return x - addonsBuilder.enclosureOuterWidthMm(cabinet, 'left', settings.enclosureFillerWidthMm);
}

/** Prawa krawędź szafki na jej ścianie razem z prawą obudową. */
export function cabinetEndWithEnclosureMm(cabinet: KitchenCabinet, x: number, settings: CornerGeometrySettings): number {
  return x + cabinet.width + addonsBuilder.enclosureOuterWidthMm(cabinet, 'right', settings.enclosureFillerWidthMm);
}

/** Część wspólna o dodatniej powierzchni; styk krawędzi nie jest kolizją. */
export function cornerRectsOverlap(a: CornerRectMm, b: CornerRectMm): boolean {
  return a.uMin < b.uMax && a.uMax > b.uMin && a.vMin < b.vMax && a.vMax > b.vMin;
}

export function cornerFootprintsOverlap(a: CornerFootprint, b: CornerFootprint): boolean {
  return a.rects.some(rectA => b.rects.some(rectB => cornerRectsOverlap(rectA, rectB)));
}

export function isCornerCabinetFootprint(footprint: CornerFootprint): boolean {
  return footprint.cabinet.type === KitchenCabinetType.CORNER_CABINET;
}

/** Szafka narożna stoi w narożniku, gdy jej bliższa krawędź leży bliżej narożnika niż jej własny zasięg. */
export function isCornerCabinetAtCorner(footprint: CornerFootprint): boolean {
  return isCornerCabinetFootprint(footprint) && footprint.nearEdgeMm < footprint.reachMm;
}

/** Szafka narożna typu B: ślepy narożnik, Magic Corner albo Le Mans. */
export function isBlindCornerFootprint(footprint: CornerFootprint): boolean {
  const cabinet = footprint.cabinet;
  return cabinet.type === KitchenCabinetType.CORNER_CABINET && isBlindType(cabinet.cornerMechanism);
}

/** Długość ramienia szafki L wzdłuż sąsiedniej ściany (`cornerWidthB`); `null` dla pozostałych szafek. */
export function partnerWallArmLengthMm(cabinet: KitchenCabinet): number | null {
  if (cabinet.type !== KitchenCabinetType.CORNER_CABINET || isBlindType(cabinet.cornerMechanism)) {
    return null;
  }
  const widthB = cabinet.cornerWidthB;
  return typeof widthB === 'number' && widthB > 0 ? widthB : null;
}

function wallFootprints(
  walls: readonly WallWithCabinets[],
  wallId: string,
  wallEnd: WallEnd,
  alongU: boolean,
  positionsByWallId: CabinetPositionsByWallId,
  level: CornerLevel,
  settings: CornerGeometrySettings
): CornerFootprint[] {
  const wall = walls.find(candidate => candidate.id === wallId);
  if (!wall) {
    return [];
  }
  const xById = new Map((positionsByWallId.get(wallId) ?? []).map(position => [position.cabinetId, position.x]));

  return wall.cabinets.flatMap(cabinet => {
    const x = xById.get(cabinet.id);
    if (x === undefined || !isCabinetOnCornerLevel(cabinet, level)) {
      return [];
    }
    return [footprint(wall, wallEnd, alongU, cabinet, x, level, settings)];
  });
}

function footprint(
  wall: WallWithCabinets,
  wallEnd: WallEnd,
  alongU: boolean,
  cabinet: KitchenCabinet,
  x: number,
  level: CornerLevel,
  settings: CornerGeometrySettings
): CornerFootprint {
  const startMm = cabinetStartWithEnclosureMm(cabinet, x, settings);
  const endMm = cabinetEndWithEnclosureMm(cabinet, x, settings);
  const nearEdgeMm = wallEnd === 'START' ? startMm : wall.widthMm - endMm;
  const farEdgeMm = wallEnd === 'START' ? endMm : wall.widthMm - startMm;
  const reachMm = cabinetReachMm(cabinet, settings);

  const rects: CornerRectMm[] = [rect(alongU, nearEdgeMm, farEdgeMm, 0, reachMm)];
  const armLengthMm = partnerWallArmLengthMm(cabinet);
  if (armLengthMm !== null && nearEdgeMm < reachMm) {
    rects.push(rect(alongU, nearEdgeMm, nearEdgeMm + reachMm, 0, armLengthMm));
  }

  return { wallId: wall.id, wallType: wall.type, wallEnd, cabinet, level, nearEdgeMm, farEdgeMm, reachMm, rects };
}

/** Prostokąt z osi własnej ściany (`along`) i osi w głąb pomieszczenia (`depth`). */
function rect(alongU: boolean, alongMin: number, alongMax: number, depthMin: number, depthMax: number): CornerRectMm {
  return alongU
    ? { uMin: alongMin, uMax: alongMax, vMin: depthMin, vMax: depthMax }
    : { uMin: depthMin, uMax: depthMax, vMin: alongMin, vMax: alongMax };
}

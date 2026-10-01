import { WallWithCabinets } from '../../model/kitchen-state.model';
import {
  CORNER_LEVELS,
  CornerFootprint,
  CornerGeometrySettings,
  CornerGhost,
  CornerIssue,
  CornerReservedZone,
  WallCorner,
  WallCornerConstraints,
  WallCornerEndpoint,
  WallTopology
} from './corner-layout.model';
import { buildCornerFootprints, CabinetPositionsByWallId, partnerWallArmLengthMm } from './corner-footprint.builder';
import { cornerIssueCabinetIds } from './corner-issue-messages';
import { maxCabinetReachMm } from './corner-reach';

interface GhostContext {
  target: WallCornerEndpoint;
  targetWall: WallWithCabinets;
  positionsByWallId: CabinetPositionsByWallId;
  conflictPairs: ReadonlySet<string>;
}

/**
 * Szafki sąsiednich ścian widoczne na elewacji przy narożniku. Elewacja jest przekrojem do głębokości szafek
 * oglądanej ściany: pokazujemy bok szafki sąsiedniej ściany, gdy jej bliższa krawędź leży nie dalej niż największy
 * zasięg szafek oglądanej ściany na tym poziomie (bez szafek na tym poziomie — gdy szafka stoi w narożniku).
 * Szafka L stojąca w narożniku pokazuje całe ramię wzdłuż oglądanej ściany, z frontem za kwadratem narożnym.
 */
export function buildCornerGhosts(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  issues: readonly CornerIssue[],
  settings: CornerGeometrySettings
): CornerGhost[] {
  const conflictPairs = errorCabinetPairs(issues);
  return topology.corners.flatMap(corner => [
    ...ghostsOnWall(corner, corner.a, corner.b, walls, positionsByWallId, conflictPairs, settings),
    ...ghostsOnWall(corner, corner.b, corner.a, walls, positionsByWallId, conflictPairs, settings)
  ]);
}

/** Strefy narożne ścian (osobno dół i góra) wynikające z ograniczeń układu. */
export function buildCornerReservedZones(
  walls: readonly WallWithCabinets[],
  constraintsByWallId: ReadonlyMap<string, WallCornerConstraints>
): CornerReservedZone[] {
  const zones: CornerReservedZone[] = [];
  for (const [wallId, constraints] of constraintsByWallId) {
    const wall = walls.find(candidate => candidate.id === wallId);
    if (!wall) {
      continue;
    }
    const candidates: CornerReservedZone[] = [
      { wallId, wallEnd: 'START', level: 'BASE', startMm: 0, endMm: constraints.startBottomMm },
      { wallId, wallEnd: 'START', level: 'UPPER', startMm: 0, endMm: constraints.startTopMm },
      { wallId, wallEnd: 'END', level: 'BASE', startMm: wall.widthMm - constraints.endBottomMm, endMm: wall.widthMm },
      { wallId, wallEnd: 'END', level: 'UPPER', startMm: wall.widthMm - constraints.endTopMm, endMm: wall.widthMm }
    ];
    zones.push(...candidates.filter(zone => zone.endMm > zone.startMm));
  }
  return zones;
}

function ghostsOnWall(
  corner: WallCorner,
  target: WallCornerEndpoint,
  source: WallCornerEndpoint,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  conflictPairs: ReadonlySet<string>,
  settings: CornerGeometrySettings
): CornerGhost[] {
  const targetWall = walls.find(wall => wall.id === target.wallId);
  if (!targetWall) {
    return [];
  }
  const context: GhostContext = { target, targetWall, positionsByWallId, conflictPairs };
  const ghostsByCabinetId = new Map<string, CornerGhost>();

  for (const level of CORNER_LEVELS) {
    const sectionDepthMm = maxCabinetReachMm(targetWall.cabinets, level, settings);
    const sourceFootprints = buildCornerFootprints(corner, walls, positionsByWallId, level, settings)
      .filter(footprint => footprint.wallId === source.wallId);
    for (const footprint of sourceFootprints) {
      if (ghostsByCabinetId.has(footprint.cabinet.id)) {
        continue;
      }
      const ghost = ghostOf(footprint, sectionDepthMm, context);
      if (ghost) {
        ghostsByCabinetId.set(footprint.cabinet.id, ghost);
      }
    }
  }
  return [...ghostsByCabinetId.values()];
}

function ghostOf(footprint: CornerFootprint, sectionDepthMm: number, context: GhostContext): CornerGhost | null {
  const atCorner = footprint.nearEdgeMm < footprint.reachMm;
  const armLengthMm = partnerWallArmLengthMm(footprint.cabinet);
  if (armLengthMm !== null && atCorner) {
    const frontStartMm = Math.min(footprint.reachMm, armLengthMm);
    return ghost(footprint, context, 'L_ARM', armLengthMm, [frontStartMm, armLengthMm]);
  }

  const inSection = sectionDepthMm > 0 ? footprint.nearEdgeMm <= sectionDepthMm : atCorner;
  return inSection ? ghost(footprint, context, 'SIDE_PROFILE', footprint.reachMm, null) : null;
}

/** Odcinki od narożnika (`[0, depthMm]`, front) przeliczone na oś oglądanej ściany. */
function ghost(
  footprint: CornerFootprint,
  context: GhostContext,
  kind: CornerGhost['kind'],
  depthMm: number,
  front: [number, number] | null
): CornerGhost | null {
  const sourcePosition = context.positionsByWallId.get(footprint.wallId)
    ?.find(position => position.cabinetId === footprint.cabinet.id);
  if (!sourcePosition) {
    return null;
  }
  const [startMm, endMm] = alongTargetWall(context, 0, depthMm);
  const [frontStartMm, frontEndMm] = front && front[1] > front[0]
    ? alongTargetWall(context, front[0], front[1])
    : [null, null];

  return {
    wallId: context.target.wallId,
    wallEnd: context.target.end,
    sourceWallId: footprint.wallId,
    sourceWallType: footprint.wallType,
    cabinet: footprint.cabinet,
    sourcePosition,
    kind,
    startMm,
    endMm,
    frontStartMm,
    frontEndMm,
    conflict: context.targetWall.cabinets.some(cabinet =>
      context.conflictPairs.has(pairKey(cabinet.id, footprint.cabinet.id)))
  };
}

function alongTargetWall(context: GhostContext, fromCornerMm: number, toCornerMm: number): [number, number] {
  if (context.target.end === 'START') {
    return [fromCornerMm, toCornerMm];
  }
  const widthMm = context.targetWall.widthMm;
  return [widthMm - toCornerMm, widthMm - fromCornerMm];
}

/** Pary szafek objęte błędem narożnika (kolizja, dwie szafki narożne). */
function errorCabinetPairs(issues: readonly CornerIssue[]): Set<string> {
  const pairs = new Set<string>();
  for (const issue of issues) {
    if (issue.severity !== 'ERROR') {
      continue;
    }
    const [first, second] = cornerIssueCabinetIds(issue);
    if (first && second) {
      pairs.add(pairKey(first, second));
    }
  }
  return pairs;
}

function pairKey(first: string, second: string): string {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPosition, KitchenCabinet, WallWithCabinets } from '../../model/kitchen-state.model';
import { KitchenGeometryService, KitchenGeometrySettings, kitchenGeometrySharedSingleton } from '../kitchen-geometry.service';
import {
  CORNER_LEVELS,
  CornerGeometrySettings,
  CornerGhost,
  CornerIssue,
  CornerJunctionSide,
  CornerLevel,
  CornerReservedZone,
  NO_CORNER_CONSTRAINTS,
  WallCorner,
  WallCornerConstraints,
  WallCornerEndpoint,
  WallTopology
} from './corner-layout.model';
import { buildCornerFootprints, CabinetPositionsByWallId, isCornerCabinetAtCorner } from './corner-footprint.builder';
import { buildCornerGhosts, buildCornerReservedZones } from './corner-ghosts.builder';
import { resolveCornerJunctionSides } from './corner-junction-side.resolver';
import { detectCornerIssues } from './corner-issues.detector';
import { isCabinetOnCornerLevel, maxCabinetReachMm } from './corner-reach';
import { resolveCornerReservationMm } from './corner-reservation';
import { resolveWallTopology } from './wall-topology.resolver';

/** Układ projektu z uwzględnieniem narożników. */
export interface ProjectCornerLayout {
  topology: WallTopology;
  /** Ograniczenia tylko dla ścian połączonych narożnikiem; pozostałe ściany układają się bez zmian. */
  constraintsByWallId: ReadonlyMap<string, WallCornerConstraints>;
  /** Pozycje szafek ścian liniowych (bez wyspy) po uwzględnieniu ograniczeń. */
  positionsByWallId: CabinetPositionsByWallId;
  issues: readonly CornerIssue[];
  /** Szafki sąsiednich ścian widoczne na elewacjach przy narożnikach. */
  ghosts: readonly CornerGhost[];
  /** Strefy narożne ścian dostawionych (dół i góra osobno). */
  reservedZones: readonly CornerReservedZone[];
  /** Strona styku szafek narożnych stojących w narożniku. */
  junctionSides: ReadonlyMap<string, CornerJunctionSide>;
}

/** Ustawienia geometrii konkretnej ściany (wysokość, cokół, blat, blenda). */
export type WallGeometrySettingsFn = (wall: WallWithCabinets) => KitchenGeometrySettings;

interface CornerOwner {
  wallId: string;
  /** Szafka narożna właściciela, która wyznaczyła go regułą listową, albo `null`. */
  cornerCabinetId: string | null;
}

/**
 * Wyznacza układ projektu z narożnikami: kto „przechodzi” przez narożnik, strefy narożne ścian dostawionych,
 * szafki narożne przypięte do końca ściany, pozycje szafek i problemy narożników.
 *
 * Właściciel narożnika (per poziom) wynika z kolejności szafek: ściana, której szafka narożna jest pierwsza (narożnik
 * na START) albo ostatnia (narożnik na END) w swoim pasie; w innym przypadku ściana A (MAIN). Strefa narożna ściany
 * dostawionej zależy od pozycji szafek właściciela, a te — od jego własnych stref, dlatego pozycje i strefy są liczone
 * iteracyjnie aż do stabilizacji (topologia ścian jest ścieżką, więc wystarcza kilka przebiegów).
 */
export function buildProjectCornerLayout(
  walls: readonly WallWithCabinets[],
  geometrySettingsFor: WallGeometrySettingsFn,
  cornerSettings: CornerGeometrySettings,
  geometry: KitchenGeometryService = kitchenGeometrySharedSingleton
): ProjectCornerLayout {
  const topology = resolveWallTopology(walls);
  const linearWalls = walls.filter(wall => wall.type !== 'ISLAND');

  if (topology.corners.length === 0) {
    const positionsByWallId = layoutWalls(linearWalls, new Map(), geometrySettingsFor, geometry);
    return completeLayout(topology, walls, new Map(), positionsByWallId, cornerSettings);
  }

  const owners = resolveCornerOwners(topology, walls);
  let constraints = initialConstraints(topology, walls);
  let positionsByWallId = layoutWalls(linearWalls, constraints, geometrySettingsFor, geometry);

  for (let pass = 0; pass <= linearWalls.length; pass++) {
    const next = resolveReservations(topology, walls, positionsByWallId, owners, constraints, cornerSettings);
    if (sameConstraints(next, constraints)) {
      break;
    }
    constraints = next;
    positionsByWallId = layoutWalls(linearWalls, constraints, geometrySettingsFor, geometry);
  }

  return completeLayout(topology, walls, constraints, positionsByWallId, cornerSettings);
}

function completeLayout(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  constraintsByWallId: ReadonlyMap<string, WallCornerConstraints>,
  positionsByWallId: CabinetPositionsByWallId,
  cornerSettings: CornerGeometrySettings
): ProjectCornerLayout {
  const issues = detectCornerIssues(walls, topology, positionsByWallId, cornerSettings);
  return {
    topology,
    constraintsByWallId,
    positionsByWallId,
    issues,
    ghosts: buildCornerGhosts(topology, walls, positionsByWallId, issues, cornerSettings),
    reservedZones: buildCornerReservedZones(walls, constraintsByWallId),
    junctionSides: resolveCornerJunctionSides(topology, walls, positionsByWallId, cornerSettings)
  };
}

/** Same ograniczenia narożne ścian projektu — dla konsumentów, które liczą pozycje samodzielnie. */
export function resolveWallCornerConstraints(
  walls: readonly WallWithCabinets[],
  geometrySettingsFor: WallGeometrySettingsFn,
  cornerSettings: CornerGeometrySettings,
  geometry: KitchenGeometryService = kitchenGeometrySharedSingleton
): ReadonlyMap<string, WallCornerConstraints> {
  return buildProjectCornerLayout(walls, geometrySettingsFor, cornerSettings, geometry).constraintsByWallId;
}

/** Szafka narożna stojąca pierwsza (START) albo ostatnia (END) w pasie danego poziomu. */
function laneCornerCabinetAtEnd(wall: WallWithCabinets, endpoint: WallCornerEndpoint, level: CornerLevel): KitchenCabinet | null {
  const lane = wall.cabinets.filter(cabinet => isCabinetOnCornerLevel(cabinet, level));
  const candidate = endpoint.end === 'START' ? lane[0] : lane[lane.length - 1];
  return candidate?.type === KitchenCabinetType.CORNER_CABINET ? candidate : null;
}

function resolveCornerOwners(topology: WallTopology, walls: readonly WallWithCabinets[]): Map<string, CornerOwner> {
  const owners = new Map<string, CornerOwner>();
  for (const corner of topology.corners) {
    const wallA = findWall(walls, corner.a.wallId);
    const wallB = findWall(walls, corner.b.wallId);
    for (const level of CORNER_LEVELS) {
      const onA = wallA ? laneCornerCabinetAtEnd(wallA, corner.a, level) : null;
      const onB = wallB ? laneCornerCabinetAtEnd(wallB, corner.b, level) : null;
      owners.set(ownerKey(corner, level), onB && !onA
        ? { wallId: corner.b.wallId, cornerCabinetId: onB.id }
        : { wallId: corner.a.wallId, cornerCabinetId: onA?.id ?? null });
    }
  }
  return owners;
}

/** Szafki narożne ostatnie w pasie przy połączonym końcu END są przypinane do narożnika. */
function initialConstraints(topology: WallTopology, walls: readonly WallWithCabinets[]): Map<string, WallCornerConstraints> {
  const constraints = new Map<string, WallCornerConstraints>();
  for (const corner of topology.corners) {
    for (const endpoint of [corner.a, corner.b]) {
      const current = constraints.get(endpoint.wallId) ?? NO_CORNER_CONSTRAINTS;
      const wall = findWall(walls, endpoint.wallId);
      const pinned = new Set(current.pinnedEndCabinetIds);
      if (wall && endpoint.end === 'END') {
        for (const level of CORNER_LEVELS) {
          const cornerCabinet = laneCornerCabinetAtEnd(wall, endpoint, level);
          if (cornerCabinet) {
            pinned.add(cornerCabinet.id);
          }
        }
      }
      constraints.set(endpoint.wallId, { ...current, pinnedEndCabinetIds: [...pinned] });
    }
  }
  return constraints;
}

function resolveReservations(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  owners: ReadonlyMap<string, CornerOwner>,
  previous: ReadonlyMap<string, WallCornerConstraints>,
  cornerSettings: CornerGeometrySettings
): Map<string, WallCornerConstraints> {
  const next = new Map<string, WallCornerConstraints>();
  for (const [wallId, constraints] of previous) {
    next.set(wallId, { ...NO_CORNER_CONSTRAINTS, pinnedEndCabinetIds: constraints.pinnedEndCabinetIds });
  }

  for (const corner of topology.corners) {
    for (const level of CORNER_LEVELS) {
      const owner = owners.get(ownerKey(corner, level));
      if (!owner) {
        continue;
      }
      const partner = owner.wallId === corner.a.wallId ? corner.b : corner.a;
      const partnerWall = findWall(walls, partner.wallId);
      const footprints = buildCornerFootprints(corner, walls, positionsByWallId, level, cornerSettings);
      const ownerFootprints = footprints.filter(footprint => footprint.wallId === owner.wallId);
      const ownerCornerCabinet = ownerFootprints.find(footprint =>
        footprint.cabinet.id === owner.cornerCabinetId && isCornerCabinetAtCorner(footprint)) ?? null;

      const reservationMm = resolveCornerReservationMm({
        ownerFootprints,
        ownerCornerCabinet,
        partnerMaxReachMm: partnerWall ? maxCabinetReachMm(partnerWall.cabinets, level, cornerSettings) : 0,
        settings: cornerSettings
      });
      next.set(partner.wallId, withReservation(next.get(partner.wallId) ?? NO_CORNER_CONSTRAINTS, partner, level, reservationMm));
    }
  }
  return next;
}

function withReservation(
  constraints: WallCornerConstraints,
  endpoint: WallCornerEndpoint,
  level: CornerLevel,
  reservationMm: number
): WallCornerConstraints {
  if (endpoint.end === 'START') {
    return level === 'BASE'
      ? { ...constraints, startBottomMm: reservationMm }
      : { ...constraints, startTopMm: reservationMm };
  }
  return level === 'BASE'
    ? { ...constraints, endBottomMm: reservationMm }
    : { ...constraints, endTopMm: reservationMm };
}

function layoutWalls(
  walls: readonly WallWithCabinets[],
  constraints: ReadonlyMap<string, WallCornerConstraints>,
  geometrySettingsFor: WallGeometrySettingsFn,
  geometry: KitchenGeometryService
): Map<string, CabinetPosition[]> {
  return new Map(walls.map(wall => [wall.id, geometry.calculateLinearCabinetPositions(wall.cabinets, {
    ...geometrySettingsFor(wall),
    wallWidthMm: wall.widthMm,
    cornerConstraints: constraints.get(wall.id)
  })]));
}

function sameConstraints(
  left: ReadonlyMap<string, WallCornerConstraints>,
  right: ReadonlyMap<string, WallCornerConstraints>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [wallId, a] of left) {
    const b = right.get(wallId);
    if (!b
      || a.startBottomMm !== b.startBottomMm || a.startTopMm !== b.startTopMm
      || a.endBottomMm !== b.endBottomMm || a.endTopMm !== b.endTopMm
      || a.pinnedEndCabinetIds.join('|') !== b.pinnedEndCabinetIds.join('|')) {
      return false;
    }
  }
  return true;
}

function ownerKey(corner: WallCorner, level: CornerLevel): string {
  return `${corner.id}|${level}`;
}

function findWall(walls: readonly WallWithCabinets[], wallId: string): WallWithCabinets | undefined {
  return walls.find(wall => wall.id === wallId);
}

import { cabinetRequiresCountertop, WallWithCabinets } from '../../model/kitchen-state.model';
import { CornerFootprint, CornerGeometrySettings, WallCornerEndpoint, WallTopology } from './corner-layout.model';
import { buildCornerFootprints, CabinetPositionsByWallId } from './corner-footprint.builder';
import { resolveCornerOwnership } from './corner-ownership.resolver';

/** Tolerancja dopasowania szafki ściany dostawionej do strefy narożnej (zaokrąglenia pozycji). */
const CORNER_ZONE_TOLERANCE_MM = 1;
/** Głębokość blatu bez ręcznej wartości — jak w `ProjectWallAddonsRequestBuilder.buildCountertopRequest`. */
const DEFAULT_COUNTERTOP_DEPTH_MM = 600;

/** Wymuszone końce przebiegu blatu wzdłuż ściany (mm od START); brak wartości — koniec wynika z szafek. */
export interface CountertopRunTrim {
  startMm?: number;
  endMm?: number;
}

/**
 * Przycięcia przebiegów blatu w narożnikach, tak aby kwadrat narożny należał tylko do jednej ściany: blat
 * ściany-właściciela dochodzi do ściany, a blat ściany dostawionej kończy się na krawędzi blatu właściciela.
 * Narożnik łączy blaty, gdy właściciel ma szafkę z blatem stojącą w narożniku, a najbliższa szafka z blatem ściany
 * dostawionej stoi nie dalej niż sięgają szafki właściciela wzdłuż tej ściany, powiększone o luz narożny.
 *
 * Spójne z backendem: `CornerRunTrimResolver` (część blatu). Cokoły przycina tylko backend.
 */
export function resolveCornerCountertopTrims(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings
): Map<string, CountertopRunTrim> {
  const trims = new Map<string, CountertopRunTrim>();

  for (const corner of topology.corners) {
    const footprints = buildCornerFootprints(corner, walls, positionsByWallId, 'BASE', settings);
    const ownerWallId = resolveCornerOwnership(corner, footprints).ownerWallId;
    const [ownerEnd, partnerEnd] = ownerWallId === corner.a.wallId ? [corner.a, corner.b] : [corner.b, corner.a];
    const owner = walls.find(wall => wall.id === ownerEnd.wallId);
    const partner = walls.find(wall => wall.id === partnerEnd.wallId);
    if (!owner || !partner || !countertopEnabled(owner) || !countertopEnabled(partner)) {
      continue;
    }

    const withCountertop = footprints.filter(footprint => cabinetRequiresCountertop(footprint.cabinet));
    const ownerAtCorner = withCountertop.filter(footprint =>
      footprint.wallId === owner.id && footprint.nearEdgeMm < footprint.reachMm);
    const partnerNearest = withCountertop
      .filter(footprint => footprint.wallId === partner.id)
      .sort((left, right) => left.nearEdgeMm - right.nearEdgeMm)[0];
    if (!joined(ownerAtCorner, partnerNearest, ownerWallId === corner.a.wallId, settings)) {
      continue;
    }

    setTrim(trims, owner, ownerEnd, 0);
    setTrim(trims, partner, partnerEnd, countertopDepthMm(owner));
  }
  return trims;
}

function joined(
  ownerAtCorner: readonly CornerFootprint[],
  partnerNearest: CornerFootprint | undefined,
  ownerIsWallA: boolean,
  settings: CornerGeometrySettings
): boolean {
  if (ownerAtCorner.length === 0 || !partnerNearest) {
    return false;
  }
  const occupancyMm = Math.max(...ownerAtCorner.flatMap(footprint =>
    footprint.rects.map(rect => ownerIsWallA ? rect.vMax : rect.uMax)));
  return partnerNearest.nearEdgeMm <= occupancyMm + settings.cornerClearanceMm + CORNER_ZONE_TOLERANCE_MM;
}

function setTrim(
  trims: Map<string, CountertopRunTrim>,
  wall: WallWithCabinets,
  endpoint: WallCornerEndpoint,
  distanceFromCornerMm: number
): void {
  const current = trims.get(wall.id) ?? {};
  trims.set(wall.id, endpoint.end === 'START'
    ? { ...current, startMm: distanceFromCornerMm }
    : { ...current, endMm: wall.widthMm - distanceFromCornerMm });
}

function countertopEnabled(wall: WallWithCabinets): boolean {
  return wall.countertopConfig?.enabled === true;
}

/** Głębokość blatu wysyłana do backendu (`manualDepthMm`) — krawędź blatu właściciela w narożniku. */
function countertopDepthMm(wall: WallWithCabinets): number {
  return wall.countertopConfig?.manualDepthMm ?? wall.islandDepthMm ?? DEFAULT_COUNTERTOP_DEPTH_MM;
}

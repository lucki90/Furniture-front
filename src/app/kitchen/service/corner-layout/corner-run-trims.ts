import { CornerJointType } from '../../model/countertop.model';
import { cabinetRequiresCountertop, WallWithCabinets } from '../../model/kitchen-state.model';
import { CornerFootprint, CornerGeometrySettings, WallCorner, WallCornerEndpoint, WallTopology } from './corner-layout.model';
import { buildCornerFootprints, CabinetPositionsByWallId } from './corner-footprint.builder';
import { resolveCornerOwnership } from './corner-ownership.resolver';
import { resolveCornerJointConfig } from './corner-joint-config';

/** Tolerancja dopasowania szafki ściany dostawionej do strefy narożnej (zaokrąglenia pozycji). */
const CORNER_ZONE_TOLERANCE_MM = 1;
/** Głębokość blatu bez ręcznej wartości — jak w `ProjectWallAddonsRequestBuilder.buildCountertopRequest`. */
const DEFAULT_COUNTERTOP_DEPTH_MM = 600;

/** Odcinek wzdłuż ściany (mm od START). */
export interface CountertopSupportMm {
  startMm: number;
  endMm: number;
}

/**
 * Ograniczenia przebiegu blatu ściany z narożników (mm od START):
 * - `startMm` / `endMm` — wymuszone końce przebiegu; brak wartości — koniec wynika z szafek,
 * - `supports` — wirtualne podparcia blatu (ramię szafki L sąsiedniej ściany), liczone jak szafki z blatem.
 */
export interface CountertopRunTrim {
  startMm?: number;
  endMm?: number;
  supports?: readonly CountertopSupportMm[];
}

/**
 * Narożnik, w którym blaty się łączą:
 * - `ruleOwnerWallId` — właściciel narożnika z reguły (blat przechodzący przy ustawieniu „Automatycznie”),
 * - `passingWallId` — ściana, której blat przechodzi przez narożnik (wybór użytkownika albo reguła).
 */
export interface CountertopCornerJoint {
  cornerId: string;
  type: CornerJointType;
  ruleOwnerWallId: string;
  passingWallId: string;
}

/** Przycięcia przebiegów blatu i narożniki z połączeniem blatów. */
export interface CornerCountertopLayout {
  trimsByWallId: Map<string, CountertopRunTrim>;
  joints: CountertopCornerJoint[];
}

/**
 * Przycięcia przebiegów blatu w narożnikach. Narożnik łączy blaty, gdy właściciel ma szafkę z blatem stojącą
 * w narożniku, a ściana dostawiona ma podparcie blatu w strefie narożnej: ramię szafki L właściciela albo najbliższą
 * szafkę z blatem nie dalej niż sięgają szafki właściciela wzdłuż tej ściany, powiększone o luz narożny.
 *
 * - Ramię szafki L właściciela jest wirtualnym podparciem blatu ściany dostawionej (blat nad ramieniem powstaje także
 *   bez jej szafek).
 * - Blat przechodzący (wybór użytkownika z `resolveCornerJointConfig`, bez niego właściciel) dochodzi do ściany;
 *   blat drugiej ściany kończy się na jego krawędzi, a przy cięciu 45° też dochodzi do ściany.
 *
 * Spójne z backendem: `CornerRunTrimResolver` (część blatu). Cokoły przycina tylko backend.
 */
export function resolveCornerCountertopTrims(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings
): Map<string, CountertopRunTrim> {
  return resolveCornerCountertopLayout(topology, walls, positionsByWallId, settings).trimsByWallId;
}

/** Jak `resolveCornerCountertopTrims`, a dodatkowo narożniki z połączeniem blatów (panel ściany, rzut z góry). */
export function resolveCornerCountertopLayout(
  topology: WallTopology,
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings
): CornerCountertopLayout {
  const trims = new Map<string, CountertopRunTrim>();
  const joints: CountertopCornerJoint[] = [];

  for (const corner of topology.corners) {
    const footprints = buildCornerFootprints(corner, walls, positionsByWallId, 'BASE', settings);
    const ownerWallId = resolveCornerOwnership(corner, footprints).ownerWallId;
    const [ownerEnd, partnerEnd] = sidesOf(corner, ownerWallId);
    const owner = walls.find(wall => wall.id === ownerEnd.wallId);
    const partner = walls.find(wall => wall.id === partnerEnd.wallId);
    if (!owner || !partner || !countertopEnabled(owner) || !countertopEnabled(partner)) {
      continue;
    }

    const ownerIsWallA = ownerWallId === corner.a.wallId;
    const withCountertop = footprints.filter(footprint => cabinetRequiresCountertop(footprint.cabinet));
    const ownerAtCorner = withCountertop.filter(footprint =>
      footprint.wallId === owner.id && footprint.nearEdgeMm < footprint.reachMm);
    const ownerArm = ownerAtCorner.find(hasPartnerWallArm);
    const partnerNearest = withCountertop
      .filter(footprint => footprint.wallId === partner.id)
      .sort((left, right) => left.nearEdgeMm - right.nearEdgeMm)[0];
    if (ownerAtCorner.length === 0
      || (!ownerArm && !partnerInCornerZone(ownerAtCorner, partnerNearest, ownerIsWallA, settings))) {
      continue;
    }

    if (ownerArm) {
      addSupport(trims, partner, partnerEnd, partnerAxisExtentMm([ownerArm], ownerIsWallA));
    }

    const joint = resolveCornerJointConfig(corner, walls);
    const [passingEnd, joiningEnd] = sidesOf(corner, joint.passThroughWallId ?? ownerWallId);
    const passing = passingEnd.wallId === owner.id ? owner : partner;
    const joining = passing === owner ? partner : owner;
    setTrim(trims, passing, passingEnd, 0);
    setTrim(trims, joining, joiningEnd, joint.type === 'MITER_45' ? 0 : countertopDepthMm(passing));
    joints.push({ cornerId: corner.id, type: joint.type, ruleOwnerWallId: ownerWallId, passingWallId: passing.id });
  }
  return { trimsByWallId: trims, joints };
}

/** Końce narożnika: najpierw ściany wskazanej, potem drugiej. */
function sidesOf(corner: WallCorner, firstWallId: string): [WallCornerEndpoint, WallCornerEndpoint] {
  return firstWallId === corner.a.wallId ? [corner.a, corner.b] : [corner.b, corner.a];
}

function hasPartnerWallArm(footprint: CornerFootprint): boolean {
  return footprint.rects.length > 1;
}

function partnerInCornerZone(
  ownerAtCorner: readonly CornerFootprint[],
  partnerNearest: CornerFootprint | undefined,
  ownerIsWallA: boolean,
  settings: CornerGeometrySettings
): boolean {
  if (!partnerNearest) {
    return false;
  }
  const occupancyMm = partnerAxisExtentMm(ownerAtCorner, ownerIsWallA);
  return partnerNearest.nearEdgeMm <= occupancyMm + settings.cornerClearanceMm + CORNER_ZONE_TOLERANCE_MM;
}

/** Jak daleko od narożnika sięgają szafki właściciela wzdłuż ściany dostawionej (ramię szafki L albo zasięg). */
function partnerAxisExtentMm(ownerFootprints: readonly CornerFootprint[], ownerIsWallA: boolean): number {
  return Math.max(0, ...ownerFootprints.flatMap(footprint =>
    footprint.rects.map(rect => ownerIsWallA ? rect.vMax : rect.uMax)));
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

function addSupport(
  trims: Map<string, CountertopRunTrim>,
  wall: WallWithCabinets,
  endpoint: WallCornerEndpoint,
  lengthFromCornerMm: number
): void {
  const current = trims.get(wall.id) ?? {};
  const support = endpoint.end === 'START'
    ? { startMm: 0, endMm: lengthFromCornerMm }
    : { startMm: wall.widthMm - lengthFromCornerMm, endMm: wall.widthMm };
  trims.set(wall.id, { ...current, supports: [...(current.supports ?? []), support] });
}

function countertopEnabled(wall: WallWithCabinets): boolean {
  return wall.countertopConfig?.enabled === true;
}

/** Głębokość blatu wysyłana do backendu (`manualDepthMm`) — krawędź blatu przechodzącego w narożniku. */
function countertopDepthMm(wall: WallWithCabinets): number {
  return wall.countertopConfig?.manualDepthMm ?? wall.islandDepthMm ?? DEFAULT_COUNTERTOP_DEPTH_MM;
}

import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import {
  CORNER_HANDLE_FILLER_WIDTH_MM,
  CornerHandleType,
  isLeMans,
  isMagicCorner
} from '../../cabinet-form/model/corner-cabinet.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';
import {
  CORNER_ISSUE_CODES,
  CORNER_LEVELS,
  CornerFootprint,
  CornerGeometrySettings,
  CornerIssue,
  CornerIssueCode,
  CornerLevel,
  CornerOwnership,
  WallCorner,
  WallTopology
} from './corner-layout.model';
import {
  buildCornerFootprints,
  CabinetPositionsByWallId,
  cabinetEndWithEnclosureMm,
  cabinetStartWithEnclosureMm,
  cornerFootprintsOverlap,
  isBlindCornerFootprint,
  isCornerCabinetAtCorner,
  isCornerCabinetFootprint
} from './corner-footprint.builder';
import { hasCornerCabinetsOnBothWalls, resolveCornerOwnership } from './corner-ownership.resolver';
import { cabinetReachMm } from './corner-reach';

/**
 * Zapas na szczeliny frontów w książkowej szerokości ślepego narożnika `S = 580 − 50 + X + Y + 4`
 * (`_docs/_cabinets_doc/06-base-corner.md`).
 */
export const BLIND_CORNER_FRONT_RESERVE_MM = 4;

/**
 * Wykrywa problemy geometrii narożników dla pozycji szafek z układu frontu.
 *
 * Błędy (niezależne od właściciela): kolizja brył szafek z dwóch ścian oraz szafki narożne po obu stronach
 * narożnika. Ostrzeżenia: szafka stojąca przed frontem szafki sąsiedniej ściany (zasłonięty front, za mały luz),
 * reguły szafki typu B (ślepa część, zasłonięcie, strona mechanizmu) i szafka narożna poza końcem ściany.
 *
 * Spójne z backendem: `CornerIssueDetector` — te same kody, argumenty i kolejność.
 */
export function detectCornerIssues(
  walls: readonly WallWithCabinets[],
  topology: WallTopology,
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings
): CornerIssue[] {
  const collector = new IssueCollector();
  for (const corner of topology.corners) {
    for (const level of CORNER_LEVELS) {
      const footprints = buildCornerFootprints(corner, walls, positionsByWallId, level, settings);
      const ownership = resolveCornerOwnership(corner, footprints);
      detectCrossWallConflicts(corner, footprints, level, collector);
      detectBlindCornerIssues(ownership, footprints, level, settings, collector);
      detectFacingIssues(corner, footprints, settings, collector);
    }
  }
  detectCornerCabinetsAwayFromWallEnds(walls, positionsByWallId, settings, collector);
  return collector.issues();
}

function detectCrossWallConflicts(
  corner: WallCorner,
  footprints: readonly CornerFootprint[],
  level: CornerLevel,
  collector: IssueCollector
): void {
  for (const onA of onWall(footprints, corner.a.wallId)) {
    for (const onB of onWall(footprints, corner.b.wallId)) {
      if (isCornerCabinetAtCorner(onA) && isCornerCabinetAtCorner(onB)) {
        collector.add(pairIssue(CORNER_ISSUE_CODES.CORNER_CABINET_DUPLICATE, onA, onB, level));
      } else if (cornerFootprintsOverlap(onA, onB)) {
        collector.add(pairIssue(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, onA, onB, level));
      }
    }
  }
}

function detectBlindCornerIssues(
  ownership: CornerOwnership,
  footprints: readonly CornerFootprint[],
  level: CornerLevel,
  settings: CornerGeometrySettings,
  collector: IssueCollector
): void {
  const blind = ownership.ownerCornerCabinet;
  if (!blind || !isBlindCornerFootprint(blind) || hasCornerCabinetsOnBothWalls(ownership)) {
    return;
  }

  const covering = footprints
    .filter(footprint => footprint.wallId !== blind.wallId)
    .filter(footprint => !cornerFootprintsOverlap(footprint, blind))
    .filter(footprint => footprint.nearEdgeMm <= blind.reachMm + settings.cornerClearanceMm)
    .reduce<CornerFootprint | null>(
      (closest, footprint) => !closest || footprint.nearEdgeMm < closest.nearEdgeMm ? footprint : closest,
      null
    );

  if (!covering) {
    collector.add(warning(CORNER_ISSUE_CODES.BLIND_UNCOVERED, {
      cabinetId: blind.cabinet.id,
      wallType: blind.wallType,
      level
    }));
  } else {
    detectBlindPartTooShort(blind, covering, collector);
  }
  detectHandednessMismatch(blind, collector);
}

function detectBlindPartTooShort(blind: CornerFootprint, covering: CornerFootprint, collector: IssueCollector): void {
  const cabinet = blind.cabinet;
  if (cabinet.type !== KitchenCabinetType.CORNER_CABINET) {
    return;
  }
  const handleType = (cabinet.cornerHandleType as CornerHandleType | undefined) ?? CornerHandleType.SCREWED;
  const handleFillerMm = CORNER_HANDLE_FILLER_WIDTH_MM[handleType] ?? CORNER_HANDLE_FILLER_WIDTH_MM[CornerHandleType.SCREWED];
  const requiredMm = covering.reachMm + handleFillerMm + BLIND_CORNER_FRONT_RESERVE_MM - blind.nearEdgeMm;
  const openingFrontMm = typeof cabinet.cornerFrontUchylnyWidthMm === 'number' && cabinet.cornerFrontUchylnyWidthMm > 0
    ? cabinet.cornerFrontUchylnyWidthMm
    : Math.floor(cabinet.width / 2);
  const actualMm = cabinet.width - openingFrontMm;
  if (actualMm < requiredMm) {
    collector.add(warning(CORNER_ISSUE_CODES.BLIND_PART_TOO_SHORT, {
      cabinetId: cabinet.id,
      wallType: blind.wallType,
      requiredMm: String(requiredMm),
      actualMm: String(actualMm)
    }));
  }
}

/**
 * Front otwierany szafki typu B leży po stronie przeciwnej do narożnika: przy narożniku na początku ściany —
 * po prawej, przy narożniku na końcu ściany — po lewej. Sprawdzane tylko dla mechanizmów z jawną stroną.
 */
function detectHandednessMismatch(blind: CornerFootprint, collector: IssueCollector): void {
  const cabinet = blind.cabinet;
  if (cabinet.type !== KitchenCabinetType.CORNER_CABINET) {
    return;
  }
  const actual = cabinet.cornerHandedness;
  if (!actual || !(isMagicCorner(cabinet.cornerMechanism) || isLeMans(cabinet.cornerMechanism))) {
    return;
  }
  const expected = blind.wallEnd === 'START' ? 'RIGHT' : 'LEFT';
  if (actual !== expected) {
    collector.add(warning(CORNER_ISSUE_CODES.HANDEDNESS_MISMATCH, {
      cabinetId: cabinet.id,
      wallType: blind.wallType,
      expected,
      actual
    }));
  }
}

function detectFacingIssues(
  corner: WallCorner,
  footprints: readonly CornerFootprint[],
  settings: CornerGeometrySettings,
  collector: IssueCollector
): void {
  for (const onA of onWall(footprints, corner.a.wallId)) {
    for (const onB of onWall(footprints, corner.b.wallId)) {
      if (cornerFootprintsOverlap(onA, onB)) {
        continue;
      }
      detectStandingInFront(onA, onB, settings, collector);
      detectStandingInFront(onB, onA, settings, collector);
    }
  }
}

/**
 * Szafka `standing` stoi przed frontem szafki `front`, gdy zaczyna się za jej zasięgiem, a front leży w pasie
 * zajmowanym przez bok szafki `standing`. Szafki narożne mają własne reguły.
 */
function detectStandingInFront(
  front: CornerFootprint,
  standing: CornerFootprint,
  settings: CornerGeometrySettings,
  collector: IssueCollector
): void {
  const standsInFront = standing.nearEdgeMm >= front.reachMm && front.nearEdgeMm < standing.reachMm;
  if (!standsInFront || isCornerCabinetFootprint(front) || isCornerCabinetFootprint(standing)) {
    return;
  }
  const gapMm = standing.nearEdgeMm - front.reachMm;
  if (gapMm < settings.cornerClearanceMm) {
    collector.add(warning(CORNER_ISSUE_CODES.CLEARANCE_TOO_SMALL, {
      cabinetId: standing.cabinet.id,
      wallType: standing.wallType,
      requiredMm: String(front.reachMm + settings.cornerClearanceMm),
      actualMm: String(standing.nearEdgeMm)
    }));
  }
  if (gapMm < front.cabinet.depth) {
    collector.add(warning(CORNER_ISSUE_CODES.FRONT_BLOCKED, {
      cabinetId: front.cabinet.id,
      wallType: front.wallType,
      blockingCabinetId: standing.cabinet.id,
      blockingWallType: standing.wallType
    }));
  }
}

function detectCornerCabinetsAwayFromWallEnds(
  walls: readonly WallWithCabinets[],
  positionsByWallId: CabinetPositionsByWallId,
  settings: CornerGeometrySettings,
  collector: IssueCollector
): void {
  for (const wall of walls) {
    if (wall.type === 'ISLAND') {
      continue;
    }
    const xById = new Map((positionsByWallId.get(wall.id) ?? []).map(position => [position.cabinetId, position.x]));
    for (const cabinet of wall.cabinets) {
      const x = xById.get(cabinet.id);
      if (cabinet.type !== KitchenCabinetType.CORNER_CABINET || x === undefined) {
        continue;
      }
      const fromStartMm = cabinetStartWithEnclosureMm(cabinet, x, settings);
      const fromEndMm = wall.widthMm - cabinetEndWithEnclosureMm(cabinet, x, settings);
      const offsetMm = Math.min(fromStartMm, fromEndMm);
      if (offsetMm >= cabinetReachMm(cabinet, settings)) {
        collector.add(warning(CORNER_ISSUE_CODES.CORNER_CABINET_NOT_AT_CORNER, {
          cabinetId: cabinet.id,
          wallType: wall.type,
          offsetMm: String(offsetMm)
        }));
      }
    }
  }
}

function onWall(footprints: readonly CornerFootprint[], wallId: string): CornerFootprint[] {
  return footprints.filter(footprint => footprint.wallId === wallId);
}

function pairIssue(code: CornerIssueCode, onA: CornerFootprint, onB: CornerFootprint, level: CornerLevel): CornerIssue {
  return {
    code,
    severity: 'ERROR',
    args: {
      cabinetId1: onA.cabinet.id,
      wallType1: onA.wallType,
      cabinetId2: onB.cabinet.id,
      wallType2: onB.wallType,
      level
    }
  };
}

function warning(code: CornerIssueCode, args: Record<string, string>): CornerIssue {
  return { code, severity: 'WARNING', args };
}

/**
 * Zbiera problemy bez powtórzeń: zabudowa pełnej wysokości jest sprawdzana na obu poziomach, więc ten sam
 * problem (bez względu na poziom) jest zgłaszany raz.
 */
class IssueCollector {
  private readonly collected: CornerIssue[] = [];
  private readonly keys = new Set<string>();

  add(issue: CornerIssue): void {
    const identity: Record<string, string> = { ...issue.args };
    delete identity['level'];
    const key = `${issue.code}|${JSON.stringify(identity)}`;
    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.collected.push(issue);
    }
  }

  issues(): CornerIssue[] {
    return [...this.collected];
  }
}

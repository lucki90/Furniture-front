import { WallConnectionType, WallType } from '../../model/kitchen-project.model';
import { CabinetPosition, KitchenCabinet } from '../../model/kitchen-state.model';

/**
 * Koniec ściany w widoku z wnętrza kuchni: START = lewa krawędź elewacji (x = 0),
 * END = prawa krawędź elewacji (x = szerokość ściany).
 */
export type WallEnd = 'START' | 'END';

/** Jedna strona narożnika: ściana i jej koniec stykający się z sąsiednią ścianą. */
export interface WallCornerEndpoint {
  wallId: string;
  wallType: WallType;
  end: WallEnd;
}

/**
 * Narożnik łączący ścianę A (MAIN albo CORNER_LEFT/CORNER_RIGHT) ze ścianą B (LEFT albo RIGHT).
 *
 * Konwencja (widok z wnętrza kuchni):
 * - `L_CORNER_LEFT`: A.START ↔ B.END,
 * - `L_CORNER_RIGHT`: A.END ↔ B.START.
 */
export interface WallCorner {
  id: string;
  connectionType: WallConnectionType;
  a: WallCornerEndpoint;
  b: WallCornerEndpoint;
}

/** Połączenia ścian projektu wyliczone z typów ścian. */
export interface WallTopology {
  readonly corners: readonly WallCorner[];
}

/**
 * Poziom sprawdzania narożnika: BASE = strefy BOTTOM i FULL, UPPER = strefy TOP i FULL.
 * Zabudowa pełnej wysokości należy do obu poziomów.
 */
export type CornerLevel = 'BASE' | 'UPPER';

export const CORNER_LEVELS: readonly CornerLevel[] = ['BASE', 'UPPER'];

/**
 * Ustawienia geometrii narożnika. Spójne z backendem: `CornerGeometrySettings`.
 * - `defaultFrontThicknessMm` — grubość frontu, gdy szafka nie ma własnej w `materialRequest`,
 * - `cornerClearanceMm` — luz narożny (blenda narożna) między frontem a szafką sąsiedniej ściany,
 * - `enclosureFillerWidthMm` — szerokość blendy obudowy bez własnego override'u.
 */
export interface CornerGeometrySettings {
  defaultFrontThicknessMm: number;
  cornerClearanceMm: number;
  enclosureFillerWidthMm: number;
  /** Wcięcie łyżwy: o ile blat męski (dochodzący) wchodzi w blat żeński (przechodzący) za jego front. */
  lyzwaRecessMm: number;
}

/**
 * Prostokąt rzutu z góry w układzie narożnika (mm): `u` wzdłuż ściany A od narożnika, `v` wzdłuż ściany B.
 */
export interface CornerRectMm {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

/**
 * Rzut szafki na jednym poziomie narożnika. Spójne z backendem: `CornerFootprint`.
 * - `nearEdgeMm` / `farEdgeMm` — odległość krawędzi szafki (z obudową) od narożnika, wzdłuż jej ściany,
 * - `reachMm` — zasięg w głąb pomieszczenia (korpus i front),
 * - `rects` — prostokąty rzutu; szafka L w narożniku ma dodatkowo ramię wzdłuż sąsiedniej ściany.
 */
export interface CornerFootprint {
  wallId: string;
  wallType: WallType;
  wallEnd: WallEnd;
  cabinet: KitchenCabinet;
  level: CornerLevel;
  nearEdgeMm: number;
  farEdgeMm: number;
  reachMm: number;
  rects: readonly CornerRectMm[];
}

/**
 * Właściciel narożnika na jednym poziomie: ściana, która „przechodzi” przez narożnik.
 * Spójne z backendem: `CornerOwnership`.
 */
export interface CornerOwnership {
  ownerWallId: string;
  ownerCornerCabinet: CornerFootprint | null;
  cornerCabinetsAtCorner: readonly CornerFootprint[];
}

export type CornerIssueSeverity = 'ERROR' | 'WARNING';

/** Kody problemów narożnika. Spójne z backendem: `CornerIssueCodes`. */
export const CORNER_ISSUE_CODES = {
  CABINETS_OVERLAP_CROSS_WALL: 'ex.cabinets.overlap.cross.wall',
  CORNER_CABINET_DUPLICATE: 'ex.corner.cabinet.duplicate',
  CORNER_CABINET_NOT_AT_CORNER: 'warning.corner.cabinet.not.at.corner',
  BLIND_PART_TOO_SHORT: 'warning.corner.blind.part.too.short',
  BLIND_UNCOVERED: 'warning.corner.blind.uncovered',
  FRONT_BLOCKED: 'warning.corner.front.blocked',
  CLEARANCE_TOO_SMALL: 'warning.corner.clearance.too.small',
  HANDEDNESS_MISMATCH: 'warning.corner.handedness.mismatch',
  COUNTERTOP_JOINT_MATERIAL_MISMATCH: 'warning.countertop.joint.material.mismatch',
  COUNTERTOP_JOINT_DEPTH_MISMATCH: 'warning.countertop.joint.depth.mismatch'
} as const;

export type CornerIssueCode = typeof CORNER_ISSUE_CODES[keyof typeof CORNER_ISSUE_CODES];

/**
 * Ograniczenia układu ściany wynikające z narożników (mm). Strefy narożne liczone od START i od END ściany, osobno
 * dla pasa dolnego (BOTTOM + FULL) i górnego (TOP + FULL), oraz szafki narożne przypięte do połączonego końca END.
 * Szafka przypięta stoi w narożniku niezależnie od szafek przed nią; nachodzenie widać jako przepełnienie.
 */
export interface WallCornerConstraints {
  startBottomMm: number;
  startTopMm: number;
  endBottomMm: number;
  endTopMm: number;
  pinnedEndCabinetIds: readonly string[];
}

export const NO_CORNER_CONSTRAINTS: WallCornerConstraints = {
  startBottomMm: 0,
  startTopMm: 0,
  endBottomMm: 0,
  endTopMm: 0,
  pinnedEndCabinetIds: []
};

/** Problem wykryty w narożniku: stabilny kod domenowy, waga i argumenty komunikatu. */
export interface CornerIssue {
  code: CornerIssueCode;
  severity: CornerIssueSeverity;
  args: Readonly<Record<string, string>>;
}

/**
 * Rodzaj cienia szafki sąsiedniej ściany na elewacji:
 * - `SIDE_PROFILE` — bok szafki stojącej w przekroju przy narożniku (do głębokości szafek oglądanej ściany),
 * - `L_ARM` — ramię szafki L wzdłuż oglądanej ściany: bok w kwadracie narożnym i front ramienia za nim.
 */
export type CornerGhostKind = 'SIDE_PROFILE' | 'L_ARM';

/**
 * Szafka sąsiedniej ściany widoczna na elewacji ściany `wallId` przy narożniku. Odcinki są w mm wzdłuż ściany
 * `wallId`, liczone od jej START; położenie w pionie wynika z pozycji szafki na jej własnej ścianie.
 */
export interface CornerGhost {
  wallId: string;
  wallEnd: WallEnd;
  sourceWallId: string;
  sourceWallType: WallType;
  cabinet: KitchenCabinet;
  sourcePosition: CabinetPosition;
  kind: CornerGhostKind;
  startMm: number;
  endMm: number;
  /** Front ramienia szafki L; `null` dla boku szafki. */
  frontStartMm: number | null;
  frontEndMm: number | null;
  /** Szafka koliduje z szafką oglądanej ściany (błąd narożnika). */
  conflict: boolean;
}

/** Strefa narożna ściany zajęta przez szafki sąsiedniej ściany (mm wzdłuż ściany, od jej START). */
export interface CornerReservedZone {
  wallId: string;
  wallEnd: WallEnd;
  level: CornerLevel;
  startMm: number;
  endMm: number;
}

/** Strona elewacji, po której szafka narożna styka się z sąsiednią ścianą. */
export type CornerJunctionSide = 'LEFT' | 'RIGHT';

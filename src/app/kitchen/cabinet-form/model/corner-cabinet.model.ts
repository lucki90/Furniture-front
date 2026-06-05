/**
 * Types of internal organization mechanisms for corner cabinets.
 * Type A (L-shaped): FIXED_SHELVES, CAROUSEL_270, CAROUSEL_360
 * Type B (Rectangular/Blind): BLIND_CORNER, MAGIC_CORNER_COMFORT, MAGIC_CORNER_STANDARD, LE_MANS_I, LE_MANS_II
 * Note: NONE is kept for backward compatibility but not shown in dropdown (same as FIXED_SHELVES with 0 shelves).
 *
 * Iter.6 (2026-05-29): rozdzielono MAGIC_CORNER → COMFORT/STANDARD i LE_MANS → I/II (taksonomia producenta).
 */
export enum CornerMechanismType {
  MAGIC_CORNER_COMFORT = 'MAGIC_CORNER_COMFORT',
  MAGIC_CORNER_STANDARD = 'MAGIC_CORNER_STANDARD',
  CAROUSEL_270 = 'CAROUSEL_270',
  CAROUSEL_360 = 'CAROUSEL_360',
  LE_MANS_I = 'LE_MANS_I',
  LE_MANS_II = 'LE_MANS_II',
  FIXED_SHELVES = 'FIXED_SHELVES',
  NONE = 'NONE',
  BLIND_CORNER = 'BLIND_CORNER'
}

/**
 * Handedness (chirality) of the active front / mechanism for one-sided Type B systems
 * (Le Mans, Magic Corner). Null = "not specified / symmetric". Synchronizowany z backendowym CornerHandednessEnum.
 */
export enum CornerHandedness {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export const CORNER_HANDEDNESS_LABELS: Record<CornerHandedness, string> = {
  [CornerHandedness.LEFT]: 'Lewa',
  [CornerHandedness.RIGHT]: 'Prawa'
};

/**
 * Manufacturer "line" (front-width family / Y-min) dla Type B systemów (Magic Corner, Le Mans).
 * Synchronizowany z backendowym CornerSystemLineEnum. Wartość = minimalna szerokość frontu (Y-min) w mm.
 */
export enum CornerSystemLine {
  LINE_400 = 'LINE_400',
  LINE_450 = 'LINE_450',
  LINE_500 = 'LINE_500',
  LINE_550 = 'LINE_550',
  LINE_600 = 'LINE_600'
}

/** Y-min (minimalna szerokość frontu) per linia — zsynchronizowane z backendem. */
export const CORNER_SYSTEM_LINE_MIN_FRONT_MM: Record<CornerSystemLine, number> = {
  [CornerSystemLine.LINE_400]: 396,
  [CornerSystemLine.LINE_450]: 446,
  [CornerSystemLine.LINE_500]: 496,
  [CornerSystemLine.LINE_550]: 546,
  [CornerSystemLine.LINE_600]: 596
};

export const CORNER_SYSTEM_LINE_LABELS: Record<CornerSystemLine, string> = {
  [CornerSystemLine.LINE_400]: 'Linia 400 (front ≥ 396 mm)',
  [CornerSystemLine.LINE_450]: 'Linia 450 (front ≥ 446 mm)',
  [CornerSystemLine.LINE_500]: 'Linia 500 (front ≥ 496 mm)',
  [CornerSystemLine.LINE_550]: 'Linia 550 (front ≥ 546 mm)',
  [CornerSystemLine.LINE_600]: 'Linia 600 (front ≥ 596 mm)'
};

/**
 * Opening type for Type A L-shaped corner cabinets.
 */
export enum CornerOpeningType {
  TWO_DOORS = 'TWO_DOORS',   // Dwie standardowe drzwi (jedna na każde ramię)
  BIFOLD = 'BIFOLD',          // Harmonijka (dwie połówki na jednym ramieniu)
  BLIND = 'BLIND'             // Jedno ramię z drzwiami (A), drugie bez frontu — zasłonięte ścianą lub szafką
}

/**
 * Typ uchwytu w szafce ślepej (Type B). Wpływa na szerokość blendy narożnikowej X
 * oraz na auto-dobór szerokości szafki wg wzoru: S = 580 - 50 + X + Y + 4 (książka str. 169).
 */
export enum CornerHandleType {
  SCREWED = 'SCREWED',           // X = 50 mm — uchwyt przykręcany (standard z książki)
  MILLED = 'MILLED',             // X = 15 mm — uchwyt frezowany
  PUSH_TO_OPEN = 'PUSH_TO_OPEN'  // X = 0 mm — bez uchwytu
}

/** Mapa szerokości blendy narożnikowej (X) per typ uchwytu — synchronizowana z backendowym enum. */
export const CORNER_HANDLE_FILLER_WIDTH_MM: Record<CornerHandleType, number> = {
  [CornerHandleType.SCREWED]: 50,
  [CornerHandleType.MILLED]: 15,
  [CornerHandleType.PUSH_TO_OPEN]: 0
};

/** Etykiety dropdown dla typów uchwytów. */
export const CORNER_HANDLE_TYPE_LABELS: Record<CornerHandleType, string> = {
  [CornerHandleType.SCREWED]: 'Przykręcany (50 mm)',
  [CornerHandleType.MILLED]: 'Frezowany (15 mm)',
  [CornerHandleType.PUSH_TO_OPEN]: 'Push-to-open (0 mm)'
};

/**
 * Sposób konstrukcji wieńca i półek w szafce narożnej Type A (L-shape).
 * Iter.4 [A2 opcja C] — synchronizowany z backendowym {@code CornerWreathConstructionTypeEnum}.
 * Default null → SPLIT_RECTANGLES (kompatybilność wsteczna).
 *
 * <p>UI dropdown + Excel/BOM obsługa L-shape kształtu — Iteracja 5 (opcja II tej iteracji = BE only).</p>
 */
export enum CornerWreathConstructionType {
  /** Default: 2 prostokątne płyty per wieniec/półka (Part A + Part B). Tańsza. */
  SPLIT_RECTANGLES = 'SPLIT_RECTANGLES',
  /** 1 płyta L-shape z wycięciem CNC w rogu wewnętrznym. Książka str. 173. Droższa, sztywniejsza. */
  L_SHAPE_CNC = 'L_SHAPE_CNC'
}

/** Etykiety dropdown dla konstrukcji wieńca/półek narożnika (UI Iter.5b). */
export const CORNER_WREATH_CONSTRUCTION_LABELS: Record<CornerWreathConstructionType, string> = {
  [CornerWreathConstructionType.SPLIT_RECTANGLES]: '2 prostokątne płyty (taniej, bez CNC)',
  [CornerWreathConstructionType.L_SHAPE_CNC]: '1 płyta L-shape z wycięciem CNC (sztywniejsza)'
};

/** Tooltipy długie dla każdej opcji (książkowy kontekst). */
export const CORNER_WREATH_CONSTRUCTION_TOOLTIPS: Record<CornerWreathConstructionType, string> = {
  [CornerWreathConstructionType.SPLIT_RECTANGLES]:
    'Wieniec i półki dolne/górne są wycinane jako 2 prostokątne płyty (Part A + Part B) i łączone w L-kształt. ' +
    'Brak potrzeby CNC, niższy koszt produkcji. Wymaga ręcznego dopasowania w narożniku.',
  [CornerWreathConstructionType.L_SHAPE_CNC]:
    'Wieniec i półki są wycinane jako 1 płyta L-shape z wycięciem CNC w rogu wewnętrznym (książka Wasiak v.2.3 str. 173). ' +
    'Wymaga maszyny CNC, wyższy koszt produkcji, ale gotowa do montażu i sztywniejsza konstrukcyjnie. ' +
    'W BOM/Excel widoczne wymiary pełnej płyty + wymiary wycięcia.'
};

/**
 * Wzór auto-doboru szerokości szafki ślepej (książka Wasiak v.2.3 str. 169):
 *   S = 580 - 50 + X + Y + 4
 *   gdzie:
 *     580 = stała odległość czoła frontu od ściany (50 odstęp + 510 głębokość sąsiedniej szafki + 20 grubość frontu)
 *     X = szerokość blendy zależna od typu uchwytu
 *     Y = szerokość frontu uchylnego
 *
 * @returns sugerowana szerokość szafki widthA w mm.
 */
export function computeBlindCornerWidthFromFormula(
  handleType: CornerHandleType,
  frontUchylnyWidthMm: number
): number {
  const x = CORNER_HANDLE_FILLER_WIDTH_MM[handleType];
  return 580 - 50 + x + frontUchylnyWidthMm + 4;
}

/** Returns true if mechanism is a Magic Corner variant (Comfort or Standard). */
export function isMagicCorner(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT
    || mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD;
}

/** Returns true if mechanism is a Le Mans variant (I or II). */
export function isLeMans(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.LE_MANS_I
    || mechanism === CornerMechanismType.LE_MANS_II;
}

/**
 * Returns true if mechanism is Type B (Blind/Rectangular).
 * Type B: BLIND_CORNER, MAGIC_CORNER_COMFORT, MAGIC_CORNER_STANDARD, LE_MANS_I, LE_MANS_II
 */
export function isBlindType(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.BLIND_CORNER
    || isMagicCorner(mechanism)
    || isLeMans(mechanism);
}

/**
 * Resolves the minimum active-front width (Y-min) for a Type B mechanism, mirroring the backend
 * {@code effectiveFrontMinWidth}. Magic Corner uses the selected line's Y-min (or the system default);
 * other Type B systems use the generic 400mm minimum.
 */
export function effectiveFrontMinWidthMm(
  mechanism: CornerMechanismType,
  systemLine?: CornerSystemLine | null
): number {
  if (isMagicCorner(mechanism)) {
    if (systemLine) {
      return CORNER_SYSTEM_LINE_MIN_FRONT_MM[systemLine];
    }
    return mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT ? 446 : 396;
  }
  return 400;
}

/**
 * Domyślne parametry systemowe (Magic Corner / Le Mans) dla danego mechanizmu Type B.
 * Wartości są dobrane tak, by od razu spełniały zakresy walidacji backendu i FE:
 *  - Le Mans: kąt ≥ 85°, grubość frontu 16–19 mm,
 *  - Magic Corner Comfort: kąt ≤ 90°, linia ≥ 450 (nie 400),
 *  - Magic Corner Standard: kąt ≤ 75°, linia od 400.
 *
 * `systemLine = null` oznacza, że linia jest opcjonalna dla danego systemu (Le Mans —
 * `effectiveFrontMinWidthMm` i tak zwraca 400 niezależnie od linii).
 */
export interface CornerSystemParamDefaults {
  systemLine: CornerSystemLine | null;
  openingAngleDeg: number;
  frontThicknessMm: number;
}

/**
 * Zwraca sensowne wartości domyślne parametrów systemowych dla mechanizmów Magic Corner / Le Mans.
 * Zwraca `null` dla mechanizmów bez parametrów systemowych (BLIND_CORNER, Type A).
 */
export function defaultCornerSystemParams(
  mechanism: CornerMechanismType
): CornerSystemParamDefaults | null {
  if (isLeMans(mechanism)) {
    // Le Mans: linia opcjonalna (Y-min = 400 niezależnie od linii); kąt ≥ 85°, front 16–19 mm.
    return { systemLine: null, openingAngleDeg: 90, frontThicknessMm: 18 };
  }
  if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT) {
    return { systemLine: CornerSystemLine.LINE_450, openingAngleDeg: 90, frontThicknessMm: 18 };
  }
  if (mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD) {
    return { systemLine: CornerSystemLine.LINE_400, openingAngleDeg: 75, frontThicknessMm: 18 };
  }
  return null;
}

/**
 * Sprawdza, czy podany kąt otwarcia jest dopuszczalny dla danego systemu (mirror walidacji):
 *  - Le Mans ≥ 85°, Magic Comfort ≤ 90°, Magic Standard ≤ 75°.
 * Mechanizmy bez ograniczenia kąta zwracają `true`.
 */
export function isCornerOpeningAngleValid(mechanism: CornerMechanismType, angleDeg: number): boolean {
  if (isLeMans(mechanism)) {
    return angleDeg >= 85;
  }
  if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT) {
    return angleDeg <= 90;
  }
  if (mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD) {
    return angleDeg <= 75;
  }
  return true;
}

/**
 * Form data for corner cabinet configuration.
 */
export interface CornerCabinetFormData {
  widthA: number;
  widthB: number;
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  isUpperCabinet: boolean;
}

/**
 * Request DTO for corner cabinet (matches backend CornerCabinetRequest).
 */
export interface CornerCabinetRequest {
  widthA: number;
  widthB?: number;              // null for Type B (no widthB)
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  upperCabinet: boolean;
  cornerOpeningType?: CornerOpeningType;  // Type A only: TWO_DOORS | BIFOLD
  frontUchylnyWidthMm?: number;           // Type B only: 400-600mm
  magicCornerFrontOnHinges?: boolean;     // MAGIC_CORNER only (optional)
  cornerHandleType?: CornerHandleType;    // Type B: typ uchwytu — steruje blendą narożnikową
  /** FS1 — Iteracja 2 [B1]: szerokość widocznej części frontu ślepego (materiał frontu, ~150mm).
   *  Null = brak splitu (cały front ślepy z materiału frontu, jak przed Iteracją 2). */
  blindPanelVisibleWidthMm?: number;
  /** Iter.4 [A2 opcja C]: Type A — sposób konstrukcji wieńca/półek (2 prostokąty vs L-CNC).
   *  Default null = SPLIT_RECTANGLES (kompatybilność wsteczna). Wartość propagowana do BE bez UI dropdown
   *  (UI w Iteracji 5 razem z UX-TOOLBAR + Excel/BOM obsługą kształtu L). */
  wreathConstructionType?: CornerWreathConstructionType;
  /** Iter.6 (Faza 1): strona aktywnego frontu/mechanizmu dla jednostronnych Type B (Le Mans, Magic Corner).
   *  Null = niesprecyzowane / symetryczne. */
  handedness?: CornerHandedness;
  /** Iter.6 (Faza 1): wymagany/maks. kąt otwarcia frontu w stopniach (Le Mans ≥85°, Magic ≤90°/≤75°). */
  openingAngleDeg?: number;
  /** Iter.6 (Faza 1): grubość frontu w mm — Le Mans wymaga 16–19 mm. */
  frontThicknessMm?: number;
  /** Iter.6 (Faza 1): linia systemu (rodzina szerokości frontu / Y-min) dla Magic Corner / Le Mans. */
  systemLine?: CornerSystemLine;
}

/** Domyślna szerokość widocznej części frontu ślepego (FS1) — książka str. 169. */
export const BLIND_PANEL_VISIBLE_WIDTH_DEFAULT_MM = 150;

/**
 * Labels for corner mechanism types.
 */
export const CORNER_MECHANISM_LABELS: Record<CornerMechanismType, string> = {
  [CornerMechanismType.MAGIC_CORNER_COMFORT]: 'Magic Corner Comfort',
  [CornerMechanismType.MAGIC_CORNER_STANDARD]: 'Magic Corner Standard',
  [CornerMechanismType.CAROUSEL_270]: 'Karuzela 270°',
  [CornerMechanismType.CAROUSEL_360]: 'Karuzela 360°',
  [CornerMechanismType.LE_MANS_I]: 'Fasolka Le Mans I',
  [CornerMechanismType.LE_MANS_II]: 'Fasolka Le Mans II',
  [CornerMechanismType.FIXED_SHELVES]: 'Półki stałe',
  [CornerMechanismType.NONE]: 'Brak (pusta)',
  [CornerMechanismType.BLIND_CORNER]: 'Ślepy narożnik (front uchylny)'
};

/**
 * Warstwa meta dla prezentacji kart mechanizmów (handoff „Layout narożnika" §5).
 * Nie zmienia istniejących typów/reguł — służy wyłącznie do renderowania kart-radio
 * (ikona/glif, skrót mono, jednolinijkowy opis) w zakładce „Podstawowe".
 */
export type CornerMechanismGlyph = 'shelves' | 'carousel' | 'bean';

export interface CornerMechanismMeta {
  /** Skrót mono pokazywany na karcie i w podglądzie (FS, C270, MCc, …). */
  abbr: string;
  /** Rodzaj ikony schematycznej. */
  glyph: CornerMechanismGlyph;
  /** Jednolinijkowy opis na karcie. */
  desc: string;
}

export const CORNER_MECHANISM_META: Record<CornerMechanismType, CornerMechanismMeta> = {
  [CornerMechanismType.FIXED_SHELVES]:        { abbr: 'FS',    glyph: 'shelves',  desc: 'Najtańsza — proste półki w narożniku' },
  [CornerMechanismType.CAROUSEL_270]:         { abbr: 'C270',  glyph: 'carousel', desc: 'Obrotowa taca, 2 fronty na zawiasach' },
  [CornerMechanismType.CAROUSEL_360]:         { abbr: 'C360',  glyph: 'carousel', desc: 'Pełny obrót, jeden łamany front' },
  [CornerMechanismType.BLIND_CORNER]:         { abbr: 'BC',    glyph: 'shelves',  desc: 'Front uchylny + półki, część schowana' },
  [CornerMechanismType.MAGIC_CORNER_COMFORT]: { abbr: 'MCc',   glyph: 'bean',     desc: 'Wysuwane kosze, maks. 90°' },
  [CornerMechanismType.MAGIC_CORNER_STANDARD]:{ abbr: 'MCs',   glyph: 'bean',     desc: 'Wysuwane kosze, maks. 75°' },
  [CornerMechanismType.LE_MANS_I]:            { abbr: 'LM I',  glyph: 'bean',     desc: 'Fasolka, front ≥ 85°' },
  [CornerMechanismType.LE_MANS_II]:           { abbr: 'LM II', glyph: 'bean',     desc: 'Fasolka 2-poziomowa, front ≥ 85°' },
  [CornerMechanismType.NONE]:                 { abbr: 'BOX',   glyph: 'shelves',  desc: 'Pusta szafka (kompatybilność wsteczna)' }
};

/**
 * Mechanisms allowed for base (floor) corner cabinet.
 * NONE is excluded — use FIXED_SHELVES with shelfQuantity=0 instead.
 */
export const BASE_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.CAROUSEL_270,
  CornerMechanismType.CAROUSEL_360,
  CornerMechanismType.MAGIC_CORNER_COMFORT,
  CornerMechanismType.MAGIC_CORNER_STANDARD,
  CornerMechanismType.LE_MANS_I,
  CornerMechanismType.LE_MANS_II,
  CornerMechanismType.BLIND_CORNER
];

/**
 * Mechanisms allowed for upper (hanging) corner cabinet.
 * - FIXED_SHELVES — standard upper corner Type A (L-shape, z półkami lub BLIND opening dla ramienia bez frontu).
 * - BLIND_CORNER — wiszący ślepy narożnik Type B: konstrukcja identyczna jak dolna, różni się tylko brakiem nóżek
 *   i opcjami szafki wiszącej (przedłużany front). Magic Corner / Le Mans nie mają wariantu wiszącego.
 */
export const UPPER_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.BLIND_CORNER
];

/**
 * Dimension constraints for base corner cabinet (Type A — L-shaped).
 * Książka Wasiak v.2.3:
 *  - str. 47 (sekcja 11): symetryczna 860×860mm
 *  - str. 171-173 (sekcja 7): asymetryczna z F1/F2 (przykład 928×780 → widthA=878, widthB=730)
 *  - głębokość 510mm spójna z resztą szafek dolnych BASE_*
 * `widthStep` ustawiony na 1mm — bez sztywnego skoku, użytkownik wpisuje dowolny wymiar.
 */
export const BASE_CORNER_CONSTRAINTS = {
  widthMin: 600,
  widthMax: 1200,
  widthStep: 1,
  heightMin: 680,
  heightMax: 760,
  depth: 510,
  shelfMin: 0,
  shelfMax: 4
};

/**
 * Dimension constraints for blind corner cabinet (Type B — Rectangular).
 */
export const BLIND_CORNER_CONSTRAINTS = {
  widthMin: 800,
  widthMax: 1200,
  widthStep: 1,   // bez sztywnego skoku 50 — user wpisuje dowolnie
  heightMin: 680,
  heightMax: 760,
  depth: 510,   // Fixed by backend preparer
  shelfMin: 0,
  shelfMax: 2,   // Only BLIND_CORNER supports shelves (0-2)
  frontUchylnyMin: 400,
  frontUchylnyMax: 600,
  frontUchylnyDefault: 500
};

/**
 * Dimension constraints for upper corner cabinet (Type A — L-shaped, wiszący).
 */
export const UPPER_CORNER_CONSTRAINTS = {
  widthMin: 600,
  widthMax: 900,
  widthStep: 1,   // bez sztywnego skoku 50
  heightMin: 600,
  heightMax: 900,
  depth: 320,  // Stała głębokość dla górnej (typowo 300-350mm)
  shelfMin: 0,  // 0 półek dozwolone — np. przy karuzeli lub pustej szafce
  shelfMax: 3
};

/**
 * Dimension constraints for upper BLIND corner cabinet (wiszący ślepy narożnik).
 * Książka Wasiak v.2.3 ("Szafka górna narożna ślepa") — węższa, wyższa i płytsza od dolnej.
 * Decyzje użytkownika 2026-06-02: głębokość/szerokość/wysokość jak w książce; półki 0–4
 * (książka 2–4, ale dopuszczamy 0); front uchylny min 296mm.
 */
export const UPPER_BLIND_CORNER_CONSTRAINTS = {
  widthMin: 660,
  widthMax: 960,
  widthStep: 1,
  heightMin: 300,
  heightMax: 1200,
  depth: 320,   // Stała głębokość korpusu wiszącego ślepego narożnika
  shelfMin: 0,
  shelfMax: 4,
  frontUchylnyMin: 296,
  frontUchylnyMax: 600,
  frontUchylnyDefault: 500
};

/**
 * Maps form data to request DTO.
 */
export function mapCornerFormToRequest(formData: CornerCabinetFormData): CornerCabinetRequest {
  return {
    widthA: formData.widthA,
    widthB: formData.widthB,
    mechanism: formData.mechanism,
    shelfQuantity: formData.shelfQuantity,
    upperCabinet: formData.isUpperCabinet
  };
}

/**
 * Checks if mechanism requires shelf configuration.
 */
export function mechanismRequiresShelves(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES
    || mechanism === CornerMechanismType.BLIND_CORNER;
}

/**
 * Checks if mechanism is allowed for upper cabinet.
 * FIXED_SHELVES (Type A) oraz BLIND_CORNER (wiszący ślepy narożnik Type B). Magic Corner / Le Mans — tylko dolne.
 */
export function isAllowedForUpperCabinet(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES
    || mechanism === CornerMechanismType.BLIND_CORNER;
}

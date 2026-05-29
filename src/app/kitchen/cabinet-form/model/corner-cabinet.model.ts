/**
 * Types of internal organization mechanisms for corner cabinets.
 * Type A (L-shaped): FIXED_SHELVES, CAROUSEL_270, CAROUSEL_360
 * Type B (Rectangular/Blind): BLIND_CORNER, MAGIC_CORNER, LE_MANS
 * Note: NONE is kept for backward compatibility but not shown in dropdown (same as FIXED_SHELVES with 0 shelves).
 */
export enum CornerMechanismType {
  MAGIC_CORNER = 'MAGIC_CORNER',
  CAROUSEL_270 = 'CAROUSEL_270',
  CAROUSEL_360 = 'CAROUSEL_360',
  LE_MANS = 'LE_MANS',
  FIXED_SHELVES = 'FIXED_SHELVES',
  NONE = 'NONE',
  BLIND_CORNER = 'BLIND_CORNER'
}

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

/**
 * Returns true if mechanism is Type B (Blind/Rectangular).
 * Type B: BLIND_CORNER, MAGIC_CORNER, LE_MANS
 */
export function isBlindType(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.BLIND_CORNER
    || mechanism === CornerMechanismType.MAGIC_CORNER
    || mechanism === CornerMechanismType.LE_MANS;
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
}

/** Domyślna szerokość widocznej części frontu ślepego (FS1) — książka str. 169. */
export const BLIND_PANEL_VISIBLE_WIDTH_DEFAULT_MM = 150;

/**
 * Labels for corner mechanism types.
 */
export const CORNER_MECHANISM_LABELS: Record<CornerMechanismType, string> = {
  [CornerMechanismType.MAGIC_CORNER]: 'Magic Corner',
  [CornerMechanismType.CAROUSEL_270]: 'Karuzela 270°',
  [CornerMechanismType.CAROUSEL_360]: 'Karuzela 360°',
  [CornerMechanismType.LE_MANS]: 'Fasolka (Le Mans)',
  [CornerMechanismType.FIXED_SHELVES]: 'Półki stałe',
  [CornerMechanismType.NONE]: 'Brak (pusta)',
  [CornerMechanismType.BLIND_CORNER]: 'Ślepy narożnik (front uchylny)'
};

/**
 * Mechanisms allowed for base (floor) corner cabinet.
 * NONE is excluded — use FIXED_SHELVES with shelfQuantity=0 instead.
 */
export const BASE_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES,
  CornerMechanismType.CAROUSEL_270,
  CornerMechanismType.CAROUSEL_360,
  CornerMechanismType.MAGIC_CORNER,
  CornerMechanismType.LE_MANS,
  CornerMechanismType.BLIND_CORNER
];

/**
 * Mechanisms allowed for upper (hanging) corner cabinet.
 * FIXED_SHELVES — standard upper corner (with shelves or blind: CornerOpeningType.BLIND for one arm without front).
 */
export const UPPER_CORNER_MECHANISMS: CornerMechanismType[] = [
  CornerMechanismType.FIXED_SHELVES
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
 * Dimension constraints for upper corner cabinet.
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
 */
export function isAllowedForUpperCabinet(mechanism: CornerMechanismType): boolean {
  return mechanism === CornerMechanismType.FIXED_SHELVES;
}
